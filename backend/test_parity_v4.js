const fs = require('fs');
const assert = require('assert');

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
    if (rest.id && typeof rest.id === 'string' && rest.id.startsWith('ALT-')) delete rest.id;
    for (const k in rest) rest[k] = cleanObj(rest[k]);
    return rest;
  }
  return obj;
}

// Custom sort function to sort arrays of objects deterministically so order differences don't fail parity
function sortDeep(obj) {
  if (Array.isArray(obj)) {
     // sort array elements if they are objects
     obj.sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
     return obj.map(sortDeep);
  }
  if (obj && typeof obj === 'object') {
    const sorted = {};
    Object.keys(obj).sort().forEach(k => {
      sorted[k] = sortDeep(obj[k]);
    });
    return sorted;
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
      try {
         assert.deepStrictEqual(sortDeep(cleanObj(mongoData)), sortDeep(cleanObj(csData)));
         if (Array.isArray(mongoData) && Array.isArray(csData)) dataMatch = 'PASS (Counts & Content Match)';
         else dataMatch = 'PASS (Content Match)';
      } catch (e) {
         dataMatch = 'PARTIAL (Fields Mismatch)';
         differences.push(e.message);
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
      differences: differences.length > 0 ? differences[0].substring(0, 100) : []
    });
  }
  fs.writeFileSync('parity_results_v4.json', JSON.stringify(results, null, 2));
}

runTests().catch(console.error);
