import { QueryPlan } from './planner';
import { findDocuments } from './tools/findDocuments';
import { aggregate } from './tools/aggregate';
import { countDocuments } from './tools/countDocuments';
import { similaritySearch } from './tools/similaritySearch';
import { aiLogger } from './logger';

export const retrieveContext = async (plan: QueryPlan): Promise<any> => {
  try {
    if (plan.tool === 'none' || !plan.query) {
      return null;
    }

    if (plan.tool === 'similaritySearch') {
      return await similaritySearch(plan.query, 5);
    }

    if (!plan.collection) {
      throw new Error("Collection is required for database tools.");
    }

    switch (plan.tool) {
      case 'findDocuments':
        return await findDocuments(plan.collection, plan.query);
      case 'aggregate':
        return await aggregate(plan.collection, plan.query);
      case 'countDocuments':
        return { count: await countDocuments(plan.collection, plan.query) };
      default:
        return null;
    }
  } catch (err: any) {
    aiLogger.error(`Retriever error: ${err.message}`);
    return { error: err.message };
  }
};
