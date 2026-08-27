const assert = require('assert');

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

function sortDeep(obj) {
  if (Array.isArray(obj)) {
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

async function testEp(ep) {
    const url = 'https://backend-50044295489.development.catalystappsail.in/api' + ep;
    const mResp = await fetch(url, { headers: { 'x-mock-db-provider': 'mongo' } });
    const cResp = await fetch(url, { headers: { 'x-mock-db-provider': 'cloudscale' } });
    
    const m = await mResp.json();
    const c = await cResp.json();
    
    assert.deepStrictEqual(sortDeep(cleanObj(m)), sortDeep(cleanObj(c)));
    console.log("PASS:", ep);
}

async function run() {
    await testEp('/cases/station/2026');
    await testEp('/cases/officer/30015');
    await testEp('/network/100001');
}
run().catch(console.error);
