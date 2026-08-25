"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planQuery = void 0;
const embeddings_1 = require("./embeddings");
const config_1 = require("./config");
const logger_1 = require("./logger");
const promptBuilder_1 = require("./promptBuilder");
const planQuery = async (question) => {
    const ai = (0, embeddings_1.getAI)();
    const prompt = await (0, promptBuilder_1.buildSystemPrompt)();
    const instruction = `
Given the user's question, decide whether to use a direct MongoDB query (findDocuments, aggregate, countDocuments) or vector search (similaritySearch).
Return ONLY a valid JSON object matching this structure:
{
  "tool": "findDocuments" | "aggregate" | "countDocuments" | "similaritySearch" | "none",
  "collection": "collectionName if applicable",
  "query": {}, 
  "reasoning": "why you chose this"
}
If 'similaritySearch' is chosen, 'query' should be a string containing the semantic search text.
If 'none' is chosen, no database query will be run.
For aggregate, 'query' should be an array (the pipeline).
User Question: ${question}
  `;
    try {
        const response = await ai.models.generateContent({
            model: config_1.AI_CONFIG.LLM_MODEL,
            contents: instruction,
            config: {
                systemInstruction: prompt,
                responseMimeType: 'application/json',
                temperature: 0.1,
            }
        });
        const text = response.text || '{}';
        return JSON.parse(text);
    }
    catch (err) {
        logger_1.aiLogger.error(`Planner error: ${err.message}`);
        return { tool: 'none', reasoning: 'Planner failed' };
    }
};
exports.planQuery = planQuery;
