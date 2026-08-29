import catalyst from 'zcatalyst-sdk-node';
const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');

async function test() {
    const app = catalyst.initialize(undefined as any);
    const nosql = app.nosql();
    const table = nosql.table('districts');
    const itemKey = NoSQLItem.from({ DistrictID: 1001 });
    
    try {
        const res = await table.fetchItem({ keys: [itemKey] });
        console.log("Raw Response:");
        console.dir(res, { depth: null });
    } catch (e: any) {
        console.error(e.message);
    }
}
test();
