const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testAllLive() {
  const baseURL = 'https://backend-50044295489.development.catalystappsail.in';
  const token = jwt.sign(
    { email: 'admin@ksp.gov.in', role: 'Admin', officerId: 9001 },
    'ksp_access_jwt_s3cr3t_2026_xJ9mPqR7wLnK4vZt',
    { expiresIn: '1h' }
  );
  const headers = { 'Authorization': `Bearer ${token}` };

  try {
    let res = await axios.get(`${baseURL}/api/forensic?zcql=SELECT%20*%20FROM%20Act%20LIMIT%205`, { headers });
    console.log("zcql Act:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.message);
    if(err.response) console.error(err.response.data);
  }
}
testAllLive();
