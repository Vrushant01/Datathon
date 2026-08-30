import { chatComplete, ToolDefinition } from './catalystLLM';
import { aiLogger } from './logger';
import { buildSystemPrompt } from './promptBuilder';

export interface QueryPlan {
  tool: 'findDocuments' | 'aggregate' | 'countDocuments' | 'similaritySearch' | 'none';
  collection?: string;
  query?: any;
  reasoning: string;
}

const PLANNER_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'findDocuments',
      description: 'Fetch a small set of matching records from a CloudScale table (e.g. list the 5 most recent FIRs in a district).',
      parameters: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Table name: casemasters, accuseds, victims, districts, units, employees' },
          query: { type: 'object', description: 'Mongo-style equality/$gte/$lte/$in filter object' },
          reasoning: { type: 'string' },
        },
        required: ['collection', 'query', 'reasoning'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'aggregate',
      description: 'Run a grouped aggregation (counts/sums/averages by field) over a CloudScale table, e.g. "FIR count by district".',
      parameters: {
        type: 'object',
        properties: {
          collection: { type: 'string' },
          query: { type: 'array', description: 'Pipeline of $match/$group/$sort/$limit stages' },
          reasoning: { type: 'string' },
        },
        required: ['collection', 'query', 'reasoning'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'countDocuments',
      description: 'Count records matching a filter, e.g. "how many FIRs were registered today".',
      parameters: {
        type: 'object',
        properties: {
          collection: { type: 'string' },
          query: { type: 'object' },
          reasoning: { type: 'string' },
        },
        required: ['collection', 'query', 'reasoning'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'similaritySearch',
      description: 'For knowledge/explanatory questions not answerable by a structured query (e.g. "explain crime head 500", "why is Belagavi flagged") — routes to the RAG knowledge base.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The semantic search text' },
          reasoning: { type: 'string' },
        },
        required: ['query', 'reasoning'],
      },
    },
  },
];

export const planQuery = async (question: string): Promise<QueryPlan> => {
  try {
    const systemPrompt = await buildSystemPrompt();
    const result = await chatComplete(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Decide which tool (if any) answers this question, then call it. If no database/RAG lookup is needed, do not call any tool.\n\nQuestion: ${question}`,
        },
      ],
      { temperature: 0.1, tools: PLANNER_TOOLS, toolChoice: 'auto' }
    );

    const call = result.toolCalls?.[0];
    if (!call) {
      return { tool: 'none', reasoning: result.content || 'No tool call returned.' };
    }

    const args = JSON.parse(call.function.arguments || '{}');
    if (call.function.name === 'similaritySearch') {
      return { tool: 'similaritySearch', query: args.query, reasoning: args.reasoning };
    }
    return {
      tool: call.function.name as QueryPlan['tool'],
      collection: args.collection,
      query: args.query,
      reasoning: args.reasoning,
    };
  } catch (err: any) {
    aiLogger.error(`Planner error: ${err.message}`);
    return { tool: 'none', reasoning: 'Planner failed' };
  }
};
