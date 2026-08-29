const http = require('http');

const questions = [
  "How many FIRs are currently in the system?",
  "How many cases are pending?",
  "How many cases are solved?",
  "Which crime category has the most cases?",
  "How many cases are there in each district?",
  "How many cases are there at a particular police station?"
];

async function run() {
  for (const q of questions) {
    console.log(`\nTesting question: "${q}"`);
    
    const payload = JSON.stringify({ question: q, sessionId: 'test1' });
    
    const res = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/chatbot/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.length
        }
      }, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve({ status: response.statusCode, data }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.data}`);
  }
}

run();
