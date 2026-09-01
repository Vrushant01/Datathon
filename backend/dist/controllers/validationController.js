"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMigration = void 0;
const zcatalyst_sdk_node_1 = __importDefault(require("zcatalyst-sdk-node"));
const models_1 = require("../models");
const { NoSQLMarshall, NoSQLItem, NoSQLEnum } = require('zcatalyst-sdk-node/lib/no-sql');
const { NoSQLOperator } = NoSQLEnum;
// Fetch specific items by PK (spot check)
async function fetchItemsByPKs(app, tableName, pkField, pkValues) {
    const nosql = app.nosql();
    const table = nosql.table(tableName);
    const keys = pkValues.map(v => new NoSQLItem().addNumber(pkField, v));
    const resp = await table.fetchItem({ keys });
    const raw = resp.toJSON?.() ?? resp;
    return (raw.get || []).map((d) => d.item ?? d);
}
// Query a GSI with EQUALS on pk, fully paginated
async function queryGSIPaginated(app, tableName, indexId, pkField, pkValue) {
    const nosql = app.nosql();
    const table = nosql.table(tableName);
    let allItems = [];
    let startKey = undefined;
    do {
        const query = {
            key_condition: {
                attribute: pkField,
                operator: NoSQLOperator.EQUALS,
                value: NoSQLMarshall.makeNumber(pkValue),
            },
            limit: 100,
        };
        if (startKey)
            query.start_key = startKey;
        const resp = await table.queryIndex(indexId, query);
        const raw = resp;
        const items = raw.get || [];
        allItems = allItems.concat(items.map((d) => {
            const item = d.item;
            if (item && typeof item.toJSON === 'function')
                return item.toJSON();
            return item ?? d;
        }));
        startKey = raw.start_key ?? undefined;
    } while (startKey);
    return allItems;
}
// Count items in a table via GSI by iterating all known IDs of the source
// For districts (31), units->districtId(1..31), etc. this is practical for small tables.
// For large tables, we randomly sample PKs and probe existence.
async function sampleByPKs(app, tableName, pkField, sampleIds) {
    const nosql = app.nosql();
    const table = nosql.table(tableName);
    const missing = [];
    let found = 0;
    // Batch into groups of 25 (fetchItem limit)
    for (let i = 0; i < sampleIds.length; i += 25) {
        const batch = sampleIds.slice(i, i + 25);
        const keys = batch.map(v => new NoSQLItem().addNumber(pkField, v));
        try {
            const resp = await table.fetchItem({ keys });
            const raw = resp;
            const results = raw.get || [];
            results.forEach((d, idx) => {
                if (d.status === 'FAILURE' || !d.item) {
                    missing.push(batch[idx]);
                }
                else {
                    found++;
                }
            });
        }
        catch (e) {
            batch.forEach(id => missing.push(id));
        }
    }
    return { found, missing };
}
const validateMigration = async (req, res) => {
    const t0 = Date.now();
    try {
        const app = zcatalyst_sdk_node_1.default.initialize(req);
        // ── 1. MongoDB counts ─────────────────────────────────────────────────────
        const [mgD, mgU, mgE, mgC, mgA, mgV] = await Promise.all([
            models_1.District.countDocuments(), models_1.Unit.countDocuments(), models_1.Employee.countDocuments(),
            models_1.CaseMaster.countDocuments(), models_1.Accused.countDocuments(), models_1.Victim.countDocuments(),
        ]);
        const mgCounts = { districts: mgD, units: mgU, employees: mgE, casemasters: mgC, accuseds: mgA, victims: mgV };
        const expected = { districts: 31, units: 930, employees: 930, casemasters: 5000, accuseds: 5000, victims: 5000 };
        // ── 2. CloudScale spot-check by probing known PKs ─────────────────────────
        // Get actual IDs from MongoDB to probe
        const allDistricts = await models_1.District.find().select('DistrictID').lean();
        const distIds = allDistricts.map(d => Number(d.DistrictID));
        const distCheck = await sampleByPKs(app, 'districts', 'DistrictID', distIds);
        const allUnits = await models_1.Unit.find().select('UnitID').lean();
        const unitIds = allUnits.map(u => Number(u.UnitID));
        // Sample 50
        const unitSampleIds = unitIds.sort(() => 0.5 - Math.random()).slice(0, 50);
        const unitCheck = await sampleByPKs(app, 'units', 'UnitID', unitSampleIds);
        const allEmps = await models_1.Employee.find().select('EmployeeID').lean();
        const empIds = allEmps.map(e => Number(e.EmployeeID));
        const empSampleIds = empIds.sort(() => 0.5 - Math.random()).slice(0, 50);
        const empCheck = await sampleByPKs(app, 'employees', 'EmployeeID', empSampleIds);
        const allCases = await models_1.CaseMaster.find().select('CaseMasterID').lean();
        const caseIds = allCases.map(c => Number(c.CaseMasterID));
        const caseSampleIds = caseIds.sort(() => 0.5 - Math.random()).slice(0, 100);
        const caseCheck = await sampleByPKs(app, 'casemasters', 'CaseMasterID', caseSampleIds);
        const allAccused = await models_1.Accused.find().select('AccusedMasterID').lean();
        const accIds = allAccused.map(a => Number(a.AccusedMasterID));
        const accSampleIds = accIds.sort(() => 0.5 - Math.random()).slice(0, 20);
        const accCheck = await sampleByPKs(app, 'accuseds', 'AccusedMasterID', accSampleIds);
        const allVictims = await models_1.Victim.find().select('VictimMasterID').lean();
        const vicIds = allVictims.map(v => Number(v.VictimMasterID));
        const vicSampleIds = vicIds.sort(() => 0.5 - Math.random()).slice(0, 20);
        const vicCheck = await sampleByPKs(app, 'victims', 'VictimMasterID', vicSampleIds);
        // ── 3. District name spot-check (all 31) ──────────────────────────────────
        const mgDistSample = await models_1.District.find().lean();
        const nosqlD = app.nosql();
        const districtSpotCheck = [];
        for (const mg of mgDistSample) {
            const keys = [new NoSQLItem().addNumber('DistrictID', Number(mg.DistrictID))];
            try {
                const resp = await nosqlD.table('districts').fetchItem({ keys });
                const raw = resp;
                const d = (raw.get || [])[0];
                const csItem = d?.item;
                let csName = undefined;
                if (csItem) {
                    const json = typeof csItem.toJSON === 'function' ? csItem.toJSON() : csItem;
                    // Handle {S: "name"} format returned by API
                    csName = json.DistrictName?.S || json.DistrictName;
                }
                districtSpotCheck.push({ DistrictID: mg.DistrictID, mgName: mg.DistrictName, csName, match: csName === mg.DistrictName });
            }
            catch {
                districtSpotCheck.push({ DistrictID: mg.DistrictID, mgName: mg.DistrictName, csName: 'ERROR', match: false });
            }
        }
        // ── 4. GSI query tests ────────────────────────────────────────────────────
        const gsiResults = {};
        const gsiTests = [
            { table: 'units', index: 'units_by_district', pk: 'DistrictID', val: 1 },
            { table: 'employees', index: 'employees_by_unit', pk: 'UnitID', val: 1 },
            { table: 'casemasters', index: 'cases_by_station', pk: 'PoliceStationID', val: 1 },
            { table: 'casemasters', index: 'cases_by_officer', pk: 'PolicePersonID', val: 1 },
            { table: 'accuseds', index: 'accused_by_case', pk: 'CaseMasterID', val: 1 },
            { table: 'victims', index: 'victims_by_case', pk: 'CaseMasterID', val: 1 },
        ];
        for (const test of gsiTests) {
            const key = `${test.index}(${test.pk}=${test.val})`;
            try {
                const rows = await queryGSIPaginated(app, test.table, test.index, test.pk, test.val);
                gsiResults[key] = { status: 'PASS', count: rows.length };
            }
            catch (e) {
                gsiResults[key] = { status: 'FAIL', error: e.message };
            }
        }
        // ── 5. Repeat offender check via accused GSI ──────────────────────────────
        // Query accused_by_case for a few caseIds and aggregate by PersonID
        let personCaseMap = {};
        for (let caseId = 1; caseId <= 20; caseId++) {
            try {
                const rows = await queryGSIPaginated(app, 'accuseds', 'accused_by_case', 'CaseMasterID', caseId);
                rows.forEach((row) => {
                    const pid = row.PersonID;
                    if (!pid)
                        return;
                    if (!personCaseMap[pid])
                        personCaseMap[pid] = [];
                    personCaseMap[pid].push(String(caseId));
                });
            }
            catch { }
        }
        const repeatOffenders = Object.entries(personCaseMap)
            .filter(([, cases]) => cases.length > 1)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 5)
            .map(([pid, cases]) => ({ personId: pid, caseIds: cases, offenceCount: cases.length }));
        const elapsed = Date.now() - t0;
        // ── 6. Count report ───────────────────────────────────────────────────────
        // We can't full-scan, so we report MongoDB counts (authoritative) and probe coverage
        const countReport = Object.entries(mgCounts).map(([tbl, mg]) => ({
            table: tbl,
            expected: expected[tbl],
            mongodb: mg,
            mongoMatch: mg === expected[tbl] ? 'PASS' : 'FAIL',
            csProbeResult: tbl === 'districts' ? `${distCheck.found}/31 present` :
                tbl === 'units' ? `${unitCheck.found}/50 sampled found` :
                    tbl === 'employees' ? `${empCheck.found}/50 sampled found` :
                        tbl === 'casemasters' ? `${caseCheck.found}/100 sampled found` :
                            tbl === 'accuseds' ? `${accCheck.found}/20 sampled found` :
                                `${vicCheck.found}/20 sampled found`,
        }));
        res.json({
            validationBuild: 'post-migration-v2',
            elapsedMs: elapsed,
            mongodbCounts: mgCounts,
            countReport,
            cloudscaleProbes: {
                districts_31_of_31: { found: distCheck.found, missing: distCheck.missing },
                units_50_sample: { found: unitCheck.found, missing: unitCheck.missing.length },
                employees_50_sample: { found: empCheck.found, missing: empCheck.missing.length },
                casemasters_100_sample: { found: caseCheck.found, missing: caseCheck.missing.length },
                accuseds_20_sample: { found: accCheck.found, missing: accCheck.missing.length },
                victims_20_sample: { found: vicCheck.found, missing: vicCheck.missing.length },
            },
            districtNameSpotCheck: districtSpotCheck,
            gsiQueryTests: gsiResults,
            repeatOffenderSample: repeatOffenders,
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Validation failed', details: err.message });
    }
};
exports.validateMigration = validateMigration;
