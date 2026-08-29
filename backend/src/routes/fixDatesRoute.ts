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
    const fetchPromises: (() => Promise<void>)[] = [];
    for (let i = 0; i < ids.length; i += 25) {
        const batch = ids.slice(i, i + 25);
        const keys = batch.map(v => new NoSQLItem().addNumber('CaseMasterID', v));
        fetchPromises.push(async () => {
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
        });
    }

    // Run fetches concurrently with safe limits (concurrency 4 + delay)
    for (let i = 0; i < fetchPromises.length; i += 4) {
        await Promise.all(fetchPromises.slice(i, i + 4).map(fn => fn()));
        if (i + 4 < fetchPromises.length) {
            await new Promise(r => setTimeout(r, 50));
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

    // Prepare Date Range: January 1, 2025 to August 30, 2026
    const minTime = new Date('2025-01-01T00:00:00Z').getTime();
    const maxTime = new Date('2026-08-30T23:59:59Z').getTime();

    const backup: Record<number, { oldDate: string, oldDateTime: string, newDate: string, newDateTime: string }> = {};
    const distribution: Record<string, number> = {};
    
    let updatedCount = 0;
    
    // Create update fns
    const updateFns = cases.map(c => async () => {
        const oldDate = c.CrimeRegisteredDate;
        const oldDateTime = c.CrimeRegisteredDateTime;
        
        // Generate random date between Jan 2025 and Aug 2026
        // Skewing the distribution using Math.pow so it's not perfectly even across months.
        // Math.random()^0.8 skews dates slightly more towards recent times (2026).
        const r = Math.random();
        const skewedTime = minTime + Math.pow(r, 0.8) * (maxTime - minTime);
        const newDateObj = new Date(skewedTime);
        const newDateStr = newDateObj.toISOString().split('T')[0]; // YYYY-MM-DD
        const newDateTimeStr = newDateObj.toISOString();
        
        const caseId = Number(c.CaseMasterID);
        backup[caseId] = { oldDate, oldDateTime, newDate: newDateStr, newDateTime: newDateTimeStr };
        
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
                    },
                    {
                        operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT,
                        update_value: NoSQLMarshall.make(newDateTimeStr),
                        attribute_path: ['CrimeRegisteredDateTime']
                    }
                ]
            });
            updatedCount++;
        } catch (e: any) {
            console.error(`Failed to update CaseMasterID ${caseId}: ${e.message}`);
        }
    });

    // Run updates strictly sequentially to completely avoid "Concurrency limit reached" errors
    for (let i = 0; i < updateFns.length; i++) {
        await updateFns[i]();
        // 10ms sleep to be nice to CloudScale API
        if (i < updateFns.length - 1) {
            await new Promise(r => setTimeout(r, 10));
        }
        
        // Log progress every 500 records
        if ((i + 1) % 500 === 0) {
            console.log(`[fixDatesRoute] Updated ${i + 1} of ${updateFns.length}`);
        }
    }

    // Save backup to scratch
    fs.writeFileSync(path.join(__dirname, '../../scratch/date_backup.json'), JSON.stringify(backup, null, 2));
    fs.writeFileSync(path.join(__dirname, '../../scratch/update_results.json'), JSON.stringify({
        table: 'casemasters',
        fieldsChanged: ['CrimeRegisteredDate', 'CrimeRegisteredDateTime'],
        recordsFetched: cases.length,
        recordsUpdated: updatedCount,
        newDateRange: { min: '2025-01-01', max: '2026-08-30' },
        monthlyDistribution: distribution,
        success: true
    }, null, 2));

    res.json({
        table: 'casemasters',
        fieldsChanged: ['CrimeRegisteredDate', 'CrimeRegisteredDateTime'],
        recordsFetched: cases.length,
        recordsUpdated: updatedCount,
        newDateRange: { min: '2025-01-01', max: '2026-08-30' },
        monthlyDistribution: distribution,
        success: true
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
