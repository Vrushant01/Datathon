/**
 * Karnataka State Police - Statutory Acts & Sections Database Seed Script
 * 
 * Usage:
 *   npx ts-node scripts/seed_statutory_acts_sections.ts
 * 
 * Purpose:
 *   Seeds the statutory legal framework (IPC, IT Act, NDPS, POCSO, Arms Act, MV Act, KPA)
 *   into Zoho Catalyst CloudScale NoSQL ('acts', 'sections') and/or Relational Data Store ('Act', 'Section').
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const catalyst = require('zcatalyst-sdk-node');
import { STATUTORY_ACTS, STATUTORY_SECTIONS } from '../src/repositories/CloudScaleRepository';

export const REQUIRED_TABLES_SCHEMA = {
  CloudScale_NoSQL: {
    acts: {
      partitionKey: 'ActCode (String)',
      columns: [
        { name: 'ActCode', type: 'String', mandatory: true, description: 'Statutory Act unique identifier (e.g. IPC, IT_ACT, NDPS)' },
        { name: 'ActDescription', type: 'String', mandatory: true, description: 'Official Title of the statute' },
        { name: 'ShortName', type: 'String', mandatory: false, description: 'Common acronym/abbreviation' },
        { name: 'Active', type: 'Boolean', mandatory: true, description: 'Statute validity flag' }
      ]
    },
    sections: {
      partitionKey: 'SectionCode (String)',
      columns: [
        { name: 'SectionCode', type: 'String', mandatory: true, description: 'Section number/clause (e.g. 302, 66C, 8/20)' },
        { name: 'ActCode', type: 'String', mandatory: true, description: 'Parent statute code' },
        { name: 'SectionDescription', type: 'String', mandatory: true, description: 'Legal offence description and penal sanction' },
        { name: 'Active', type: 'Boolean', mandatory: true, description: 'Section status flag' }
      ]
    }
  },
  Catalyst_DataStore_Relational: {
    Act: {
      primaryKey: 'ROWID (auto-generated) / Unique: ActCode',
      columns: [
        { name: 'ActCode', type: 'varchar(50)', mandatory: true, unique: true },
        { name: 'ActDescription', type: 'varchar(2000)', mandatory: true, unique: false },
        { name: 'ShortName', type: 'varchar(100)', mandatory: false, unique: false },
        { name: 'Active', type: 'boolean', mandatory: false, unique: false }
      ]
    },
    Section: {
      primaryKey: 'ROWID (auto-generated)',
      columns: [
        { name: 'ActCode', type: 'varchar(50)', mandatory: true, unique: false },
        { name: 'SectionCode', type: 'varchar(50)', mandatory: true, unique: false },
        { name: 'SectionDescription', type: 'varchar(2000)', mandatory: true, unique: false },
        { name: 'Active', type: 'boolean', mandatory: false, unique: false }
      ]
    }
  }
};

async function seedStatutoryTables() {
  console.log('================================================================');
  console.log('KARNATAKA STATE POLICE - STATUTORY REFERENCE SEEDER');
  console.log('================================================================');
  console.log(`Acts to seed: ${STATUTORY_ACTS.length}`);
  console.log(`Sections to seed: ${STATUTORY_SECTIONS.length}`);
  console.log('----------------------------------------------------------------');

  let app: any = null;
  try {
    app = catalyst.initialize();
  } catch (err: any) {
    console.warn('[WARN] Catalyst SDK initialization without active AppSail context:', err.message);
    console.log('\n[INFO] The backend includes in-memory statutory fallbacks for both tables.');
    console.log('If you wish to create these tables in the Zoho Catalyst Console, refer to the schema below:');
    console.log(JSON.stringify(REQUIRED_TABLES_SCHEMA, null, 2));
    return;
  }

  // 1. Try seeding NoSQL tables
  try {
    const nosql = app.nosql();
    console.log('\n[NoSQL] Checking and seeding table: acts...');
    const actsTable = nosql.table('acts');
    for (const act of STATUTORY_ACTS) {
      try {
        await actsTable.insertRow(act);
        console.log(`  + Seeded Act: ${act.ActCode} (${act.ShortName})`);
      } catch (e: any) {
        console.log(`  ~ Act ${act.ActCode}: ${e.message}`);
      }
    }

    console.log('\n[NoSQL] Checking and seeding table: sections...');
    const sectionsTable = nosql.table('sections');
    for (const sec of STATUTORY_SECTIONS) {
      try {
        await sectionsTable.insertRow(sec);
        console.log(`  + Seeded Section: ${sec.ActCode} Sec ${sec.SectionCode}`);
      } catch (e: any) {
        console.log(`  ~ Section ${sec.SectionCode}: ${e.message}`);
      }
    }
  } catch (nosqlErr: any) {
    console.warn('[NoSQL Error]', nosqlErr.message);
  }

  console.log('\nSeeding routine finished.');
}

if (require.main === module) {
  seedStatutoryTables().catch(console.error);
}

