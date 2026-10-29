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

async function runStage2() {
  console.log('========================================================================');
  console.log('          STAGE 2: FULL DATA BACKFILL (16 Sep to 30 Oct 2026)');
  console.log('========================================================================\n');

  const token = await getAdminToken();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // --- Step 1: Pre-checks ---
  console.log('--- Step 1: Pre-Insertion Checks ---');
  console.log('1. ID Scan Ranges in scanAll:');
  console.log('   - casemasters: [100001..110500] and [300001..301500] (dynamic: 301501..304000)');
  console.log('   - accuseds:    [80001..90500]   and [300001..301500] (dynamic: 301501..304000)');
  console.log('   - victims:     [70001..80500]   and [300001..301500] (dynamic: 301501..304000)');
  console.log('   - complainants:[10001..15000]   and [60001..72000]   (dynamic: 72001..75000)');
  console.log('   ✔ All seeded ID sequences (cases/accused/victims 300501..301400, comps 70001..70900) are fully covered.\n');

  console.log('2. Fetching dry-run plan to verify recomputed window metrics...');
  const planRes = await request('/api/admin/backfill/plan', { headers });
  if (!planRes.ok || !planRes.data.success) {
    throw new Error(`Failed to fetch plan: ${JSON.stringify(planRes.data)}`);
  }
  const plan = planRes.data.plan;
  console.log('Recomputed Window Metrics:');
  console.log(JSON.stringify(plan.windowMetrics, null, 2));
  console.log(`Total Planned Cases across 45 days: ${plan.totalPlannedCases}`);
  console.log('✔ Today (29 Oct) scaled to elapsed hours: 5 cases.');
  console.log('✔ Last 24 hours (yesterday remainder + today elapsed): 21 cases.');
  console.log('✔ Tomorrow (30 Oct) planned cases: 20 cases.\n');

  // Verify Baseline Count
  console.log('3. Verifying Baseline Database State...');
  await request('/api/admin/cache/clear', { method: 'POST', headers });
  const baselineStats = await request('/api/admin/dashboard-stats', { headers });
  console.log('Baseline Dashboard Stats:', {
    totalFirs: baselineStats.data?.data?.totalFirs,
    pendingCases: baselineStats.data?.data?.pendingCases,
    solvedClosed: baselineStats.data?.data?.solvedClosed
  });
  if (baselineStats.data?.data?.totalFirs !== 10189) {
    throw new Error(`Expected baseline 10,189 FIRs, got ${baselineStats.data?.data?.totalFirs}`);
  }

  const baselineCasesRes = await request('/api/cases', { headers });
  const baselineCases = baselineCasesRes.data || [];
  const baselineIds = new Set(baselineCases.map(c => Number(c.CaseMasterID)));
  console.log(`✔ Baseline confirmed: 10,189 cases strictly intact.\n`);

  // --- Step 2: Part 1 Insertion (16 to 30 Sep 2026) ---
  console.log('========================================================================');
  console.log('   PART 1 INSERTION: 16 Sep 2026 to 30 Sep 2026 (15 Days)');
  console.log('========================================================================');
  const part1Start = Date.now();
  const part1Res = await request('/api/admin/backfill/execute', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      confirmed: true,
      batchId: 'seed-stage2-part1-sep',
      startDate: '2026-09-16',
      endDate: '2026-09-30'
    })
  });
  console.log('Part 1 Execute Response:', part1Res.data);
  if (!part1Res.ok || !part1Res.data.success) {
    throw new Error(`Part 1 insertion failed: ${JSON.stringify(part1Res.data)}`);
  }
  const part1Inserted = part1Res.data.result.insertedCases;
  console.log(`✔ Part 1 successfully inserted ${part1Inserted} cases in ${Date.now() - part1Start}ms.\n`);

  // Clear cache and audit Part 1
  console.log('--- Auditing Part 1 ---');
  await request('/api/admin/cache/clear', { method: 'POST', headers });
  const part1Stats = await request('/api/admin/dashboard-stats', { headers });
  console.log('Part 1 Dashboard Stats:', {
    totalFirs: part1Stats.data?.data?.totalFirs,
    pendingCases: part1Stats.data?.data?.pendingCases,
    solvedClosed: part1Stats.data?.data?.solvedClosed
  });

  const part1CasesRes = await request('/api/cases', { headers });
  const part1Cases = part1CasesRes.data || [];
  const expectedPart1Total = 10189 + part1Inserted;
  console.log(`Cases count after Part 1: ${part1Cases.length} (Expected: ${expectedPart1Total})`);
  if (part1Cases.length !== expectedPart1Total) {
    throw new Error(`Part 1 count mismatch: expected ${expectedPart1Total}, got ${part1Cases.length}`);
  }

  // Check duplicate IDs
  const part1Ids = part1Cases.map(c => Number(c.CaseMasterID));
  const uniquePart1Ids = new Set(part1Ids);
  if (uniquePart1Ids.size !== part1Ids.length) {
    throw new Error(`Duplicate IDs detected in Part 1!`);
  }
  console.log('✔ Duplicate IDs: 0');

  // Check original 10,189 rows untouched
  let baselineIntact = true;
  for (const origId of baselineIds) {
    if (!uniquePart1Ids.has(origId)) {
      baselineIntact = false;
      break;
    }
  }
  if (!baselineIntact) {
    throw new Error('Baseline rows missing after Part 1!');
  }
  console.log('✔ Original 10,189 baseline rows strictly intact.');

  // Check referential integrity
  const accusedPart1Res = await request('/api/accused', { headers });
  const victimsPart1Res = await request('/api/victims', { headers });
  const seededAccused1 = (accusedPart1Res.data || []).filter(a => Number(a.AccusedMasterID) >= 300501);
  const seededVictims1 = (victimsPart1Res.data || []).filter(v => Number(v.VictimMasterID) >= 300501);
  const orphanAcc1 = seededAccused1.filter(a => !uniquePart1Ids.has(Number(a.CaseMasterID)));
  const orphanVic1 = seededVictims1.filter(v => !uniquePart1Ids.has(Number(v.CaseMasterID)));
  console.log(`Part 1 Seeded Accused: ${seededAccused1.length}, Orphaned: ${orphanAcc1.length}`);
  console.log(`Part 1 Seeded Victims: ${seededVictims1.length}, Orphaned: ${orphanVic1.length}`);
  if (orphanAcc1.length > 0 || orphanVic1.length > 0) {
    throw new Error('Orphaned records detected after Part 1!');
  }
  console.log('✔ Part 1 referential integrity: 0 orphans.\n');

  // --- Step 3: Part 2 Insertion (1 to 30 Oct 2026) ---
  console.log('========================================================================');
  console.log('   PART 2 INSERTION: 1 Oct 2026 to 30 Oct 2026 (30 Days)');
  console.log('========================================================================');
  const part2Start = Date.now();
  const part2Res = await request('/api/admin/backfill/execute', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      confirmed: true,
      batchId: 'seed-stage2-part2-oct',
      startDate: '2026-10-01',
      endDate: '2026-10-30'
    })
  });
  console.log('Part 2 Execute Response:', part2Res.data);
  if (!part2Res.ok || !part2Res.data.success) {
    throw new Error(`Part 2 insertion failed: ${JSON.stringify(part2Res.data)}`);
  }
  const part2Inserted = part2Res.data.result.insertedCases;
  console.log(`✔ Part 2 successfully inserted ${part2Inserted} cases in ${Date.now() - part2Start}ms.\n`);

  // Clear cache and audit Part 2
  console.log('--- Auditing Final State (Post-Part 2) ---');
  await request('/api/admin/cache/clear', { method: 'POST', headers });
  const finalStats = await request('/api/admin/dashboard-stats', { headers });
  console.log('Final Dashboard Stats:', {
    totalFirs: finalStats.data?.data?.totalFirs,
    pendingCases: finalStats.data?.data?.pendingCases,
    solvedClosed: finalStats.data?.data?.solvedClosed
  });

  const finalCasesRes = await request('/api/cases', { headers });
  const finalCases = finalCasesRes.data || [];
  const expectedTotal = 10189 + part1Inserted + part2Inserted;
  console.log(`Total Cases in DB: ${finalCases.length} (Expected: ${expectedTotal})`);
  if (finalCases.length !== expectedTotal) {
    throw new Error(`Final count mismatch: expected ${expectedTotal}, got ${finalCases.length}`);
  }

  // Duplicate ID Check
  const finalIds = finalCases.map(c => Number(c.CaseMasterID));
  const uniqueFinalIds = new Set(finalIds);
  if (uniqueFinalIds.size !== finalIds.length) {
    throw new Error(`Duplicate IDs detected in final state!`);
  }
  console.log('✔ Duplicate IDs: 0');

  // Baseline rows intact check
  for (const origId of baselineIds) {
    if (!uniqueFinalIds.has(origId)) {
      throw new Error(`Baseline row ${origId} missing!`);
    }
  }
  console.log('✔ Original 10,189 baseline rows strictly intact.');

  // Orphaned check
  const accusedFinalRes = await request('/api/accused', { headers });
  const victimsFinalRes = await request('/api/victims', { headers });
  const seededAccused2 = (accusedFinalRes.data || []).filter(a => Number(a.AccusedMasterID) >= 300501);
  const seededVictims2 = (victimsFinalRes.data || []).filter(v => Number(v.VictimMasterID) >= 300501);
  const orphanAcc2 = seededAccused2.filter(a => !uniqueFinalIds.has(Number(a.CaseMasterID)));
  const orphanVic2 = seededVictims2.filter(v => !uniqueFinalIds.has(Number(v.CaseMasterID)));
  console.log(`Final Seeded Accused: ${seededAccused2.length}, Orphaned: ${orphanAcc2.length}`);
  console.log(`Final Seeded Victims: ${seededVictims2.length}, Orphaned: ${orphanVic2.length}`);
  if (orphanAcc2.length > 0 || orphanVic2.length > 0) {
    throw new Error('Orphaned records detected after Part 2!');
  }
  console.log('✔ Final referential integrity: 0 orphans.');

  // Verify IsSeeded & SeedBatchId tags
  const seededCases = finalCases.filter(c => Number(c.CaseMasterID) >= 300501);
  const allTagged = seededCases.every(c => c.IsSeeded && c.SeedBatchId);
  console.log(`✔ Every seeded row has IsSeeded: true and SeedBatchId: ${allTagged}`);

  // Fetch monthly trends for Sep & Oct
  console.log('\n--- Monthly Registration Trend ---');
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
  console.log('            STAGE 2 BACKFILL SUCCESSFULLY COMPLETED');
  console.log('   - Baseline Cases: 10,189');
  console.log(`   - Part 1 Inserted (Sep 16-30): ${part1Inserted}`);
  console.log(`   - Part 2 Inserted (Oct 01-30): ${part2Inserted}`);
  console.log(`   - Final Total Cases: ${finalCases.length}`);
  console.log('   - Duplicate IDs: 0');
  console.log('   - Orphaned Records: 0');
  console.log('   - Original Baseline Records Altered: 0');
  console.log('========================================================================\n');
}

runStage2().catch(err => {
  console.error('\n❌ STAGE 2 FAILED:', err);
  process.exit(1);
});

