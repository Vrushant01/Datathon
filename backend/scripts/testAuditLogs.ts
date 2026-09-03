import catalyst from 'zcatalyst-sdk-node';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const test = async () => {
    try {
        const app = catalyst.initializeApp();
        const nosql = app.nosql();
        const table = nosql.table('auditlogs');
        const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        const { NoSQLOperator } = NoSQLEnum;

        const timestamp = new Date().toISOString();
        const logId = `${Date.now()}-test`;

        // 1. Insert a log
        console.log('Inserting test log...');
        const item = new NoSQLItem();
        item.addString('AuditLogID', logId);
        item.addString('Timestamp', timestamp);
        item.addString('LogGroup', 'ALL');
        item.addString('ActorID', 'System');
        item.addString('Action', 'TEST');
        item.addString('Description', 'Testing index');

        await table.insertRow(item);
        console.log('Inserted successfully:', logId);

        // 2. Fetch directly to confirm
        console.log('\nFetching inserted item directly...');
        const keys = [new NoSQLItem().addString('AuditLogID', logId)];
        const fetched = await table.fetchItem({ keys });
        console.log('Direct fetch result:', JSON.stringify(fetched, null, 2));

        // 3. Query index
        console.log('\nQuerying LogGroupIndex...');
        const query = {
            key_condition: {
                attribute: ['LogGroup'],
                operator: NoSQLOperator.EQUALS,
                value: NoSQLMarshall.makeString('ALL')
            },
            forward_scan: false,
            limit: 5
        };
        const res = await table.queryIndex('LogGroupIndex', query);
        console.log('Query result:', JSON.stringify(res, null, 2));

    } catch (e: any) {
        console.error('Error:', e.message);
    }
}
test();
