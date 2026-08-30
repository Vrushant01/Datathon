import { getTableData } from '../cloudscale';
import { findDocs } from '../queryEngine';
import { aiLogger } from '../logger';

export const findDocuments = async (collection: string, query: any, limit: number = 10, sort?: any) => {
  const start = Date.now();
  try {
    const data = await getTableData(collection);
    const result = findDocs(data, query, limit, sort);
    aiLogger.logQuery(`findDocuments on ${collection}`, Date.now() - start, [collection], false);
    return result;
  } catch (err: any) {
    aiLogger.logQuery(`findDocuments on ${collection}`, Date.now() - start, [collection], true);
    throw err;
  }
};
