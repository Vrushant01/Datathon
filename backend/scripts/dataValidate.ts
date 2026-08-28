import fs from 'fs/promises';
import path from 'path';

async function validateData() {
  console.log('\n==================================================');
  console.log('DATA VALIDATION');
  console.log('==================================================\n');
  
  try {
      const seedData = await import('../../frontend/src/utils/seedData');
      const cases: any[] = seedData.SEED_CASES || [];
      const districts: any[] = seedData.SEED_DISTRICTS || [];
      const units: any[] = seedData.SEED_UNITS || [];
      const employees: any[] = seedData.SEED_EMPLOYEES || [];
      const victims: any[] = seedData.SEED_VICTIMS || [];
      const accuseds: any[] = seedData.SEED_ACCUSED || [];
      
      let errors = 0;
      
      const logError = (msg: string) => {
          console.error(`❌ ${msg}`);
          errors++;
      };

      // Create Maps for fast lookups
      const districtIds = new Set(districts.map(d => d.DistrictID));
      const unitIds = new Set(units.map(u => u.UnitID));
      const employeeIds = new Set(employees.map(e => e.EmployeeID));
      const caseIds = new Set(cases.map(c => c.CaseMasterID));
      
      // 1. Station -> District
      for (const u of units) {
          if (!districtIds.has(u.DistrictID)) logError(`Unit ${u.UnitID} has invalid DistrictID ${u.DistrictID}`);
      }
      
      // 2. Case -> Station, Case -> Officer
      const now = new Date();
      for (const c of cases) {
          if (!unitIds.has(c.PoliceStationID)) logError(`Case ${c.CaseMasterID} has invalid PoliceStationID ${c.PoliceStationID}`);
          if (!employeeIds.has(c.PolicePersonID)) logError(`Case ${c.CaseMasterID} has invalid PolicePersonID ${c.PolicePersonID}`);
          
          if (!c.CrimeRegisteredDateTime) logError(`Case ${c.CaseMasterID} missing CrimeRegisteredDateTime`);
          else {
              const dt = new Date(c.CrimeRegisteredDateTime);
              if (dt > now) logError(`Case ${c.CaseMasterID} has future CrimeRegisteredDateTime ${c.CrimeRegisteredDateTime}`);
          }
          
          // Coordinate bounds (Karnataka approx)
          if (c.latitude < 11.0 || c.latitude > 19.0) logError(`Case ${c.CaseMasterID} has out of bounds latitude ${c.latitude}`);
          if (c.longitude < 74.0 || c.longitude > 79.0) logError(`Case ${c.CaseMasterID} has out of bounds longitude ${c.longitude}`);
      }
      
      // 3. Accused -> Case
      for (const a of accuseds) {
          if (!caseIds.has(a.CaseMasterID)) logError(`Accused ${a.PersonID} has invalid CaseMasterID ${a.CaseMasterID}`);
          if (!a.PersonID) logError(`Accused missing PersonID for Case ${a.CaseMasterID}`);
      }
      
      // 4. Victim -> Case
      for (const v of victims) {
          if (!caseIds.has(v.CaseMasterID)) logError(`Victim ${v.PersonID} has invalid CaseMasterID ${v.CaseMasterID}`);
          if (!v.PersonID) logError(`Victim missing PersonID for Case ${v.CaseMasterID}`);
      }
      
      if (errors > 0) {
          console.error(`\n❌ Validation Failed with ${errors} errors. Stopping pipeline.`);
          process.exit(1);
      }
      
      console.log('✅ All validations passed.');
      
  } catch (err: any) {
      console.error('❌ Validation crashed:', err.message);
      process.exit(1);
  }
}

validateData();
