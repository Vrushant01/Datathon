import * as fs from 'fs';
import * as path from 'path';

const catalyst = require('zcatalyst-sdk-node');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAll(table: any, itemsData: any[], pkField: string, tableName: string) {
    const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
    let allRecords: any[] = [];
    
    for (let i = 0; i < itemsData.length; i += 25) {
        const batch = itemsData.slice(i, i + 25);
        const itemKeys = batch.map((v: any) => {
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
                if (retries === 0) {
                    console.error(`VERIFICATION_ERROR in ${tableName}: ${e.message}`);
                }
                await sleep(500); // Backoff on error
            }
        }
        await sleep(100); // Prevent DNS/rate limits
    }
    return allRecords;
}

async function verifyCloudScale() {
    console.log("Starting CloudScale Verification...");
    
    const requiredEnv = [
        'CATALYST_PROJECT_ID',
        'CATALYST_PROJECT_KEY',
        'CATALYST_CLIENT_ID',
        'CATALYST_CLIENT_SECRET',
        'CATALYST_REFRESH_TOKEN'
    ];
    
    let missing = [];
    for (const env of requiredEnv) {
        if (!process.env[env]) {
            missing.push(env);
        }
    }
    if (missing.length > 0) {
        console.error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
    
    const app = catalyst.initializeApp({
        project_id: process.env.CATALYST_PROJECT_ID,
        project_key: process.env.CATALYST_PROJECT_KEY,
        environment: process.env.CATALYST_ENVIRONMENT || 'Development',
        credential: catalyst.credential.refreshToken({
            client_id: process.env.CATALYST_CLIENT_ID,
            client_secret: process.env.CATALYST_CLIENT_SECRET,
            refresh_token: process.env.CATALYST_REFRESH_TOKEN
        })
    });
    
    const nosql = app.nosql();
    const seedPath = path.join(__dirname, '../src/seedData.json');
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
    
    // VALIDATIONS
    let firMissing: any[] = [];
    const crimeNos = new Set();
    const casemasterIds = new Set(allData['casemasters'].map((c: any) => Number(c.CaseMasterID)));
    
    let invalidFormats = 0;
    allData['casemasters'].forEach((c: any) => {
        const cno = String(c.CrimeNo || '');
        if (!cno.match(/^[0-9]{4}\/202[0-9]$/)) invalidFormats++;
        crimeNos.add(cno);
    });
    
    const sortedFirs = Array.from(crimeNos).sort();
    let isSequential = true;
    if (sortedFirs.length > 0) {
        for (let i = 0; i < sortedFirs.length; i++) {
            const num = parseInt((sortedFirs[i] as string).split('/')[0], 10);
            if (num !== i + 1) {
                isSequential = false;
                firMissing.push(i + 1);
            }
        }
    }
    
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
    let totalDupePks = 0;
    
    for (const t of tables) {
        let dupes = 0;
        if (t === 'actsectionassociations') {
             const seen = new Set();
             const expData = expected['actsectionassociations'];
             expData.forEach((r: any) => seen.add(`${r.CaseMasterID}_${r.Act_Section}`));
             dupes = expData.length - seen.size;
        } else {
            const seen = new Set();
            const expData = expected[t as keyof typeof expected] as any[];
            expData.forEach((r: any) => seen.add(r[pks[tables.indexOf(t)]]));
            dupes = expData.length - seen.size;
        }
        
        duplicatePks[t] = dupes;
        totalDupePks += dupes;
    }
    report['duplicate_pks'] = { status: totalDupePks === 0 ? 'PASS' : 'FAIL', details: duplicatePks };
    
    const reportPath = path.join(__dirname, 'cloudscale_verification_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({ success: true, report }, null, 2));
    
    console.log("\n=================================");
    console.log("FINAL CLOUDSCALE VERIFICATION REPORT");
    console.log("=================================\n");
    console.log(JSON.stringify(report, null, 2));
}

verifyCloudScale().catch(e => {
    console.error("Verification failed:", e);
    process.exit(1);
});