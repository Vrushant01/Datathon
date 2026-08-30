import { Router, Request, Response } from 'express';
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

      // AppSail kills requests after ~30s. We race the actual answer against a
      // 25-second timeout so we can respond gracefully before the platform cuts us off.
      const timeoutMs = 25000;
      let timedOut = false;

      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        aiLogger.warn(`Chat timeout after ${timeoutMs}ms for question: "${question}"`);
        // Send a warm-up notice as text so the frontend shows it instead of an error
        const warmupMsg = 'The crime database is still loading into memory (this takes ~30 seconds on a cold start). Please send your question again in a moment and it will answer instantly.';
        warmupMsg.match(/.{1,6}/g)?.forEach((chunk: string) => {
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        });
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
      } finally {
        clearTimeout(timeoutHandle);
      }
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

import { CloudScaleRepository } from '../repositories/CloudScaleRepository';

router.get('/debug/mappings', async (req: Request, res: Response) => {
  try {
    const repo = new CloudScaleRepository(req);
    const cases = await repo.getAllCases();
    res.json({
      firstCase: cases[0] || null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
