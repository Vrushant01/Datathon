import { QueryPlan } from './planner';
import { findDocuments } from './tools/findDocuments';
import { aggregate } from './tools/aggregate';
import { countDocuments } from './tools/countDocuments';
import { aiLogger } from './logger';

// NOTE: similaritySearch/vectorStore/embeddings (Gemini-embedding-based cosine
// search over MongoDB) are retired as part of the Catalyst migration.
// Knowledge/explanatory questions route to Catalyst QuickML RAG instead —
// RAG's Knowledge Base handles retrieval itself, so no custom vector store
// is needed here. (RAG endpoint wiring is a follow-up; see chatbot.ts.)

export const retrieveContext = async (plan: QueryPlan, req?: any): Promise<any> => {
  try {
    if (plan.tool === 'none' || !plan.query) {
      return null;
    }

    if (plan.tool === 'similaritySearch') {
      return { useRag: true, ragQuery: plan.query };
    }

    if (!plan.collection) {
      throw new Error("Collection is required for database tools.");
    }

    switch (plan.tool) {
      case 'findDocuments':
        return await findDocuments(plan.collection, plan.query, undefined, undefined, req);
      case 'aggregate':
        return await aggregate(plan.collection, plan.query, req);
      case 'countDocuments':
        return { count: await countDocuments(plan.collection, plan.query, req) };
      default:
        return null;
    }
  } catch (err: any) {
    aiLogger.error(`Retriever error: ${err.message}`);
    return { error: err.message };
  }
};
