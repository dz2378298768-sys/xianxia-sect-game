const http = require('http');
const https = require('https');
const tls = require('tls');
const { URL } = require('url');

const UPSTREAM_PROXY_HOST = '127.0.0.1';
const UPSTREAM_PROXY_PORT = 18080;
const LOCAL_PORT = 18090;

function httpConnect(host, port) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: UPSTREAM_PROXY_HOST,
      port: UPSTREAM_PROXY_PORT,
      method: 'CONNECT',
      path: `${host}:${port}`,
      headers: {
        'Proxy-Connection': 'Keep-Alive',
      }
    });

    req.on('connect', (res, socket, head) => {
      if (res.statusCode === 200) {
        resolve({ socket, head });
      } else {
        reject(new Error(`CONNECT failed with status ${res.statusCode}`));
        socket.destroy();
      }
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      reject(new Error('CONNECT timeout'));
      req.destroy();
    });
    req.end();
  });
}

function makeHttpsRequest(url, method, headers, bodyStream) {
  return new Promise(async (resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname;
      const port = parsedUrl.port || 443;
      const path = parsedUrl.pathname + parsedUrl.search;

      const { socket: proxySocket } = await httpConnect(host, port);

      const tlsSocket = tls.connect({
        socket: proxySocket,
        servername: host,
      });

      tlsSocket.on('error', reject);

      await new Promise((res, rej) => {
        tlsSocket.once('secureConnect', res);
        tlsSocket.once('error', rej);
      });

      const headerLines = [
        `${method} ${path} HTTP/1.1`,
        `Host: ${parsedUrl.host}`,
      ];

      for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'host' || lowerKey === 'proxy-connection' || lowerKey === 'connection' || lowerKey === 'accept-encoding') {
          continue;
        }
        headerLines.push(`${key}: ${value}`);
      }

      headerLines.push('Connection: close');
      headerLines.push('\r\n');

      tlsSocket.write(headerLines.join('\r\n'));

      if (bodyStream) {
        bodyStream.pipe(tlsSocket, { end: false });
        bodyStream.on('end', () => {
        });
      }

      let responseStarted = false;
      let responseData = Buffer.alloc(0);
      let responseHeaders = {};
      let statusCode = 0;
      let bodyChunks = [];
      let contentLength = null;
      let isChunked = false;
      let headersComplete = false;

      tlsSocket.on('data', (chunk) => {
        if (!headersComplete) {
          responseData = Buffer.concat([responseData, chunk]);
          const headerEnd = responseData.indexOf('\r\n\r\n');
          if (headerEnd !== -1) {
            const headerStr = responseData.slice(0, headerEnd).toString('utf8');
            const headerLines = headerStr.split('\r\n');
            const statusLine = headerLines[0];
            const match = statusLine.match(/HTTP\/\d+\.\d+\s+(\d+)/);
            if (match) {
              statusCode = parseInt(match[1]);
            }

            for (let i = 1; i < headerLines.length; i++) {
              const line = headerLines[i];
              const colonIdx = line.indexOf(':');
              if (colonIdx !== -1) {
                const key = line.slice(0, colonIdx).trim();
                const value = line.slice(colonIdx + 1).trim();
                responseHeaders[key.toLowerCase()] = value;
              }
            }

            isChunked = responseHeaders['transfer-encoding'] === 'chunked';
            if (responseHeaders['content-length']) {
              contentLength = parseInt(responseHeaders['content-length']);
            }

            const remainingData = responseData.slice(headerEnd + 4);
            headersComplete = true;
            responseStarted = true;

            const readable = new (require('stream').Readable)();
            readable._read = () => {};
            resolve({ statusCode, headers: responseHeaders, body: readable });
            
            if (remainingData.length > 0) {
              readable.push(remainingData);
            }

            tlsSocket.on('data', (moreChunk) => {
              readable.push(moreChunk);
            });

            tlsSocket.on('end', () => {
              readable.push(null);
            });
          }
        }
      });

      tlsSocket.on('end', () => {
        if (!responseStarted) {
          reject(new Error('Connection closed before response'));
        }
      });

    } catch (e) {
      reject(e);
    }
  });
}

const server = http.createServer(async (req, res) => {
  const targetUrl = req.url;
  
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request: Expected full URL in path');
    return;
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const isHttps = parsedUrl.protocol === 'https:';

    if (isHttps) {
      const { statusCode, headers, body } = await makeHttpsRequest(targetUrl, req.method, req.headers, req);
      res.writeHead(statusCode, headers);
      body.pipe(res);
    } else {
      const requestHeaders = { ...req.headers };
      delete requestHeaders['proxy-connection'];
      delete requestHeaders['accept-encoding'];

      const upstreamReq = http.request({
        hostname: UPSTREAM_PROXY_HOST,
        port: UPSTREAM_PROXY_PORT,
        path: targetUrl,
        method: req.method,
        headers: requestHeaders,
      });

      upstreamReq.on('response', (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode, upstreamRes.headers);
        upstreamRes.pipe(res);
      });

      upstreamReq.on('error', (e) => {
        console.error('HTTP upstream error:', e.message);
        if (!res.headersSent) {
          res.writeHead(502);
          res.end('Upstream Error: ' + e.message);
        }
      });

      req.pipe(upstreamReq);
    }
  } catch (e) {
    console.error('Proxy error:', e.message);
    if (!res.headersSent) {
      res.writeHead(502);
      res.end('Proxy Error: ' + e.message);
    }
  }
});

server.on('connect', async (req, clientSocket, head) => {
  const [host, portStr] = req.url.split(':');
  const port = parseInt(portStr) || 443;

  try {
    const { socket: proxySocket, head: proxyHead } = await httpConnect(host, port);
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    if (proxyHead && proxyHead.length > 0) {
      proxySocket.write(proxyHead);
    }
    if (head && head.length > 0) {
      proxySocket.write(head);
    }
    proxySocket.pipe(clientSocket);
    clientSocket.pipe(proxySocket);
  } catch (e) {
    console.error('CONNECT error:', e.message);
    clientSocket.end();
  }
});

server.listen(LOCAL_PORT, '127.0.0.1', () => {
  console.log(`Fix proxy running on http://127.0.0.1:${LOCAL_PORT}`);
});
