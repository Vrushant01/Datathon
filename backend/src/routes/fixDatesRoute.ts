import express, { Request, Response } from 'express';
import catalyst from 'zcatalyst-sdk-node';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Singleton Catalyst app — same pattern as CloudScaleRepository
let _fixDatesApp: any = null;
function getApp(req: any): any {
  if (_fixDatesApp) return _fixDatesApp;
  if (process.env.CATALYST_CONFIG) {
    try { _fixDatesApp = (catalyst as any).initializeApp(); return _fixDatesApp; } catch {}
  }
  _fixDatesApp = catalyst.initialize(req as any);
  return _fixDatesApp;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const app = getApp(req);
    const nosql = app.nosql();
    const table = nosql.table('casemasters');
    
    const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
    
    let ids: number[] = [];
    for (let i = 100001; i <= 110000; i++) ids.push(i);

    const allItems: any[] = [];
    
    // Batch in groups of 25 (Catalyst limit)
    for (let i = 0; i < ids.length; i += 25) {
        const batch = ids.slice(i, i + 25);
        const keys = batch.map(v => new NoSQLItem().addNumber('CaseMasterID', v));
        try {
            const resp = await table.fetchItem({ keys });
            const raw = (resp as any).toJSON?.() ?? resp;
            const items = (raw.get || []).map((d: any) => {
                const item = d.item;
                if (!item) return null;
                return typeof item.toJSON === 'function' ? item.toJSON() : item;
            }).filter(Boolean);
            allItems.push(...items);
        } catch (e) {
            // Ignore missing batches
        }
    }
    
    // Unpack DynamoDB-style typing ({S: "val"}, {N: "123"})
    const cases = allItems.map(item => {
        const clean: any = {};
        for (const [k, v] of Object.entries(item)) {
            if (v && typeof v === 'object') {
                if ('S' in (v as any)) clean[k] = (v as any).S;
                else if ('N' in (v as any)) clean[k] = Number((v as any).N);
                else if ('BOOL' in (v as any)) clean[k] = (v as any).BOOL;
                else clean[k] = v;
            } else {
                clean[k] = v;
            }
        }
        return clean;
    });

    console.log(`Fetched ${cases.length} casemasters from CloudScale`);

    if (cases.length === 0) {
        return res.json({ error: "No casemasters found. Fetch returned 0 items." });
    }

    // Prepare Date Range: March 1, 2026 to August 30, 2026
    const minTime = new Date('2026-03-01T00:00:00Z').getTime();
    const maxTime = new Date('2026-08-30T00:00:00Z').getTime();

    const backup: Record<number, { old: string, new: string }> = {};
    const distribution: Record<string, number> = {};
    
    let updatedCount = 0;

    for (let i = 0; i < cases.length; i++) {
        const c = cases[i];
        const oldDate = c.CrimeRegisteredDate;
        
        // Generate random date between March and August 2026
        const randomTime = minTime + Math.random() * (maxTime - minTime);
        const newDateObj = new Date(randomTime);
        const newDateStr = newDateObj.toISOString().split('T')[0]; // YYYY-MM-DD
        
        const caseId = Number(c.CaseMasterID);
        backup[caseId] = { old: oldDate, new: newDateStr };
        
        const monthKey = newDateStr.substring(0, 7); // YYYY-MM
        distribution[monthKey] = (distribution[monthKey] || 0) + 1;

        // Update in CloudScale
        try {
            await table.updateItems({
                keys: new NoSQLItem().addNumber('CaseMasterID', caseId),
                update_attributes: [
                    {
                        operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT,
                        update_value: NoSQLMarshall.make(newDateStr),
                        attribute_path: ['CrimeRegisteredDate']
                    }
                ]
            });
            updatedCount++;
        } catch (e: any) {
            console.error(`Failed to update CaseMasterID ${caseId}: ${e.message}`);
        }
    }

    // Save backup to scratch
    fs.writeFileSync(path.join(__dirname, '../../scratch/date_backup.json'), JSON.stringify(backup, null, 2));

    res.json({
        table: 'casemasters',
        fieldChanged: 'CrimeRegisteredDate',
        recordsFetched: cases.length,
        recordsUpdated: updatedCount,
        newDateRange: { min: '2026-03-01', max: '2026-08-30' },
        monthlyDistribution: distribution,
        success: true
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
