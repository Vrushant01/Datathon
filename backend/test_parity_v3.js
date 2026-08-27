const fs = require('fs');
const BASE_URL = 'https://backend-50044295489.development.catalystappsail.in/api';
const ENDPOINTS = [
  '/districts',
  '/units',
  '/employees',
  '/cases',
  '/hotspots',
  '/ai/dashboard'
];

function cleanObj(obj) {
  if (Array.isArray(obj)) return obj.map(cleanObj);
  if (obj && typeof obj === 'object') {
    const { _id, __v, generatedAt, generatedTime, riskScore, currentValue, reason, ...rest } = obj;
    // Normalize IDs that are generated
    if (rest.id && typeof rest.id === 'string' && rest.id.startsWith('ALT-')) delete rest.id;
    for (const k in rest) rest[k] = cleanObj(rest[k]);
    return rest;
  }
  return obj;
}

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
    } catch (err) { mongoStatus = 500; mongoError = err.message; }
    const mongoTime = Date.now() - mongoStart;

    // CloudScale Request
    const csStart = Date.now();
    let csData = null, csStatus = null, csError = null;
    let nosqlCalls = 0, cacheHits = 0, cacheMisses = 0;
    try {
      const csResp = await fetch(url, { headers: { 'x-mock-db-provider': 'cloudscale' } });
      csStatus = csResp.status;
      nosqlCalls = parseInt(csResp.headers.get('x-timing-nosql-calls') || '0', 10);
      cacheHits = parseInt(csResp.headers.get('x-timing-cache-hits') || '0', 10);
      cacheMisses = parseInt(csResp.headers.get('x-timing-cache-misses') || '0', 10);
      
      if (csResp.ok) csData = await csResp.json();
      else csError = await csResp.text();
    } catch (err) { csStatus = 500; csError = err.message; }
    const csTime = Date.now() - csStart;
    
    // Compare
    let dataMatch = 'FAIL';
    let differences = [];
    
    if (mongoStatus === 200 && csStatus === 200) {
      const mCleanStr = JSON.stringify(cleanObj(mongoData));
      const cCleanStr = JSON.stringify(cleanObj(csData));
      
      if (Array.isArray(mongoData) && Array.isArray(csData)) {
         if (mongoData.length === csData.length) {
            if (mCleanStr === cCleanStr) dataMatch = 'PASS (Counts & Content Match)';
            else dataMatch = 'PARTIAL (Counts Match, Content Mismatch)';
         } else {
            differences.push(`Count mismatch: Mongo=${mongoData.length}, CS=${csData.length}`);
         }
      } else if (!Array.isArray(mongoData) && !Array.isArray(csData)) {
         if (mCleanStr === cCleanStr) dataMatch = 'PASS (Content Match)';
         else dataMatch = 'PARTIAL (Fields Mismatch)';
      } else {
         differences.push('Type mismatch (Array vs Object)');
      }
    } else {
      differences.push(`Status mismatch: Mongo=${mongoStatus}, CS=${csStatus}`);
    }
    
    results.push({
      endpoint: ep,
      mongoStatus,
      csStatus,
      mongoTime,
      csTime,
      nosqlCalls,
      cacheHits,
      cacheMisses,
      dataMatch,
      differences
    });
  }
  fs.writeFileSync('parity_results_v3.json', JSON.stringify(results, null, 2));
}

runTests().catch(console.error);
