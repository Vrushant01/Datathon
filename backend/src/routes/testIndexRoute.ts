import express from 'express';
import catalyst from 'zcatalyst-sdk-node';
const router = express.Router();

router.get('/', async (req: any, res: any) => {
    try {
        const app = catalyst.initialize(req);
        const nosql = app.nosql();
        const table = nosql.table('auditlogs');
        const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        const { NoSQLOperator } = NoSQLEnum;

        const timestamp = new Date().toISOString();
        const logId = `${Date.now()}-test`;

        // 1. Insert a log
        const item = new NoSQLItem();
        item.addString('AuditLogID', logId);
        item.addString('Timestamp', timestamp);
        item.addString('LogGroup', 'ALL');
        item.addString('ActorID', 'System');
        item.addString('Action', 'TEST');
        item.addString('Description', 'Testing index');

        let inserted = false;
        try {
            await table.insertItems({ item });
            inserted = true;
        } catch(e: any) {
            return res.json({ success: false, step: 'insert', error: e.message });
        }
        
        let queryRes;
        let tableDetails;
        let realTable;
        try {
            tableDetails = await nosql.getTable('auditlogs');
            const detailsJson = (tableDetails as any).toJSON ? (tableDetails as any).toJSON() : tableDetails;
            const index = detailsJson.global_index?.find((idx: any) => idx.name === 'LogGroupIndex' || idx.id === 'LogGroupIndex') 
                        || detailsJson.local_index?.find((idx: any) => idx.name === 'LogGroupIndex' || idx.id === 'LogGroupIndex');
            
            realTable = nosql.table(detailsJson);
            const indexIdToUse = index ? index.id : 'LogGroupIndex';

            const query = {
                key_condition: {
                    attribute: ['LogGroup'],
                    operator: NoSQLOperator.EQUALS,
                    value: NoSQLMarshall.makeString('ALL')
                },
                forward_scan: false,
                limit: 5
            };
            queryRes = await realTable.queryIndex(indexIdToUse, query);
        } catch(e: any) {
            return res.json({ success: false, step: 'queryIndex', error: e.message, tableDetails });
        }

        res.json({
            success: true,
            insertedLogId: logId,
            indexQuery: queryRes
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message, stack: e.stack });
    }
});

export default router;
