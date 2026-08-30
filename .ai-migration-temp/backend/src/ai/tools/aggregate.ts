import { getTableData } from '../cloudscale';
import { runAggregate } from '../queryEngine';
import { aiLogger } from '../logger';

export const aggregate = async (collection: string, pipeline: any[]) => {
  const start = Date.now();
  try {
    const data = await getTableData(collection);
    const result = runAggregate(data, pipeline);
    aiLogger.logQuery(`aggregate on ${collection}`, Date.now() - start, [collection], false);
    return result;
  } catch (err: any) {
    aiLogger.logQuery(`aggregate on ${collection}`, Date.now() - start, [collection], true);
    throw err;
  }
};
