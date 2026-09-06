import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Inject offline Catalyst variables so we bypass AppSail completely
process.env.CATALYST_PROJECT_ID = '4535900000013024';
if (!process.env.CATALYST_REFRESH_TOKEN) {
    process.env.CATALYST_REFRESH_TOKEN = process.env.QUICKML_REFRESH_TOKEN;
}

import { getSession } from '../src/ai/chatbot';

const questions = [
  "How many FIRs were registered today?",
  "Show today's crime statistics.",
  "Top crime districts.",
  "Most active police station.",
  "Vehicle thefts this month.",
  "Officer performance.",
  "Recent alerts."
];

(async () => {
  try {
    const session = getSession('qa-session');
    
    // Create a mock req so CloudScaleRepository passes initialization
    const mockReq = {
      headers: {
        'x-zc-projectid': '4535900000013024'
      }
    };
    
    for (const q of questions) {
      console.log(`\n==============================================`);
      console.log(`QUESTION: ${q}`);
      
      const res = await session.processMessage(mockReq, q);
      console.log(`\nANSWER:`);
      console.log(res);
      session.clearHistory(); // clear history so tests are independent
    }

    process.exit(0);
  } catch (error: any) {
    console.error('\n--- QA FAILED ---');
    console.error(error);
    process.exit(1);
  }
})();
