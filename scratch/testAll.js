const http = require('http');

const endpoints = [
  '/api/cases',
  '/api/employees',
  '/api/units',
  '/api/customedges',
  '/api/complainants',
  '/api/actsections'
];

async function run() {
  for (const ep of endpoints) {
    console.log(`Fetching ${ep}...`);
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:3001${ep}`, (response) => {
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => resolve({ status: response.statusCode, data }));
        });
        req.on('error', reject);
      });
      
      let count = 'N/A';
      if (res.status === 200) {
        try {
          const parsed = JSON.parse(res.data);
          count = Array.isArray(parsed) ? parsed.length : 'Not an array';
        } catch(e) {
          count = 'JSON parse error';
        }
      }
      console.log(`Endpoint: ${ep} | Status: ${res.status} | Count: ${count}`);
    } catch (e) {
      console.error(`Endpoint: ${ep} | Error:`, e.message);
    }
  }
}
run();
