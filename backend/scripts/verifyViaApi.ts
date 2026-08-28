const API_BASE = 'https://backend-50044295489.development.catalystappsail.in/api';

async function runVerification() {
  console.log('Starting verification through AppSail API...');
  
  try {
    const res = await fetch(`${API_BASE}/cases`);
    const cases = (await res.json()) as any[];
    console.log(`Total cases returned from /api/cases: ${cases.length}`);
    
    // The API might not return all 5000 if it paginates or limits for dashboard, 
    // but let's check what we got.
    
    let futureCount = 0;
    let missingDateTime = 0;
    const now = new Date();

    const testIds = [100001, 101000, 102500, 103000, 104000, 104500, 104999, 105000];
    const foundIds = new Set();
    
    for (const c of cases) {
      if (testIds.includes(c.CaseMasterID)) foundIds.add(c.CaseMasterID);
      
      if (!c.CrimeRegisteredDateTime) {
        missingDateTime++;
      } else {
        const dt = new Date(c.CrimeRegisteredDateTime);
        if (dt > now) futureCount++;
      }
    }
    
    console.log(`\nVerification Results:`);
    console.log(`Found ${foundIds.size}/${testIds.length} known test records in the API payload.`);
    console.log(`Records missing CrimeRegisteredDateTime: ${missingDateTime}`);
    console.log(`Records with Future CrimeRegisteredDateTime: ${futureCount}`);
    
    if (foundIds.size > 0) {
      for (const id of testIds) {
        const c = cases.find((x: any) => x.CaseMasterID === id);
        if (c) {
          console.log(`\nVerified Case ${id}:`);
          console.log(`  CrimeRegisteredDate: ${c.CrimeRegisteredDate}`);
          console.log(`  CrimeRegisteredDateTime: ${c.CrimeRegisteredDateTime}`);
          console.log(`  PoliceStationID: ${c.PoliceStationID}`);
          console.log(`  Lat/Lng: ${c.latitude}, ${c.longitude}`);
        }
      }
    } else {
      console.log('None of the specific test IDs were found in the /api/cases payload. It might be filtered or limited.');
    }
    
  } catch (err: any) {
    console.error('Error hitting AppSail API:', err.message);
  }
}

runVerification();
