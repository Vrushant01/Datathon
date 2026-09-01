"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregate = void 0;
const cloudscale_1 = require("../cloudscale");
const queryEngine_1 = require("../queryEngine");
const logger_1 = require("../logger");
const aggregate = async (collection, pipeline, req) => {
    const start = Date.now();
    try {
        const data = await (0, cloudscale_1.getTableData)(collection, req);
        const result = (0, queryEngine_1.runAggregate)(data, pipeline);
        logger_1.aiLogger.logQuery(`aggregate on ${collection}`, Date.now() - start, [collection], false);
        return result;
    }
    catch (err) {
        logger_1.aiLogger.logQuery(`aggregate on ${collection}`, Date.now() - start, [collection], true);
        throw err;
    }
};
exports.aggregate = aggregate;
