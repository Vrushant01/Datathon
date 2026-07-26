import { getDb } from '../mongodb';
import { validateQuery } from '../queryValidator';
import { aiLogger } from '../logger';

export const aggregate = async (collection: string, pipeline: any[]) => {
  try {
    await validateQuery(collection, pipeline);
    const db = await getDb();
    
    const safePipeline = [...pipeline, { $limit: 100 }];
    
    const start = Date.now();
    const result = await db.collection(collection).aggregate(safePipeline).toArray();
    aiLogger.logQuery(`aggregate on ${collection}`, Date.now() - start, [collection], false);
    return result;
  } catch (err: any) {
    aiLogger.logQuery(`aggregate on ${collection}`, 0, [collection], true);
    throw err;
  }
};
