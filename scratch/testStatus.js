const http = require('http');

async function run() {
  const res = await new Promise((resolve, reject) => {
    http.get(`http://localhost:3001/api/cases`, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(JSON.parse(data)));
    });
  });
  
  const total = res.length;
  const solved = res.filter(c => c.CaseStatusID === 2 || c.CaseStatusID === 3 || c.CaseStatusID === 4).length;
  const pending = total - solved;
  
  console.log(`Total: ${total}`);
  console.log(`Solved: ${solved}`);
  console.log(`Pending: ${pending}`);
}
run();
