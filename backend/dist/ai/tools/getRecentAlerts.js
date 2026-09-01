"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentAlertsDef = void 0;
exports.getRecentAlertsDef = {
    name: 'getRecentAlerts',
    description: 'Retrieves recent high-priority alerts or cases based on GravityOffenceID or CaseStatusID within a specific date range or district.',
    parameters: {
        type: 'object',
        properties: {
            dateRange: {
                type: 'object',
                description: 'The date range to filter by.',
                properties: {
                    start: { type: 'string', description: 'Start date in YYYY-MM-DD' },
                    end: { type: 'string', description: 'End date in YYYY-MM-DD' }
                },
                required: ['start', 'end']
            },
            districtName: {
                type: 'string',
                description: 'Optional district name to filter alerts by.'
            },
            limit: {
                type: 'number',
                description: 'Number of recent alerts to return (default is 10).'
            },
            reasoning: {
                type: 'string',
                description: 'Explain why you are calling this tool.'
            }
        },
        required: ['dateRange', 'reasoning']
    }
};
