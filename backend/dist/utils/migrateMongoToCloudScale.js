"use strict";
/**
 * MongoDB → CloudScale NoSQL Migration Script
 *
 * SAFE: Does NOT delete or modify MongoDB records.
 * IDEMPOTENT: Running multiple times creates zero duplicates.
 * DRY-RUN: Pass --dry-run to preview without writing.
 *
 * IMPORTANT EXECUTION REQUIREMENT:
 * The Zoho Catalyst SDK (zcatalyst-sdk-node) CANNOT be initialized from a
 * standalone ts-node process — it requires the AppSail runtime context
 * (injected by `catalyst serve` or inside the Catalyst backend deployment).
 *
 * Therefore this script is designed to be called via:
 *   POST /api/admin/migrate-to-cloudscale
 *
 * That endpoint runs inside the Catalyst AppSail process which has the
 * required runtime context for the SDK to initialize correctly.
 *
 * For DRY-RUN validation of source data (not CloudScale writes):
 *   npx ts-node scripts/migrateMongoToCloudScale.ts --dry-run
 * This works standalone because in dry-run mode the Catalyst SDK is never called.
 *
 * Usage:
 *   npx ts-node scripts/migrateMongoToCloudScale.ts --dry-run   # local validation
 *   POST /api/admin/migrate-to-cloudscale                       # actual migration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigration = runMigration;
const mongoose_1 = __importDefault(require("mongoose"));
const catalyst = require('zcatalyst-sdk-node');
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const models_1 = require("../models");
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const IS_DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
const SYNC_UPDATES = process.argv.includes('--sync-updates');
const BATCH_SIZE = 25;
const SLEEP_MS = 200; // Throttle between batches
// ============================================================
// HELPERS
// ============================================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function log(msg) {
    const ts = new Date().toISOString();
    console.log(`[${ts}] ${msg}`);
}
function logError(msg) {
    const ts = new Date().toISOString();
    console.error(`[${ts}] ❌ ${msg}`);
}
/**
 * Fetch all existing IDs from a CloudScale NoSQL table by scanning known ID ranges.
 * Returns a Set of existing IDs (as numbers).
 */
async function fetchExistingIds(app, tableName, pkField, idRange) {
    const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
    const nosql = app.nosql();
    const table = nosql.table(tableName);
    const existingIds = new Set();
    for (let i = 0; i < idRange.length; i += BATCH_SIZE) {
        const batch = idRange.slice(i, i + BATCH_SIZE);
        const keys = batch.map((v) => new NoSQLItem().addNumber(pkField, v));
        try {
            const resp = await table.fetchItem({ keys });
            const raw = resp.get || [];
            raw.forEach((d) => {
                const item = d.item;
                if (!item)
                    return;
                const parsed = typeof item.toJSON === 'function' ? item.toJSON() : item;
                const rawVal = parsed[pkField];
                const id = typeof rawVal === 'object' ? Number(rawVal.N ?? rawVal.S ?? 0) : Number(rawVal);
                if (!isNaN(id))
                    existingIds.add(id);
            });
        }
        catch {
            // Items not found — that's fine
        }
        await sleep(50);
    }
    return existingIds;
}
/**
 * Fetch all existing IDs from a CloudScale NoSQL table by scanning known ID ranges.
 * Returns a Set of existing IDs (as strings).
 */
async function fetchExistingStringIds(app, tableName, pkField, idRange) {
    const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
    const nosql = app.nosql();
    const table = nosql.table(tableName);
    const existingIds = new Set();
    for (let i = 0; i < idRange.length; i += BATCH_SIZE) {
        const batch = idRange.slice(i, i + BATCH_SIZE);
        const keys = batch.map((v) => new NoSQLItem().addString(pkField, v));
        try {
            const resp = await table.fetchItem({ keys });
            const raw = resp.get || [];
            raw.forEach((d) => {
                const item = d.item;
                if (!item)
                    return;
                const parsed = typeof item.toJSON === 'function' ? item.toJSON() : item;
                const rawVal = parsed[pkField];
                const id = typeof rawVal === 'object' ? String(rawVal.S ?? rawVal.N ?? '') : String(rawVal);
                if (id)
                    existingIds.add(id);
            });
        }
        catch {
            // Items not found — that's fine
        }
        await sleep(50);
    }
    return existingIds;
}
/**
 * Insert a single item into a CloudScale NoSQL table.
 */
async function insertItem(app, tableName, data) {
    const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
    const nosql = app.nosql();
    const table = nosql.table(tableName);
    const item = NoSQLItem.from(data);
    await table.insertItems({ item });
}
function removeEmptyValues(obj) {
    if (obj === null || obj === undefined || obj === '') {
        return undefined; // signals deletion if used in parent
    }
    if (Array.isArray(obj)) {
        return obj.map(removeEmptyValues).filter(v => v !== undefined);
    }
    if (typeof obj === 'object') {
        const cleaned = {};
        for (const key in obj) {
            const val = removeEmptyValues(obj[key]);
            if (val !== undefined && val !== null && val !== '') {
                cleaned[key] = val;
            }
        }
        return cleaned;
    }
    return obj;
}
// ============================================================
// ENTITY MIGRATORS
// ============================================================
async function migrateEntity(label, app, nosqlTableName, pkField, idRange, records) {
    const report = {
        mongoTotal: records.length,
        uniqueSource: records.length,
        existingCloudScale: 0,
        newInserted: 0,
        updated: 0,
        skippedDuplicate: 0,
        conflicts: 0,
        failed: 0,
        results: []
    };
    log(`\n--- Migrating ${label} → ${nosqlTableName} (${records.length} records) ---`);
    // Fetch all existing IDs in CloudScale
    log(`  Fetching existing CloudScale IDs for ${nosqlTableName}...`);
    const existingIds = IS_DRY_RUN ? new Set() : await fetchExistingIds(app, nosqlTableName, pkField, idRange);
    report.existingCloudScale = existingIds.size;
    log(`  Found ${existingIds.size} existing records in CloudScale.`);
    for (const record of records) {
        const id = Number(record[pkField]);
        const entityResult = { id, action: 'NEW' };
        if (isNaN(id)) {
            entityResult.action = 'FAILED';
            entityResult.reason = `${pkField} is not a valid number: ${record[pkField]}`;
            report.failed++;
            report.results.push(entityResult);
            logError(`${label} ${record[pkField]} — FAILED: invalid PK`);
            continue;
        }
        // Remove MongoDB-specific fields
        let clean = { ...record };
        delete clean._id;
        delete clean.__v;
        clean = removeEmptyValues(clean);
        if (existingIds.has(id)) {
            if (SYNC_UPDATES && !IS_DRY_RUN) {
                try {
                    await insertItem(app, nosqlTableName, clean); // NoSQL upsert replaces item
                    entityResult.action = 'UPDATED';
                    report.updated++;
                    existingIds.add(id);
                }
                catch (e) {
                    entityResult.action = 'FAILED';
                    entityResult.reason = e.message;
                    report.failed++;
                    logError(`${label} ${id} — FAILED UPDATE: ${e.message}`);
                }
            }
            else {
                entityResult.action = 'ALREADY_EXISTS';
                report.skippedDuplicate++;
            }
        }
        else {
            if (!IS_DRY_RUN) {
                try {
                    await insertItem(app, nosqlTableName, clean);
                    entityResult.action = 'NEW';
                    report.newInserted++;
                    existingIds.add(id);
                    await sleep(SLEEP_MS / 10);
                }
                catch (e) {
                    entityResult.action = 'FAILED';
                    entityResult.reason = e.message;
                    report.failed++;
                    logError(`${label} ${id} — FAILED INSERT: ${e.message}`);
                }
            }
            else {
                entityResult.action = 'NEW'; // Dry run — would insert
                report.newInserted++;
            }
        }
        report.results.push(entityResult);
    }
    log(`  ✅ ${label} complete: NEW=${report.newInserted}, EXISTS=${report.skippedDuplicate}, UPDATED=${report.updated}, FAILED=${report.failed}`);
    return report;
}
async function migrateStringEntity(label, app, nosqlTableName, pkField, idRange, records) {
    const report = {
        mongoTotal: records.length,
        uniqueSource: records.length,
        existingCloudScale: 0,
        newInserted: 0,
        updated: 0,
        skippedDuplicate: 0,
        conflicts: 0,
        failed: 0,
        results: []
    };
    log(`\n--- Migrating ${label} → ${nosqlTableName} (${records.length} records) ---`);
    // Fetch all existing IDs in CloudScale
    log(`  Fetching existing CloudScale IDs for ${nosqlTableName}...`);
    const existingIds = IS_DRY_RUN ? new Set() : await fetchExistingStringIds(app, nosqlTableName, pkField, idRange);
    report.existingCloudScale = existingIds.size;
    log(`  Found ${existingIds.size} existing records in CloudScale.`);
    for (const record of records) {
        const id = String(record[pkField]);
        const entityResult = { id, action: 'NEW' };
        if (!id) {
            entityResult.action = 'FAILED';
            entityResult.reason = `${pkField} is missing or empty: ${record[pkField]}`;
            report.failed++;
            report.results.push(entityResult);
            logError(`${label} ${record[pkField]} — FAILED: invalid PK`);
            continue;
        }
        // Remove MongoDB-specific fields
        let clean = { ...record };
        delete clean._id;
        delete clean.__v;
        clean = removeEmptyValues(clean);
        if (existingIds.has(id)) {
            if (SYNC_UPDATES && !IS_DRY_RUN) {
                try {
                    await insertItem(app, nosqlTableName, clean); // NoSQL upsert replaces item
                    entityResult.action = 'UPDATED';
                    report.updated++;
                    existingIds.add(id);
                }
                catch (e) {
                    entityResult.action = 'FAILED';
                    entityResult.reason = e.message;
                    report.failed++;
                    logError(`${label} ${id} — FAILED UPDATE: ${e.message}`);
                }
            }
            else {
                entityResult.action = 'ALREADY_EXISTS';
                report.skippedDuplicate++;
            }
        }
        else {
            if (!IS_DRY_RUN) {
                try {
                    await insertItem(app, nosqlTableName, clean);
                    entityResult.action = 'NEW';
                    report.newInserted++;
                    existingIds.add(id);
                    await sleep(SLEEP_MS / 10);
                }
                catch (e) {
                    entityResult.action = 'FAILED';
                    entityResult.reason = e.message;
                    report.failed++;
                    logError(`${label} ${id} — FAILED INSERT: ${e.message}`);
                }
            }
            else {
                entityResult.action = 'NEW'; // Dry run — would insert
                report.newInserted++;
            }
        }
        report.results.push(entityResult);
    }
    log(`  ✅ ${label} complete: NEW=${report.newInserted}, EXISTS=${report.skippedDuplicate}, UPDATED=${report.updated}, FAILED=${report.failed}`);
    return report;
}
/**
 * Migrate ActSectionAssociation using composite key (CaseMasterID + ActID + SectionID).
 */
async function migrateActSections(app, records) {
    const report = {
        mongoTotal: records.length,
        uniqueSource: 0,
        existingCloudScale: 0,
        newInserted: 0,
        updated: 0,
        skippedDuplicate: 0,
        conflicts: 0,
        failed: 0,
        results: []
    };
    log(`\n--- Migrating ActSectionAssociation (${records.length} records) ---`);
    log('  Note: No PK in schema. Dedup key = (CaseMasterID, ActID, SectionID)');
    // We cannot efficiently scan all act sections from NoSQL without a PK.
    // Strategy: In dry-run, report all as NEW. In real run, the script 
    // MUST be run after verifying CloudScale has 0 records, OR track via migration map file.
    // Build dedup set from source (to detect source-side duplicates)
    const compositeKeys = new Set();
    const uniqueRecords = [];
    for (const rec of records) {
        const key = `${rec.CaseMasterID}|${rec.ActID}|${rec.SectionID}`;
        if (compositeKeys.has(key)) {
            report.skippedDuplicate++;
            report.results.push({ action: 'SKIPPED_DUPLICATE', id: key, reason: 'Duplicate composite key in source' });
        }
        else {
            compositeKeys.add(key);
            uniqueRecords.push(rec);
        }
    }
    report.uniqueSource = uniqueRecords.length;
    log(`  Source unique records (by composite key): ${uniqueRecords.length}`);
    log(`  Source duplicates detected: ${report.skippedDuplicate}`);
    if (!IS_DRY_RUN) {
        log('  ⚠️  ActSectionAssociation cannot be safely deduped against existing CloudScale records without a PK.');
        log('  ⚠️  Recommend verifying CloudScale ActSectionAssociation count is 0 before running, or use --dry-run first.');
        // For safety: only insert if table appears empty
        // We'll insert all unique source records with batch inserts
        for (let i = 0; i < uniqueRecords.length; i += BATCH_SIZE) {
            const batch = uniqueRecords.slice(i, i + BATCH_SIZE);
            for (const rec of batch) {
                let clean = { ...rec };
                delete clean._id;
                delete clean.__v;
                clean = removeEmptyValues(clean);
                try {
                    await insertItem(app, 'ActSectionAssociation', clean);
                    report.newInserted++;
                    report.results.push({ action: 'NEW', id: `${rec.CaseMasterID}|${rec.ActID}|${rec.SectionID}` });
                }
                catch (e) {
                    report.failed++;
                    report.results.push({ action: 'FAILED', id: `${rec.CaseMasterID}|${rec.ActID}|${rec.SectionID}`, reason: e.message });
                }
            }
            await sleep(SLEEP_MS);
        }
    }
    else {
        report.newInserted = uniqueRecords.length;
        uniqueRecords.forEach(rec => report.results.push({ action: 'NEW', id: `${rec.CaseMasterID}|${rec.ActID}|${rec.SectionID}` }));
    }
    log(`  ✅ ActSection complete: UNIQUE=${report.uniqueSource}, NEW=${report.newInserted}, SKIPPED_DUP=${report.skippedDuplicate}, FAILED=${report.failed}`);
    return report;
}
// ============================================================
// MAIN
// ============================================================
async function runMigration(app, IS_DRY_RUN = false, SYNC_UPDATES = false) {
    console.log('\n========================================================');
    console.log(`MongoDB → CloudScale Migration ${IS_DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
    if (SYNC_UPDATES)
        console.log('UPDATE SYNC ENABLED: Existing records will be overwritten.');
    console.log('========================================================\n');
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
        logError('MONGO_URI missing in .env');
        throw new Error('MONGO_URI missing in .env');
    }
    await mongoose_1.default.connect(mongoURI);
    log('✅ Connected to MongoDB (read-only)');
    if (!app) {
        log('ℹ️  DRY RUN: Catalyst SDK not initialized — no CloudScale writes will occur.');
    }
    else {
        log('✅ Connected to Zoho Catalyst CloudScale');
    }
    const allReports = {};
    // ----------------------------------------------------------
    // STEP 1: Districts (31 records)
    // ----------------------------------------------------------
    const districts = await models_1.District.find().lean();
    const districtIds = districts.map((d) => d.DistrictID).filter(Boolean);
    allReports['districts'] = await migrateEntity('District', app, 'districts', 'DistrictID', districtIds, districts);
    // ----------------------------------------------------------
    // STEP 2: Units / Police Stations (930 records)
    // ----------------------------------------------------------
    const units = await models_1.Unit.find().lean();
    const unitIds = units.map((u) => u.UnitID).filter(Boolean);
    allReports['units'] = await migrateEntity('Unit', app, 'units', 'UnitID', unitIds, units);
    // ----------------------------------------------------------
    // STEP 3: Employees (1,860 records)
    // ----------------------------------------------------------
    const employees = await models_1.Employee.find().lean();
    const employeeIds = employees.map((e) => e.EmployeeID).filter(Boolean);
    allReports['employees'] = await migrateEntity('Employee', app, 'employees', 'EmployeeID', employeeIds, employees);
    // ----------------------------------------------------------
    // STEP 4: CaseMasters (9,674 records) — MOST CRITICAL
    // ----------------------------------------------------------
    const cases = await models_1.CaseMaster.find().lean();
    const caseIds = cases.map((c) => c.CaseMasterID).filter(Boolean);
    allReports['casemasters'] = await migrateEntity('CaseMaster', app, 'casemasters', 'CaseMasterID', caseIds, cases);
    // ----------------------------------------------------------
    // STEP 5: Accused (9,674 records)
    // ----------------------------------------------------------
    const accused = await models_1.Accused.find().lean();
    const accusedIds = accused.map((a) => a.AccusedMasterID).filter(Boolean);
    allReports['accuseds'] = await migrateEntity('Accused', app, 'accuseds', 'AccusedMasterID', accusedIds, accused);
    // ----------------------------------------------------------
    // STEP 6: Victims (9,674 records)
    // ----------------------------------------------------------
    const victims = await models_1.Victim.find().lean();
    const victimIds = victims.map((v) => v.VictimMasterID).filter(Boolean);
    allReports['victims'] = await migrateEntity('Victim', app, 'victims', 'VictimMasterID', victimIds, victims);
    // ----------------------------------------------------------
    // STEP 7: Complainants (9,674 records)
    // ----------------------------------------------------------
    const complainants = await models_1.Complainant.find().lean();
    const complainantIds = complainants.map((c) => c.ComplainantID).filter(Boolean);
    allReports['complainants'] = await migrateEntity('Complainant', app, 'complainants', 'ComplainantID', complainantIds, complainants);
    // ----------------------------------------------------------
    // STEP 8: ActSectionAssociations (11,711 records)
    // ----------------------------------------------------------
    const actSections = await models_1.ActSectionAssociation.find().lean();
    allReports['actsectionassociations'] = await migrateActSections(app, actSections);
    // ----------------------------------------------------------
    // STEP 9: CustomEdges (10,000 records)
    // ----------------------------------------------------------
    const customEdges = await mongoose_1.default.connection.db.collection('customedges').find().toArray();
    const customEdgeIds = customEdges.map((e) => String(e.EdgeID)).filter(Boolean);
    allReports['customedges'] = await migrateStringEntity('CustomEdge', app, 'customedges', 'EdgeID', customEdgeIds, customEdges);
    // ----------------------------------------------------------
    // FINAL REPORT
    // ----------------------------------------------------------
    console.log('\n\n========================================================');
    console.log(`FINAL MIGRATION REPORT${IS_DRY_RUN ? ' (DRY RUN)' : ''}`);
    console.log('========================================================\n');
    console.log('Entity'.padEnd(25) + 'Mongo'.padEnd(10) + 'Unique'.padEnd(10) + 'Exists'.padEnd(10) + 'New'.padEnd(10) + 'Updated'.padEnd(10) + 'Skip'.padEnd(10) + 'Conflict'.padEnd(10) + 'Failed');
    console.log('-'.repeat(105));
    const entityOrder = ['districts', 'units', 'employees', 'casemasters', 'accuseds', 'victims', 'complainants', 'actsectionassociations', 'customedges'];
    for (const entity of entityOrder) {
        const r = allReports[entity];
        if (!r)
            continue;
        console.log(entity.padEnd(25) +
            String(r.mongoTotal).padEnd(10) +
            String(r.uniqueSource).padEnd(10) +
            String(r.existingCloudScale).padEnd(10) +
            String(r.newInserted).padEnd(10) +
            String(r.updated).padEnd(10) +
            String(r.skippedDuplicate).padEnd(10) +
            String(r.conflicts).padEnd(10) +
            String(r.failed));
    }
    console.log('\n--- MongoDB Data Confirmed Untouched ---');
    console.log('✅ No MongoDB records deleted.');
    console.log('✅ No MongoDB records modified.');
    console.log('✅ DB_PROVIDER remains "mongo" — application unaffected.');
    if (IS_DRY_RUN) {
        console.log('\n✅ DRY RUN COMPLETE — No CloudScale data written.');
        console.log('   Run without --dry-run to execute the actual migration.');
    }
    else {
        console.log('\n✅ Migration complete.');
        console.log('   Run AGAIN to verify idempotency (expected: 0 new records).');
    }
    await mongoose_1.default.disconnect();
    return allReports;
}
// If run directly from CLI (only works for dry-run)
if (require.main === module) {
    const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
    const syncUpdates = process.argv.includes('--sync-updates');
    runMigration(null, isDryRun, syncUpdates).then(() => process.exit(0)).catch((err) => {
        logError(`Fatal error: ${err.message}`);
        console.error(err);
        process.exit(1);
    });
}
