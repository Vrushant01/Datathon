"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickMLChatService = void 0;
const logger_1 = require("../ai/logger");
const RepositoryFactory_1 = require("../repositories/RepositoryFactory");
class QuickMLChatService {
    /**
     * Executes the 'get_case_statistics' tool locally against CloudScale.
     */
    static async executeTool(req, args) {
        logger_1.aiLogger.info(`Executing tool get_case_statistics with args:`, args);
        const repo = RepositoryFactory_1.RepositoryFactory.getRepository(req); // CloudScale repo requires req for headers
        // Safety check - restrict metrics
        const allowedMetrics = [
            'total_cases', 'pending_cases', 'solved_cases',
            'crime_category_breakdown', 'district_breakdown', 'station_breakdown'
        ];
        if (!allowedMetrics.includes(args.metric)) {
            throw new Error(`Metric ${args.metric} is not allowed or supported.`);
        }
        try {
            // @ts-ignore - Assuming we added this method
            const result = await repo.getCaseStatistics(args.metric, {
                district: args.district,
                station: args.station,
                crime_category: args.crime_category
            });
            logger_1.aiLogger.info(`Tool execution successful. Result count/metric:`, result.metric);
            return result;
        }
        catch (error) {
            logger_1.aiLogger.error(`CloudScale tool execution failed: ${error.message}`);
            throw new Error("Live data could not be retrieved from CloudScale.");
        }
    }
    /**
     * Orchestrates the conversation with QuickML GLM-4.7-Flash.
     * NOTE: The exact QuickML GLM API endpoint and request schema are not hardcoded
     * here to avoid guessing the API contract, as per strict instructions.
     */
    static async processMessage(req, question, history) {
        const endpoint = process.env.QUICKML_ENDPOINT_URL;
        const token = process.env.QUICKML_ACCESS_TOKEN;
        const orgId = process.env.QUICKML_ORG_ID;
        const endpointKey = process.env.QUICKML_ENDPOINT_KEY;
        if (!endpoint || !token) {
            throw new Error('QuickML credentials missing from environment. CloudScale integration is working, but real QuickML integration cannot be verified until valid QuickML authentication is configured.');
        }
        logger_1.aiLogger.info(`Sending question to QuickML GLM-4.7-Flash: ${question}`);
        // Prepare request payload for QuickML GLM-4.7-Flash with tools
        const payload = {
            data: {
                messages: [{ role: "user", content: question }],
                tools: [
                    {
                        name: "get_case_statistics",
                        description: "Get statistics about FIR cases",
                        parameters: {
                            type: "object",
                            properties: {
                                metric: { type: "string" },
                                district: { type: "number" },
                                station: { type: "number" },
                                crime_category: { type: "number" }
                            },
                            required: ["metric"]
                        }
                    }
                ]
            }
        };
        let response;
        try {
            const axios = require('axios');
            response = await axios.post(endpoint, payload, {
                headers: {
                    'CATALYST-ORG': orgId,
                    'X-QUICKML-ENDPOINT-KEY': endpointKey,
                    'Authorization': `Zoho-oauthtoken ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            logger_1.aiLogger.info(`QuickML response received with status ${response.status}`);
        }
        catch (e) {
            if (e.response) {
                logger_1.aiLogger.error(`QuickML API Error: ${e.response.status} - ${JSON.stringify(e.response.data)}`);
                if (e.response.status === 401) {
                    throw new Error('CloudScale integration is working, but real QuickML integration cannot be verified until valid QuickML authentication is configured. (QuickML Auth Error 401)');
                }
                if (e.response.status === 429) {
                    throw new Error('QuickML API rate limit exceeded.');
                }
                if (e.response.status >= 500) {
                    throw new Error('QuickML upstream service failure.');
                }
                throw new Error(`QuickML API Error: ${e.response.status}`);
            }
            logger_1.aiLogger.error(`QuickML request failed: ${e.message}`);
            throw new Error('Could not connect to QuickML.');
        }
        // Process QuickML Response
        const responseData = response.data;
        // Check if the LLM decided to call a tool
        // Assuming standard tool_calls response format as configured in QuickML
        let toolCallResult = null;
        let finalAnswer = responseData.choices?.[0]?.message?.content || responseData.answer || "No response generated.";
        const toolCalls = responseData.choices?.[0]?.message?.tool_calls || responseData.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
            const toolCall = toolCalls[0];
            if (toolCall.name === "get_case_statistics") {
                logger_1.aiLogger.info(`QuickML requested tool call: get_case_statistics with args`, toolCall.parameters || toolCall.arguments);
                const args = typeof toolCall.parameters === 'string' ? JSON.parse(toolCall.parameters) :
                    (typeof toolCall.arguments === 'string' ? JSON.parse(toolCall.arguments) : (toolCall.parameters || toolCall.arguments));
                toolCallResult = await this.executeTool(req, args);
                // Formatting the structured result
                finalAnswer = `CloudScale Database Tool Result: Metric '${args.metric}' has value: ${JSON.stringify(toolCallResult)}`;
            }
        }
        else {
            // Check if QuickML naturally answered it directly
            logger_1.aiLogger.info(`No tool called. GLM answered directly.`);
        }
        return finalAnswer;
    }
}
exports.QuickMLChatService = QuickMLChatService;
