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
            name: 'executeDatabaseQuery',
            description: 'The master query tool. Execute a dynamic MongoDB-style query against the CloudScale database. Handles counts, finds, aggregations, trends, and rankings.',
            parameters: {
                type: 'object',
                properties: {
                    isFollowUp: { type: 'boolean', description: 'CRITICAL: True ONLY if the user is explicitly referring back to the previous question (e.g. "What about July?", "Which district had the most?"). False if this is a NEW standalone question (e.g. "How many cyber crimes are there?"). If False, DO NOT inherit filters from previous queries.' },
                    intent: { type: 'string', description: 'Short summary of what you are querying (e.g., "count property crimes", "trend of cyber crimes per month", "rank districts by theft").' },
                    collection: { type: 'string', description: 'Target table: casemasters, accuseds, victims, districts, units, employees' },
                    filters: { type: 'object', description: 'MongoDB-style filter object (e.g., {"CrimeMajorHeadID": 200, "DistrictName": "Bengaluru"})' },
                    groupBy: { type: 'string', description: 'Optional field to group by for aggregation (e.g. "DistrictName", "PoliceStationName", "month", "year")' },
                    sort: { type: 'object', description: 'Optional sort object (e.g., {"count": -1} for descending count)' },
                    limit: { type: 'number', description: 'Optional limit for results (e.g., 5 for Top 5)' },
                    reasoning: { type: 'string' },
                },
                required: ['isFollowUp', 'intent', 'collection', 'filters', 'reasoning'],
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
                content: `Based on the conversation history above, evaluate the user's new message.

CRITICAL INSTRUCTION FOR CONTEXT:
1. Distinguish between a FOLLOW-UP and a NEW STANDALONE QUESTION.
2. A FOLLOW-UP refers back to the previous query (e.g., "What about July?", "Which district had the most of those?", "Compare that with cyber crimes"). For follow-ups, INHERIT relevant filters from the previous query and only change what the user explicitly requested.
3. A NEW STANDALONE QUESTION introduces a completely new topic or is fully self-contained (e.g., "Which district has the most property crimes?", "How many police officers are there?"). For new questions, DO NOT inherit previous filters (like date, district, or category) unless they are explicitly restated in the new question.
4. "Overall" or "Total" can be a follow-up depending on context. But explicit category mentions like "property crimes" after asking about "cyber crimes" without linking words usually indicate a new query.

New Message: ${question}

Decide which tool (if any) answers this message, and call it with the appropriate, precisely-resolved context. If no database lookup is needed, do not call any tool.`,
            },
        ];
        const result = await (0, catalystLLM_1.chatComplete)(messages, { temperature: 0.1, tools: PLANNER_TOOLS, toolChoice: 'auto' });
        const call = result.toolCalls?.[0];
        if (!call) {
            return { tool: 'none', reasoning: result.content || 'No tool call returned.' };
        }
        const args = JSON.parse(call.function.arguments || '{}');
        if (call.function.name === 'similaritySearch') {
            return { tool: 'similaritySearch', filters: args.query, reasoning: args.reasoning };
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
        if (call.function.name === 'executeDatabaseQuery') {
            return {
                tool: call.function.name,
                isFollowUp: args.isFollowUp,
                intent: args.intent,
                collection: args.collection,
                filters: args.filters,
                groupBy: args.groupBy,
                sort: args.sort,
                limit: args.limit,
                reasoning: args.reasoning
            };
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
            filters: args.query,
            reasoning: args.reasoning
        };
    }
    catch (err) {
        logger_1.aiLogger.error(`Planner error: ${err.message}`);
        return { tool: 'none', reasoning: 'Planner failed' };
    }
};
exports.planQuery = planQuery;
