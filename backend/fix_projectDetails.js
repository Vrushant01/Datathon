const fs = require('fs');
let code = fs.readFileSync('src/app.ts', 'utf8');

code = code.replace(/const projectDetails = catalystApp\.projectDetails\(\);/, 'const projectDetails = { error: "Not supported in this SDK version" };');

fs.writeFileSync('src/app.ts', code);
console.log('Fixed projectDetails.');
