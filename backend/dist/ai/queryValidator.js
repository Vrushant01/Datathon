"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = void 0;
const schemaCache_1 = require("./schemaCache");
const FORBIDDEN_OPERATORS = [
    '$insert', '$update', '$delete', '$drop', '$out', '$merge', '$bulkWrite',
    '$pull', '$pop',
    '$accumulator', '$function' // Also block custom code execution
];
const validateQuery = async (collectionName, query) => {
    const schema = await (0, schemaCache_1.getSchema)();
    if (!schema[collectionName]) {
        throw new Error(`Security Violation: Collection ${collectionName} does not exist or is restricted.`);
    }
    const queryStr = JSON.stringify(query);
    for (const op of FORBIDDEN_OPERATORS) {
        // Basic check for operator presence in keys
        if (queryStr.includes(`"${op}"`)) {
            throw new Error(`Security Violation: Operator ${op} is not permitted.`);
        }
    }
    return true;
};
exports.validateQuery = validateQuery;
