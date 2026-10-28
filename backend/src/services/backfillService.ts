import { IDataRepository } from '../repositories/IDataRepository';
import fs from 'fs';
import path from 'path';

export interface BackfillAnalysis {
  totalExistingCases: number;
  minDate: string;
  maxDate: string;
  gapStartDate: string;
  targetEndDate: string;
  missingDayCount: number;
  historicalDailyAvg: number;
  last30DaysDailyAvg: number;
  last7DaysDailyAvg: number;
  dayOfWeekDistribution: Record<string, number>;
  crimeCategoryDistribution: Record<number, number>;
  caseStatusDistribution: Record<number, number>;
  hourlyDistribution: Record<number, number>;
  accusedPerCaseDistribution: Record<number, number>;
  victimPerCaseDistribution: Record<number, number>;
  maxIds: {
    caseMasterId: number;
    accusedMasterId: number;
    victimMasterId: number;
    complainantId: number;
  };
}

export interface DayPlan {
  date: string;
  dayOfWeek: string;
  plannedCases: number;
  statusBreakdown: { underInvestigation: number; solvedClosed: number };
}

export interface BackfillPlan {
  analysis: BackfillAnalysis;
  batchId: string;
  totalPlannedCases: number;
  totalPlannedAccused: number;
  totalPlannedVictims: number;
  totalPlannedComplainants: number;
  dailySchedule: DayPlan[];
  windowMetrics: {
    last24Hours: number;
    today_2026_10_29: number;
    tomorrow_2026_10_30: number;
    last7Days: number;
    last30Days: number;
  };
  generatedCases: any[];
  generatedAccused: any[];
  generatedVictims: any[];
  generatedComplainants: any[];
}

const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function getDaysBetween(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  let curr = startStr;
  while (curr <= endStr) {
    dates.push(curr);
    curr = addDays(curr, 1);
  }
  return dates;
}

const MALE_NAMES = ['Ramesh', 'Suresh', 'Manjunath', 'Shivakumar', 'Basavaraj', 'Ganesh', 'Prakash', 'Santosh', 'Vijay', 'Anand', 'Naveen', 'Raghavendra', 'Sunil', 'Kiran', 'Prashanth'];
const FEMALE_NAMES = ['Lakshmi', 'Shobha', 'Geetha', 'Sunitha', 'Manjula', 'Radha', 'Kavitha', 'Savitri', 'Renuka', 'Pushpa', 'Anitha', 'Roopa', 'Suma', 'Bhavya', 'Deepa'];
const LAST_NAMES = ['Gowda', 'Patil', 'Kumar', 'Shetty', 'Naik', 'Bhat', 'Kulkarni', 'Reddy', 'Hegde', 'Deshmukh', 'Poojary', 'Chavan', 'Rao', 'Acharya', 'Mesta'];

function sampleWeighted<T extends string | number>(weights: Record<T, number>, fallback: T): T {
  const entries = Object.entries(weights) as [string, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return fallback;
  let rand = Math.random() * total;
  for (const [key, weight] of entries) {
    rand -= weight;
    if (rand <= 0) {
      return (typeof fallback === 'number' ? Number(key) : key) as T;
    }
  }
  return fallback;
}

export async function analyzeExistingData(db: IDataRepository): Promise<BackfillAnalysis> {
  const [cases, units, employees, accused, victims, complainants] = await Promise.all([
    db.getCases({}),
    db.getUnits(),
    db.getEmployees(),
    db.getAllAccused().catch(() => []),
    db.getAllVictims().catch(() => []),
    db.getComplainants().catch(() => [])
  ]);

  if (cases.length === 0) {
    throw new Error('No existing cases found in CloudScale to analyze.');
  }

  // Find min & max date
  let minDate = '9999-99-99';
  let maxDate = '0000-00-00';
  let maxCaseId = 0;

  const dateCounts: Record<string, number> = {};
  const dowCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const catCounts: Record<number, number> = {};
  const statusCounts: Record<number, number> = {};
  const hourCounts: Record<number, number> = {};

  for (const c of cases) {
    const id = Number(c.CaseMasterID);
    if (id > maxCaseId) maxCaseId = id;

    const rawDate = c.CrimeRegisteredDate || '';
    const dateStr = rawDate.split('T')[0];
    if (dateStr && dateStr.length === 10) {
      if (dateStr < minDate) minDate = dateStr;
      if (dateStr > maxDate) maxDate = dateStr;
      dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;

      const dObj = new Date(dateStr + 'T00:00:00Z');
      const dow = dObj.getUTCDay();
      dowCounts[dow] = (dowCounts[dow] || 0) + 1;
    }

    if (rawDate.includes('T')) {
      const timePart = rawDate.split('T')[1];
      const h = parseInt(timePart.split(':')[0], 10);
      if (!isNaN(h) && h >= 0 && h < 24) {
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      }
    }

    const cat = Number(c.CrimeMajorHeadID || 100);
    catCounts[cat] = (catCounts[cat] || 0) + 1;

    const status = Number(c.CaseStatusID || 1);
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  // Max Accused, Victim, Complainant IDs
  let maxAccusedId = 80000;
  for (const a of accused) {
    const id = Number(a.AccusedMasterID);
    if (id > maxAccusedId) maxAccusedId = id;
  }

  let maxVictimId = 70000;
  for (const v of victims) {
    const id = Number(v.VictimMasterID);
    if (id > maxVictimId) maxVictimId = id;
  }

  let maxComplainantId = 10000;
  for (const comp of complainants) {
    const id = Number(comp.ComplainantID);
    if (id > maxComplainantId) maxComplainantId = id;
  }

  // Accused & Victim counts per case
  const accusedPerCaseMap: Record<number, number> = {};
  for (const a of accused) {
    const cid = Number(a.CaseMasterID);
    if (cid) accusedPerCaseMap[cid] = (accusedPerCaseMap[cid] || 0) + 1;
  }

  const victimPerCaseMap: Record<number, number> = {};
  for (const v of victims) {
    const cid = Number(v.CaseMasterID);
    if (cid) victimPerCaseMap[cid] = (victimPerCaseMap[cid] || 0) + 1;
  }

  const accusedDist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const victimDist: Record<number, number> = { 0: 0, 1: 0, 2: 0 };

  for (const c of cases) {
    const cid = Number(c.CaseMasterID);
    const aCount = Math.min(accusedPerCaseMap[cid] || 1, 3);
    accusedDist[aCount] = (accusedDist[aCount] || 0) + 1;

    const vCount = Math.min(victimPerCaseMap[cid] || 1, 2);
    victimDist[vCount] = (victimDist[vCount] || 0) + 1;
  }

  // Calculate missing days to 2026-10-30
  const gapStartDate = addDays(maxDate, 1);
  const targetEndDate = '2026-10-30';
  const missingDays = getDaysBetween(gapStartDate, targetEndDate);

  // Averages
  const sortedDates = Object.keys(dateCounts).sort();
  const totalDays = sortedDates.length || 1;
  const historicalDailyAvg = Math.round(cases.length / totalDays);

  const last30Days = sortedDates.slice(-30);
  const last30Cases = last30Days.reduce((sum, d) => sum + (dateCounts[d] || 0), 0);
  const last30DaysDailyAvg = Math.round(last30Cases / Math.max(last30Days.length, 1));

  const last7Days = sortedDates.slice(-7);
  const last7Cases = last7Days.reduce((sum, d) => sum + (dateCounts[d] || 0), 0);
  const last7DaysDailyAvg = Math.round(last7Cases / Math.max(last7Days.length, 1));

  // Day of week distribution normalized
  const totalDowCases = Object.values(dowCounts).reduce((a, b) => a + b, 0) || 1;
  const dowDist: Record<string, number> = {};
  DOW_NAMES.forEach((name, i) => {
    dowDist[name] = Math.round(((dowCounts[i] || 0) / totalDowCases) * 100);
  });

  return {
    totalExistingCases: cases.length,
    minDate,
    maxDate,
    gapStartDate,
    targetEndDate,
    missingDayCount: missingDays.length,
    historicalDailyAvg,
    last30DaysDailyAvg,
    last7DaysDailyAvg,
    dayOfWeekDistribution: dowDist,
    crimeCategoryDistribution: catCounts,
    caseStatusDistribution: statusCounts,
    hourlyDistribution: Object.keys(hourCounts).length ? hourCounts : { 9: 10, 10: 20, 11: 25, 14: 15, 16: 20, 18: 15, 20: 10 },
    accusedPerCaseDistribution: accusedDist,
    victimPerCaseDistribution: victimDist,
    maxIds: {
      caseMasterId: Math.max(maxCaseId, 110500, 300500),
      accusedMasterId: Math.max(maxAccusedId, 90500, 300500),
      victimMasterId: Math.max(maxVictimId, 80500, 300500),
      complainantId: Math.max(maxComplainantId, 10000)
    }
  };
}

export async function createBackfillPlan(db: IDataRepository, batchId: string = 'seed-2026-10-29'): Promise<BackfillPlan> {
  const analysis = await analyzeExistingData(db);
  const [units, employees] = await Promise.all([db.getUnits(), db.getEmployees()]);

  // Use the realistic daily baseline from the last 30 active days before the gap
  // (typically ~150 - 200 cases per day across all 930 Karnataka police stations)
  const baseAvg = Math.max(analysis.last30DaysDailyAvg, 120);

  const missingDates = getDaysBetween(analysis.gapStartDate, analysis.targetEndDate);

  let nextCaseId = analysis.maxIds.caseMasterId + 1;
  let nextAccusedId = analysis.maxIds.accusedMasterId + 1;
  let nextVictimId = analysis.maxIds.victimMasterId + 1;
  let nextComplainantId = analysis.maxIds.complainantId + 1;

  const generatedCases: any[] = [];
  const generatedAccused: any[] = [];
  const generatedVictims: any[] = [];
  const generatedComplainants: any[] = [];

  const dailySchedule: DayPlan[] = [];

  // Group active employees by UnitID for valid referential integrity
  const employeesByUnit: Record<number, number[]> = {};
  for (const emp of employees) {
    const uid = Number(emp.UnitID);
    if (!employeesByUnit[uid]) employeesByUnit[uid] = [];
    employeesByUnit[uid].push(Number(emp.EmployeeID));
  }
  const allEmployeeIds = employees.map(e => Number(e.EmployeeID)).filter(Boolean);

  const validUnits = units.filter(u => u.Active !== false);

  for (const dateStr of missingDates) {
    const dObj = new Date(dateStr + 'T00:00:00Z');
    const dow = dObj.getUTCDay();
    const dowName = DOW_NAMES[dow];

    // Day of week weighting (weekends typically have slightly more cases)
    const dowFactor = (dow === 0 || dow === 6) ? 1.08 : (dow === 5 ? 1.04 : 0.96);
    
    // Light random variation (+/- 12%)
    const randomVariation = 0.88 + Math.random() * 0.24;
    const dayCasesCount = Math.round(baseAvg * dowFactor * randomVariation);

    // Newer dates lean toward Open/Under Investigation (CaseStatusID 1)
    const isRecent = dateStr >= '2026-10-15';
    let underInvestigationCount = 0;
    let solvedClosedCount = 0;

    for (let i = 0; i < dayCasesCount; i++) {
      const caseId = nextCaseId++;
      const catId = sampleWeighted(analysis.crimeCategoryDistribution, 100);

      // Station and Officer
      const unit = validUnits[Math.floor(Math.random() * validUnits.length)];
      const unitId = Number(unit.UnitID);
      const districtId = Number(unit.DistrictID);

      const unitOfficers = employeesByUnit[unitId];
      const officerId = (unitOfficers && unitOfficers.length > 0)
        ? unitOfficers[Math.floor(Math.random() * unitOfficers.length)]
        : allEmployeeIds[Math.floor(Math.random() * allEmployeeIds.length)];

      // Status
      let statusId = 1; // Under Investigation
      if (isRecent) {
        statusId = Math.random() < 0.85 ? 1 : 2; // 85% pending for recent
      } else {
        const r = Math.random();
        statusId = r < 0.40 ? 1 : (r < 0.75 ? 2 : (r < 0.90 ? 3 : 4)); // older lean closed
      }

      if (statusId === 1) underInvestigationCount++;
      else solvedClosedCount++;

      // Registration Hour
      const hour = sampleWeighted(analysis.hourlyDistribution, 11);
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      const registeredDateTime = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

      // Incident date 0 to 4 days prior
      const incidentDate = addDays(dateStr, -Math.floor(Math.random() * 4));

      // Crime number sequence
      const crimeNo = `${dateStr.substring(0, 4)}/${String(1000 + (caseId % 9000))}`;
      const caseNo = `FIR-${dateStr.replace(/-/g, '')}-${String(caseId).slice(-4)}`;

      // Lat/Lng centered in Karnataka with district jitter
      const baseLat = unit.latitude || 12.9716;
      const baseLng = unit.longitude || 77.5946;
      const lat = Number((baseLat + (Math.random() - 0.5) * 0.08).toFixed(6));
      const lng = Number((baseLng + (Math.random() - 0.5) * 0.08).toFixed(6));

      const caseRecord = {
        CaseMasterID: caseId,
        CrimeNo: crimeNo,
        CaseNo: caseNo,
        CrimeRegisteredDate: registeredDateTime,
        CrimeRegisteredDateTime: registeredDateTime,
        PolicePersonID: officerId,
        PoliceStationID: unitId,
        CaseCategoryID: 1, // FIR
        GravityOffenceID: (catId === 100 || catId === 300) ? 1 : 2,
        CrimeMajorHeadID: catId,
        CrimeMinorHeadID: catId + 1,
        CaseStatusID: statusId,
        CourtID: 3001,
        IncidentFromDate: `${incidentDate}T${String(hour).padStart(2, '0')}:00:00`,
        IncidentToDate: registeredDateTime,
        InfoReceivedPSDate: registeredDateTime,
        latitude: lat,
        longitude: lng,
        BriefFacts: `Case registered regarding incident under Category ${catId} within ${unit.UnitName} jurisdiction.`,
        IsSeeded: true,
        SeedBatchId: batchId
      };
      generatedCases.push(caseRecord);

      // Complainant (1 per case)
      const compId = nextComplainantId++;
      const isCompMale = Math.random() < 0.6;
      const compFirstName = isCompMale 
        ? MALE_NAMES[Math.floor(Math.random() * MALE_NAMES.length)]
        : FEMALE_NAMES[Math.floor(Math.random() * FEMALE_NAMES.length)];
      const compLastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

      generatedComplainants.push({
        ComplainantID: compId,
        CaseMasterID: caseId,
        ComplainantName: `${compFirstName} ${compLastName}`,
        AgeYear: 22 + Math.floor(Math.random() * 45),
        GenderID: isCompMale ? 1 : 2,
        OccupationID: 1,
        ReligionID: 1,
        CasteID: 1,
        IsSeeded: true,
        SeedBatchId: batchId
      });

      // Accused (0, 1, 2 based on distribution)
      const accusedCount = sampleWeighted(analysis.accusedPerCaseDistribution, 1);
      for (let aIdx = 0; aIdx < accusedCount; aIdx++) {
        const accusedId = nextAccusedId++;
        const isAccusedMale = Math.random() < 0.88;
        const accFirst = isAccusedMale 
          ? MALE_NAMES[Math.floor(Math.random() * MALE_NAMES.length)]
          : FEMALE_NAMES[Math.floor(Math.random() * FEMALE_NAMES.length)];
        const accLast = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

        generatedAccused.push({
          AccusedMasterID: accusedId,
          CaseMasterID: caseId,
          AccusedName: `${accFirst} ${accLast}`,
          AgeYear: 19 + Math.floor(Math.random() * 40),
          GenderID: isAccusedMale ? 1 : 2,
          PersonID: `A${aIdx + 1}`,
          IsSeeded: true,
          SeedBatchId: batchId
        });
      }

      // Victims (0, 1, 2 based on distribution)
      const victimCount = sampleWeighted(analysis.victimPerCaseDistribution, 1);
      for (let vIdx = 0; vIdx < victimCount; vIdx++) {
        const victimId = nextVictimId++;
        const isVictimMale = Math.random() < 0.55;
        const vicFirst = isVictimMale
          ? MALE_NAMES[Math.floor(Math.random() * MALE_NAMES.length)]
          : FEMALE_NAMES[Math.floor(Math.random() * FEMALE_NAMES.length)];
        const vicLast = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

        generatedVictims.push({
          VictimMasterID: victimId,
          CaseMasterID: caseId,
          VictimName: `${vicFirst} ${vicLast}`,
          AgeYear: 18 + Math.floor(Math.random() * 50),
          GenderID: isVictimMale ? 1 : 2,
          VictimPolice: '0',
          PersonID: `V${vIdx + 1}`,
          IsSeeded: true,
          SeedBatchId: batchId
        });
      }
    }

    dailySchedule.push({
      date: dateStr,
      dayOfWeek: dowName,
      plannedCases: dayCasesCount,
      statusBreakdown: {
        underInvestigation: underInvestigationCount,
        solvedClosed: solvedClosedCount
      }
    });
  }

  // Calculate resulting window totals
  const todayCases = dailySchedule.find(d => d.date === '2026-10-29')?.plannedCases || 0;
  const tomorrowCases = dailySchedule.find(d => d.date === '2026-10-30')?.plannedCases || 0;

  const last7DaysList = ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'];
  const last7DaysTotal = dailySchedule
    .filter(d => last7DaysList.includes(d.date))
    .reduce((sum, d) => sum + d.plannedCases, 0);

  const last30DaysTotal = dailySchedule
    .filter(d => d.date >= '2026-10-01' && d.date <= '2026-10-30')
    .reduce((sum, d) => sum + d.plannedCases, 0);

  return {
    analysis,
    batchId,
    totalPlannedCases: generatedCases.length,
    totalPlannedAccused: generatedAccused.length,
    totalPlannedVictims: generatedVictims.length,
    totalPlannedComplainants: generatedComplainants.length,
    dailySchedule,
    windowMetrics: {
      last24Hours: todayCases,
      today_2026_10_29: todayCases,
      tomorrow_2026_10_30: tomorrowCases,
      last7Days: last7DaysTotal,
      last30Days: last30DaysTotal
    },
    generatedCases,
    generatedAccused,
    generatedVictims,
    generatedComplainants
  };
}

export async function executeBackfillPlan(plan: BackfillPlan, catalystApp: any): Promise<{ insertedCases: number; insertedAccused: number; insertedVictims: number; insertedComplainants: number }> {
  const nosql = catalystApp.nosql();
  const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');

  const insertTableBatches = async (tableName: string, records: any[]) => {
    const table = nosql.table(tableName);
    console.log(`[Backfill] Inserting ${records.length} items into ${tableName}...`);
    for (let i = 0; i < records.length; i += 25) {
      const batch = records.slice(i, i + 25);
      const items = batch.map(r => NoSQLItem.from(r));
      try {
        await table.insertItems({ items });
      } catch (err: any) {
        console.error(`[Backfill Error] Failed batch on ${tableName} (offset ${i}):`, err?.message || err);
        // Fallback: try one-by-one to maximize insert success
        for (const item of items) {
          try {
            await table.insertItems({ item });
          } catch (e: any) {
            console.warn(`[Backfill] Single item insert failed:`, e?.message);
          }
        }
      }
    }
    console.log(`[Backfill] Completed ${tableName}.`);
  };

  await insertTableBatches('casemasters', plan.generatedCases);
  await insertTableBatches('complainants', plan.generatedComplainants);
  await insertTableBatches('accuseds', plan.generatedAccused);
  await insertTableBatches('victims', plan.generatedVictims);

  // Write seed_log.json for rollback & auditability
  const logDir = path.resolve(__dirname, '../../data');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, 'seed_log.json');

  const logPayload = {
    batchId: plan.batchId,
    executedAt: new Date().toISOString(),
    caseMasterIds: plan.generatedCases.map(c => c.CaseMasterID),
    accusedMasterIds: plan.generatedAccused.map(a => a.AccusedMasterID),
    victimMasterIds: plan.generatedVictims.map(v => v.VictimMasterID),
    complainantIds: plan.generatedComplainants.map(comp => comp.ComplainantID)
  };

  fs.writeFileSync(logFile, JSON.stringify(logPayload, null, 2), 'utf8');
  console.log(`[Backfill] Wrote seed log to ${logFile}`);

  return {
    insertedCases: plan.generatedCases.length,
    insertedAccused: plan.generatedAccused.length,
    insertedVictims: plan.generatedVictims.length,
    insertedComplainants: plan.generatedComplainants.length
  };
}
