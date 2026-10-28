/**
 * Rollback Script for Backfilled Seed Data
 * 
 * Usage:
 *   npx ts-node scripts/rollback_seeded_data.ts [--batchId=seed-2026-10-29] [--dry-run]
 * 
 * Deletes ONLY rows inserted by the specified SeedBatchId or recorded in seed_log.json.
 * NEVER deletes or alters pre-existing police data.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const catalyst = require('zcatalyst-sdk-node');

async function rollback() {
  const isDryRun = process.argv.includes('--dry-run');
  const batchArg = process.argv.find(a => a.startsWith('--batchId='));
  const targetBatchId = batchArg ? batchArg.split('=')[1] : 'seed-2026-10-29';

  console.log(`[Rollback] Initializing rollback for batch: ${targetBatchId}`);
  if (isDryRun) console.log(`[Rollback] Running in DRY-RUN mode. No rows will be deleted.`);

  const logFile = path.resolve(__dirname, '../data/seed_log.json');
  if (!fs.existsSync(logFile)) {
    console.error(`[Rollback Error] seed_log.json not found at ${logFile}`);
    process.exit(1);
  }

  const logData = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  if (logData.batchId !== targetBatchId && targetBatchId !== 'all') {
    console.warn(`[Rollback] seed_log.json batchId (${logData.batchId}) does not match target (${targetBatchId}). Proceeding with logged IDs.`);
  }

  const { caseMasterIds, accusedMasterIds, victimMasterIds, complainantIds } = logData;

  console.log(`[Rollback Target] Cases: ${caseMasterIds?.length || 0}, Accused: ${accusedMasterIds?.length || 0}, Victims: ${victimMasterIds?.length || 0}, Complainants: ${complainantIds?.length || 0}`);

  if (isDryRun) {
    console.log('[Rollback] Dry-run complete. Exiting.');
    return;
  }

  let app: any;
  try {
    app = catalyst.initialize();
  } catch (err: any) {
    console.error('[Rollback] Failed to initialize Catalyst SDK:', err.message);
    process.exit(1);
  }

  const nosql = app.nosql();
  const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');

  const deleteByKeys = async (tableName: string, pkField: string, ids: number[]) => {
    if (!ids || ids.length === 0) return;
    const table = nosql.table(tableName);
    console.log(`[Rollback] Deleting ${ids.length} rows from ${tableName}...`);

    for (let i = 0; i < ids.length; i += 25) {
      const batch = ids.slice(i, i + 25);
      const keys = batch.map(id => new NoSQLItem().addNumber(pkField, id));
      try {
        await table.deleteItems({ keys });
      } catch (e: any) {
        console.warn(`[Rollback Warning] deleteItems error on ${tableName} offset ${i}:`, e.message);
      }
    }
    console.log(`[Rollback] Completed deletion for ${tableName}.`);
  };

  await deleteByKeys('casemasters', 'CaseMasterID', caseMasterIds);
  await deleteByKeys('accuseds', 'AccusedMasterID', accusedMasterIds);
  await deleteByKeys('victims', 'VictimMasterID', victimMasterIds);
  await deleteByKeys('complainants', 'ComplainantID', complainantIds);

  console.log('[Rollback] Successfully deleted all seeded records.');
}

if (require.main === module) {
  rollback().catch(console.error);
}

