import { Request, Response } from 'express';
import catalyst from 'zcatalyst-sdk-node';
import fs from 'fs';
import path from 'path';

const removeEmptyValues = (obj: any) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v != null && v !== '')
  );
};

export const seedCloudScaleData = async (req: Request, res: Response) => {
  try {
    const app = catalyst.initialize(req as any);
    const nosql = app.nosql();
    
    const seedPath = path.join(__dirname, '../../data/seedData.json');
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

    const insertBatch = async (table: any, records: any[]) => {
      let count = 0;
      const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
      for (let i = 0; i < records.length; i += 25) {
        const batch = records.slice(i, i + 25).map(r => ({ item: NoSQLItem.from(removeEmptyValues(r)) }));
        await table.insertItems(...batch);
        count += batch.length;
      }
      return count;
    };

    const results = [];
    // results.push(await insertBatch(nosql.table('districts'), seed.SEED_DISTRICTS));
    // results.push(await insertBatch(nosql.table('units'), seed.SEED_UNITS));
    // results.push(await insertBatch(nosql.table('employees'), seed.SEED_EMPLOYEES));
    // results.push(await insertBatch(nosql.table('casemasters'), seed.SEED_CASES));
    // results.push(await insertBatch(nosql.table('accuseds'), seed.SEED_ACCUSED));
    // results.push(await insertBatch(nosql.table('victims'), seed.SEED_VICTIMS));
    // results.push(await insertBatch(nosql.table('complainants'), seed.SEED_COMPLAINANTS));
    results.push(await insertBatch(nosql.table('actsectionassociations'), seed.SEED_ACT_SECTIONS));
    results.push(await insertBatch(nosql.table('customedges'), seed.SEED_CUSTOM_EDGES));

    res.json({ success: true, message: 'CloudScale seeded successfully', results });
  } catch(e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAll(table: any, itemsData: any[], pkField: string, tableName: string) {
    const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
    let allRecords: any[] = [];
    for (let i = 0; i < itemsData.length; i += 25) {
        const batch = itemsData.slice(i, i + 25);
        const itemKeys = batch.map(v => {
            if (tableName === 'actsectionassociations') {
                return NoSQLItem.from({ CaseMasterID: v.CaseMasterID, Act_Section: v.Act_Section });
            } else {
                return NoSQLItem.from({ [pkField]: v[pkField] });
            }
        });
        
        let success = false;
        let retries = 3;
        while (!success && retries > 0) {
            try {
                const resp = await table.fetchItem({ keys: itemKeys });
                const raw = resp as any;
                const items = (raw.get || []).map((d: any) => {
                    const item = d.item;
                    if (!item) return null;
                    return typeof item.to === 'function' ? item.to() : item;
                }).filter(Boolean);
                allRecords.push(...items);
                success = true;
            } catch (e: any) {
                retries--;
                if (retries === 0) console.error(`Batch fetch error in ${tableName}: ${e.message}`);
                await sleep(500); // Backoff on error
            }
        }
        await sleep(100); // Prevent DNS/rate limits
    }
    return allRecords;
}

export const validateCloudScaleSeeding = async (req: Request, res: Response) => {
  try {
    const app = catalyst.initialize(req as any);
    const nosql = app.nosql();
    const seedPath = path.join(__dirname, '../../data/seedData.json');
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    
    const tables = ['districts', 'units', 'employees', 'casemasters', 'accuseds', 'victims', 'complainants', 'actsectionassociations', 'customedges'];
    const pks = ['DistrictID', 'UnitID', 'EmployeeID', 'CaseMasterID', 'AccusedMasterID', 'VictimMasterID', 'ComplainantID', 'CaseMasterID', 'EdgeID'];
    
    const expected = {
        'districts': seed.SEED_DISTRICTS,
        'units': seed.SEED_UNITS,
        'employees': seed.SEED_EMPLOYEES,
        'casemasters': seed.SEED_CASES,
        'accuseds': seed.SEED_ACCUSED,
        'victims': seed.SEED_VICTIMS,
        'complainants': seed.SEED_COMPLAINANTS,
        'actsectionassociations': seed.SEED_ACT_SECTIONS,
        'customedges': seed.SEED_CUSTOM_EDGES
    };
    
    let allData: any = {};
    const report: any = {};
    for (let i = 0; i < tables.length; i++) {
        const tableName = tables[i];
        const pkField = pks[i];
        const expectedData = expected[tableName as keyof typeof expected];
        
        console.log(`Fetching actual records from ${tableName}...`);
        
        let uniqueExpectedData = expectedData;
        if (tableName === 'actsectionassociations') {
             // De-duplicate in case generator created dupes, though fetchItem needs an array of objects
             const seen = new Set();
             uniqueExpectedData = expectedData.filter((r: any) => {
                 const k = `${r.CaseMasterID}_${r.Act_Section}`;
                 if (seen.has(k)) return false;
                 seen.add(k);
                 return true;
             });
        }
        
        allData[tableName] = await fetchAll(nosql.table(tableName), uniqueExpectedData, pkField, tableName);
        const count = allData[tableName].length;
        const exp = uniqueExpectedData.length;
        report[tableName] = { expected: exp, actual: count, diff: count - exp, status: count === exp ? 'PASS' : 'FAIL' };
    }
    
    // Validations
    let firMissing: any[] = [];
    const crimeNos = new Set();
    const casemasterIds = new Set(allData['casemasters'].map((c: any) => Number(c.CaseMasterID)));
    
    let invalidFormats = 0;
    const firsByYear: any = {};
    allData['casemasters'].forEach((c: any) => {
        const cno = String(c.CrimeNo || '');
        if (!cno.match(/^[0-9]{4}\/202[0-9]$/)) invalidFormats++;
        crimeNos.add(cno);
        const parts = cno.split('/');
        if (parts.length === 2) {
            const num = parseInt(parts[0], 10);
            const year = parts[1];
            if (!firsByYear[year]) firsByYear[year] = [];
            firsByYear[year].push(num);
        }
    });
    
    let isSequential = true;
    for (const year in firsByYear) {
        const nums = firsByYear[year].sort((a: number, b: number) => a - b);
        for (let i = 0; i < nums.length; i++) {
            if (nums[i] !== i + 1) {
                isSequential = false;
                firMissing.push(`${i+1}/${year}`);
            }
        }
    }
    
    const sortedFirs = Array.from(crimeNos).sort();
    
    report['fir_number_format'] = { 
        status: invalidFormats === 0 ? 'PASS' : 'FAIL', 
        invalidFormats,
        total: crimeNos.size,
        first10: sortedFirs.slice(0, 10),
        last10: sortedFirs.slice(-10),
        missingCount: firMissing.length,
        isSequential
    };
    
    let invalidDates = 0, validDates = 0, missingTime = 0, dayCases = 0, nightCases = 0;
    allData['casemasters'].forEach((c: any) => {
        const dStr = String(c.IncidentFromDate || '');
        // format: "31-03-2026 01:46 PM"
        const match = dStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})\s+(AM|PM)$/i);
        if (!match) {
            invalidDates++;
        } else {
            validDates++;
            let hour = parseInt(match[4], 10);
            const ampm = match[6].toUpperCase();
            if (ampm === 'PM' && hour < 12) hour += 12;
            if (ampm === 'AM' && hour === 12) hour = 0;
            
            if (hour >= 6 && hour < 18) dayCases++;
            else nightCases++;
        }
    });
    report['incident_date_format'] = { 
        status: invalidDates === 0 ? 'PASS' : 'FAIL', 
        total: allData['casemasters'].length,
        validDates, invalidDates, dayCases, nightCases 
    };
    
    const orphanReport: any = {};
    let totalOrphans = 0;
    ['accuseds', 'victims', 'complainants', 'actsectionassociations', 'customedges'].forEach(t => {
        let tOrphans = 0;
        let validRefs = 0;
        allData[t].forEach((r: any) => {
            if (casemasterIds.has(Number(r.CaseMasterID))) {
                validRefs++;
            } else {
                tOrphans++;
                totalOrphans++;
            }
        });
        orphanReport[t] = { total: allData[t].length, validRefs, orphans: tOrphans };
    });
    report['orphan_relationships'] = { status: totalOrphans === 0 ? 'PASS' : 'FAIL', totalOrphans, details: orphanReport };
    
    let duplicateActSections = 0;
    const caseActSections = new Set();
    allData['actsectionassociations'].forEach((r: any) => {
        const key = `${r.CaseMasterID}:${r.Act_Section}`;
        if (caseActSections.has(key)) duplicateActSections++;
        caseActSections.add(key);
    });
    report['act_section_uniqueness'] = { status: duplicateActSections === 0 ? 'PASS' : 'FAIL', duplicateActSections };
    
    const duplicatePks: any = {};
    for (const t of tables) {
        const actualCount = allData[t].length;
        const expectedCount = Array.isArray(expected[t as keyof typeof expected]) ? (expected[t as keyof typeof expected] as any).length : expected[t as keyof typeof expected];
        duplicatePks[t] = expectedCount - actualCount; // Any missing are considered dupes overwriting each other
    }
    report['duplicate_pks'] = duplicatePks;
    
    const unitIds = new Set(allData['units'].map((u: any) => Number(u.UnitID)));
    const districtIds = new Set(allData['districts'].map((d: any) => Number(d.DistrictID)));
    let casemasterOrphanUnits = 0;
    let unitOrphanDistricts = 0;
    let empOrphanDistricts = 0;
    let missingRequired = 0;
    
    allData['casemasters'].forEach((c: any) => {
        if (!unitIds.has(Number(c.PoliceStationID))) casemasterOrphanUnits++;
        if (!c.CrimeNo || !c.IncidentFromDate || !c.PoliceStationID) {
            missingRequired++;
        }
    });
    
    allData['units'].forEach((u: any) => {
        if (!districtIds.has(Number(u.DistrictID))) unitOrphanDistricts++;
    });
    
    allData['employees'].forEach((e: any) => {
        if (!districtIds.has(Number(e.DistrictID))) empOrphanDistricts++;
    });
    
    const totalOrphanDistricts = unitOrphanDistricts + empOrphanDistricts;
    
    report['police_district_references'] = {
        status: (casemasterOrphanUnits === 0 && totalOrphanDistricts === 0) ? 'PASS' : 'FAIL',
        orphanUnits: casemasterOrphanUnits,
        orphanDistricts: totalOrphanDistricts,
        details: { unitOrphanDistricts, empOrphanDistricts }
    };
    report['required_fields'] = {
        status: missingRequired === 0 ? 'PASS' : 'FAIL',
        missingRequired
    };
    
    res.json({ success: true, report });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};
