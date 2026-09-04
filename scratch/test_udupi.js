const { RepositoryFactory } = require('../backend/dist/repositories/RepositoryFactory');

async function test() {
  const req = { headers: {} };
  const db = RepositoryFactory.getRepository(req);
  
  // get units for Udupi (say districtId = 20)
  const districts = await db.getDistricts();
  const udupi = districts.find(d => d.DistrictName.toLowerCase().includes('udupi'));
  console.log('Udupi District:', udupi);
  
  if (!udupi) return;
  
  const units = await db.getUnits(udupi.DistrictID);
  const stationIds = units.map(u => u.UnitID);
  
  const filter = {
    PoliceStationID: { $in: stationIds },
    latitude: { $nin: [null, 0] },
    longitude: { $nin: [null, 0] }
  };
  
  const cases = await db.getCases(filter);
  console.log(`Total Udupi cases with coords: ${cases.length}`);
  
  // How many within last 7 days?
  cases.sort((a,b) => new Date(b.CrimeRegisteredDate).getTime() - new Date(a.CrimeRegisteredDate).getTime());
  if (cases.length > 0) {
      console.log('Latest case date:', cases[0].CrimeRegisteredDate);
  }
}
test();
