"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminJwt_1 = require("../middleware/adminJwt");
const chatbot_1 = require("../ai/chatbot");
const logger_1 = require("../ai/logger");
const schemaCache_1 = require("../ai/schemaCache");
const router = (0, express_1.Router)();
router.use(adminJwt_1.adminJwtMiddleware);
router.get('/health', (req, res) => {
    res.json({ status: 'healthy', module: 'AI Assistant', version: '1.0' });
});
router.post('/reindex', async (req, res) => {
    try {
        await (0, schemaCache_1.discoverSchema)();
        res.json({ success: true, message: 'Reindexing and schema discovery triggered' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/chat', async (req, res) => {
    try {
        const { question, sessionId = 'default' } = req.body;
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }
        const session = (0, chatbot_1.getSession)(sessionId);
        if (req.headers.accept === 'text/event-stream') {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            await session.processMessage(question, (token) => {
                res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
            });
            res.write(`data: [DONE]\n\n`);
            res.end();
        }
        else {
            const answer = await session.processMessage(question);
            res.json({ answer });
        }
    }
    catch (err) {
        logger_1.aiLogger.error(`Chat error: ${err.message}`);
        if (req.headers.accept === 'text/event-stream') {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
        }
        else {
            res.status(500).json({ error: err.message });
        }
    }
});
router.get('/analytics', (req, res) => {
    res.json({
        totalQuestions: 142,
        averageResponseTime: '1.2s',
        dailyUsage: 45,
        mostAskedQuestions: ['How many FIRs today?', 'Show crime statistics'],
        mostAccessedCollections: ['cases', 'employees'],
        failedQueries: 3,
        cacheHitRate: '85%',
        tokenUsage: '1.2M',
        activeSessions: 5
    });
});
exports.default = router;
