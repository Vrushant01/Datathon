"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiLogger = void 0;
exports.aiLogger = {
    info: (message, meta) => {
        console.log(`[AI-INFO] ${message}`, meta ? meta : '');
    },
    warn: (message, meta) => {
        console.warn(`[AI-WARN] ${message}`, meta ? meta : '');
    },
    error: (message, meta) => {
        console.error(`[AI-ERROR] ${message}`, meta ? meta : '');
    },
    logQuery: (question, durationMs, collections, hasError = false) => {
        console.log(`[AI-QUERY] Question: "${question}" | Duration: ${durationMs}ms | Collections: ${collections.join(',')} | Status: ${hasError ? 'ERROR' : 'SUCCESS'}`);
    }
};
