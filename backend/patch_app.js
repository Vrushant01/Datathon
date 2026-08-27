const fs = require('fs');
let code = fs.readFileSync('src/app.ts', 'utf8');

code = code.replace(/const data = await District\.find\(\);/, 'const db = RepositoryFactory.getRepository(req);\n    const data = await db.getDistricts();');
code = code.replace(/const data = await Unit\.find\(\);/, 'const db = RepositoryFactory.getRepository(req);\n    const data = await db.getUnits();');
code = code.replace(/const data = await Employee\.find\(\);/, 'const db = RepositoryFactory.getRepository(req);\n    const data = await db.getEmployees();');
code = code.replace(/const data = await CaseMaster\.find\(\); \/\/ Fetch all 5000 cases/, 'const db = RepositoryFactory.getRepository(req);\n    const data = await db.getCases({});');
code = code.replace(/const data = await Victim\.find\(\);/, 'const db = RepositoryFactory.getRepository(req);\n    const data = await db.getAllVictims();');
code = code.replace(/const data = await Accused\.find\(\);/, 'const db = RepositoryFactory.getRepository(req);\n    const data = await db.getAllAccused();');
code = code.replace(/const data = await CaseMaster\.find\(\{ PolicePersonID: Number\(req\.params\.officerId\) \}\);/, 'const db = RepositoryFactory.getRepository(req);\n    const data = await db.getCasesByOfficer(Number(req.params.officerId));');
code = code.replace(/const data = await CaseMaster\.find\(\{ PoliceStationID: Number\(req\.params\.stationId\) \}\);/, 'const db = RepositoryFactory.getRepository(req);\n    const data = await db.getCasesByStation(Number(req.params.stationId));');

const forensic = `
// Forensic Endpoint
app.get('/api/forensic', async (req, res) => {
  try {
    const catalyst = require('zcatalyst-sdk-node');
    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();
    
    const results = [];
    
    async function checkRecord(tableName, keyName, keyValue) {
      try {
        const query = \`SELECT ROWID, * FROM \${tableName} WHERE \${keyName} = \${keyValue} LIMIT 1\`;
        const zcql = catalystApp.zcql();
        const rows = await zcql.executeZCQLQuery(query);
        results.push({ Table: tableName, Key: \`\${keyName}=\${keyValue}\`, Found: rows.length > 0 ? 'YES' : 'NO', Raw: rows[0] });
      } catch (err) {
        results.push({ Table: tableName, Key: \`\${keyName}=\${keyValue}\`, Found: 'ERROR', Raw: err.message });
      }
    }

    await checkRecord('districts', 'DistrictID', 1);
    await checkRecord('units', 'UnitID', 1);
    await checkRecord('employees', 'EmployeeID', 30001);
    await checkRecord('casemasters', 'CaseMasterID', 100001);
    await checkRecord('accuseds', 'CaseMasterID', 100001);
    await checkRecord('victims', 'CaseMasterID', 100001);

    const projectDetails = catalystApp.projectDetails();

    res.json({
      projectDetails: projectDetails,
      forensicResults: results,
      dbProvider: process.env.DB_PROVIDER || 'mongo',
    });

  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

import { RepositoryFactory } from './repositories/RepositoryFactory';
`;

code = code.replace(/app\.get\('\/api\/districts'/, forensic + '\napp.get(\'/api/districts\'');

code = code.replace(/app\.get\('\/api\/health', \(req, res\) => \{[\s\S]*?\}\);/, `app.get('/api/health', (req, res) => {
  try {
    const provider = process.env.DB_PROVIDER || 'mongo';
    if (provider === 'cloudscale') {
      res.json({ success: true, status: 'online', database: 'connected', provider: 'cloudscale' });
      return;
    }

    const dbState = mongoose.connection.readyState;
    if (dbState === 1) {
      res.json({ success: true, status: 'online', database: 'connected', provider: 'mongo' });
    } else {
      res.status(503).json({ success: false, status: 'online', database: 'disconnected', provider: 'mongo' });
    }
  } catch (error) {
    res.status(500).json({ success: false, status: 'error', error: 'Internal server error' });
  }
});`);

code = code.replace(/res\.json = function \(body\) \{[\s\S]*?return originalJson\.call\(this, body\);\n  \};/, `res.json = function (body) {
    const totalTime = Date.now() - (req as any).metrics.startTime;
    res.setHeader('x-timing-total', \`\${totalTime}ms\`);
    res.setHeader('x-timing-nosql-calls', \`\${(req as any).metrics.nosqlCalls}\`);
    res.setHeader('x-timing-cache-hits', \`\${(req as any).metrics.cacheHits}\`);
    res.setHeader('x-timing-cache-misses', \`\${(req as any).metrics.cacheMisses}\`);
    
    // Forensic diagnostics
    res.setHeader('x-db-provider-actual', (req.headers['x-mock-db-provider'] || process.env.DB_PROVIDER || 'mongo') as string);
    res.setHeader('x-data-source', (req as any).metrics.nosqlCalls > 0 ? 'nosql' : ((req as any).metrics.cacheHits > 0 ? 'memory-cache' : 'mongo'));
    res.setHeader('x-cache-state', \`hits:\${(req as any).metrics.cacheHits},misses:\${(req as any).metrics.cacheMisses}\`);
    
    return originalJson.call(this, body);
  };`);

fs.writeFileSync('src/app.ts', code);
console.log('App patched.');
