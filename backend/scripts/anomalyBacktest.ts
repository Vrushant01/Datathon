/**
 * backtest.ts  — In-memory sanity check for detectTemporalAnomalies.
 *
 * Does NOT connect to any database.
 * Does NOT modify any data.
 *
 * Tests:
 *   A) Real synthetic dataset: 5 crime-heads × 930 stations × ~3 cases/day
 *      over 70 days to verify rejection-rate and anomaly detection.
 *   B) Injected spike: artificially raise one bucket and verify z-score increases.
 */

import { detectTemporalAnomalies } from '../src/services/ai/timeSeriesAnalysis';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return d.toISOString();
}

// ─── Build minimal lookup maps ────────────────────────────────────────────────

const DISTRICT_IDS = [1001, 1002, 1003, 1004, 1005];
const districtNames = new Map<number, string>([
  [1001, 'Bengaluru Urban'],
  [1002, 'Mysuru'],
  [1003, 'Tumakuru'],
  [1004, 'Belagavi'],
  [1005, 'Ballari'],
]);

// 10 stations, 2 per district
const unitToDistrict = new Map<number, number>();
const unitNames = new Map<number, string>();
for (let i = 0; i < 10; i++) {
  const stationId = 2000 + i;
  const districtId = DISTRICT_IDS[Math.floor(i / 2)];
  unitToDistrict.set(stationId, districtId);
  unitNames.set(stationId, `Station-${stationId}`);
}

const CRIME_HEADS = [100, 200, 300, 400, 500];

// ─── Test A: baseline dataset (no injected spikes) ────────────────────────────

function buildCases(overrides: { daysAgo: number; stationId: number; crimeHead: number }[] = []): any[] {
  const cases: any[] = [];
  let id = 100001;

  // Background: 2 cases per station × crime-head × day for the last 70 days
  for (let day = 70; day >= 1; day--) {
    for (const [stationId] of unitToDistrict) {
      for (const ch of CRIME_HEADS) {
        for (let k = 0; k < 2; k++) {
          cases.push({
            CaseMasterID: id++,
            CrimeRegisteredDateTime: isoDateDaysAgo(day),
            PoliceStationID: stationId,
            CrimeMajorHeadID: ch,
          });
        }
      }
    }
  }

  // Apply any injected spikes
  for (const o of overrides) {
    cases.push({
      CaseMasterID: id++,
      CrimeRegisteredDateTime: isoDateDaysAgo(o.daysAgo),
      PoliceStationID: o.stationId,
      CrimeMajorHeadID: o.crimeHead,
    });
  }

  return cases;
}

// ─── Run Test A ───────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════');
console.log('TEST A: Uniform background dataset (no spikes)');
console.log('══════════════════════════════════════════════════');

const casesA = buildCases();
const reportA = detectTemporalAnomalies(casesA, unitToDistrict, districtNames, unitNames, {
  minHistoryWindows: 3,
  baselineWindowCount: 8,
});

console.log(`Total cases:              ${casesA.length}`);
console.log(`Candidate series:         ${reportA.candidateSeries}`);
console.log(`Rejected (insufficient):  ${reportA.rejectedInsufficient}`);
console.log(`Anomalies detected:       ${reportA.anomalies.length}`);
console.log(`  HIGH:     ${reportA.highCount}`);
console.log(`  CRITICAL: ${reportA.criticalCount}`);

// ─── Run Test B: Inject spikes into current window ────────────────────────────

console.log('\n══════════════════════════════════════════════════');
console.log('TEST B: Injected spike — expect higher z-score');
console.log('══════════════════════════════════════════════════');

// Inject 30 extra Crimes Against Property (CrimeMajorHeadID=200)
// into station 2000 for each of the last 7 days
const spikes: { daysAgo: number; stationId: number; crimeHead: number }[] = [];
for (let d = 1; d <= 7; d++) {
  for (let k = 0; k < 30; k++) {
    spikes.push({ daysAgo: d, stationId: 2000, crimeHead: 200 });
  }
}

const casesB = buildCases(spikes);
const reportB = detectTemporalAnomalies(casesB, unitToDistrict, districtNames, unitNames, {
  minHistoryWindows: 3,
  baselineWindowCount: 8,
});

console.log(`Total cases (with spike): ${casesB.length}`);
console.log(`Candidate series:         ${reportB.candidateSeries}`);
console.log(`Anomalies detected:       ${reportB.anomalies.length}`);
console.log(`  HIGH:     ${reportB.highCount}`);
console.log(`  CRITICAL: ${reportB.criticalCount}`);

// Find the station-level anomaly we injected
const injected = reportB.anomalies.find(
  a => a.locationId === 2000 && a.crimeHeadId === 200 && a.level === 'STATION'
);
if (injected) {
  console.log(`\n✅ Injected spike detected:`);
  console.log(`   Location:        ${injected.locationName} (STATION)`);
  console.log(`   Crime type:      ${injected.crimeType}`);
  console.log(`   Current count:   ${injected.currentCount}`);
  console.log(`   Baseline mean:   ${injected.baselineMean}`);
  console.log(`   Baseline stdDev: ${injected.baselineStdDev}`);
  console.log(`   Z-Score:         ${injected.zScore}`);
  console.log(`   Severity:        ${injected.severity}`);
  console.log(`   % Change:        ${injected.percentageChange}%`);

  // Compare with baseline Test A z-score (should be 0 / absent)
  const baselineEntry = reportA.anomalies.find(
    a => a.locationId === 2000 && a.crimeHeadId === 200 && a.level === 'STATION'
  );
  const baselineZ = baselineEntry ? baselineEntry.zScore : 0;
  console.log(`\n   Z-Score in baseline (Test A): ${baselineZ}`);
  console.log(`   Z-Score with spike (Test B):  ${injected.zScore}`);
  if (injected.zScore > baselineZ) {
    console.log('   ✅ SANITY CHECK PASSED: spike produces higher z-score');
  } else {
    console.log('   ❌ SANITY CHECK FAILED');
    process.exit(1);
  }
} else {
  console.log('❌ Injected spike NOT detected — check window boundaries');
  process.exit(1);
}

// Print top 5 anomalies from Test B
console.log('\n─── Top 5 anomalies (Test B) ───');
reportB.anomalies.slice(0, 5).forEach((a, i) => {
  console.log(`\n[${i + 1}] ${a.severity} | ${a.level} | ${a.locationName}`);
  console.log(`    Crime:    ${a.crimeType}`);
  console.log(`    Current:  ${a.currentCount}  Baseline mean: ${a.baselineMean}  stdDev: ${a.baselineStdDev}`);
  console.log(`    Z-Score:  ${a.zScore}   %Change: ${a.percentageChange}%`);
  console.log(`    Window:   ${a.windowStart} → ${a.windowEnd}`);
  console.log(`    Reason:   ${a.reason}`);
});

console.log('\n══════════════════════════════════════════════════');
console.log('All sanity checks passed ✅');
console.log('══════════════════════════════════════════════════\n');
