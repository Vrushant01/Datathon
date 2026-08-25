"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.similaritySearch = void 0;
const vectorStore_1 = require("../vectorStore");
const mongodb_1 = require("../mongodb");
const logger_1 = require("../logger");
const mongodb_2 = require("mongodb");
const similaritySearch = async (queryText, limit = 5) => {
    try {
        const start = Date.now();
        const similarDocs = await (0, vectorStore_1.searchSimilar)(queryText, limit);
        // Fetch full documents from original collections
        const db = await (0, mongodb_1.getDb)();
        const results = await Promise.all(similarDocs.map(async (doc) => {
            const fullDoc = await db.collection(doc.collection).findOne({ _id: new mongodb_2.ObjectId(doc.documentId) });
            return {
                ...fullDoc,
                _similarityScore: doc.score
            };
        }));
        logger_1.aiLogger.logQuery(`similaritySearch for "${queryText}"`, Date.now() - start, similarDocs.map((d) => d.collection), false);
        return results;
    }
    catch (err) {
        logger_1.aiLogger.logQuery(`similaritySearch`, 0, [], true);
        throw err;
    }
};
exports.similaritySearch = similaritySearch;
