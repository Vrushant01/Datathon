const fs = require('fs');

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGtzcC5nb3YuaW4iLCJyb2xlIjoiQWRtaW4iLCJmaXJzdE5hbWUiOiJBZG1pbmlzdHJhdG9yIEtTUCIsImlhdCI6MTc5MzIyMzk0OSwiZXhwIjoxNzkzMjI3NTQ5fQ.ctE2VMfJ_mTN8CCLiAYyDddq-u1AZIPMcczf17czR9A";
const BASE_URL = "https://backend-50044295489.development.catalystappsail.in";

async function download(endpoint, filename) {
  console.log(`Downloading ${endpoint}...`);
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!res.ok) {
    throw new Error(`Failed ${endpoint}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  fs.writeFileSync(filename, text);
  console.log(`Saved ${filename} (${(text.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  await download('/api/cases', 'cases_dump.json');
  await download('/api/accused', 'accused_dump.json');
  await download('/api/victims', 'victims_dump.json');
  await download('/api/employees', 'employees_dump.json');
  await download('/api/units', 'units_dump.json');
  console.log('All downloads complete!');
}

main().catch(err => {
  console.error('Download error:', err);
  process.exit(1);
});

