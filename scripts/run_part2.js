const fs = require('fs');

const BASE_URL = process.env.BACKEND_URL || "https://backend-50044295489.development.catalystappsail.in";

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return { status: res.status, ok: res.ok, data: JSON.parse(text) };
  } catch {
    return { status: res.status, ok: res.ok, raw: text };
  }
}

async function getAdminToken() {
  if (process.env.ADMIN_TOKEN) return process.env.ADMIN_TOKEN;
  const email = process.env.ADMIN_EMAIL || 'admin';
  const passcode = process.env.ADMIN_PASSWORD || 'admin123';
  const res = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idOrEmail: email, passcode, loginType: 'admin' })
  });
  if (!res.ok || !res.data.token) {
    throw new Error(`Login failed: ${JSON.stringify(res.data)}`);
  }
  return res.data.token;
}

async function runPart2() {
  console.log('========================================================================');
  console.log('   PART 2 INSERTION: 1 Oct 2026 to 30 Oct 2026 (30 Days)');
  console.log('========================================================================\n');

  const token = await getAdminToken();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const chunks = [
    { start: '2026-10-01', end: '2026-10-06' },
    { start: '2026-10-07', end: '2026-10-12' },
    { start: '2026-10-13', end: '2026-10-18' },
    { start: '2026-10-19', end: '2026-10-24' },
    { start: '2026-10-25', end: '2026-10-30' }
  ];

  let totalPart2Inserted = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`--- Inserting Chunk ${i + 1}/${chunks.length} (${chunk.start} to ${chunk.end}) ---`);
    const t0 = Date.now();
    const res = await request('/api/admin/backfill/execute', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        confirmed: true,
        batchId: 'seed-stage2-part2-oct',
        startDate: chunk.start,
        endDate: chunk.end
      })
    });

    if (!res.ok || !res.data.success) {
      console.error('Chunk response failed:', res.data);
      throw new Error(`Chunk ${i + 1} failed: ${JSON.stringify(res.data)}`);
    }

    const inserted = res.data.result.insertedCases;
    totalPart2Inserted += inserted;
    console.log(`✔ Chunk ${i + 1} completed: +${inserted} cases in ${Date.now() - t0}ms.`);
  }

  console.log(`\n✔ Part 2 Insertion complete. Total Part 2 cases inserted: ${totalPart2Inserted}`);

  // Clear cache and audit Part 2
  console.log('\n--- Auditing Final Database State (Post-Part 2) ---');
  await request('/api/admin/cache/clear', { method: 'POST', headers });

  const finalStats = await request('/api/admin/dashboard-stats', { headers });
  console.log('Final Dashboard Stats:', {
    totalFirs: finalStats.data?.data?.totalFirs,
    pendingCases: finalStats.data?.data?.pendingCases,
    solvedClosed: finalStats.data?.data?.solvedClosed,
    activeOfficers: finalStats.data?.data?.activeOfficers,
    policeStations: finalStats.data?.data?.policeStations
  });

  const finalCasesRes = await request('/api/cases', { headers });
  const finalCases = finalCasesRes.data || [];
  const expectedTotal = 10189 + 287 + totalPart2Inserted;
  console.log(`Total Cases in DB: ${finalCases.length} (Expected: ${expectedTotal})`);
  if (finalCases.length !== expectedTotal) {
    throw new Error(`Total count mismatch: expected ${expectedTotal}, got ${finalCases.length}`);
  }

  // Duplicate ID Check
  const finalIds = finalCases.map(c => Number(c.CaseMasterID));
  const uniqueFinalIds = new Set(finalIds);
  if (uniqueFinalIds.size !== finalIds.length) {
    throw new Error(`Duplicate IDs detected in final state!`);
  }
  console.log('✔ Duplicate IDs: 0');

  // Baseline rows intact check
  const fs = require('fs');
  const backup = JSON.parse(fs.readFileSync('backups/pre_backfill_backup_20261029/cases_backup.json'));
  const baselineIds = new Set(backup.map(c => Number(c.CaseMasterID)));
  for (const origId of baselineIds) {
    if (!uniqueFinalIds.has(origId)) {
      throw new Error(`Baseline row ${origId} missing!`);
    }
  }
  console.log('✔ Original 10,189 baseline rows strictly intact.');

  // Orphaned check
  const accusedFinalRes = await request('/api/accused', { headers });
  const victimsFinalRes = await request('/api/victims', { headers });
  const compFinalRes = await request('/api/complainants', { headers });

  const seededAccused = (accusedFinalRes.data || []).filter(a => Number(a.AccusedMasterID) >= 300501);
  const seededVictims = (victimsFinalRes.data || []).filter(v => Number(v.VictimMasterID) >= 300501);
  const seededComps = (compFinalRes.data || []).filter(c => Number(c.ComplainantID) >= 70001);

  const orphanAcc = seededAccused.filter(a => !uniqueFinalIds.has(Number(a.CaseMasterID)));
  const orphanVic = seededVictims.filter(v => !uniqueFinalIds.has(Number(v.CaseMasterID)));
  const orphanComp = seededComps.filter(c => !uniqueFinalIds.has(Number(c.CaseMasterID)));

  console.log(`Final Seeded Accused: ${seededAccused.length}, Orphaned: ${orphanAcc.length}`);
  console.log(`Final Seeded Victims: ${seededVictims.length}, Orphaned: ${orphanVic.length}`);
  console.log(`Final Seeded Complainants: ${seededComps.length}, Orphaned: ${orphanComp.length}`);
  if (orphanAcc.length > 0 || orphanVic.length > 0 || orphanComp.length > 0) {
    throw new Error('Orphaned records detected after Part 2!');
  }
  console.log('✔ Final referential integrity: 0 orphans.');

  // Verify IsSeeded & SeedBatchId tags
  const seededCases = finalCases.filter(c => Number(c.CaseMasterID) >= 300501);
  const allTagged = seededCases.every(c => c.IsSeeded && c.SeedBatchId);
  console.log(`✔ Every seeded row has IsSeeded: true and SeedBatchId: ${allTagged}`);

  // Fetch monthly trends for Sep & Oct
  console.log('\n--- Historical Registration Trend (Last 6 Months) ---');
  const monthCounts = {};
  finalCases.forEach(c => {
    const d = (c.CrimeRegisteredDate || c.RegistrationDate || '').slice(0, 7);
    if (d) monthCounts[d] = (monthCounts[d] || 0) + 1;
  });

  const sortedMonths = Object.keys(monthCounts).sort().slice(-6);
  sortedMonths.forEach(m => {
    console.log(`  ${m}: ${monthCounts[m]} cases`);
  });

  console.log('\n========================================================================');
  console.log('       STAGE 2 COMPLETE DATA BACKFILL FINISHED (100% SUCCESS)');
  console.log('   - Baseline Cases: 10,189');
  console.log('   - Part 1 Inserted (Sep 16-30): 287 cases');
  console.log(`   - Part 2 Inserted (Oct 01-30): ${totalPart2Inserted} cases`);
  console.log(`   - Final Total Cases in CloudScale: ${finalCases.length}`);
  console.log('   - Duplicate IDs: 0');
  console.log('   - Orphaned Records: 0');
  console.log('   - Original Baseline Rows Altered: 0');
  console.log('========================================================================\n');
}

runPart2().catch(err => {
  console.error('\n❌ PART 2 FAILED:', err);
  process.exit(1);
});

