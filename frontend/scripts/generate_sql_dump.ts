import * as fs from 'fs';
import * as path from 'path';
import { SEED_DISTRICTS, SEED_UNITS, SEED_EMPLOYEES, SEED_CASES } from '../src/utils/seedData';

const escapeSql = (val: any) => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  return `'${String(val).replace(/'/g, "''")}'`;
};

const mapToLowercase = (obj: any) => {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key.toLowerCase()] = value;
  }
  return result;
};

const generateInserts = (tableName: string, data: any[], stripCols: string[] = [], filePrefix: string) => {
  if (data.length === 0) return;
  
  const batchSize = 1000;
  const outDir = path.resolve(process.cwd(), '../supabase/seed_data_split');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  for (let i = 0; i < data.length; i += batchSize) {
    let sql = 'BEGIN;\n\n';
    sql += `-- Data for ${tableName} (Rows ${i + 1} to ${Math.min(i + batchSize, data.length)})\n`;
    const batch = data.slice(i, i + batchSize);
    
    batch.forEach(item => {
      const lowered = mapToLowercase(item);
      stripCols.forEach(col => delete lowered[col]);
      
      const cols = Object.keys(lowered).join(', ');
      const vals = Object.values(lowered).map(escapeSql).join(', ');
      sql += `INSERT INTO ${tableName} (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`;
    });
    sql += '\nCOMMIT;\n';
    
    const partNum = Math.floor(i / batchSize) + 1;
    const suffix = data.length > batchSize ? `_part${partNum}` : '';
    const outPath = path.join(outDir, `${filePrefix}_${tableName}${suffix}.sql`);
    fs.writeFileSync(outPath, sql, 'utf-8');
    console.log(`Successfully generated ${outPath}`);
  }
};

const run = () => {
  console.log('Generating separate SQL files...');
  generateInserts('district', SEED_DISTRICTS, [], '01');
  generateInserts('unit', SEED_UNITS, ['latitude', 'longitude'], '02');
  generateInserts('employee', SEED_EMPLOYEES, ['status', 'designationid', 'rankid'], '03');
  generateInserts('casemaster', SEED_CASES, ['crimeminorheadid', 'crimemajorheadid', 'casecategoryid', 'gravityoffenceid', 'courtid', 'casestatusid'], '04');
};

run();
