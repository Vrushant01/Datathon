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

const pagesToTest = [
  { page: '1. Dashboard', endpoint: '/api/admin/dashboard-stats', method: 'GET' },
  { page: '2. Stations', endpoint: '/api/units', method: 'GET' },
  { page: '3. Officers', endpoint: '/api/employees', method: 'GET' },
  { page: '4. FIRs & Cases', endpoint: '/api/cases', method: 'GET' },
  { page: '5. Analytics', endpoint: '/api/analytics/dashboard', method: 'GET' },
  { page: '6. GIS Maps', endpoint: '/api/cases?requireLocation=true', method: 'GET' },
  { page: '7. Criminal Network', endpoint: '/api/network/search?query=', method: 'GET' },
  { page: '8. Intell Center', endpoint: '/api/ai/intelligence-context?type=spike', method: 'GET' },
  { page: '9. Station Risk', endpoint: '/api/station-risk/batch-predict', method: 'GET' },
  { page: '10. Repeated Offenders', endpoint: '/api/repeated-offenders', method: 'GET' },
  { page: '11. AI Assistant', endpoint: '/api/chatbot/chat?question=What+is+the+status+of+crime+in+Bangalore&sessionId=smoke-test', method: 'GET' },
  { page: '12. Audit Logs', endpoint: '/api/audit-logs', method: 'GET' }
];

async function runSmokeTests() {
  console.log(`Starting Smoke Tests against ${BASE_URL}...\n`);
  const token = await getAuthToken();
  const results = [];

  for (const item of pagesToTest) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE_URL}${item.endpoint}`, {
        method: item.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const elapsed = Date.now() - t0;
      let bodyText = await res.text();
      let isSuccess = res.ok;
      let notes = '';

      try {
        const json = JSON.parse(bodyText);
        if (json.error && !json.data && !json.success) {
          isSuccess = false;
          notes = json.error;
        } else {
          notes = Array.isArray(json) ? `${json.length} items` : (json.data && Array.isArray(json.data) ? `${json.data.length} items` : 'OK');
        }
      } catch (_) {
        notes = `${bodyText.length} bytes`;
      }

      results.push({
        page: item.page,
        endpoint: item.endpoint,
        status: res.status,
        latencyMs: elapsed,
        passed: isSuccess,
        notes
      });
    } catch (err) {
      const elapsed = Date.now() - t0;
      results.push({
        page: item.page,
        endpoint: item.endpoint,
        status: 'ERR',
        latencyMs: elapsed,
        passed: false,
        notes: err.message
      });
    }
  }

  console.log('========================================================================================');
  console.log('                        12-PAGE SMOKE TEST RESULTS                                      ');
  console.log('========================================================================================');
  console.log('Page'.padEnd(24) + 'Endpoint'.padEnd(38) + 'Status'.padEnd(8) + 'Latency'.padEnd(10) + 'Result'.padEnd(8) + 'Details');
  console.log('----------------------------------------------------------------------------------------');
  results.forEach(r => {
    const outcome = r.passed ? 'PASS' : 'FAIL';
    console.log(`${r.page.padEnd(24)}${r.endpoint.slice(0, 36).padEnd(38)}${String(r.status).padEnd(8)}${(r.latencyMs + 'ms').padEnd(10)}${outcome.padEnd(8)}${r.notes}`);
  });

  const totalPassed = results.filter(r => r.passed).length;
  console.log('----------------------------------------------------------------------------------------');
  console.log(`Summary: ${totalPassed} / ${results.length} Pages Passed (${((totalPassed / results.length) * 100).toFixed(0)}%)\n`);
}

runSmokeTests().catch(console.error);
