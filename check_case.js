const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}
const files = walk('frontend/src').filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf-8');
  const matches = content.match(/from\s+['"](\.[^'"]+)['"]/g);
  if (matches) {
    matches.forEach(m => {
      const importPath = m.match(/['"]([^'"]+)['"]/)[1];
      const absolutePath = path.resolve(path.dirname(f), importPath);
      const exts = ['.ts', '.tsx', '.css', '.json', '.js', '/index.ts', '/index.tsx'];
      for (let ext of exts) {
        if (fs.existsSync(absolutePath + ext)) {
          const dir = path.dirname(absolutePath + ext);
          const base = path.basename(absolutePath + ext);
          const actualFiles = fs.readdirSync(dir);
          if (!actualFiles.includes(base)) {
            console.log('CASE MISMATCH in ' + f + ': ' + importPath + ' -> ' + base);
          }
          break;
        }
      }
    });
  }
});
console.log('Scan complete.');
