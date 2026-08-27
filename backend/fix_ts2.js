const fs = require('fs');
let code = fs.readFileSync('src/app.ts', 'utf8');

code = code.replace(/} catch \(error\) \{\s*res\.status\(500\)\.json\(\{ error: error\.message, stack: error\.stack \}\);\s*\}/, '} catch (error: any) {\n    res.status(500).json({ error: error.message, stack: error.stack });\n  }');

fs.writeFileSync('src/app.ts', code);
console.log('Fixed typescript errors.');
