const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 18080,
  method: 'CONNECT',
  path: 'open.volcengineapi.com:443',
  headers: {
    'Proxy-Connection': 'Keep-Alive',
  }
};

const req = http.request(options);

req.on('connect', (res, socket, head) => {
  console.log('CONNECT status:', res.statusCode);
  if (res.statusCode === 200) {
    console.log('Tunnel established!');
    socket.end();
  }
  process.exit(0);
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

req.end();
