const fs = require('fs');
async function testDiff() {
    const url = 'https://backend-50044295489.development.catalystappsail.in/api/ai/dashboard';
    let mResp = await fetch(url, { headers: { 'x-mock-db-provider': 'mongo' } });
    let mongoData = await mResp.json();
    let cResp = await fetch(url, { headers: { 'x-mock-db-provider': 'cloudscale' } });
    let csData = await cResp.json();
    fs.writeFileSync('mongo_dash.json', JSON.stringify(mongoData, null, 2));
    fs.writeFileSync('cs_dash.json', JSON.stringify(csData, null, 2));
    console.log("Wrote dash");
}
testDiff();
