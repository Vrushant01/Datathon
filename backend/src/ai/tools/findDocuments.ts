import { getDb } from '../mongodb';
import { validateQuery } from '../queryValidator';
import { aiLogger } from '../logger';

export const findDocuments = async (collection: string, query: any, limit: number = 10, sort?: any) => {
  try {
    await validateQuery(collection, query);
    const db = await getDb();
    let cursor = db.collection(collection).find(query).limit(Math.min(limit, 100));
    if (sort) {
      cursor = cursor.sort(sort);
    }
    const start = Date.now();
    const result = await cursor.toArray();
    aiLogger.logQuery(`findDocuments on ${collection}`, Date.now() - start, [collection], false);
    return result;
  } catch (err: any) {
    aiLogger.logQuery(`findDocuments on ${collection}`, 0, [collection], true);
    throw err;
  }
};
