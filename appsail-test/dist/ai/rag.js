"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAnswer = void 0;
const embeddings_1 = require("./embeddings");
const config_1 = require("./config");
const promptBuilder_1 = require("./promptBuilder");
const logger_1 = require("./logger");
const generateAnswer = async (question, context, chatHistory = []) => {
    try {
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
            ...chatHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            })),
            {
                role: 'user',
                parts: [{ text: prompt }]
            }
        ];
        const response = await ai.models.generateContent({
            model: config_1.AI_CONFIG.LLM_MODEL,
            contents,
            config: {
                systemInstruction: systemPrompt,
            }
        });
        return response.text || "No response generated.";
    }
    catch (err) {
        logger_1.aiLogger.error(`Generation error: ${err.message}`);
        throw err;
    }
};
exports.generateAnswer = generateAnswer;
