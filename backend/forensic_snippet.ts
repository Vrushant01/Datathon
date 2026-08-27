// Forensic Endpoint
app.get('/api/forensic', async (req, res) => {
  try {
    const catalyst = require('zcatalyst-sdk-node');
    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();
    
    const results = [];
    
    async function checkRecord(tableName, keyName, keyValue) {
      try {
        const query = `SELECT ROWID, * FROM ${tableName} WHERE ${keyName} = ${keyValue} LIMIT 1`;
        const zcql = catalystApp.zcql();
        const rows = await zcql.executeZCQLQuery(query);
        results.push({ Table: tableName, Key: `${keyName}=${keyValue}`, Found: rows.length > 0 ? 'YES' : 'NO', Raw: rows[0] });
      } catch (err) {
        results.push({ Table: tableName, Key: `${keyName}=${keyValue}`, Found: 'ERROR', Raw: err.message });
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
