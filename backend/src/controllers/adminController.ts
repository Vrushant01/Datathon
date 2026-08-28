import { Request, Response } from 'express';
import { District, Unit, Employee, CaseMaster, Accused, Victim } from '../models';
import catalyst from 'zcatalyst-sdk-node';
import mongoose from 'mongoose';

const BATCH_SIZE = 25;

let migrationState = {
  status: 'idle',
  progress: 0,
  total: 0,
  currentTable: '',
  message: '',
  startTime: null as null | Date,
  endTime: null as null | Date
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function writeBatchWithRetry(app: any, tableName: string, batch: any[], attempt = 1): Promise<void> {
  try {
    const nosql = app.nosql();
    const table = nosql.table(tableName);
    // Convert generic objects to NoSQLItems
    const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
    const items = batch.map(b => ({ item: NoSQLItem.from(b) }));
    await table.insertItems(...items);
  } catch (err: any) {
    if (attempt <= 3) {
      await sleep(attempt * 1000);
      return writeBatchWithRetry(app, tableName, batch, attempt + 1);
    } else {
      throw err;
    }
  }
}

async function clearTable(app: any, tableName: string) {
  migrationState.message = `Clearing existing rows in ${tableName}`;
  try {
    let nextToken: string | undefined = undefined;
    let rowIds: string[] = [];
    do {
      const page: any = await app.nosql().table(tableName).getPagedRows({ next_token: nextToken, max_rows: 100 });
      if (page.data && page.data.length > 0) {
        rowIds = rowIds.concat(page.data.map((r: any) => r[tableName].ROWID));
      }
      nextToken = page.next_token;
    } while (nextToken);

    if (rowIds.length > 0) {
      for (let i = 0; i < rowIds.length; i += 100) {
        const batch = rowIds.slice(i, i + 100);
        await app.nosql().table(tableName).deleteRows(batch);
      }
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('No rows found')) {
       console.error(`[Migrate] Error checking ${tableName}:`, err.message);
    }
  }
}

async function migrateCollection(app: any, model: any, tableName: string) {
  migrationState.currentTable = tableName;
  migrationState.message = `Preparing to migrate ${tableName}`;
  
  await clearTable(app, tableName);
  
  const total = await model.countDocuments();
  migrationState.total = total;
  migrationState.progress = 0;

  const cursor = model.find().lean().cursor();
  let batch: any[] = [];
  let migratedCount = 0;

  for await (const doc of cursor) {
    delete doc._id;
    delete doc.__v;

    batch.push(doc);

    if (batch.length === BATCH_SIZE) {
      await writeBatchWithRetry(app, tableName, batch);
      migratedCount += batch.length;
      migrationState.progress = migratedCount;
      migrationState.message = `Migrating ${tableName} (${migratedCount}/${total})`;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await writeBatchWithRetry(app, tableName, batch);
    migratedCount += batch.length;
    migrationState.progress = migratedCount;
    migrationState.message = `Migrating ${tableName} (${migratedCount}/${total})`;
  }
}

async function runMigrationBackground(app: any) {
  try {
    migrationState.status = 'running';
    migrationState.startTime = new Date();
    migrationState.endTime = null;
    
    // await migrateCollection(app, District, 'districts');
    // await migrateCollection(app, Unit, 'units');
    // await migrateCollection(app, Employee, 'employees');
    await migrateCollection(app, CaseMaster, 'casemasters');
    // await migrateCollection(app, Accused, 'accuseds');
    // await migrateCollection(app, Victim, 'victims');

    migrationState.status = 'completed';
    migrationState.message = 'Migration successful';
    migrationState.endTime = new Date();
  } catch (err: any) {
    migrationState.status = 'failed';
    migrationState.message = `Migration failed: ${err.message}`;
    migrationState.endTime = new Date();
  }
}

export const startMigration = async (req: Request, res: Response) => {
  if (migrationState.status === 'running') {
    return res.status(400).json({ error: 'Migration is already running' });
  }

  try {
    // Log version from package.json
    try {
      const pkg = require('zcatalyst-sdk-node/package.json');
      console.log(`[Diagnostic] zcatalyst-sdk-node version: ${pkg.version}`);
    } catch (e) {
      console.log(`[Diagnostic] Failed to read zcatalyst-sdk-node version.`);
    }

    // Attempt to initialize catalyst
    console.log(`[Diagnostic] Attempting catalyst.initialize with req...`);
    const app = catalyst.initialize(req as any);
    console.log(`[Diagnostic] Catalyst App context initialized successfully!`);
    
    // Preflight check: fetch all tables to verify partition keys and existence
    const targetTables = ['districts', 'units', 'employees', 'casemasters', 'accuseds', 'victims'];
    const nosql = app.nosql();
    
    let allTablesInfo: any[] = [];
    try {
      for (const tableName of targetTables) {
        const t = await nosql.getTable(tableName);
        allTablesInfo.push(JSON.parse(JSON.stringify(t)));
      }
    } catch (err: any) {
      console.error(`[Preflight] Error fetching all tables: ${err.message}`);
      return res.status(500).json({ error: `Preflight failed: ${err.message}` });
    }
    
    // Start migration in background
    runMigrationBackground(app);
    res.json({ message: 'Migration started successfully', status: migrationState, migrationBuild: "cloudscale-migration-v2" });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to initialize Catalyst App context', details: error.message });
  }
};

export const getMigrationStatus = async (req: Request, res: Response) => {
  res.json(migrationState);
};
