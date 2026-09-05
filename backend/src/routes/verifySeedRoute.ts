import express, { Request, Response } from 'express';
import catalyst from 'zcatalyst-sdk-node';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const app = catalyst.initialize(req as any);
    const nosql = app.nosql();
    const table = nosql.table('casemasters');
    
    const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
    
    // The new cases started at 300001
    const ids = [300001, 300002, 300003, 300004, 300005];
    const keys = ids.map(v => new NoSQLItem().addNumber('CaseMasterID', v));
    
    const resp = await table.fetchItem({ keys });
    const raw = resp as any;
    const items = (raw.get || []).map((d: any) => {
        const item = d.item;
        if (!item) return null;
        return typeof item.toJSON === 'function' ? item.toJSON() : item;
    }).filter(Boolean);

    res.json({ success: true, count: items.length, items });
  } catch(e: any) {
    res.status(500).json({ success: false, error: e.message, stack: e.stack });
  }
});

export default router;
