"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCollections = void 0;
const mongodb_1 = require("../mongodb");
const listCollections = async () => {
    const db = await (0, mongodb_1.getDb)();
    const collections = await db.listCollections().toArray();
    return collections.map(c => c.name);
};
exports.listCollections = listCollections;
