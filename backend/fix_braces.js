const fs = require('fs');
let code = fs.readFileSync('src/app.ts', 'utf8');

code = code.replace(/\s*\} else \{\s*res\.status\(503\)\.json\(\{ success: false, status: 'online', database: 'disconnected' \}\);\s*\}\s*\} catch \(error\) \{\s*res\.status\(500\)\.json\(\{ success: false, status: 'error', error: 'Internal server error' \}\);\s*\}\s*\}\);/, '');

fs.writeFileSync('src/app.ts', code);
console.log('Fixed extra braces again.');
