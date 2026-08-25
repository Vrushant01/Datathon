"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveContext = void 0;
const findDocuments_1 = require("./tools/findDocuments");
const aggregate_1 = require("./tools/aggregate");
const countDocuments_1 = require("./tools/countDocuments");
const similaritySearch_1 = require("./tools/similaritySearch");
const logger_1 = require("./logger");
const retrieveContext = async (plan) => {
    try {
        if (plan.tool === 'none' || !plan.query) {
            return null;
        }
        if (plan.tool === 'similaritySearch') {
            return await (0, similaritySearch_1.similaritySearch)(plan.query, 5);
        }
        if (!plan.collection) {
            throw new Error("Collection is required for database tools.");
        }
        switch (plan.tool) {
            case 'findDocuments':
                return await (0, findDocuments_1.findDocuments)(plan.collection, plan.query);
            case 'aggregate':
                return await (0, aggregate_1.aggregate)(plan.collection, plan.query);
            case 'countDocuments':
                return { count: await (0, countDocuments_1.countDocuments)(plan.collection, plan.query) };
            default:
                return null;
        }
    }
    catch (err) {
        logger_1.aiLogger.error(`Retriever error: ${err.message}`);
        return { error: err.message };
    }
};
exports.retrieveContext = retrieveContext;
