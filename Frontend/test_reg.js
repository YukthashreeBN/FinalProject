const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/register', {
      name: 'Test Student 3',
      email: 'teststudent3@example.com',
      password: 'password123',
      role: 'student'
    });
    console.log('Register success:', res.data);
    
    // Now try login
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'teststudent3@example.com',
      password: 'password123'
    });
    console.log('Login success:', loginRes.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

test();
