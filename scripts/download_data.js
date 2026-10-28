const fs = require('fs');

const BASE_URL = process.env.BACKEND_URL || "https://backend-50044295489.development.catalystappsail.in";

async function getAuthToken() {
  if (process.env.ADMIN_TOKEN) {
    return process.env.ADMIN_TOKEN;
  }
  const email = process.env.ADMIN_EMAIL || 'admin';
  const passcode = process.env.ADMIN_PASSWORD || 'admin123';
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idOrEmail: email, passcode, loginType: 'admin' })
  });
  const data = await res.json();
  if (!data.token) {
    throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  }
  return data.token;
}

async function download(endpoint, filename, token) {
  console.log(`Downloading ${endpoint}...`);
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Failed ${endpoint}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  fs.writeFileSync(filename, text);
  console.log(`Saved ${filename} (${(text.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  const token = await getAuthToken();
  await download('/api/cases', 'cases_dump.json', token);
  await download('/api/accused', 'accused_dump.json', token);
  await download('/api/victims', 'victims_dump.json', token);
  await download('/api/employees', 'employees_dump.json', token);
  await download('/api/units', 'units_dump.json', token);
  console.log('All downloads complete!');
}

main().catch(err => {
  console.error('Download error:', err);
  process.exit(1);
});
