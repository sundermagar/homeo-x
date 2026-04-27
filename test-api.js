const http = require('http');
http.get('http://localhost:3000/api/doctors', {
  headers: { 'Authorization': 'Bearer demo-token-123' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(parsed.data[0]);
      console.log(parsed.data[1]);
    } catch(e) { console.error('parse err', e); }
  });
});
