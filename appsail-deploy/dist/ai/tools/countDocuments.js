"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countDocuments = void 0;
const mongodb_1 = require("../mongodb");
const queryValidator_1 = require("../queryValidator");
const logger_1 = require("../logger");
const countDocuments = async (collection, query) => {
    try {
        await (0, queryValidator_1.validateQuery)(collection, query);
        const db = await (0, mongodb_1.getDb)();
        const start = Date.now();
        const count = await db.collection(collection).countDocuments(query);
        logger_1.aiLogger.logQuery(`countDocuments on ${collection}`, Date.now() - start, [collection], false);
        return count;
    }
    catch (err) {
        logger_1.aiLogger.logQuery(`countDocuments on ${collection}`, 0, [collection], true);
        throw err;
    }
};
exports.countDocuments = countDocuments;
