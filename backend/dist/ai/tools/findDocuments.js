"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findDocuments = void 0;
const cloudscale_1 = require("../cloudscale");
const queryEngine_1 = require("../queryEngine");
const logger_1 = require("../logger");
const findDocuments = async (collection, query, limit = 10, sort, req) => {
    const start = Date.now();
    try {
        const data = await (0, cloudscale_1.getTableData)(collection, req);
        const result = (0, queryEngine_1.findDocs)(data, query, limit, sort);
        logger_1.aiLogger.logQuery(`findDocuments on ${collection}`, Date.now() - start, [collection], false);
        return result;
    }
    catch (err) {
        logger_1.aiLogger.logQuery(`findDocuments on ${collection}`, Date.now() - start, [collection], true);
        throw err;
    }
};
exports.findDocuments = findDocuments;
