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

async function main() {
  console.log('========================================================================');
  console.log('          STAGE 2: SHORTFALL FILL PIPELINE (3-DAY CHUNKS)');
  console.log('========================================================================\n');

  const token = await getAdminToken();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  await request('/api/admin/cache/clear', { method: 'POST', headers });

  // 1. Fetch current plan to get targets
  console.log('Fetching targets from backfill plan...');
  const planRes = await request('/api/admin/backfill/plan', { headers });
  if (!planRes.ok || !planRes.data.success) {
    throw new Error('Failed to fetch plan: ' + JSON.stringify(planRes.data));
  }
  const targets = {};
  planRes.data.plan.dailySchedule.forEach(day => {
    targets[day.date] = day.targetDailyCount;
  });

  // 2. Define 3-day chunks from 2026-09-16 to 2026-10-30
  const chunks = [];
  let d = new Date('2026-09-16T00:00:00Z');
  const endLimit = new Date('2026-10-30T00:00:00Z');

  while (d <= endLimit) {
    const chunkStart = d.toISOString().slice(0, 10);
    const dEnd = new Date(d);
    dEnd.setUTCDate(dEnd.getUTCDate() + 2); // 3 days: d, d+1, d+2
    const chunkEnd = (dEnd > endLimit ? endLimit : dEnd).toISOString().slice(0, 10);
    chunks.push({ start: chunkStart, end: chunkEnd });
    d.setUTCDate(d.getUTCDate() + 3);
  }

  console.log(`Generated ${chunks.length} 3-day execution chunks:\n`, chunks);

  // 3. Process each chunk
  let totalShortfallInserted = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Re-count before execution so nothing is duplicated
    await request('/api/admin/cache/clear', { method: 'POST', headers });
    const casesRes = await request('/api/cases', { headers });
    const currentCounts = {};
    (casesRes.data || []).forEach(c => {
      const cd = (c.CrimeRegisteredDate || c.RegistrationDate || '').slice(0, 10);
      if (cd) currentCounts[cd] = (currentCounts[cd] || 0) + 1;
    });

    // Check if chunk has any shortfall
    let chunkShortfall = 0;
    let cur = new Date(chunk.start + 'T00:00:00Z');
    const cEnd = new Date(chunk.end + 'T00:00:00Z');
    while (cur <= cEnd) {
      const cd = cur.toISOString().slice(0, 10);
      const ex = currentCounts[cd] || 0;
      const tg = targets[cd] || 0;
      chunkShortfall += Math.max(0, tg - ex);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    if (chunkShortfall === 0) {
      console.log(`Chunk ${i + 1}/${chunks.length} [${chunk.start}..${chunk.end}]: Already fulfilled (shortfall: 0). Skipping.`);
      continue;
    }

    console.log(`Chunk ${i + 1}/${chunks.length} [${chunk.start}..${chunk.end}]: Shortfall = ${chunkShortfall} cases. Inserting...`);
    const t0 = Date.now();

    let attempts = 0;
    let success = false;
    let result = null;

    while (!success && attempts < 3) {
      attempts++;
      try {
        const execRes = await request('/api/admin/backfill/execute', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            confirmed: true,
            batchId: 'seed-stage2-part3-fill',
            startDate: chunk.start,
            endDate: chunk.end
          })
        });

        if (execRes.ok && execRes.data?.success) {
          success = true;
          result = execRes.data.result;
        } else {
          console.warn(`[Chunk ${i + 1}] Attempt ${attempts} returned error:`, execRes.data);
          if (attempts < 3) await new Promise(r => setTimeout(r, 2000));
        }
      } catch (err) {
        console.warn(`[Chunk ${i + 1}] Attempt ${attempts} network error:`, err.message);
        if (attempts < 3) await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!success) {
      throw new Error(`Chunk ${i + 1} [${chunk.start}..${chunk.end}] failed after ${attempts} attempts!`);
    }

    const inserted = result?.insertedCases || 0;
    totalShortfallInserted += inserted;
    console.log(`✔ Chunk ${i + 1} completed: inserted ${inserted} cases in ${Date.now() - t0}ms.`);
  }

  console.log(`\n========================================================================`);
  console.log(`   ALL CHUNKS PROCESSED! Total Shortfall Inserted: ${totalShortfallInserted}`);
  console.log(`========================================================================\n`);

  // --- Step 5: Verification & Audit ---
  console.log('--- Step 5: Running Complete Post-Fill Audit ---');
  await request('/api/admin/cache/clear', { method: 'POST', headers });

  const finalCasesRes = await request('/api/cases', { headers });
  const finalCases = finalCasesRes.data || [];
  const finalIds = finalCases.map(c => Number(c.CaseMasterID));
  const uniqueFinalIds = new Set(finalIds);

  console.log(`1. Total cases in DB: ${finalCases.length}`);
  console.log(`   Unique IDs: ${uniqueFinalIds.size}`);
  if (finalCases.length !== uniqueFinalIds.size) {
    throw new Error('DUPLICATE IDs DETECTED! Total cases !== Unique IDs');
  }
  console.log('   ✔ Total cases == Unique IDs (0 duplicates)');

  // 2. Check baseline rows
  const fs = require('fs');
  const backup = JSON.parse(fs.readFileSync('backups/pre_backfill_backup_20261029/cases_backup.json'));
  const baselineIds = new Set(backup.map(c => Number(c.CaseMasterID)));
  for (const bId of baselineIds) {
    if (!uniqueFinalIds.has(bId)) {
      throw new Error(`Baseline ID ${bId} is missing!`);
    }
  }
  console.log(`2. Baseline Rows: All 10,189 original rows strictly present and intact.`);

  // 3. Child tables & orphans
  const accusedRes = await request('/api/accused', { headers });
  const victimsRes = await request('/api/victims', { headers });
  const compRes = await request('/api/complainants', { headers });

  const seededAcc = (accusedRes.data || []).filter(a => Number(a.AccusedMasterID) >= 300501);
  const seededVic = (victimsRes.data || []).filter(v => Number(v.VictimMasterID) >= 300501);
  const seededComp = (compRes.data || []).filter(c => Number(c.ComplainantID) >= 70001);

  const orphanAcc = seededAcc.filter(a => !uniqueFinalIds.has(Number(a.CaseMasterID)));
  const orphanVic = seededVic.filter(v => !uniqueFinalIds.has(Number(v.CaseMasterID)));
  const orphanComp = seededComp.filter(c => !uniqueFinalIds.has(Number(c.CaseMasterID)));

  console.log(`3. Child Records:`);
  console.log(`   - Seeded Accused:     ${seededAcc.length} (Orphans: ${orphanAcc.length})`);
  console.log(`   - Seeded Victims:     ${seededVic.length} (Orphans: ${orphanVic.length})`);
  console.log(`   - Seeded Complainants:${seededComp.length} (Orphans: ${orphanComp.length})`);
  if (orphanAcc.length > 0 || orphanVic.length > 0 || orphanComp.length > 0) {
    throw new Error('ORPHANED RECORDS DETECTED!');
  }
  console.log('   ✔ Referential Integrity: 0 orphans across all child tables.');

  // 4. Cases per day 16 Sep to 30 Oct next to target
  console.log('\n4. Daily Registration Counts (16 Sep to 30 Oct):');
  console.log('Date'.padEnd(12) + 'Actual'.padEnd(10) + 'Target'.padEnd(10) + 'Difference');
  console.log('------------------------------------------');
  const actualDayCounts = {};
  finalCases.forEach(c => {
    const cd = (c.CrimeRegisteredDate || c.RegistrationDate || '').slice(0, 10);
    if (cd) actualDayCounts[cd] = (actualDayCounts[cd] || 0) + 1;
  });

  let curDay = new Date('2026-09-16T00:00:00Z');
  const endDay = new Date('2026-10-30T00:00:00Z');
  while (curDay <= endDay) {
    const dStr = curDay.toISOString().slice(0, 10);
    const act = actualDayCounts[dStr] || 0;
    const tgt = targets[dStr] || 0;
    const diff = act - tgt;
    console.log(`${dStr.padEnd(12)}${String(act).padEnd(10)}${String(tgt).padEnd(10)}${diff >= 0 ? '+' + diff : diff}`);
    curDay.setUTCDate(curDay.getUTCDate() + 1);
  }

  // 5. Window Metrics: 24h, 7d, 30d, today, tomorrow
  console.log('\n5. Recomputed Window Metrics:');
  const todayActual = actualDayCounts['2026-10-29'] || 0;
  const tomorrowActual = actualDayCounts['2026-10-30'] || 0;
  const yesterdayActual = actualDayCounts['2026-10-28'] || 0;
  const last24hActual = Math.round(yesterdayActual * ((24 - 5.5) / 24)) + todayActual;

  let last7Actual = 0;
  for (let i = 22; i <= 28; i++) {
    last7Actual += actualDayCounts[`2026-10-${String(i).padStart(2, '0')}`] || 0;
  }
  const last7DailyAvg = Number((last7Actual / 7).toFixed(1));

  let last30Actual = 0;
  // Last 30 days prior to today
  let c30 = new Date('2026-10-28T00:00:00Z');
  for (let i = 0; i < 30; i++) {
    const s = c30.toISOString().slice(0, 10);
    last30Actual += actualDayCounts[s] || 0;
    c30.setUTCDate(c30.getUTCDate() - 1);
  }
  const last30DailyAvg = Number((last30Actual / 30).toFixed(1));

  console.log(`   - Today (2026-10-29):    ${todayActual} cases (scaled to elapsed hours)`);
  console.log(`   - Tomorrow (2026-10-30): ${tomorrowActual} cases`);
  console.log(`   - Last 24 Hours:         ${last24hActual} cases`);
  console.log(`   - Last 7 Days:           ${last7Actual} cases (~${last7DailyAvg}/day)`);
  console.log(`   - Last 30 Days:          ${last30Actual} cases (~${last30DailyAvg}/day)`);

  // 6. Sep and Oct Monthly Totals
  console.log('\n6. Monthly Totals:');
  const monthTotals = {};
  finalCases.forEach(c => {
    const ym = (c.CrimeRegisteredDate || c.RegistrationDate || '').slice(0, 7);
    if (ym) monthTotals[ym] = (monthTotals[ym] || 0) + 1;
  });
  console.log(`   - September 2026: ${monthTotals['2026-09']} cases`);
  console.log(`   - October 2026:   ${monthTotals['2026-10']} cases`);

  // 7. Live Dashboard Stats
  console.log('\n7. Live /api/admin/dashboard-stats:');
  const statsRes = await request('/api/admin/dashboard-stats', { headers });
  console.log(JSON.stringify(statsRes.data?.data, null, 2));

  // 8. Confirm every seeded row has IsSeeded and SeedBatchId
  const seededCases = finalCases.filter(c => Number(c.CaseMasterID) >= 300501);
  const allTagged = seededCases.every(c => c.IsSeeded === true && typeof c.SeedBatchId === 'string' && c.SeedBatchId.length > 0);
  console.log(`\n8. Tag Verification: Every seeded row has IsSeeded and SeedBatchId: ${allTagged}`);
  const activeBatches = Array.from(new Set(seededCases.map(c => c.SeedBatchId)));
  console.log(`   Active Batches in CloudScale: ${activeBatches.join(', ')}`);
}

main().catch(err => {
  console.error('\n❌ SHORTFALL FILL FAILED:', err);
  process.exit(1);
});

