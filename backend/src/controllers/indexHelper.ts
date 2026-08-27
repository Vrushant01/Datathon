import catalyst from 'zcatalyst-sdk-node';
import { Request, Response } from 'express';

export const getCloudscaleIndexes = async (req: Request, res: Response) => {
  try {
    const app = catalyst.initialize(req as any);
    const nosql = app.nosql();
    
    const tables = ['districts', 'units', 'employees', 'casemasters', 'accuseds', 'victims'];
    const result: any = {};
    
    for (const t of tables) {
      try {
        const table = nosql.table(t);
        // We have to call an API to load the details first? Actually, toJSON() might be synchronous if loaded.
        // There is no table.getDetails() in the d.ts except maybe it's loaded automatically?
        // Let's just try to call a dummy query and catch error to see if it loads
        try { await table.queryTable({} as any); } catch(e) {}
        
        result[t] = typeof table.toJSON === 'function' ? table.toJSON() : 'no toJSON';
      } catch (e: any) {
        result[t] = e.message;
      }
    }
    
    res.json(result);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
};
