const fs = require('fs');
let code = fs.readFileSync('src/app.ts', 'utf8');

code = code.replace(/const results = \[\];/, 'const results: any[] = [];');
code = code.replace(/async function checkRecord\(tableName, keyName, keyValue\)/, 'async function checkRecord(tableName: string, keyName: string, keyValue: number)');
code = code.replace(/} catch \(err\) {/, '} catch (err: any) {');
code = code.replace(/} catch \(error\) {/, '} catch (error: any) {');

fs.writeFileSync('src/app.ts', code);
console.log('Fixed typescript errors.');
