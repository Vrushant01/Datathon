const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testAllLive() {
  const baseURL = process.env.BACKEND_URL || 'https://backend-50044295489.development.catalystappsail.in';
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required to run testAllLive');
  }
  const token = jwt.sign(
    { email: process.env.ADMIN_EMAIL || 'admin@ksp.gov.in', role: 'Admin', officerId: 9001 },
    secret,
    { expiresIn: '1h' }
  );
  const headers = { 'Authorization': `Bearer ${token}` };

  try {
    const endpoints = ['/api/cases', '/api/employees', '/api/units', '/api/districts', '/api/accuseds', '/api/victims'];
    for (const ep of endpoints) {
      const res = await axios.get(`${baseURL}${ep}`, { headers });
      console.log(`${ep}: length ${Array.isArray(res.data) ? res.data.length : 'not array'}`, typeof res.data === 'object' ? Object.keys(res.data) : '');
    }
  } catch (err) {
    console.error(err.message);
    if(err.response) console.error(err.response.data);
  }
}
testAllLive();
