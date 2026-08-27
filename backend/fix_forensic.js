const fs = require('fs');
let code = fs.readFileSync('src/app.ts', 'utf8');

code = code.replace(/const paged = await catalystApp\.datastore\(\)\.table\(tableName\)\.getPagedRows\(\{ maxRows: 1 \}\);\s*results\.push\(\{ Table: tableName, Key: \`\$\{keyName\}=\$\{keyValue\}\`, Found: paged\.data\.length > 0 \? 'YES' : 'NO', Raw: paged\.data\.length > 0 \? paged\.data\[0\] : null \}\);/, `const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        const nosql = catalystApp.nosql();
        const table = nosql.table(tableName);
        const keyItem = new NoSQLItem().addNumber(keyName, keyValue);
        const paged = await table.fetchItem({ keys: [keyItem] });
        const raw = (paged as any).get || [];
        const itemFound = raw.length > 0 ? raw[0].item : null;
        results.push({ Table: tableName, Key: \`\${keyName}=\${keyValue}\`, Found: itemFound ? 'YES' : 'NO', Raw: itemFound ? (typeof itemFound.toJSON === 'function' ? itemFound.toJSON() : itemFound) : null });`);

fs.writeFileSync('src/app.ts', code);
console.log('Fixed forensic to use nosql fetchItem.');
