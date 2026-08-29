import catalyst from 'zcatalyst-sdk-node';
import dotenv from 'dotenv';
import path from 'path';

// @ts-ignore
import {
  SEED_DISTRICTS,
  SEED_UNITS,
  SEED_EMPLOYEES,
  SEED_CASES,
  SEED_ACCUSED,
  SEED_VICTIMS,
  SEED_COMPLAINANTS,
  SEED_ACT_SECTIONS
} from '../../frontend/src/utils/seedData';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const removeEmptyValues = (obj: any) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v != null && v !== '')
  );
};

const insertBatch = async (table: any, records: any[]) => {
  if (records.length === 0) return;
  let count = 0;
  for (const record of records) {
    try {
      await table.insertRow(removeEmptyValues(record));
      count++;
    } catch (e: any) {
      console.error(`Failed to insert record in ${table.tableName}:`, record);
      console.error(e.message);
    }
  }
  console.log(`Successfully inserted ${count} / ${records.length} into ${table.tableName}`);
};

const seedCloudScale = async () => {
  console.log('Starting CloudScale Seeding...');
  
  let app;
  try {
    app = catalyst.initialize();
  } catch(e) {
    console.error('Catalyst Initialization Failed. Ensure you are running this within the Catalyst environment or have appropriate env vars set.');
    process.exit(1);
  }

  const nosql = app.nosql();
  
  console.log('Seeding Districts...');
  await insertBatch(nosql.table('districts'), SEED_DISTRICTS);
  
  console.log('Seeding Units...');
  await insertBatch(nosql.table('units'), SEED_UNITS);
  
  console.log('Seeding Employees...');
  await insertBatch(nosql.table('employees'), SEED_EMPLOYEES);
  
  console.log('Seeding CaseMasters...');
  await insertBatch(nosql.table('casemasters'), SEED_CASES);
  
  console.log('Seeding Accused...');
  await insertBatch(nosql.table('accuseds'), SEED_ACCUSED);
  
  console.log('Seeding Victims...');
  await insertBatch(nosql.table('victims'), SEED_VICTIMS);
  
  console.log('Seeding Complainants...');
  await insertBatch(nosql.table('complainants'), SEED_COMPLAINANTS);
  
  console.log('Seeding ActSections...');
  await insertBatch(nosql.table('actsectionassociations'), SEED_ACT_SECTIONS);
  
  console.log('Seeding Completed successfully!');
};

seedCloudScale().catch(console.error);
