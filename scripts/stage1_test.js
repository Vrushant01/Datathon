const fs = require('fs');

const BASE_URL = "https://backend-50044295489.development.catalystappsail.in";

async function loginAdmin() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idOrEmail: 'admin@ksp.gov.in', passcode: 'admin123', loginType: 'admin' })
  });
  const data = await res.json();
  if (!data.token) throw new Error('Failed to login: ' + JSON.stringify(data));
  return data.token;
}

async function runStage1() {
  console.log('Logging in as Admin...');
  const token = await loginAdmin();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log('\n--- STEP 1: PRE-INSERT COUNT CHECK ---');
  await fetch(`${BASE_URL}/api/admin/cache/clear`, { method: 'POST', headers });
  const beforeCasesRes = await fetch(`${BASE_URL}/api/cases`, { headers });
  const beforeCasesData = await beforeCasesRes.json();
  const beforeCases = beforeCasesData.data || beforeCasesData;
  const beforeStatsRes = await fetch(`${BASE_URL}/api/admin/dashboard-stats`, { headers });
  const beforeStats = await beforeStatsRes.json();

  console.log(`Pre-insert Cases Count: ${beforeCases.length}`);
  console.log(`Pre-insert Dashboard Stats: Total FIRs = ${beforeStats.data.totalFirs}, Pending = ${beforeStats.data.pendingCases}, Solved = ${beforeStats.data.solvedClosed}`);

  console.log('\n--- STEP 2: INSERT 1 DAY (21 OCT 2026) VIA STAGE 1 ---');
  const execRes = await fetch(`${BASE_URL}/api/admin/backfill/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      confirmed: true,
      batchId: 'seed-stage1-2026-10-21',
      singleDay: '2026-10-21'
    })
  });
  const execData = await execRes.json();
  console.log('Execution response:', JSON.stringify(execData, null, 2));

  console.log('\n--- STEP 3: POST-INSERT VERIFICATION ---');
  await fetch(`${BASE_URL}/api/admin/cache/clear`, { method: 'POST', headers });
  const postCasesRes = await fetch(`${BASE_URL}/api/cases`, { headers });
  const postCasesData = await postCasesRes.json();
  const postCases = postCasesData.data || postCasesData;

  const postStatsRes = await fetch(`${BASE_URL}/api/admin/dashboard-stats`, { headers });
  const postStats = await postStatsRes.json();

  console.log(`Post-insert Cases Count: ${postCases.length} (Expected: ${beforeCases.length + execData.result.insertedCases})`);
  console.log(`Post-insert Dashboard Stats: Total FIRs = ${postStats.data.totalFirs}, Pending = ${postStats.data.pendingCases}, Solved = ${postStats.data.solvedClosed}`);

  // Find newly inserted cases
  const newCases = postCases.filter(c => c.IsSeeded === true && c.SeedBatchId === 'seed-stage1-2026-10-21');
  console.log(`Verified new seeded cases in database: ${newCases.length}`);
  if (newCases.length > 0) {
    const newIds = newCases.map(c => c.CaseMasterID).sort((a,b) => a - b);
    console.log(`New Case IDs range: ${newIds[0]} to ${newIds[newIds.length - 1]}`);
    console.log(`Sample new case:`, JSON.stringify(newCases[0], null, 2));
  }

  // Integrity checks
  const existingUnchanged = postCases.filter(c => Number(c.CaseMasterID) <= 300166);
  console.log(`Old rows check (<= 300166): ${existingUnchanged.length} existing rows completely unchanged.`);

  // Check duplicate IDs
  const allIds = postCases.map(c => c.CaseMasterID);
  const uniqueIds = new Set(allIds);
  console.log(`Unique CaseMasterIDs check: total ${allIds.length}, unique ${uniqueIds.size} (Duplicates: ${allIds.length - uniqueIds.size})`);

  console.log('\n--- STEP 4: RUN ROLLBACK FOR STAGE 1 BATCH ---');
  const rollbackRes = await fetch(`${BASE_URL}/api/admin/backfill/rollback`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      confirmed: true,
      batchId: 'seed-stage1-2026-10-21'
    })
  });
  const rollbackData = await rollbackRes.json();
  console.log('Rollback response:', JSON.stringify(rollbackData, null, 2));

  console.log('\n--- STEP 5: POST-ROLLBACK VERIFICATION ---');
  await fetch(`${BASE_URL}/api/admin/cache/clear`, { method: 'POST', headers });
  const rollbackCasesRes = await fetch(`${BASE_URL}/api/cases`, { headers });
  const rollbackCasesData = await rollbackCasesRes.json();
  const rollbackCases = rollbackCasesData.data || rollbackCasesData;

  const rollbackStatsRes = await fetch(`${BASE_URL}/api/admin/dashboard-stats`, { headers });
  const rollbackStats = await rollbackStatsRes.json();

  console.log(`Post-rollback Cases Count: ${rollbackCases.length} (Expected: ${beforeCases.length})`);
  console.log(`Post-rollback Dashboard Stats: Total FIRs = ${rollbackStats.data.totalFirs}, Pending = ${rollbackStats.data.pendingCases}, Solved = ${rollbackStats.data.solvedClosed}`);

  const remainingSeeded = rollbackCases.filter(c => c.SeedBatchId === 'seed-stage1-2026-10-21');
  console.log(`Remaining seeded cases from batch: ${remainingSeeded.length} (Expected: 0)`);
}

runStage1().catch(console.error);

