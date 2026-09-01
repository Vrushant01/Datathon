"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAnswer = void 0;
const catalystLLM_1 = require("./catalystLLM");
const promptBuilder_1 = require("./promptBuilder");
const logger_1 = require("./logger");
const generateAnswer = async (question, context, chatHistory = [], req, plan) => {
    try {
        const systemPrompt = await (0, promptBuilder_1.buildSystemPrompt)(req);
        let userContent = `User Question: ${question}\n\n`;
        if (context) {
            userContent += `Database Context:\n${JSON.stringify(context, null, 2)}\n\n`;
            userContent += `Please answer the user's question using strictly the Database Context provided above.\n`;
        }
        else {
            userContent += `No database tools were queried for this question.\n`;
            if (plan?.reasoning) {
                userContent += `Planner reasoning: ${plan.reasoning}\n`;
            }
            userContent += `Please incorporate this reasoning into your response, or indicate that no data is available.\n`;
        }
        const messages = [
            { role: 'system', content: systemPrompt },
            ...chatHistory.map(msg => ({
                role: (msg.role === 'user' ? 'user' : 'assistant'),
                content: msg.content,
            })),
            { role: 'user', content: userContent },
        ];
        const result = await (0, catalystLLM_1.chatComplete)(messages, { temperature: 0.2, maxTokens: 2500 });
        return result.content || 'No response generated.';
    }
    catch (err) {
        logger_1.aiLogger.error(`Generation error: ${err.message}`);
        throw err;
    }
};
exports.generateAnswer = generateAnswer;
