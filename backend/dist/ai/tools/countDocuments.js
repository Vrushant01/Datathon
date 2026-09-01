"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countDocuments = void 0;
const cloudscale_1 = require("../cloudscale");
const queryEngine_1 = require("../queryEngine");
const logger_1 = require("../logger");
const countDocuments = async (collection, query, req) => {
    const start = Date.now();
    try {
        const data = await (0, cloudscale_1.getTableData)(collection, req);
        const count = (0, queryEngine_1.countDocs)(data, query);
        logger_1.aiLogger.logQuery(`countDocuments on ${collection}`, Date.now() - start, [collection], false);
        return count;
    }
    catch (err) {
        logger_1.aiLogger.logQuery(`countDocuments on ${collection}`, Date.now() - start, [collection], true);
        throw err;
    }
};
exports.countDocuments = countDocuments;
