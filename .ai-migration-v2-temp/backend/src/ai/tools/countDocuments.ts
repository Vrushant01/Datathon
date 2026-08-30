import { getTableData } from '../cloudscale';
import { countDocs } from '../queryEngine';
import { aiLogger } from '../logger';

export const countDocuments = async (collection: string, query: any, req?: any) => {
  const start = Date.now();
  try {
    const data = await getTableData(collection, req);
    const count = countDocs(data, query);
    aiLogger.logQuery(`countDocuments on ${collection}`, Date.now() - start, [collection], false);
    return count;
  } catch (err: any) {
    aiLogger.logQuery(`countDocuments on ${collection}`, Date.now() - start, [collection], true);
    throw err;
  }
};
