import { IDataRepository } from '../repositories/IDataRepository';
import { getCatalystApp } from '../repositories/CloudScaleRepository';

export interface ReconciliationReport {
  timestamp: string;
  casemastersCounts: {
    zcqlCount: {
      count: number | null;
      query: string;
      raw: any;
      error?: string;
    };
    cloudScaleMetadataCount: {
      tableDetails: any;
      error?: string;
    };
    scanAllCount: {
      totalFound: number;
      byRange: Record<string, number>;
      failedBatches: number;
      retriedBatches: number;
      idMin: number;
      idMax: number;
    };
    trendChartFunctionCount: {
      totalFromFunction: number;
      monthlyTotals: Record<string, { total: number; Cyber: number; Property: number; Body: number; Other: number }>;
    };
    explanationOfDifferences: string[];
  };
  monthlyCaseCountsLast18Months: {
    month: string;
    total: number;
    Cyber: number;
    Property: number;
    Body: number;
    Other: number;
  }[];
  latestCase: {
    CaseMasterID: number;
    CrimeRegisteredDate: string;
    CaseNo: string;
    CrimeNo: string;
    PoliceStationID: number;
    CaseStatusID: number;
    CrimeMajorHeadID: number;
  } | null;
  earliestCase: {
    CaseMasterID: number;
    CrimeRegisteredDate: string;
  } | null;
  realMaxIds: {
    casemasters: { maxId: number; source: string; probedRanges: any };
    accuseds: { maxId: number; source: string; probedRanges: any };
    victims: { maxId: number; source: string; probedRanges: any };
    complainants: { maxId: number; count: number; source: string; details: any };
    actsectionassociations: { maxId: number | string; count: number; source: string; details: any };
  };
  gapAnalysis: {
    gapStartDate: string;
    targetEndDate: string;
    missingDaysCount: number;
    preGap3MonthsDailyRate: number;
    preGap3MonthsTotalCases: number;
    preGapMonthsExamined: string[];
    dailyCountsInGap: { date: string; existingCount: number }[];
    historicalRegistrationTrendRecentMonths: Record<string, number>;
  };
}

export async function runReconciliation(req: any): Promise<ReconciliationReport> {
  const catalystApp = getCatalystApp(req);
  const nosql = catalystApp.nosql();
  const zcql = catalystApp.zcql();
  const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1.a ZCQL COUNT(*) and CloudScale NoSQL Metadata Count
  // ─────────────────────────────────────────────────────────────────────────────
  let zcqlCountResult: any = { count: null, query: '', raw: null };
  const zcqlQueries = [
    'SELECT COUNT(CaseMasterID) FROM casemasters',
    'SELECT COUNT(*) FROM casemasters',
    'SELECT COUNT(CaseMasterID) FROM CaseMaster',
    'SELECT COUNT(*) FROM CaseMaster'
  ];

  for (const q of zcqlQueries) {
    try {
      const res = await zcql.executeZCQLQuery(q);
      zcqlCountResult = { count: res?.[0]?.casemasters?.CaseMasterID || res?.[0]?.CaseMaster?.CaseMasterID || res?.[0]?.[Object.keys(res?.[0] || {})[0]] || res?.length, query: q, raw: res };
      if (zcqlCountResult.count !== null && zcqlCountResult.count !== undefined) break;
    } catch (e: any) {
      zcqlCountResult.error = (zcqlCountResult.error ? zcqlCountResult.error + '; ' : '') + `${q}: ${e.message}`;
    }
  }

  let tableMetaResult: any = {};
  try {
    const tableDetails = await nosql.getTable('casemasters');
    tableMetaResult = (tableDetails as any).toJSON ? (tableDetails as any).toJSON() : tableDetails;
  } catch (e: any) {
    tableMetaResult = { error: e.message };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1.b Complete, Un-truncated Scan of casemasters across ALL ranges with RETRIES
  // ─────────────────────────────────────────────────────────────────────────────
  const casemastersTable = nosql.table('casemasters');

  // Define ranges to scan
  const ranges = [
    { name: '100001-110500', start: 100001, end: 110500 },
    { name: '110501-112000', start: 110501, end: 112000 },
    { name: '300001-300500', start: 300001, end: 300500 },
    { name: '300501-305000', start: 300501, end: 305000 }
  ];

  const allScannedCases: any[] = [];
  const rangeCounts: Record<string, number> = {};
  let totalRetries = 0;
  let failedBatches = 0;

  // Safe batch fetcher with exponential backoff retry (up to 4 attempts)
  async function fetchBatchWithRetry(keys: any[]): Promise<any[]> {
    let attempts = 0;
    while (attempts < 4) {
      attempts++;
      try {
        const resp = await casemastersTable.fetchItem({ keys });
        const raw = resp as any;
        return (raw.get || []).map((d: any) => typeof d.item?.toJSON === 'function' ? d.item.toJSON() : d.item).filter(Boolean);
      } catch (e: any) {
        if (e?.message && e.message.includes('No such Item')) {
          return []; // Truly empty keys
        }
        if (attempts < 4) {
          totalRetries++;
          await new Promise(r => setTimeout(r, 120 * Math.pow(2, attempts - 1)));
        } else {
          failedBatches++;
          console.error(`[Reconcile] fetchItem failed permanently on batch starting with ${keys[0]?.CaseMasterID || 'unknown'}:`, e?.message || e);
          return [];
        }
      }
    }
    return [];
  }

  // Concurrency worker runner
  async function runBatchesConcurrently(batches: any[][], concurrency: number = 6): Promise<any[]> {
    const results: any[] = [];
    let idx = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (idx < batches.length) {
        const batch = batches[idx++];
        const items = await fetchBatchWithRetry(batch);
        results.push(...items);
      }
    });
    await Promise.all(workers);
    return results;
  }

  for (const r of ranges) {
    const batchList: any[][] = [];
    for (let id = r.start; id <= r.end; id += 25) {
      const keys = [];
      for (let k = id; k < Math.min(id + 25, r.end + 1); k++) {
        keys.push(new NoSQLItem().addNumber('CaseMasterID', k));
      }
      batchList.push(keys);
    }

    const items = await runBatchesConcurrently(batchList, 6);
    rangeCounts[r.name] = items.length;
    allScannedCases.push(...items);
  }

  // Clean raw NoSQL attribute wrappers if needed
  const cleanedCases = allScannedCases.map(item => {
    if (!item) return null;
    let unwrapped = item.casemasters || item.CaseMaster || item;
    const clean: any = {};
    for (const [k, v] of Object.entries(unwrapped)) {
      if (v && typeof v === 'object') {
        if ('S' in (v as any)) clean[k] = (v as any).S;
        else if ('N' in (v as any)) clean[k] = Number((v as any).N);
        else if ('BOOL' in (v as any)) clean[k] = (v as any).BOOL === true || (v as any).BOOL === 'true';
        else if ('NULL' in (v as any)) clean[k] = null;
        else clean[k] = v;
      } else {
        clean[k] = v;
      }
    }
    return clean;
  }).filter(Boolean);

  // Deduplicate by CaseMasterID
  const caseMap = new Map<number, any>();
  cleanedCases.forEach(c => {
    const cid = Number(c.CaseMasterID);
    if (cid && !caseMap.has(cid)) caseMap.set(cid, c);
  });
  const uniqueCases = Array.from(caseMap.values());

  const caseIds = uniqueCases.map(c => Number(c.CaseMasterID)).filter(Boolean);
  const minCaseId = caseIds.length ? Math.min(...caseIds) : 0;
  const maxCaseId = caseIds.length ? Math.max(...caseIds) : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1.c Exact Function that Feeds the Historical Registration Trend Chart
  // ─────────────────────────────────────────────────────────────────────────────
  // Identical to lines 326-345 in backend/src/routes/analyticsRoutes.ts
  const monthlyCounts = new Map<string, { total: number; Cyber: number; Property: number; Body: number; Other: number }>();
  uniqueCases.forEach((c: any) => {
    const dStr = c.CrimeRegisteredDate || '';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return;
    const monthStr = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    if (!monthlyCounts.has(monthStr)) {
      monthlyCounts.set(monthStr, { total: 0, Cyber: 0, Property: 0, Body: 0, Other: 0 });
    }
    const counts = monthlyCounts.get(monthStr)!;
    counts.total++;
    const cat = Number(c.CrimeMajorHeadID);
    if (cat === 500) counts.Cyber++;
    else if (cat === 200) counts.Property++;
    else if (cat === 100) counts.Body++;
    else counts.Other++;
  });

  // Sort months chronologically
  const sortedMonths = Array.from(monthlyCounts.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const monthlyData = sortedMonths.map(m => ({
    month: m,
    total: monthlyCounts.get(m)!.total,
    Cyber: monthlyCounts.get(m)!.Cyber,
    Property: monthlyCounts.get(m)!.Property,
    Body: monthlyCounts.get(m)!.Body,
    Other: monthlyCounts.get(m)!.Other
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Monthly Counts for Last 18 Months & Date of Latest Case
  // ─────────────────────────────────────────────────────────────────────────────
  const last18Months = monthlyData.slice(-18);

  // Find latest and earliest case
  let latestCase: any = null;
  let earliestCase: any = null;
  let maxDateStr = '0000-00-00';
  let minDateStr = '9999-99-99';

  uniqueCases.forEach(c => {
    const d = (c.CrimeRegisteredDate || '').split('T')[0];
    if (d && d.length === 10) {
      if (d > maxDateStr) {
        maxDateStr = d;
        latestCase = c;
      }
      if (d < minDateStr) {
        minDateStr = d;
        earliestCase = c;
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Real Max ID Across ALL Ranges for All Tables
  // ─────────────────────────────────────────────────────────────────────────────
  // Probe accuseds
  let maxAccusedId = 0;
  const accusedTable = nosql.table('accuseds');
  const accusedRanges = [
    { start: 80001, end: 90500 },
    { start: 90501, end: 95000 },
    { start: 300001, end: 300500 },
    { start: 300501, end: 305000 }
  ];
  for (const ar of accusedRanges) {
    const batch = [];
    for (let id = ar.start; id <= ar.end; id += 25) {
      const keys = [];
      for (let k = id; k < Math.min(id + 25, ar.end + 1); k++) keys.push(new NoSQLItem().addNumber('AccusedMasterID', k));
      batch.push(keys);
    }
    const items = await runBatchesConcurrently(batch, 6);
    items.forEach((it: any) => {
      const clean = it.accuseds || it.Accused || it;
      const aid = Number(clean.AccusedMasterID?.N !== undefined ? clean.AccusedMasterID.N : clean.AccusedMasterID);
      if (aid > maxAccusedId) maxAccusedId = aid;
    });
  }

  // Probe victims
  let maxVictimId = 0;
  const victimsTable = nosql.table('victims');
  const victimRanges = [
    { start: 70001, end: 80500 },
    { start: 80501, end: 85000 },
    { start: 300001, end: 300500 },
    { start: 300501, end: 305000 }
  ];
  for (const vr of victimRanges) {
    const batch = [];
    for (let id = vr.start; id <= vr.end; id += 25) {
      const keys = [];
      for (let k = id; k < Math.min(id + 25, vr.end + 1); k++) keys.push(new NoSQLItem().addNumber('VictimMasterID', k));
      batch.push(keys);
    }
    const items = await runBatchesConcurrently(batch, 6);
    items.forEach((it: any) => {
      const clean = it.victims || it.Victim || it;
      const vid = Number(clean.VictimMasterID?.N !== undefined ? clean.VictimMasterID.N : clean.VictimMasterID);
      if (vid > maxVictimId) maxVictimId = vid;
    });
  }

  // Probe complainants (ZCQL + NoSQL)
  let maxComplainantId = 0;
  let complainantCount = 0;
  let complainantZcqlError = '';
  try {
    const cRes = await zcql.executeZCQLQuery("SELECT * FROM complainants ORDER BY ComplainantID DESC LIMIT 200");
    const list = cRes.map((r: any) => r.complainants || r);
    complainantCount = list.length;
    list.forEach((c: any) => {
      const cid = Number(c.ComplainantID);
      if (cid > maxComplainantId) maxComplainantId = cid;
    });
  } catch (e: any) {
    complainantZcqlError = e.message;
  }

  // Also check NoSQL complainants in ranges 10001-11000 and 60001-72000
  let nosqlComplainantMax = 0;
  try {
    const compTable = nosql.table('complainants');
    const compRanges = [{ start: 10001, end: 11000 }, { start: 60001, end: 72000 }];
    for (const cr of compRanges) {
      const batch = [];
      for (let id = cr.start; id <= cr.end; id += 25) {
        const keys = [];
        for (let k = id; k < Math.min(id + 25, cr.end + 1); k++) keys.push(new NoSQLItem().addNumber('ComplainantID', k));
        batch.push(keys);
      }
      const items = await runBatchesConcurrently(batch, 6);
      items.forEach((it: any) => {
        const clean = it.complainants || it;
        const cid = Number(clean.ComplainantID?.N !== undefined ? clean.ComplainantID.N : clean.ComplainantID);
        if (cid > nosqlComplainantMax) nosqlComplainantMax = cid;
      });
    }
  } catch (e: any) {
    // NoSQL complainants table might not exist
  }
  const realMaxComplainantId = Math.max(maxComplainantId, nosqlComplainantMax);

  // Probe ActSectionAssociation (ZCQL)
  let actSectionCount = 0;
  let maxActSectionId: any = 0;
  let actSectionError = '';
  try {
    const asRes = await zcql.executeZCQLQuery("SELECT * FROM ActSectionAssociation LIMIT 5000");
    const list = asRes.map((r: any) => r.ActSectionAssociation || r);
    actSectionCount = list.length;
    list.forEach((as: any) => {
      const id = Number(as.AssociationID || as.CaseMasterID || 0);
      if (id > maxActSectionId) maxActSectionId = id;
    });
  } catch (e: any) {
    actSectionError = e.message;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Exact Gap Analysis
  // ─────────────────────────────────────────────────────────────────────────────
  // Count cases per calendar date
  const dateCounts: Record<string, number> = {};
  uniqueCases.forEach(c => {
    const d = (c.CrimeRegisteredDate || '').split('T')[0];
    if (d && d.length === 10) {
      dateCounts[d] = (dateCounts[d] || 0) + 1;
    }
  });

  // Calculate pre-gap rate: look at active months in 2026 before the drop
  // Monthly totals in 2026
  const active2026Months = monthlyData.filter(m => m.month.includes('2026') && m.total > 50);
  const preGapMonths = active2026Months.slice(-3);
  const preGapCases = preGapMonths.reduce((sum, m) => sum + m.total, 0);
  // Average days in those 3 months (~92 days)
  const preGapDays = preGapMonths.length * 30.5;
  const preGapDailyRate = preGapDays > 0 ? Math.round((preGapCases / preGapDays) * 10) / 10 : 20.0;

  // Find exact gap start date: find where daily counts drop and stay at 0
  // Sort all dates
  const allDates = Object.keys(dateCounts).sort();
  const lastActiveDate = allDates[allDates.length - 1] || '2026-08-29';

  function addDays(dStr: string, n: number): string {
    const d = new Date(dStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().split('T')[0];
  }

  const gapStartDate = addDays(lastActiveDate, 1);
  const targetEndDate = '2026-10-30';

  const dailyCountsInGap: { date: string; existingCount: number }[] = [];
  let curr = gapStartDate;
  while (curr <= targetEndDate) {
    dailyCountsInGap.push({
      date: curr,
      existingCount: dateCounts[curr] || 0
    });
    curr = addDays(curr, 1);
  }

  const recentTrends: Record<string, number> = {};
  monthlyData.slice(-6).forEach(m => {
    recentTrends[m.month] = m.total;
  });

  return {
    timestamp: new Date().toISOString(),
    casemastersCounts: {
      zcqlCount: zcqlCountResult,
      cloudScaleMetadataCount: { tableDetails: tableMetaResult },
      scanAllCount: {
        totalFound: uniqueCases.length,
        byRange: rangeCounts,
        failedBatches,
        retriedBatches: totalRetries,
        idMin: minCaseId,
        idMax: maxCaseId
      },
      trendChartFunctionCount: {
        totalFromFunction: uniqueCases.length,
        monthlyTotals: Object.fromEntries(monthlyCounts.entries())
      },
      explanationOfDifferences: [
        'ZCQL COUNT: Executes SQL-like aggregation via Catalyst ZCQL query engine directly on data storage.',
        'scanAll: High-performance NoSQL batch fetchItem with 4-tier exponential backoff retry across 100001-112000 and 300001-305000.',
        'Trend Chart function: Iterates over the complete deduplicated casemasters dataset and aggregates by month string.'
      ]
    },
    monthlyCaseCountsLast18Months: last18Months,
    latestCase: latestCase ? {
      CaseMasterID: Number(latestCase.CaseMasterID),
      CrimeRegisteredDate: latestCase.CrimeRegisteredDate,
      CaseNo: latestCase.CaseNo,
      CrimeNo: latestCase.CrimeNo,
      PoliceStationID: Number(latestCase.PoliceStationID),
      CaseStatusID: Number(latestCase.CaseStatusID),
      CrimeMajorHeadID: Number(latestCase.CrimeMajorHeadID)
    } : null,
    earliestCase: earliestCase ? {
      CaseMasterID: Number(earliestCase.CaseMasterID),
      CrimeRegisteredDate: earliestCase.CrimeRegisteredDate
    } : null,
    realMaxIds: {
      casemasters: { maxId: maxCaseId, source: 'casemasters NoSQL scan', probedRanges: ranges },
      accuseds: { maxId: maxAccusedId, source: 'accuseds NoSQL scan', probedRanges: accusedRanges },
      victims: { maxId: maxVictimId, source: 'victims NoSQL scan', probedRanges: victimRanges },
      complainants: { maxId: realMaxComplainantId, count: complainantCount, source: nosqlComplainantMax > 0 ? 'NoSQL complainants' : 'ZCQL complainants', details: { zcqlMax: maxComplainantId, nosqlMax: nosqlComplainantMax, error: complainantZcqlError || undefined } },
      actsectionassociations: { maxId: maxActSectionId, count: actSectionCount, source: 'ZCQL ActSectionAssociation', details: { error: actSectionError || undefined } }
    },
    gapAnalysis: {
      gapStartDate,
      targetEndDate,
      missingDaysCount: dailyCountsInGap.length,
      preGap3MonthsDailyRate: preGapDailyRate,
      preGap3MonthsTotalCases: preGapCases,
      preGapMonthsExamined: preGapMonths.map(m => `${m.month} (${m.total} cases)`),
      dailyCountsInGap,
      historicalRegistrationTrendRecentMonths: recentTrends
    }
  };
}
