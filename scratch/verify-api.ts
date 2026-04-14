import http from 'http';

function request(path: string) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, {
      headers: {
        'x-tenant-id': 'test'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        data: JSON.parse(data)
      }));
    }).on('error', reject);
  });
}

async function verify() {
  try {
    console.log('Testing GET /api/patients...');
    const p1 = await request('/api/patients?page=1&limit=5');
    console.log('Patients response:', p1.statusCode, 'count:', (p1 as any).data.data.length);

    console.log('\nTesting GET /api/staff?category=doctor...');
    const s1 = await request('/api/staff?category=doctor&page=1&limit=5');
    console.log('Doctors response:', s1.statusCode, 'count:', (s1 as any).data.data.length);

    console.log('\nTesting GET /api/staff?category=employee...');
    const s2 = await request('/api/staff?category=employee&page=1&limit=5');
    console.log('Employees response:', s2.statusCode, 'count:', (s2 as any).data.data.length);

  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

verify();
