const fs = require('fs');

function loadData(file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return parsed.data || parsed;
}

const existingCases = loadData('./cases_dump.json');
const existingAccused = loadData('./accused_dump.json');
const existingVictims = loadData('./victims_dump.json');
const existingEmployees = loadData('./employees_dump.json');
const existingUnits = loadData('./units_dump.json');

// 1. Baseline daily rate from pre-gap 3 months (Jun, Jul, Aug 2026)
const preGapCases = existingCases.filter(c => {
  const d = c.CrimeRegisteredDate;
  return d >= '2026-06-01' && d <= '2026-08-31';
});
const BASELINE_RATE = Number((preGapCases.length / 92).toFixed(2)); // 20.67
const HARD_CAP = Math.round(BASELINE_RATE * 1.6); // 33

// Weekday weights from pre-gap data
const WEEKDAY_WEIGHTS = {
  0: 1.03, // Sunday
  1: 0.97, // Monday
  2: 1.05, // Tuesday
  3: 0.90, // Wednesday
  4: 1.02, // Thursday
  5: 0.97, // Friday
  6: 1.06  // Saturday
};

// Poisson generator with seedable pseudo-random
function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

let seedCounter = 12345;
function prng() {
  return seededRandom(seedCounter++);
}

function poisson(lambda) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= prng();
  } while (p > L);
  return k - 1;
}

// 2. Dates to backfill: 2026-09-16 to 2026-10-30
function getDaysBetween(start, end) {
  const dates = [];
  let cur = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

const gapDays = getDaysBetween('2026-09-16', '2026-10-30');

// Existing counts on these days
const existingDayCounts = {};
existingCases.forEach(c => {
  const dStr = (c.CrimeRegisteredDate || '').slice(0, 10);
  if (dStr) existingDayCounts[dStr] = (existingDayCounts[dStr] || 0) + 1;
});

// Prepare daily schedule
const dailySchedule = [];
let totalPlannedCases = 0;

gapDays.forEach(dateStr => {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dow = d.getUTCDay();
  const dowWeight = WEEKDAY_WEIGHTS[dow] || 1.0;
  const lambda = BASELINE_RATE * dowWeight;

  let count = poisson(lambda);
  if (count > HARD_CAP) count = HARD_CAP;
  if (count < 14) count = 14 + (count % 4); // Keep within reasonable Poisson bounds

  // Adjust for today (2026-10-29): e.g. hours up to current time (target ~20)
  if (dateStr === '2026-10-29') {
    count = Math.round(BASELINE_RATE * dowWeight); // 21
  }
  // Tomorrow (2026-10-30): full day
  if (dateStr === '2026-10-30') {
    count = Math.round(BASELINE_RATE * dowWeight); // 20
  }

  // Account for any existing cases on that date (e.g. 1 on 2026-10-28)
  const existingOnDate = existingDayCounts[dateStr] || 0;
  const toGenerate = Math.max(0, count - existingOnDate);

  dailySchedule.push({
    date: dateStr,
    dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow],
    weekdayWeight: dowWeight,
    targetDailyCount: count,
    existingCount: existingOnDate,
    plannedCases: toGenerate
  });
  totalPlannedCases += toGenerate;
});

// Window Metrics validation
const last24hCount = dailySchedule.find(d => d.date === '2026-10-29')?.plannedCases || 0;
const todayCount = last24hCount;
const tomorrowCount = dailySchedule.find(d => d.date === '2026-10-30')?.plannedCases || 0;

const last7DaysList = dailySchedule.slice(-8, -1); // Oct 22 to Oct 28
const last7Cases = last7DaysList.reduce((acc, d) => acc + d.targetDailyCount, 0);
const last7DailyAvg = Number((last7Cases / 7).toFixed(2));

const last30DaysList = dailySchedule.slice(-31, -1); // Sep 29 to Oct 28
const last30Cases = last30DaysList.reduce((acc, d) => acc + d.targetDailyCount, 0);
const last30DailyAvg = Number((last30Cases / 30).toFixed(2));

console.log('================================================================');
console.log('                 DRY-RUN BACKFILL PLAN SUMMARY                  ');
console.log('================================================================');
console.log(`Baseline Daily Rate (Jun-Aug 2026): ${BASELINE_RATE} cases/day`);
console.log(`Hard Daily Cap: ${HARD_CAP} cases`);
console.log(`Gap Range: 2026-09-16 to 2026-10-30 (${gapDays.length} days)`);
console.log(`Total Cases Planned to Insert: ${totalPlannedCases}`);

console.log('\n================================================================');
console.log('                     WINDOW METRICS TABLE                       ');
console.log('================================================================');
console.log('Window           Count   Daily Avg   Baseline   Diff from Baseline');
console.log('----------------------------------------------------------------');
const diff = (avg) => `${(((avg - BASELINE_RATE) / BASELINE_RATE) * 100).toFixed(1)}%`;
console.log(`Today (Oct 29)   ${String(todayCount).padEnd(7)} ${String(todayCount).padEnd(11)} ${String(BASELINE_RATE).padEnd(10)} ${diff(todayCount)}`);
console.log(`Tomorrow(Oct 30) ${String(tomorrowCount).padEnd(7)} ${String(tomorrowCount).padEnd(11)} ${String(BASELINE_RATE).padEnd(10)} ${diff(tomorrowCount)}`);
console.log(`Last 24 Hours    ${String(last24hCount).padEnd(7)} ${String(last24hCount).padEnd(11)} ${String(BASELINE_RATE).padEnd(10)} ${diff(last24hCount)}`);
console.log(`Last 7 Days      ${String(last7Cases).padEnd(7)} ${String(last7DailyAvg).padEnd(11)} ${String(BASELINE_RATE).padEnd(10)} ${diff(last7DailyAvg)}`);
console.log(`Last 30 Days     ${String(last30Cases).padEnd(7)} ${String(last30DailyAvg).padEnd(11)} ${String(BASELINE_RATE).padEnd(10)} ${diff(last30DailyAvg)}`);

// Generate actual rows with IDs, PersonID reuse, and Status distribution
let nextCaseId = 300501;
let nextAccusedId = 300501;
let nextVictimId = 300501;
let nextComplainantId = 70001;

// Existing PersonIDs for reuse (~36%)
const existingPersonIds = existingAccused.map(a => a.PersonID).filter(Boolean);
const uniqueExistingPersons = Array.from(new Set(existingPersonIds));

// Repeat offenders pool for Criminal Network & Repeated Offenders page
const repeatPersonMap = {};
existingPersonIds.forEach(p => { repeatPersonMap[p] = (repeatPersonMap[p] || 0) + 1; });
const topRepeatPersons = Object.keys(repeatPersonMap).filter(p => repeatPersonMap[p] >= 2);

const generatedCases = [];
const generatedAccused = [];
const generatedVictims = [];
const generatedComplainants = [];

const HEAD_DIST = { 100: 0.223, 200: 0.231, 300: 0.120, 400: 0.136, 500: 0.162, 600: 0.128 };
const HEAD_KEYS = [100, 200, 300, 400, 500, 600];

// Group employees by unit
const employeesByUnit = {};
existingEmployees.forEach(e => {
  const uid = Number(e.UnitID);
  if (!employeesByUnit[uid]) employeesByUnit[uid] = [];
  employeesByUnit[uid].push(Number(e.EmployeeID));
});
const allEmpIds = existingEmployees.map(e => Number(e.EmployeeID));

dailySchedule.forEach(day => {
  const isRecent7 = day.date >= '2026-10-23';
  const isMid = day.date >= '2026-10-01' && day.date < '2026-10-23';

  for (let i = 0; i < day.plannedCases; i++) {
    const caseId = nextCaseId++;
    
    // CrimeMajorHeadID
    const rHead = prng();
    let cum = 0;
    let chosenHead = 100;
    for (const h of HEAD_KEYS) {
      cum += HEAD_DIST[h];
      if (rHead <= cum) {
        chosenHead = h;
        break;
      }
    }

    // Status: Newer lean pending, older lean closed
    let statusId = 1;
    const rStatus = prng();
    if (isRecent7) {
      statusId = rStatus < 0.75 ? 1 : (rStatus < 0.85 ? 5 : 2); // 85% pending
    } else if (isMid) {
      statusId = rStatus < 0.42 ? 1 : (rStatus < 0.50 ? 5 : (rStatus < 0.80 ? 2 : 3)); // 50% pending
    } else {
      statusId = rStatus < 0.30 ? 1 : (rStatus < 0.35 ? 5 : (rStatus < 0.70 ? 2 : (rStatus < 0.90 ? 3 : 4))); // 35% pending
    }

    // Hour distribution
    const hour = Math.floor(prng() * 24);
    const min = Math.floor(prng() * 60);
    const sec = Math.floor(prng() * 60);
    const timeStr = `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    const registeredDateTime = `${day.date}T${timeStr}`;

    // Station & Officer
    const unit = existingUnits[Math.floor(prng() * existingUnits.length)];
    const unitId = Number(unit.UnitID);
    const districtId = Number(unit.DistrictID);
    const unitOfficers = employeesByUnit[unitId];
    const officerId = (unitOfficers && unitOfficers.length) ? unitOfficers[Math.floor(prng() * unitOfficers.length)] : allEmpIds[Math.floor(prng() * allEmpIds.length)];

    const lat = Number(((unit.latitude || 12.97) + (prng() - 0.5) * 0.05).toFixed(6));
    const lng = Number(((unit.longitude || 77.59) + (prng() - 0.5) * 0.05).toFixed(6));

    const caseRow = {
      CaseMasterID: caseId,
      CaseNo: `FIR-${day.date.replace(/-/g, '')}-${String(caseId).slice(-4)}`,
      CrimeNo: `${day.date.substring(0, 4)}/${String(1000 + (caseId % 9000))}`,
      CrimeRegisteredDate: registeredDateTime,
      CrimeRegisteredDateTime: registeredDateTime,
      PolicePersonID: officerId,
      PoliceStationID: unitId,
      CaseCategoryID: 1,
      GravityOffenceID: (chosenHead === 100 || chosenHead === 300) ? 1 : 2,
      CrimeMajorHeadID: chosenHead,
      CrimeMinorHeadID: chosenHead + 1,
      CaseStatusID: statusId,
      FIRTypeID: 1,
      Latitude: lat,
      Longitude: lng,
      IsSeeded: true,
      SeedBatchId: 'seed-2026-10-29'
    };
    generatedCases.push(caseRow);

    // Accused (1 per case, 36% reused PersonID)
    const accusedId = nextAccusedId++;
    let personId = '';
    const reuse = prng() < 0.36;
    if (reuse) {
      personId = topRepeatPersons[Math.floor(prng() * topRepeatPersons.length)] || uniqueExistingPersons[Math.floor(prng() * uniqueExistingPersons.length)];
    } else {
      personId = `P-2026-${String(accusedId).slice(-5)}`;
    }

    generatedAccused.push({
      AccusedMasterID: accusedId,
      CaseMasterID: caseId,
      PersonID: personId,
      Age: 22 + Math.floor(prng() * 35),
      Sex: prng() < 0.90 ? 'MALE' : 'FEMALE',
      IsSeeded: true,
      SeedBatchId: 'seed-2026-10-29'
    });

    // Victim (1 per case)
    const victimId = nextVictimId++;
    generatedVictims.push({
      VictimMasterID: victimId,
      CaseMasterID: caseId,
      Age: 18 + Math.floor(prng() * 45),
      Sex: chosenHead === 300 ? 'FEMALE' : (prng() < 0.55 ? 'MALE' : 'FEMALE'),
      IsSeeded: true,
      SeedBatchId: 'seed-2026-10-29'
    });

    // Complainant (1 per case)
    const complainantId = nextComplainantId++;
    generatedComplainants.push({
      ComplainantID: complainantId,
      CaseMasterID: caseId,
      ComplainantName: `Complainant ${complainantId}`,
      AgeYear: 25 + Math.floor(prng() * 40),
      GenderID: prng() < 0.65 ? 1 : 2,
      IsSeeded: true,
      SeedBatchId: 'seed-2026-10-29'
    });
  }
});

// Check overall database pending ratio after backfill
const allCasesAfter = [...existingCases, ...generatedCases];
const pendingCount = allCasesAfter.filter(c => c.CaseStatusID === 1 || c.CaseStatusID === 5).length;
const pendingShare = (pendingCount / allCasesAfter.length) * 100;

console.log('\n================================================================');
console.log('              OVERALL DATABASE METRICS POST-BACKFILL            ');
console.log('================================================================');
console.log(`Total Cases: Existing = ${existingCases.length}, Seeded = ${generatedCases.length}, Total = ${allCasesAfter.length}`);
console.log(`Total Pending Cases (Status 1 & 5): ${pendingCount}`);
console.log(`Overall Pending Share: ${pendingShare.toFixed(2)}% (Target: 47.0% - 51.0%)`);

// Person ID reuse stats in seeded accused
const seededPersonIds = generatedAccused.map(a => a.PersonID);
const reusedFromExisting = seededPersonIds.filter(p => uniqueExistingPersons.includes(p)).length;
console.log(`Accused PersonID Reuse in Seeded Data: ${reusedFromExisting} / ${generatedAccused.length} (${((reusedFromExisting / generatedAccused.length) * 100).toFixed(1)}%)`);

// CrimeMajorHeadID breakdown
const headSeeded = {};
generatedCases.forEach(c => { headSeeded[c.CrimeMajorHeadID] = (headSeeded[c.CrimeMajorHeadID] || 0) + 1; });
console.log('\nSeeded CrimeMajorHeadID Breakdown:');
Object.keys(headSeeded).forEach(h => {
  console.log(`  Head ${h}: ${headSeeded[h]} (${((headSeeded[h] / generatedCases.length) * 100).toFixed(1)}%)`);
});

// ID Ranges allocated
console.log('\nAllocated ID Ranges:');
console.log(`  CaseMasterID:  ${generatedCases[0].CaseMasterID} to ${generatedCases[generatedCases.length - 1].CaseMasterID}`);
console.log(`  AccusedMasterID: ${generatedAccused[0].AccusedMasterID} to ${generatedAccused[generatedAccused.length - 1].AccusedMasterID}`);
console.log(`  VictimMasterID:  ${generatedVictims[0].VictimMasterID} to ${generatedVictims[generatedVictims.length - 1].VictimMasterID}`);
console.log(`  ComplainantID:   ${generatedComplainants[0].ComplainantID} to ${generatedComplainants[generatedComplainants.length - 1].ComplainantID}`);

// Save planned IDs to seed_log.json
const seedLog = {
  batchId: 'seed-2026-10-29',
  createdAt: new Date().toISOString(),
  baselineDailyRate: BASELINE_RATE,
  totalCases: generatedCases.length,
  totalAccused: generatedAccused.length,
  totalVictims: generatedVictims.length,
  totalComplainants: generatedComplainants.length,
  overallPendingShare: Number(pendingShare.toFixed(2)),
  idRanges: {
    casemasters: { start: generatedCases[0].CaseMasterID, end: generatedCases[generatedCases.length - 1].CaseMasterID },
    accuseds: { start: generatedAccused[0].AccusedMasterID, end: generatedAccused[generatedAccused.length - 1].AccusedMasterID },
    victims: { start: generatedVictims[0].VictimMasterID, end: generatedVictims[generatedVictims.length - 1].VictimMasterID },
    complainants: { start: generatedComplainants[0].ComplainantID, end: generatedComplainants[generatedComplainants.length - 1].ComplainantID }
  },
  sampleCase: generatedCases[0],
  sampleAccused: generatedAccused[0],
  sampleVictim: generatedVictims[0],
  sampleComplainant: generatedComplainants[0]
};
fs.writeFileSync('seed_log.json', JSON.stringify(seedLog, null, 2));
console.log('\nSaved planned manifest to seed_log.json');

