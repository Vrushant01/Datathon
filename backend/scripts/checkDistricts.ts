import catalyst from 'zcatalyst-sdk-node';

const app = catalyst.initializeApp();

async function main() {
    const nosql = app.nosql();
    const districtsTable = nosql.table('districts');
    const unitsTable = nosql.table('units');
    const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');

    // fetch all districts
    const ids = [];
    for (let i = 1001; i <= 1035; i++) ids.push(i);
    const keys = ids.map(v => new NoSQLItem().addNumber('DistrictID', v));
    
    try {
        const resp = await districtsTable.fetchItem({ keys });
        const districts = (resp.get || []).map((d: any) => d.item.toJSON());
        console.log("Districts:", JSON.stringify(districts, null, 2));

        // fetch all units
        const unitIds = [];
        for (let i = 2000; i <= 2930; i++) unitIds.push(i);
        const unitKeys = unitIds.map(v => new NoSQLItem().addNumber('UnitID', v));
        
        let allUnits: any[] = [];
        for (let i = 0; i < unitKeys.length; i += 25) {
            const batchKeys = unitKeys.slice(i, i + 25);
            try {
                const res = await unitsTable.fetchItem({ keys: batchKeys });
                allUnits.push(...(res.get || []).map((d: any) => d.item.toJSON()));
            } catch(e) {}
        }
        
        const mangaluruUnits = allUnits.filter(u => u.DistrictID === 1003 || u.DistrictID === '1003' || (u.UnitName && u.UnitName.includes('Mangaluru')));
        console.log("Mangaluru/Davanagere Units:", JSON.stringify(mangaluruUnits.map(u => ({ UnitID: u.UnitID, UnitName: u.UnitName, DistrictID: u.DistrictID, latitude: u.latitude, longitude: u.longitude })), null, 2));
        
        const davUnits = allUnits.filter(u => u.UnitName && u.UnitName.includes('Davanagere'));
        console.log("Davanagere Units (by name):", JSON.stringify(davUnits.map(u => ({ UnitID: u.UnitID, UnitName: u.UnitName, DistrictID: u.DistrictID })), null, 2));
    } catch(e) {
        console.error("Error:", e);
    }
}
main();
