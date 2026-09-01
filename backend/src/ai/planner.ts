import { chatComplete, ToolDefinition } from './catalystLLM';
import { aiLogger } from './logger';
import { buildSystemPrompt } from './promptBuilder';

import { getOfficerPerformanceDef } from './tools/getOfficerPerformance';
import { getTopCrimeDistrictsDef } from './tools/getTopCrimeDistricts';
import { getRecentAlertsDef } from './tools/getRecentAlerts';

export type ToolName = 'findDocuments' | 'aggregate' | 'countDocuments' | 'similaritySearch' | 'getCaseCountByPerson' | 'listCasesByPerson' | 'getCaseDetail' | 'getCrimeStatsByCategory' | 'getCaseTrend' | 'getOfficerPerformance' | 'getTopCrimeDistricts' | 'getRecentAlerts' | 'none';

export interface QueryPlan {
  tool: ToolName;
  collection?: string;
  query?: any;
  personName?: string;
  caseId?: number;
  category?: string;
  dateRange?: { start: string; end: string };
  groupBy?: 'day' | 'month' | 'year';
  officerIdentifier?: string;
  districtName?: string;
  limit?: number;
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
  {
    type: 'function',
    function: {
      name: 'getCaseCountByPerson',
      description: 'Find out how many cases/FIRs a specific person (accused or victim) is associated with.',
      parameters: {
        type: 'object',
        properties: {
          personName: { type: 'string', description: 'The name of the accused or victim' },
          reasoning: { type: 'string' },
        },
        required: ['personName', 'reasoning'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listCasesByPerson',
      description: 'List the actual cases/FIRs a specific person (accused or victim) is associated with.',
      parameters: {
        type: 'object',
        properties: {
          personName: { type: 'string', description: 'The name of the accused or victim' },
          reasoning: { type: 'string' },
        },
        required: ['personName', 'reasoning'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCaseDetail',
      description: 'Get full details for a specific case by its CaseMasterID.',
      parameters: {
        type: 'object',
        properties: {
          caseId: { type: 'number', description: 'The CaseMasterID (numeric)' },
          reasoning: { type: 'string' },
        },
        required: ['caseId', 'reasoning'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCrimeStatsByCategory',
      description: 'Get crime statistics or a list of cases for a specific crime category. ALWAYS use this tool when the user asks about a crime type. The category parameter accepts natural-language terms — the system will map them to the correct database category. Recognized keywords include: "theft", "robbery", "burglary", "larceny", "house breaking", "vehicle theft" (→ Crimes Against Property); "murder", "assault", "grievous hurt", "kidnapping" (→ Crimes Against Body); "rape", "dowry", "molestation" (→ Crimes Against Women); "cheating", "fraud", "forgery" (→ Economic Offences); "cyber", "phishing", "hacking" (→ Cyber Crimes); "ndps", "drugs", "excise" (→ SLL).',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'The crime category keyword (e.g. "theft", "murder", "cyber", "robbery"). Use the natural-language term from the user — it will be mapped to the correct database category. "theft" maps to Crimes Against Property (Minor Head 201).'
          },
          dateRange: {
            type: 'object',
            properties: {
              start: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
              end: { type: 'string', description: 'End date in YYYY-MM-DD format' }
            }
          },
          reasoning: { type: 'string' }
        },
        required: ['category', 'reasoning']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCaseTrend',
      description: 'Get an aggregated trend of cases grouped by time (e.g. per month, per day).',
      parameters: {
        type: 'object',
        properties: {
          groupBy: {
            type: 'string',
            enum: ['day', 'month', 'year'],
            description: 'The time period to group by'
          },
          category: {
            type: 'string',
            description: 'Optional. Filter by specific crime category (e.g. "cyber crimes") before grouping'
          },
          dateRange: {
            type: 'object',
            properties: {
              start: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
              end: { type: 'string', description: 'End date in YYYY-MM-DD format' }
            }
          },
          reasoning: { type: 'string' }
        },
        required: ['groupBy', 'reasoning']
      }
    }
  },
  { type: 'function', function: getOfficerPerformanceDef },
  { type: 'function', function: getTopCrimeDistrictsDef },
  { type: 'function', function: getRecentAlertsDef }
];

export const planQuery = async (question: string, req?: any, chatHistory: any[] = []): Promise<QueryPlan> => {
  try {
    const systemPrompt = await buildSystemPrompt(req);
    
    // Inject chat history into the planner so it can resolve coreferences (e.g. "list them" -> knows who "them" is)
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: `Decide which tool (if any) answers this question, then call it. If no database/RAG lookup is needed, do not call any tool.\n\nQuestion: ${question}`,
      },
    ];

    const result = await chatComplete(messages, { temperature: 0.1, tools: PLANNER_TOOLS, toolChoice: 'auto' });

    const call = result.toolCalls?.[0];
    if (!call) {
      return { tool: 'none', reasoning: result.content || 'No tool call returned.' };
    }

    const args = JSON.parse(call.function.arguments || '{}');
    if (call.function.name === 'similaritySearch') {
      return { tool: 'similaritySearch', query: args.query, reasoning: args.reasoning };
    }
    if (call.function.name === 'getCaseCountByPerson' || call.function.name === 'listCasesByPerson') {
      return { tool: call.function.name, personName: args.personName, reasoning: args.reasoning };
    }
    if (call.function.name === 'getCaseDetail') {
      return { tool: call.function.name, caseId: Number(args.caseId), reasoning: args.reasoning };
    }
    if (call.function.name === 'getCrimeStatsByCategory') {
      return { tool: call.function.name, category: args.category, dateRange: args.dateRange, reasoning: args.reasoning };
    }
    if (call.function.name === 'getCaseTrend') {
      return { tool: call.function.name, groupBy: args.groupBy, category: args.category, dateRange: args.dateRange, reasoning: args.reasoning };
    }
    if (call.function.name === 'getOfficerPerformance') {
      return { tool: call.function.name, officerIdentifier: args.officerIdentifier, reasoning: args.reasoning };
    }
    if (call.function.name === 'getTopCrimeDistricts') {
      return { tool: call.function.name, dateRange: args.dateRange, limit: args.limit, reasoning: args.reasoning };
    }
    if (call.function.name === 'getRecentAlerts') {
      return { tool: call.function.name, dateRange: args.dateRange, districtName: args.districtName, limit: args.limit, reasoning: args.reasoning };
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
