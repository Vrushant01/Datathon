"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSchema = exports.discoverSchema = void 0;
const cloudscale_1 = require("./cloudscale");
const logger_1 = require("./logger");
let cachedSchema = null;
let isDiscovering = false;
const inferType = (val) => {
    if (val === null || val === undefined)
        return 'null';
    if (Array.isArray(val))
        return 'array';
    return typeof val;
};
const discoverSchema = async (req) => {
    if (isDiscovering) {
        while (isDiscovering)
            await new Promise(r => setTimeout(r, 100));
        return cachedSchema || {};
    }
    isDiscovering = true;
    try {
        const schema = {};
        for (const table of (0, cloudscale_1.listTables)()) {
            const rows = await (0, cloudscale_1.getTableData)(table, req);
            const sample = rows.slice(0, 20);
            const fields = {};
            for (const doc of sample) {
                for (const [key, val] of Object.entries(doc)) {
                    const type = inferType(val);
                    if (!fields[key])
                        fields[key] = { type, count: 0 };
                    fields[key].count += 1;
                }
            }
            schema[table] = {
                collectionName: table,
                fields,
                sampleDocuments: sample.slice(0, 2),
            };
        }
        cachedSchema = schema;
        logger_1.aiLogger.info(`[CloudScale] Schema discovered for ${Object.keys(schema).length} tables.`);
        return schema;
    }
    catch (err) {
        logger_1.aiLogger.error(`Schema discovery failed: ${err.message}`);
        throw err;
    }
    finally {
        isDiscovering = false;
    }
};
exports.discoverSchema = discoverSchema;
const getSchema = async (req) => {
    if (cachedSchema)
        return cachedSchema;
    try {
        return await (0, exports.discoverSchema)(req);
    }
    catch (err) {
        logger_1.aiLogger.error(`getSchema falling back to empty schema: ${err.message}`);
        return {};
    }
};
exports.getSchema = getSchema;
