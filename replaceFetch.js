const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('frontend/src');
let updatedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  if (content.includes('API_BASE') && !file.includes('authFetch.ts')) {
    content = content.replace(/await fetch\(/g, 'await authFetch(');
    content = content.replace(/fetch\(\`/g, 'authFetch(`');
  }

  if (content !== originalContent) {
    if (!content.includes('import { authFetch }')) {
       // depth calculation: e.g. frontend/src/utils/mockDb.ts -> parts: frontend, src, utils, mockDb.ts
       const parts = file.split('/');
       const depth = parts.length - 3; 
       let relative = '../'.repeat(Math.max(0, depth)) + 'utils/authFetch';
       if (depth === 0) relative = './utils/authFetch'; 
       if (file.includes('utils/mockDb.ts')) relative = './authFetch';
       if (file.includes('services/aiService.ts')) relative = '../utils/authFetch';

       content = 'import { authFetch } from \'' + relative + '\';\n' + content;
    }
    fs.writeFileSync(file, content);
    updatedFiles++;
  }
});
console.log('Updated files: ' + updatedFiles);
