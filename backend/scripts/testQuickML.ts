import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Inject offline Catalyst variables so we bypass AppSail completely
process.env.CATALYST_PROJECT_ID = '4535900000013024';
process.env.CATALYST_REFRESH_TOKEN = process.env.QUICKML_REFRESH_TOKEN;
process.env.RISK_ANALYSIS_DATE = '2025-09-19T12:00:00Z';

// Now import the services
import { calculateFeatures } from '../src/services/stationFeatureService';
import { predictStationRisk } from '../src/services/quickmlService';

(async () => {
  try {
    console.log('[Test] Calculating features for Station 2047...');
    // We pass undefined for req to trigger CloudScale offline mode
    const features = await calculateFeatures(undefined as any, 2047);
    
    console.log('[Test] Features calculated. Sending to QuickML...');
    const result = await predictStationRisk(features);
    
    console.log('\n--- QUICKML PREDICTION SUCCESS ---');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error: any) {
    console.log('\n--- QUICKML PREDICTION FAILED ---');
    console.log('Error Message:', error.message);
    process.exit(1);
  }
})();
