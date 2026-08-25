"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSchema = exports.discoverSchema = void 0;
const mongodb_1 = require("./mongodb");
const logger_1 = require("./logger");
let cachedSchema = null;
let isDiscovering = false;
const inferType = (val) => {
    if (val === null)
        return 'null';
    if (Array.isArray(val))
        return 'array';
    if (val instanceof Date)
        return 'date';
    return typeof val;
};
const discoverSchema = async () => {
    if (isDiscovering) {
        while (isDiscovering) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return cachedSchema || {};
    }
    isDiscovering = true;
    try {
        const db = await (0, mongodb_1.getDb)();
        const collections = await db.listCollections().toArray();
        const schema = {};
        for (const collInfo of collections) {
            if (collInfo.name === 'embeddings' || collInfo.name.startsWith('system.'))
                continue;
            const collectionName = collInfo.name;
            const sampleDocs = await db.collection(collectionName).find().limit(20).toArray();
            const fields = {};
            for (const doc of sampleDocs) {
                for (const [key, val] of Object.entries(doc)) {
                    const type = inferType(val);
                    if (!fields[key]) {
                        fields[key] = { type, count: 0 };
                    }
                    fields[key].count += 1;
                }
            }
            schema[collectionName] = {
                collectionName,
                fields,
                sampleDocuments: sampleDocs.slice(0, 2) // keep 2 docs for prompt context
            };
        }
        cachedSchema = schema;
        logger_1.aiLogger.info(`Schema discovered for ${Object.keys(schema).length} collections.`);
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
const getSchema = async () => {
    if (!cachedSchema) {
        return await (0, exports.discoverSchema)();
    }
    return cachedSchema;
};
exports.getSchema = getSchema;
