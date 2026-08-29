const https = require('https');

function fetchEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    console.log(`Fetching ${endpoint}...`);
    https.get(`https://backend-50044295489.development.catalystappsail.in/api/${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            endpoint,
            status: res.statusCode,
            count: Array.isArray(parsed) ? parsed.length : 'Not an array',
            sample: Array.isArray(parsed) ? parsed.slice(0, 1) : parsed
          });
        } catch (e) {
          resolve({ endpoint, status: res.statusCode, error: 'Parse failed', raw: data.substring(0, 200) });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const cases = await fetchEndpoint('cases');
  console.log('Cases:', cases);

  const employees = await fetchEndpoint('employees');
  console.log('Employees:', employees);

  const units = await fetchEndpoint('units');
  console.log('Units:', units);
}

run();
