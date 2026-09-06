import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/server/backend/api';

const questions = [
  "How many FIRs were registered today?",
  "Show today's crime statistics.",
  "Top crime districts.",
  "Most active police station.",
  "Vehicle thefts this month.",
  "Officer performance.",
  "Recent alerts."
];

async function run() {
  console.log('Logging in as admin...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idOrEmail: 'admin@ksp.gov.in', passcode: 'admin123', loginType: 'admin' })
  });
  
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }
  
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Login successful. Running QA...');
  
  for (const q of questions) {
    console.log(`\n==============================================`);
    console.log(`QUESTION: ${q}`);
    const res = await fetch(`${BASE_URL}/chatbot/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ question: q, sessionId: `qa-session-${Date.now()}` }) // unique session ID
    });
    
    if (!res.ok) {
      console.error(`Request failed: ${res.status}`);
      console.error(await res.text());
      continue;
    }
    
    const data = await res.json();
    console.log(`\nANSWER:`);
    console.log(data.answer || data);
  }
}

run().catch(console.error);
