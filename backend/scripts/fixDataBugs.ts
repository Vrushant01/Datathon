import fs from 'fs';
import path from 'path';
import catalyst from 'zcatalyst-sdk-node';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Starting Data Bugs Fix Migration ${isDryRun ? '(DRY RUN)' : '(LIVE)'}...`);

  // 1. Load GeoJSON for Davanagere coordinates
  const geojsonPath = path.resolve(__dirname, '../../frontend/src/assets/karnataka_districts.geojson');
  const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
  
  const davanagereFeature = geojson.features.find((f: any) => f.properties.district.toLowerCase() === 'davanagere');
  if (!davanagereFeature) throw new Error("Davanagere not found in GeoJSON");
  
  const geomType = davanagereFeature.geometry.type;
  const coords = davanagereFeature.geometry.coordinates;
  
  let allPoints: number[][] = [];
  if (geomType === 'Polygon') {
    for (const ring of coords) allPoints.push(...ring);
  } else if (geomType === 'MultiPolygon') {
    for (const poly of coords) {
      for (const ring of poly) allPoints.push(...ring);
    }
  }
  
  const lons = allPoints.map(p => p[0]);
  const lats = allPoints.map(p => p[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const getRandomDavanagerePoint = () => {
    return {
      latitude: minLat + Math.random() * (maxLat - minLat),
      longitude: minLon + Math.random() * (maxLon - minLon)
    };
  };

  // 2. Load Seed Data to find affected IDs
  // @ts-ignore
  const { SEED_DISTRICTS, SEED_UNITS, SEED_CASES, SEED_EMPLOYEES, SEED_ACCUSED, SEED_VICTIMS, SEED_COMPLAINANTS } = require('./generated/seedData.ts');
  
  // Find Davanagere Units
  const davanagereUnits = SEED_UNITS.filter((u: any) => u.DistrictID === 1004 || u.DistrictID === '1004');
  const davanagereUnitIds = davanagereUnits.map((u: any) => u.UnitID);
  
  // Find Davanagere Cases
  const davanagereCases = SEED_CASES.filter((c: any) => davanagereUnitIds.includes(c.PoliceStationID));
  
  // Find Mangaluru strings in other collections
  const collectionsToSearch = [
    { name: 'employees', data: SEED_EMPLOYEES, key: 'EmployeeID', fields: ['Address', 'UnitName', 'DistrictName'] },
    { name: 'accuseds', data: SEED_ACCUSED, key: 'AccusedID', fields: ['PresentAddress', 'PermanentAddress'] },
    { name: 'victims', data: SEED_VICTIMS, key: 'VictimID', fields: ['PresentAddress', 'PermanentAddress'] },
    { name: 'complainants', data: SEED_COMPLAINANTS, key: 'ComplainantID', fields: ['PresentAddress', 'PermanentAddress'] }
  ];

  let mangaluruReplacements: any[] = [];
  
  for (const coll of collectionsToSearch) {
    for (const record of coll.data) {
      let needsUpdate = false;
      let updates: any = {};
      
      for (const field of coll.fields) {
        if (record[field] && typeof record[field] === 'string' && record[field].includes('Mangaluru')) {
          updates[field] = record[field].replace(/Mangaluru/g, 'Dakshina Kannada');
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        mangaluruReplacements.push({
          collection: coll.name,
          keyField: coll.key,
          id: record[coll.key],
          updates,
          oldRecord: record
        });
      }
    }
  }

  const otherUnits = SEED_UNITS.filter((u: any) => u.Address?.includes('Mangaluru'));
  for (const u of otherUnits) {
    if (u.DistrictID !== 1004 && u.DistrictID !== '1004') {
      mangaluruReplacements.push({
        collection: 'units',
        keyField: 'UnitID',
        id: u.UnitID,
        updates: { Address: u.Address.replace(/Mangaluru/g, 'Dakshina Kannada') },
        oldRecord: u
      });
    }
  }

  console.log('\n--- DRY RUN SUMMARY ---');
  console.log(`Units needing coordinate fix: ${davanagereUnits.length}`);
  console.log(`Cases needing coordinate fix: ${davanagereCases.length}`);
  console.log(`Records needing Mangaluru -> Dakshina Kannada rename: ${mangaluruReplacements.length}`);
  
  console.log('\nSample Unit Coordinate Fixes:');
  for (let i = 0; i < Math.min(5, davanagereUnits.length); i++) {
    const pt = getRandomDavanagerePoint();
    console.log(`- UnitID ${davanagereUnits[i].UnitID} (${davanagereUnits[i].UnitName}): [${davanagereUnits[i].latitude.toFixed(4)}, ${davanagereUnits[i].longitude.toFixed(4)}] -> [${pt.latitude.toFixed(4)}, ${pt.longitude.toFixed(4)}]`);
  }

  console.log('\nSample Mangaluru Renames:');
  for (let i = 0; i < Math.min(5, mangaluruReplacements.length); i++) {
    const r = mangaluruReplacements[i];
    console.log(`- ${r.collection} [ID: ${r.id}]:`);
    for (const [k, v] of Object.entries(r.updates)) {
      console.log(`    ${k}: "${r.oldRecord[k]}" -> "${v}"`);
    }
  }

  if (isDryRun) {
    console.log('\nDry run complete. Use live mode to execute.');
    return;
  }

  console.log('\n--- EXECUTING LIVE MIGRATION ---');
  let app;
  try {
    app = catalyst.initializeApp({} as any);
  } catch(e: any) {
    console.error("Catalyst initialization failed with error:", e.message || e);
    console.log("Catalyst not initialized, skipping DB update (make sure you run via CLI or with proper env vars)");
    return;
  }

  const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
  const nosql = app.nosql();
  
  // 1. Update Units
  console.log('Updating Units coordinates...');
  for (const u of davanagereUnits) {
    const pt = getRandomDavanagerePoint();
    try {
      await nosql.table('units').updateItems({
        keys: new NoSQLItem().addNumber('UnitID', parseInt(u.UnitID)),
        update_attributes: [
          { operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT, update_value: NoSQLMarshall.makeNumber(pt.latitude), attribute_path: ['latitude'] },
          { operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT, update_value: NoSQLMarshall.makeNumber(pt.longitude), attribute_path: ['longitude'] }
        ]
      });
    } catch(e: any) {
      console.log(`Failed Unit ${u.UnitID}: ${e.message}`);
    }
  }

  // 2. Update Cases
  console.log('Updating Casemasters coordinates...');
  for (let i=0; i<davanagereCases.length; i++) {
    const c = davanagereCases[i];
    const pt = getRandomDavanagerePoint();
    try {
      await nosql.table('casemasters').updateItems({
        keys: new NoSQLItem().addNumber('CaseMasterID', parseInt(c.CaseMasterID)),
        update_attributes: [
          { operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT, update_value: NoSQLMarshall.makeNumber(pt.latitude), attribute_path: ['latitude'] },
          { operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT, update_value: NoSQLMarshall.makeNumber(pt.longitude), attribute_path: ['longitude'] }
        ]
      });
      if (i % 50 === 0) console.log(`  Updated ${i}/${davanagereCases.length} cases...`);
    } catch(e: any) {
      console.log(`Failed Case ${c.CaseMasterID}: ${e.message}`);
    }
  }

  // 3. Update Renames
  console.log('Applying Mangaluru renames...');
  for (let i=0; i<mangaluruReplacements.length; i++) {
    const r = mangaluruReplacements[i];
    try {
      const attrs = [];
      for (const [k, v] of Object.entries(r.updates)) {
        attrs.push({ operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT, update_value: NoSQLMarshall.makeString(v as string), attribute_path: [k] });
      }
      
      const keyItem = new NoSQLItem();
      // Handle string vs number IDs properly
      const parsedId = parseInt(r.id);
      if (isNaN(parsedId)) {
         keyItem.addString(r.keyField, r.id);
      } else {
         keyItem.addNumber(r.keyField, parsedId);
      }

      await nosql.table(r.collection).updateItems({
        keys: keyItem,
        update_attributes: attrs
      });
    } catch(e: any) {
      console.log(`Failed Rename on ${r.collection} ID ${r.id}: ${e.message}`);
    }
  }

  console.log('Migration Complete.');
}

main().catch(console.error);
