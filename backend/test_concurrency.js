const BASE_URL = 'https://backend-50044295489.development.catalystappsail.in/api';
async function testConcurrency() {
  const url = BASE_URL + '/cases';
  const reqs = [];
  for(let i=0; i<5; i++) {
     reqs.push(fetch(url, { headers: { 'x-mock-db-provider': 'cloudscale' } }));
  }
  const responses = await Promise.all(reqs);
  
  for(let i=0; i<5; i++) {
     console.log("Headers for req", i);
     for(let [k,v] of responses[i].headers) {
         if (k.startsWith('x-timing')) console.log(k, v);
     }
  }
}
testConcurrency().catch(console.error);
