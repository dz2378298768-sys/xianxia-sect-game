const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 18090,
  path: 'https://open.volcengineapi.com/',
  method: 'GET',
  headers: {
    'Host': 'open.volcengineapi.com',
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Body:', data.substring(0, 200));
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
