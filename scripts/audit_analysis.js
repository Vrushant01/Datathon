const fs = require('fs');

function loadData(file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return parsed.data || parsed;
}

const cases = loadData('./cases_dump.json');
const accused = loadData('./accused_dump.json');
const victims = loadData('./victims_dump.json');
const employees = loadData('./employees_dump.json');
const units = loadData('./units_dump.json');

console.log('================================================================');
console.log('             RECONCILIATION & CASE AUDIT REPORT                 ');
console.log('================================================================');
console.log('Total Cases in CloudScale Repository Scan:', cases.length);
console.log('Total Accused in CloudScale Repository Scan:', accused.length);
console.log('Total Victims in CloudScale Repository Scan:', victims.length);
console.log('Total Employees in CloudScale Repository Scan:', employees.length);
console.log('Total Units in CloudScale Repository Scan:', units.length);

const caseIds = cases.map(c => Number(c.CaseMasterID)).filter(n => !isNaN(n)).sort((a,b) => a - b);
console.log('\nCaseMasterID Range: min =', caseIds[0], ', max =', caseIds[caseIds.length - 1]);

// Check ID ranges
const c100k = caseIds.filter(id => id >= 100000 && id < 200000);
const c300k = caseIds.filter(id => id >= 300000 && id < 400000);
const cOther = caseIds.filter(id => id < 100000 || (id >= 200000 && id < 300000) || id >= 400000);
console.log(`Cases in [100,001 - 110,500] range: count = ${c100k.length} (min: ${c100k[0]}, max: ${c100k[c100k.length - 1]})`);
console.log(`Cases in [300,001 - 300,500] range: count = ${c300k.length} (min: ${c300k[0]}, max: ${c300k[c300k.length - 1]})`);
if (cOther.length > 0) {
  console.log(`Cases in OTHER ranges: count = ${cOther.length}`, cOther.slice(0, 10));
}

// Dates
const validDates = cases.map(c => ({
  id: c.CaseMasterID,
  raw: c.CrimeRegisteredDate,
  d: new Date(c.CrimeRegisteredDate),
  status: c.CaseStatusID,
  head: c.CrimeMajorHeadID,
  unit: c.PoliceStationID
})).filter(x => !isNaN(x.d.getTime())).sort((a,b) => a.d.getTime() - b.d.getTime());

console.log('\nEarliest Case Date:', validDates[0].raw, '(Case ID:', validDates[0].id, ')');
console.log('Latest Case Date:  ', validDates[validDates.length - 1].raw, '(Case ID:', validDates[validDates.length - 1].id, ')');

// Month by month breakdown
console.log('\n================================================================');
console.log('   MONTHLY CASE COUNTS (HISTORICAL REGISTRATION TREND FUNCTION) ');
console.log('================================================================');
const monthlyStats = {};
validDates.forEach(x => {
  const m = x.d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  if (!monthlyStats[m]) monthlyStats[m] = { total: 0, cyber: 0, property: 0, body: 0, other: 0, minDate: x.raw, maxDate: x.raw };
  monthlyStats[m].total++;
  if (x.raw < monthlyStats[m].minDate) monthlyStats[m].minDate = x.raw;
  if (x.raw > monthlyStats[m].maxDate) monthlyStats[m].maxDate = x.raw;
  const head = Number(x.head);
  if (head === 500) monthlyStats[m].cyber++;
  else if (head === 200) monthlyStats[m].property++;
  else if (head === 100) monthlyStats[m].body++;
  else monthlyStats[m].other++;
});

// Sort months chronologically
const sortedMonths = Object.keys(monthlyStats).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
console.log('Month\t\tTotal\tCyber(500)\tProperty(200)\tBody(100)\tOther\tDate Range');
console.log('-----------------------------------------------------------------------------------------');
sortedMonths.slice(-20).forEach(m => {
  const s = monthlyStats[m];
  console.log(`${m.padEnd(10)}\t${String(s.total).padEnd(6)}\t${String(s.cyber).padEnd(10)}\t${String(s.property).padEnd(13)}\t${String(s.body).padEnd(9)}\t${String(s.other).padEnd(6)}\t${s.minDate.slice(0,10)} to ${s.maxDate.slice(0,10)}`);
});

// Daily counts around the gap
console.log('\n================================================================');
console.log('               DAILY COUNTS AROUND THE GAP                      ');
console.log('================================================================');
const dailyMap = {};
validDates.forEach(x => {
  const dayStr = x.raw.slice(0, 10);
  dailyMap[dayStr] = (dailyMap[dayStr] || 0) + 1;
});

const gapDays = Object.keys(dailyMap).filter(d => d >= '2026-08-20' && d <= '2026-10-31').sort();
gapDays.forEach(day => {
  console.log(`${day}: ${dailyMap[day]} cases`);
});

// Real Max IDs
console.log('\n================================================================');
console.log('                REAL MAX IDs PER TABLE                          ');
console.log('================================================================');
const accusedIds = accused.map(a => Number(a.AccusedMasterID)).filter(n => !isNaN(n)).sort((a,b) => a - b);
const victimIds = victims.map(v => Number(v.VictimMasterID)).filter(n => !isNaN(n)).sort((a,b) => a - b);
const empIds = employees.map(e => Number(e.EmployeeID)).filter(n => !isNaN(n)).sort((a,b) => a - b);
const unitIds = units.map(u => Number(u.UnitID)).filter(n => !isNaN(n)).sort((a,b) => a - b);

console.log(`casemasters:   count = ${cases.length}, maxID = ${caseIds[caseIds.length - 1]}, (300k range max: ${c300k[c300k.length - 1]})`);
const acc300k = accusedIds.filter(id => id >= 300000);
console.log(`accuseds:      count = ${accused.length}, maxID = ${accusedIds[accusedIds.length - 1]}, (300k range max: ${acc300k[acc300k.length - 1]})`);
const vic300k = victimIds.filter(id => id >= 300000);
console.log(`victims:       count = ${victims.length}, maxID = ${victimIds[victimIds.length - 1]}, (300k range max: ${vic300k[vic300k.length - 1]})`);
console.log(`employees:     count = ${employees.length}, maxID = ${empIds[empIds.length - 1]}`);
console.log(`units:         count = ${units.length}, maxID = ${unitIds[unitIds.length - 1]}`);

// Pre-gap 3-month daily baseline (June, July, August 2026)
console.log('\n================================================================');
console.log('        PRE-GAP 3-MONTH BASELINE STATISTICS (Jun - Aug 2026)     ');
console.log('================================================================');
const jun26 = monthlyStats['Jun 2026']?.total || 0;
const jul26 = monthlyStats['Jul 2026']?.total || 0;
const aug26 = monthlyStats['Aug 2026']?.total || 0;
const preGap3mTotal = jun26 + jul26 + aug26;
const preGap3mDays = 30 + 31 + 31; // 92 days
const baselineDailyRate = preGap3mTotal / preGap3mDays;
console.log(`June 2026:   ${jun26} cases`);
console.log(`July 2026:   ${jul26} cases`);
console.log(`August 2026: ${aug26} cases`);
console.log(`3-Month Total: ${preGap3mTotal} cases over 92 days`);
console.log(`Chart Baseline Daily Rate: ${baselineDailyRate.toFixed(2)} cases/day`);

// CrimeMajorHeadID distribution across the 3 months
const preGapCases = validDates.filter(x => x.raw >= '2026-06-01' && x.raw <= '2026-08-31');
const headCounts = {};
preGapCases.forEach(c => {
  headCounts[c.head] = (headCounts[c.head] || 0) + 1;
});
console.log('\nPre-gap CrimeMajorHeadID Distribution:');
Object.keys(headCounts).sort().forEach(h => {
  const cnt = headCounts[h];
  const pct = ((cnt / preGapCases.length) * 100).toFixed(1);
  console.log(`  Head ${h}: ${cnt} (${pct}%)`);
});

// CaseStatusID distribution across the 3 months
const statusCounts = {};
preGapCases.forEach(c => {
  statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
});
console.log('\nPre-gap CaseStatusID Distribution:');
Object.keys(statusCounts).sort().forEach(s => {
  const cnt = statusCounts[s];
  const pct = ((cnt / preGapCases.length) * 100).toFixed(1);
  console.log(`  Status ${s}: ${cnt} (${pct}%)`);
});

// Day-of-week distribution
const dowCounts = [0, 0, 0, 0, 0, 0, 0];
preGapCases.forEach(c => {
  dowCounts[c.d.getDay()]++;
});
const dowNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
console.log('\nPre-gap Day of Week Distribution:');
dowCounts.forEach((cnt, idx) => {
  const avg = (cnt / (preGap3mDays / 7)).toFixed(1);
  const factor = (cnt / (preGapCases.length / 7)).toFixed(2);
  console.log(`  ${dowNames[idx].padEnd(10)}: ${cnt} (avg ${avg}/day, weight ${factor}x)`);
});

// Hourly distribution
const hourlyCounts = new Array(24).fill(0);
preGapCases.forEach(c => {
  hourlyCounts[c.d.getHours()]++;
});
console.log('\nPre-gap Hourly Distribution:');
console.log(hourlyCounts.map((c, h) => `${String(h).padStart(2, '0')}:00=${c}`).join(' '));

// PersonID reuse in Accused
const personIds = accused.map(a => a.PersonID).filter(Boolean);
const personCounts = {};
personIds.forEach(p => {
  personCounts[p] = (personCounts[p] || 0) + 1;
});
const uniquePersons = Object.keys(personCounts).length;
const repeatedPersons = Object.values(personCounts).filter(c => c > 1).length;
const repeatRows = personIds.length - uniquePersons;
console.log(`\nAccused PersonID Reuse:`);
console.log(`  Total Accused Rows: ${accused.length}`);
console.log(`  Rows with PersonID: ${personIds.length}`);
console.log(`  Unique PersonIDs:   ${uniquePersons}`);
console.log(`  Persons with >1 case: ${repeatedPersons}`);
console.log(`  Repeat Accused rows:  ${repeatRows} (${((repeatRows / personIds.length) * 100).toFixed(1)}%)`);
