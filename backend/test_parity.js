const fs = require('fs');

const BASE_URL = 'https://backend-50044295489.development.catalystappsail.in/api';
const ENDPOINTS = [
  '/districts',
  '/units',
  '/employees',
  '/cases',
  '/hotspots',
  '/ai/district-intelligence',
  '/ai/dashboard'
];

async function runTests() {
  const results = [];
  
  for (const ep of ENDPOINTS) {
    console.log(`Testing ${ep}...`);
    const url = BASE_URL + ep;
    
    // Mongo Request
    const mongoStart = Date.now();
    let mongoData = null, mongoStatus = null, mongoError = null;
    try {
      const mResp = await fetch(url, { headers: { 'x-mock-db-provider': 'mongo' } });
      mongoStatus = mResp.status;
      if (mResp.ok) mongoData = await mResp.json();
      else mongoError = await mResp.text();
    } catch (err) {
      mongoStatus = 500;
      mongoError = err.message;
    }
    const mongoTime = Date.now() - mongoStart;

    // CloudScale Request
    const csStart = Date.now();
    let csData = null, csStatus = null, csError = null;
    try {
      const csResp = await fetch(url, { headers: { 'x-mock-db-provider': 'cloudscale' } });
      csStatus = csResp.status;
      if (csResp.ok) csData = await csResp.json();
      else csError = await csResp.text();
    } catch (err) {
      csStatus = 500;
      csError = err.message;
    }
    const csTime = Date.now() - csStart;
    
    // Compare
    let dataMatch = 'FAIL';
    let differences = [];
    
    if (mongoStatus === 200 && csStatus === 200) {
      if (Array.isArray(mongoData) && Array.isArray(csData)) {
        if (mongoData.length === csData.length) {
          // Deep compare first item
          if (mongoData.length > 0) {
            const m1 = mongoData[0];
            const c1 = csData.find(c => {
                if (ep === '/districts') return c.DistrictID === m1.DistrictID;
                if (ep === '/units') return c.UnitID === m1.UnitID;
                if (ep === '/employees') return c.EmployeeID === m1.EmployeeID;
                if (ep === '/cases' || ep === '/hotspots') return c.CaseMasterID === m1.CaseMasterID;
                if (ep === '/ai/district-intelligence') return c.stationId === m1.stationId;
                if (ep === '/ai/dashboard') return c._id === m1._id; // _id is PersonID here
                return true;
            });
            if (c1) {
                // Remove meta fields
                const { _id: mId, __v: mV, ...mClean } = m1;
                const { _id: cId, __v: cV, ...cClean } = c1;
                
                const mStr = JSON.stringify(mClean);
                const cStr = JSON.stringify(cClean);
                
                if (mStr === cStr) {
                    dataMatch = 'PASS';
                } else {
                    dataMatch = 'PARTIAL (Fields Mismatch)';
                    differences.push('Data structure mismatch on first item');
                    differences.push(`Mongo: ${mStr}`);
                    differences.push(`CS: ${cStr}`);
                }
            } else {
                differences.push('Could not find matching ID in CloudScale response');
            }
          } else {
            dataMatch = 'PASS (Empty Arrays)';
          }
        } else {
          dataMatch = 'FAIL';
          differences.push(`Count mismatch: Mongo=${mongoData.length}, CS=${csData.length}`);
        }
      } else {
         differences.push('Response is not an array');
      }
    } else {
      differences.push(`Status mismatch: Mongo=${mongoStatus}, CS=${csStatus}`);
      if (csError) differences.push(`CS Error: ${csError}`);
    }
    
    results.push({
      endpoint: ep,
      mongoStatus,
      csStatus,
      mongoTime,
      csTime,
      dataMatch,
      differences
    });
  }
  
  fs.writeFileSync('parity_results.json', JSON.stringify(results, null, 2));
  console.log('Parity test complete. Results saved to parity_results.json');
}

runTests().catch(console.error);
