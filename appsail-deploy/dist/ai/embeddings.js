"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = exports.getAI = void 0;
const genai_1 = require("@google/genai");
const config_1 = require("./config");
const logger_1 = require("./logger");
let ai = null;
const getAI = () => {
    if (!ai) {
        ai = new genai_1.GoogleGenAI({ apiKey: config_1.AI_CONFIG.GOOGLE_API_KEY });
    }
    return ai;
};
exports.getAI = getAI;
const generateEmbedding = async (text) => {
    try {
        const aiInstance = (0, exports.getAI)();
        const response = await aiInstance.models.embedContent({
            model: config_1.AI_CONFIG.EMBEDDING_MODEL,
            contents: text,
        });
        if (response.embeddings && response.embeddings.length > 0) {
            return response.embeddings[0].values;
        }
        return [];
    }
    catch (err) {
        logger_1.aiLogger.error(`Error generating embedding: ${err.message}`);
        throw err;
    }
};
exports.generateEmbedding = generateEmbedding;
