import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/accounts/cleanup-duplicates',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test' // Auth might fail if the token is invalid, but let's try
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
});

req.on('error', console.error);
req.end();
