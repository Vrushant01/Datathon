import { QueryPlan } from './planner';
import { findDocuments } from './tools/findDocuments';
import { aggregate } from './tools/aggregate';
import { countDocuments } from './tools/countDocuments';
import { aiLogger } from './logger';

// NOTE: similaritySearch/vectorStore/embeddings (Gemini-embedding-based cosine
// search over MongoDB) are retired as part of the Catalyst migration.
// Knowledge/explanatory questions should route to the Catalyst QuickML RAG
// endpoint once it's wired in generateAnswer() (see rag.ts) — RAG's Knowledge
// Base handles retrieval itself, so no custom vector store is needed here.

export const retrieveContext = async (plan: QueryPlan): Promise<any> => {
  try {
    if (plan.tool === 'none' || !plan.query) {
      return null;
    }

    if (plan.tool === 'similaritySearch') {
      // Structured CloudScale tools can't answer "explain"/"why" style
      // questions — hand off to RAG instead of a removed vector store.
      return { useRag: true, ragQuery: plan.query };
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
