"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSession = exports.ChatSession = void 0;
const planner_1 = require("./planner");
const retriever_1 = require("./retriever");
const rag_1 = require("./rag");
const logger_1 = require("./logger");
const config_1 = require("./config");
const embeddings_1 = require("./embeddings");
const promptBuilder_1 = require("./promptBuilder");
class ChatSession {
    history = [];
    constructor() { }
    async processMessage(question, onToken) {
        try {
            const plan = await (0, planner_1.planQuery)(question);
            logger_1.aiLogger.info(`Plan generated`, plan);
            const context = await (0, retriever_1.retrieveContext)(plan);
            let answer = '';
            if (config_1.AI_CONFIG.ENABLE_STREAMING && onToken) {
                const ai = (0, embeddings_1.getAI)();
                const systemPrompt = await (0, promptBuilder_1.buildSystemPrompt)();
                let prompt = `User Question: ${question}\n\n`;
                if (context) {
                    prompt += `Database Context:\n${JSON.stringify(context, null, 2)}\n\n`;
                    prompt += `Please answer the user's question using strictly the Database Context provided above.\n`;
                }
                else {
                    prompt += `No relevant database context was found or queried. Answer based on available knowledge or indicate that no data is available.\n`;
                }
                const contents = [
                    ...this.history.map(msg => ({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.content }]
                    })),
                    { role: 'user', parts: [{ text: prompt }] }
                ];
                const responseStream = await ai.models.generateContentStream({
                    model: config_1.AI_CONFIG.LLM_MODEL,
                    contents,
                    config: { systemInstruction: systemPrompt }
                });
                for await (const chunk of responseStream) {
                    if (chunk.text) {
                        onToken(chunk.text);
                        answer += chunk.text;
                    }
                }
            }
            else {
                answer = await (0, rag_1.generateAnswer)(question, context, this.history);
            }
            this.history.push({ role: 'user', content: question });
            this.history.push({ role: 'model', content: answer });
            if (this.history.length > config_1.AI_CONFIG.CHAT_HISTORY_LIMIT * 2) {
                this.history = this.history.slice(this.history.length - config_1.AI_CONFIG.CHAT_HISTORY_LIMIT * 2);
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
