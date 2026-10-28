const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testLiveAPI() {
  const baseURL = process.env.BACKEND_URL || 'https://backend-50044295489.development.catalystappsail.in';
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required to run testLiveAPI');
  }
  const token = jwt.sign(
    { email: process.env.ADMIN_EMAIL || 'admin@ksp.gov.in', role: 'admin', officerId: 9001 },
    secret,
    { expiresIn: '1h' }
  );

  console.log('--- Testing /api/cases (CREATE) ---');
  try {
    const newFIR = {
      CrimeNo: `FIR-TEST-${Date.now()}`,
      CaseNo: `FIR-TEST-${Date.now()}`,
      PoliceStationID: 2001,
      CrimeRegisteredDateTime: new Date().toISOString(),
      CrimeRegisteredDate: new Date().toISOString().split('T')[0],
      IncidentFromDate: "2026-09-01",
      IncidentToDate: "2026-09-02",
      BriefFacts: "Test live creation of FIR to verify HTTP 201 via AppSail.",
      Acts: [
        { ActID: "IPC", ActOrderID: 1, SectionID: "302" }
      ]
    };

    const caseRes = await axios.post(`${baseURL}/api/cases`, newFIR, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(`Case Create Status: ${caseRes.status}`);
    console.log(`Created CaseMasterID:`, caseRes.data.CaseMasterID);
  } catch (err) {
    console.error('Case Create Error:', err.response?.data || err.message);
  }
}

testLiveAPI();
