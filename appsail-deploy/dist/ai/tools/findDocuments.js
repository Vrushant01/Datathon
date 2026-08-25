"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findDocuments = void 0;
const mongodb_1 = require("../mongodb");
const queryValidator_1 = require("../queryValidator");
const logger_1 = require("../logger");
const findDocuments = async (collection, query, limit = 10, sort) => {
    try {
        await (0, queryValidator_1.validateQuery)(collection, query);
        const db = await (0, mongodb_1.getDb)();
        let cursor = db.collection(collection).find(query).limit(Math.min(limit, 100));
        if (sort) {
            cursor = cursor.sort(sort);
        }
        const start = Date.now();
        const result = await cursor.toArray();
        logger_1.aiLogger.logQuery(`findDocuments on ${collection}`, Date.now() - start, [collection], false);
        return result;
    }
    catch (err) {
        logger_1.aiLogger.logQuery(`findDocuments on ${collection}`, 0, [collection], true);
        throw err;
    }
};
exports.findDocuments = findDocuments;
