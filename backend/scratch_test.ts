import { CloudScaleRepository } from './src/repositories/CloudScaleRepository';

async function run() {
  try {
    const req = { headers: {} } as any;
    const db = new CloudScaleRepository(req);
    console.log('Fetching cases...');
    const cases = await db.getCases({});
    console.log('Got cases count:', cases.length);
  } catch (error) {
    console.error('Error fetching cases:', error);
  }
}
run();
