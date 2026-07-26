"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregate = void 0;
const mongodb_1 = require("../mongodb");
const queryValidator_1 = require("../queryValidator");
const logger_1 = require("../logger");
const aggregate = async (collection, pipeline) => {
    try {
        await (0, queryValidator_1.validateQuery)(collection, pipeline);
        const db = await (0, mongodb_1.getDb)();
        const safePipeline = [...pipeline, { $limit: 100 }];
        const start = Date.now();
        const result = await db.collection(collection).aggregate(safePipeline).toArray();
        logger_1.aiLogger.logQuery(`aggregate on ${collection}`, Date.now() - start, [collection], false);
        return result;
    }
    catch (err) {
        logger_1.aiLogger.logQuery(`aggregate on ${collection}`, 0, [collection], true);
        throw err;
    }
};
exports.aggregate = aggregate;
