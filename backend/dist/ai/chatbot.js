"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSession = exports.ChatSession = void 0;
const planner_1 = require("./planner");
const retriever_1 = require("./retriever");
const rag_1 = require("./rag");
const logger_1 = require("./logger");
const config_1 = require("./config");
class ChatSession {
    history = [];
    constructor() { }
    // req is threaded through to CloudScale so getCatalystApp(req) can
    // authenticate on AppSail (see backend/src/repositories/CloudScaleRepository.ts).
    async processMessage(req, question, onToken) {
        try {
            const plan = await (0, planner_1.planQuery)(question, req, this.history);
            logger_1.aiLogger.info(`Plan generated`, plan);
            let context = await (0, retriever_1.retrieveContext)(plan, req);
            if (context?.useRag) {
                context = { note: 'Answer from general knowledge/Knowledge Base context; no exact CloudScale record applies.' };
            }
            const answer = await (0, rag_1.generateAnswer)(question, context, this.history, req, plan);
            this.history.push({ role: 'user', content: question });
            // Store a brief note of the context that was retrieved so future turns know what data was loaded
            if (context && !context.useRag && plan.tool !== 'none') {
                const toolStr = plan.tool;
                const argStr = JSON.stringify({
                    category: plan.category,
                    dateRange: plan.dateRange,
                    districtName: plan.districtName,
                    personName: plan.personName,
                    groupBy: plan.groupBy
                });
                this.history.push({
                    role: 'assistant',
                    content: `[System Note: I previously ran ${toolStr} with arguments ${argStr} and returned ${context.totalCases || context.count || (Array.isArray(context.cases || context) ? (context.cases || context).length : 1)} results]`
                });
            }
            // The Catalyst LLM Serving endpoint's streaming response format isn't
            // confirmed yet (sample snippet only shows stream:false). Simulate
            // incremental delivery so the existing UI typing effect still works;
            // swap for real SSE once the streaming response shape is verified.
            if (config_1.AI_CONFIG.ENABLE_STREAMING && onToken) {
                // Send the entire generated response as a single chunk.
                // Attempting to simulate typing synchronously with hundreds of tiny chunks
                // floods the AppSail proxy buffer and causes missing/corrupted SSE events in production.
                onToken(answer);
            }
            this.history.push({ role: 'assistant', content: answer });
            if (this.history.length > config_1.AI_CONFIG.CHAT_HISTORY_LIMIT * 3) {
                this.history = this.history.slice(this.history.length - config_1.AI_CONFIG.CHAT_HISTORY_LIMIT * 3);
            }
            return answer;
        }
        catch (err) {
            logger_1.aiLogger.error(`Chat session error: ${err.message}`);
            throw err;
        }
    }
    getHistory() {
        return this.history;
    }
    clearHistory() {
        this.history = [];
    }
}
exports.ChatSession = ChatSession;
const sessions = new Map();
const getSession = (sessionId) => {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, new ChatSession());
    }
    return sessions.get(sessionId);
};
exports.getSession = getSession;
