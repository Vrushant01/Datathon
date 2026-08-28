import catalyst from 'zcatalyst-sdk-node';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verifyMigration() {
  const app = catalyst.initialize(undefined as any);
  const datastore = app.datastore();
  const casemasters = datastore.table('CaseMaster');

  const testIds = [100001, 101000, 102500, 103000, 104000, 104500, 104999, 105000];

  let passed = 0;
  for (const id of testIds) {
    try {
      const row = await casemasters.getRow(id);
      const data = (row as any).CaseMaster || row;
      console.log(`\nVerifying CaseMasterID: ${id}`);
      console.log(`CrimeRegisteredDate: ${data.CrimeRegisteredDate}`);
      console.log(`CrimeRegisteredDateTime: ${data.CrimeRegisteredDateTime}`);
      console.log(`PoliceStationID: ${data.PoliceStationID}`);
      console.log(`Latitude: ${data.latitude}, Longitude: ${data.longitude}`);
      
      if (data.CrimeRegisteredDateTime) {
        passed++;
      } else {
        console.log('❌ CrimeRegisteredDateTime is missing!');
      }
    } catch (e: any) {
      console.error(`❌ Failed to fetch CaseMasterID ${id}: ${e.message}`);
    }
  }

  // Get total count (using dummy logic or if count is supported)
  try {
      let nextToken: string | undefined = undefined;
      let count = 0;
      do {
        const page: any = await casemasters.getPagedRows({ next_token: nextToken, max_rows: 100 });
        if (page.data && page.data.length > 0) {
          count += page.data.length;
        }
        nextToken = page.next_token;
      } while (nextToken);
      console.log(`\nTotal cases in CloudScale CaseMaster table: ${count}`);
  } catch (e: any) {
      console.error(`Failed to count records: ${e.message}`);
  }

  console.log(`\nVerification complete. Passed temporal checks: ${passed}/${testIds.length}`);
  process.exit(0);
}

verifyMigration();
