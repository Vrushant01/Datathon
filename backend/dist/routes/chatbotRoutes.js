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
const chatbotHandler = async (req, res) => {
    try {
        const question = req.body.question || req.query.question;
        const sessionId = req.body.sessionId || req.query.sessionId || 'default';
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }
        const session = (0, chatbot_1.getSession)(sessionId);
        if (req.headers.accept === 'text/event-stream') {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            // AppSail kills requests after ~30s. We race the actual answer against a
            // 25-second timeout so we can respond gracefully before the platform cuts us off.
            const timeoutMs = 25000;
            let timedOut = false;
            const timeoutHandle = setTimeout(() => {
                timedOut = true;
                logger_1.aiLogger.warn(`Chat timeout after ${timeoutMs}ms for question: "${question}"`);
                const warmupMsg = 'The database query took too long to complete. Please try a simpler query or try again later.';
                res.write(`data: ${JSON.stringify({ text: warmupMsg })}\n\n`);
                res.write(`data: [DONE]\n\n`);
                res.end();
            }, timeoutMs);
            try {
                await session.processMessage(req, question, (token) => {
                    if (!timedOut) {
                        res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
                    }
                });
                if (!timedOut) {
                    res.write(`data: [DONE]\n\n`);
                    res.end();
                }
            }
            finally {
                clearTimeout(timeoutHandle);
            }
        }
        else {
            const answer = await session.processMessage(req, question);
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
};
router.get('/chat', chatbotHandler);
router.post('/chat', chatbotHandler);
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
const CloudScaleRepository_1 = require("../repositories/CloudScaleRepository");
router.get('/debug/mappings', async (req, res) => {
    try {
        const repo = new CloudScaleRepository_1.CloudScaleRepository(req);
        const cases = await repo.getAllCases();
        res.json({
            firstCase: cases[0] || null
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
