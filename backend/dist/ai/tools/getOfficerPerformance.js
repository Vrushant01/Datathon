"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOfficerPerformanceDef = void 0;
exports.getOfficerPerformanceDef = {
    name: 'getOfficerPerformance',
    description: 'ONLY use this when the user asks for a SPECIFIC individual police officer by name or ID (e.g., "How many cases did Kiran Desai handle?"). DO NOT use this tool for general officer performance questions like "top officers", "officer performance", or "who handled the most cases" (use executeDatabaseQuery instead).',
    parameters: {
        type: 'object',
        properties: {
            officerIdentifier: {
                type: 'string',
                description: 'The name or EmployeeID of the officer (e.g. "Kiran Desai" or "10427")'
            },
            reasoning: {
                type: 'string',
                description: 'Explain why you are querying this officer.'
            }
        },
        required: ['officerIdentifier', 'reasoning']
    }
};
