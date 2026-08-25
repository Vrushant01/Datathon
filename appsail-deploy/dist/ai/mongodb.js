"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDb = exports.getDb = void 0;
const mongodb_1 = require("mongodb");
const config_1 = require("./config");
const logger_1 = require("./logger");
let client = null;
let dbInstance = null;
const getDb = async () => {
    if (dbInstance)
        return dbInstance;
    if (!client) {
        client = new mongodb_1.MongoClient(config_1.AI_CONFIG.MONGODB_URI, {
            maxPoolSize: 10,
        });
        await client.connect();
        logger_1.aiLogger.info('Connected to MongoDB natively for AI Analytics.');
    }
    dbInstance = client.db(config_1.AI_CONFIG.MONGODB_DATABASE);
    return dbInstance;
};
exports.getDb = getDb;
const closeDb = async () => {
    if (client) {
        await client.close();
        client = null;
        dbInstance = null;
        logger_1.aiLogger.info('Closed MongoDB native connection.');
    }
};
exports.closeDb = closeDb;
