import mongoose from 'mongoose';
const catalyst = require('zcatalyst-sdk-node');
import dotenv from 'dotenv';
import path from 'path';

// Import Mongo models
import { District, Unit, Employee, CaseMaster, Accused, Victim } from '../src/models';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BATCH_SIZE = 25;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ensure the NoSQL tables are flushed/ready (Idempotent run)
// Note: ZCQL / Datastore requires manual table creation via console,
// but we'll empty existing rows if there are any to ensure idempotency.
async function clearTable(app: any, tableName: string) {
  console.log(`[Migrate] Checking table ${tableName} for existing rows to clear...`);
  try {
    let nextToken: string | undefined = undefined;
    let rowIds: string[] = [];
    do {
      const page: any = await app.datastore().table(tableName).getPagedRows({ next_token: nextToken, max_rows: 100 });
      if (page.data && page.data.length > 0) {
        rowIds = rowIds.concat(page.data.map((r: any) => r[tableName].ROWID));
      }
      nextToken = page.next_token;
    } while (nextToken);

    if (rowIds.length > 0) {
      console.log(`[Migrate] Found ${rowIds.length} rows in ${tableName}. Deleting...`);
      // Delete in batches of 100
      for (let i = 0; i < rowIds.length; i += 100) {
        const batch = rowIds.slice(i, i + 100);
        // Catalyst deleteRows supports array of ROWIDs
        await app.datastore().table(tableName).deleteRows(batch);
      }
      console.log(`[Migrate] Cleared table ${tableName}.`);
    } else {
      console.log(`[Migrate] Table ${tableName} is already empty.`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('No rows found')) {
       console.log(`[Migrate] Table ${tableName} is empty.`);
    } else {
       console.log(`[Migrate] Error checking ${tableName}:`, err.message);
    }
  }
}

async function migrateCollection(app: any, model: any, tableName: string) {
  console.log(`\n--- Migrating ${model.modelName} to ${tableName} ---`);
  const total = await model.countDocuments();
  console.log(`[Migrate] Found ${total} documents in MongoDB.`);

  await clearTable(app, tableName);

  const cursor = model.find().lean().cursor();
  let batch: any[] = [];
  let migratedCount = 0;

  for await (const doc of cursor) {
    // Remove mongo _id and __v
    delete doc._id;
    delete doc.__v;

    batch.push(doc);

    if (batch.length === BATCH_SIZE) {
      await writeBatchWithRetry(app, tableName, batch);
      migratedCount += batch.length;
      console.log(`[Migrate] Progress: ${migratedCount}/${total}`);
      batch = [];
    }
  }

  // Write remaining
  if (batch.length > 0) {
    await writeBatchWithRetry(app, tableName, batch);
    migratedCount += batch.length;
    console.log(`[Migrate] Progress: ${migratedCount}/${total}`);
  }

  console.log(`[Migrate] Successfully migrated ${migratedCount} records to ${tableName}.`);
}

async function writeBatchWithRetry(app: any, tableName: string, batch: any[], attempt = 1): Promise<void> {
  try {
    await app.datastore().table(tableName).insertRows(batch);
  } catch (err: any) {
    if (attempt <= 3) {
      console.warn(`[Migrate] Batch write failed. Retrying in ${attempt * 1000}ms... Error: ${err.message}`);
      await sleep(attempt * 1000);
      return writeBatchWithRetry(app, tableName, batch, attempt + 1);
    } else {
      console.error(`[Migrate] Batch write failed permanently after 3 retries.`);
      throw err;
    }
  }
}

async function runMigration() {
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    console.error('MONGO_URI is missing in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI);
    console.log('[Migrate] Connected to MongoDB.');

    // Initialize Catalyst SDK
    const app = catalyst.initialize(undefined as any);
    console.log('[Migrate] Connected to Catalyst CloudScale.');

    // await migrateCollection(app, District, 'District');
    // await migrateCollection(app, Unit, 'Unit');
    // await migrateCollection(app, Employee, 'Employee');
    await migrateCollection(app, CaseMaster, 'CaseMaster');
    // await migrateCollection(app, Accused, 'Accused');
    // await migrateCollection(app, Victim, 'Victim');

    console.log('\n[Migrate] Migration script completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Migrate] Fatal error during migration:', err);
    process.exit(1);
  }
}

runMigration();
