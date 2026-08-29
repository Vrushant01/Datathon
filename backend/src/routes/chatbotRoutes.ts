import { Router } from 'express';
import { adminJwtMiddleware } from '../middleware/adminJwt';
import { getSession } from '../ai/chatbot';
import { aiLogger } from '../ai/logger';
import { discoverSchema } from '../ai/schemaCache';

const router = Router();

router.use(adminJwtMiddleware);

router.get('/health', (req, res) => {
  res.json({ status: 'healthy', module: 'AI Assistant', version: '1.0' });
});

router.post('/reindex', async (req, res) => {
  try {
    await discoverSchema();
    res.json({ success: true, message: 'Reindexing and schema discovery triggered' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { question, sessionId = 'default' } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const session = getSession(sessionId);

    if (req.headers.accept === 'text/event-stream') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await session.processMessage(req, question, (token) => {
        res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
      });

      res.write(`data: [DONE]\n\n`);
      res.end();
    } else {
      const answer = await session.processMessage(req, question);
      res.json({ answer });
    }
  } catch (err: any) {
    aiLogger.error(`Chat error: ${err.message}`);
    if (req.headers.accept === 'text/event-stream') {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    } else {
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

export default router;
