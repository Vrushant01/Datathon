import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { SEED_DISTRICTS, SEED_UNITS, SEED_EMPLOYEES, SEED_CASES } from '../src/utils/seedData';

dotenv.config(); // Reads .env in frontend folder if run from there

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Utility to convert keys to lowercase since mockDb uses lowercase table columns
const mapToLowercase = (obj: any) => {
  const newObj: any = {};
  for (const key of Object.keys(obj)) {
    newObj[key.toLowerCase()] = obj[key];
  }
  return newObj;
};

async function uploadBatch(tableName: string, data: any[]) {
  console.log(`Starting upload to ${tableName} (${data.length} records)...`);
  const batchSize = 1000;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize).map(item => {
      const lowered = mapToLowercase(item);
      if (tableName === 'unit') {
        delete lowered.latitude;
        delete lowered.longitude;
      }
      if (tableName === 'employee') {
        delete lowered.status;
        delete lowered.designationid;
        delete lowered.rankid;
      }
      if (tableName === 'casemaster') {
        delete lowered.crimeminorheadid;
        delete lowered.crimemajorheadid;
        delete lowered.casecategoryid;
        delete lowered.gravityoffenceid;
        delete lowered.courtid;
        delete lowered.casestatusid;
      }
      return lowered;
    });
    const { error } = await supabase.from(tableName.toLowerCase()).upsert(batch);
    if (error) {
      console.error(`Error uploading to ${tableName} at batch ${i}:`, error.message);
      return false;
    }
    console.log(`Uploaded ${Math.min(i + batchSize, data.length)} / ${data.length} to ${tableName}`);
  }
  return true;
}

async function run() {
  console.log("Connecting to Supabase at", supabaseUrl);

  await uploadBatch('district', SEED_DISTRICTS);
  await uploadBatch('unit', SEED_UNITS);
  await uploadBatch('employee', SEED_EMPLOYEES);
  await uploadBatch('casemaster', SEED_CASES);

  console.log("All data successfully uploaded to Supabase!");
}

run();
