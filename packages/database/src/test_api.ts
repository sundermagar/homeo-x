
async function testPackages() {
  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:5173/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'password123' })
    });
    
    const loginData: any = await loginRes.json();
    const token = loginData?.data?.token;

    if (!token) {
      console.log('Login failed:', loginData);
      return;
    }

    console.log('Login success, Token retrieved.');

    // 2. Fetch Packages (GET)
    const getRes = await fetch('http://localhost:5173/api/packages', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('GET /packages Status:', getRes.status);
    console.log('GET /packages Response:', await getRes.text());

    // 3. Create Package (POST)
    const postRes = await fetch('http://localhost:5173/api/packages', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'System Test Plan', price: 999, durationDays: 14 })
    });
    console.log('POST /packages Status:', postRes.status);
    console.log('POST /packages Response:', await postRes.text());

    // 4. Fetch Medical Case (GET)
    const medRes = await fetch('http://localhost:5173/api/medical-cases/patient/10/full', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('GET /medical-cases/patient/10/full Status:', medRes.status);
    console.log('GET /medical-cases/patient/10/full Response:', await medRes.text());

  } catch (err) {
    console.error('Test script error:', err);
  }
}

testPackages();
