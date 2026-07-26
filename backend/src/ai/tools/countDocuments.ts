import { getDb } from '../mongodb';
import { validateQuery } from '../queryValidator';
import { aiLogger } from '../logger';

export const countDocuments = async (collection: string, query: any) => {
  try {
    await validateQuery(collection, query);
    const db = await getDb();
    
    const start = Date.now();
    const count = await db.collection(collection).countDocuments(query);
    aiLogger.logQuery(`countDocuments on ${collection}`, Date.now() - start, [collection], false);
    return count;
  } catch (err: any) {
    aiLogger.logQuery(`countDocuments on ${collection}`, 0, [collection], true);
    throw err;
  }
};
