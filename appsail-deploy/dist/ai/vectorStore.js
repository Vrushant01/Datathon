"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchSimilar = exports.saveEmbedding = void 0;
const mongodb_1 = require("./mongodb");
const embeddings_1 = require("./embeddings");
const logger_1 = require("./logger");
const saveEmbedding = async (doc) => {
    const db = await (0, mongodb_1.getDb)();
    await db.collection('embeddings').updateOne({ documentId: doc.documentId, collection: doc.collection }, { $set: doc }, { upsert: true });
};
exports.saveEmbedding = saveEmbedding;
const searchSimilar = async (queryText, limit = 5) => {
    try {
        const queryEmbedding = await (0, embeddings_1.generateEmbedding)(queryText);
        if (!queryEmbedding || queryEmbedding.length === 0)
            return [];
        const db = await (0, mongodb_1.getDb)();
        // Generic fallback for local MongoDB without Atlas Vector Search.
        // Calculates Cosine Similarity in-memory.
        const allEmbeddings = await db.collection('embeddings').find().toArray();
        const calculateCosineSimilarity = (vecA, vecB) => {
            if (!vecA || !vecB || vecA.length !== vecB.length)
                return 0;
            let dotProduct = 0;
            let normA = 0;
            let normB = 0;
            for (let i = 0; i < vecA.length; i++) {
                dotProduct += vecA[i] * vecB[i];
                normA += vecA[i] * vecA[i];
                normB += vecB[i] * vecB[i];
            }
            if (normA === 0 || normB === 0)
                return 0;
            return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        };
        const scored = allEmbeddings.map((doc) => ({
            ...doc,
            score: calculateCosineSimilarity(queryEmbedding, doc.embedding || [])
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, limit);
    }
    catch (err) {
        logger_1.aiLogger.error(`Error searching embeddings: ${err.message}`);
        return [];
    }
};
exports.searchSimilar = searchSimilar;
