import express from 'express';
import catalyst from 'zcatalyst-sdk-node';
const router = express.Router();
router.get('/', async (req, res) => {
  try {
    const app = catalyst.initialize(req as any);
    const nosql = app.nosql();
    const table = nosql.table('casemasters');
    const { NoSQLMarshall, NoSQLEnum } = require('zcatalyst-sdk-node/lib/no-sql');
    try {
        const result: any = await table.queryTable({
            key_condition: {
                attribute: ['CaseMasterID'],
                operator: NoSQLEnum.NoSQLOperator.IN,
                value: [NoSQLMarshall.makeNumber(100001), NoSQLMarshall.makeNumber(100002)] as any
            }
        });
        const arr = typeof result.toJSON === 'function' ? result.toJSON() : result;
        res.json({ success: true, count: Array.isArray(arr) ? arr.length : (arr.data ? arr.data.length : null) });
    } catch(e: any) {
        res.json({ success: false, message: e.message, code: e.code });
    }
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});
export default router;
