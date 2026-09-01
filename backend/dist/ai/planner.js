"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planQuery = void 0;
const catalystLLM_1 = require("./catalystLLM");
const logger_1 = require("./logger");
const promptBuilder_1 = require("./promptBuilder");
const getOfficerPerformance_1 = require("./tools/getOfficerPerformance");
const getTopCrimeDistricts_1 = require("./tools/getTopCrimeDistricts");
const getRecentAlerts_1 = require("./tools/getRecentAlerts");
const PLANNER_TOOLS = [
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
            description: 'Get crime statistics or a list of cases for a specific crime category.',
            parameters: {
                type: 'object',
                properties: {
                    category: {
                        type: 'string',
                        description: 'The crime category to search for (e.g. "vehicle theft", "murder", "robbery")'
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
    { type: 'function', function: getOfficerPerformance_1.getOfficerPerformanceDef },
    { type: 'function', function: getTopCrimeDistricts_1.getTopCrimeDistrictsDef },
    { type: 'function', function: getRecentAlerts_1.getRecentAlertsDef }
];
const planQuery = async (question, req, chatHistory = []) => {
    try {
        const systemPrompt = await (0, promptBuilder_1.buildSystemPrompt)(req);
        // Inject chat history into the planner so it can resolve coreferences (e.g. "list them" -> knows who "them" is)
        const messages = [
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
        const result = await (0, catalystLLM_1.chatComplete)(messages, { temperature: 0.1, tools: PLANNER_TOOLS, toolChoice: 'auto' });
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
            tool: call.function.name,
            collection: args.collection,
            query: args.query,
            reasoning: args.reasoning,
        };
    }
    catch (err) {
        logger_1.aiLogger.error(`Planner error: ${err.message}`);
        return { tool: 'none', reasoning: 'Planner failed' };
    }
};
exports.planQuery = planQuery;
