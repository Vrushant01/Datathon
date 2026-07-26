"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemaExplorer = void 0;
const schemaCache_1 = require("../schemaCache");
const schemaExplorer = async () => {
    return await (0, schemaCache_1.getSchema)();
};
exports.schemaExplorer = schemaExplorer;
