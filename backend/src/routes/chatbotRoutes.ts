import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getSession } from '../ai/chatbot';
import { aiLogger } from '../ai/logger';
import { discoverSchema } from '../ai/schemaCache';

const router = Router();

router.use(authMiddleware);

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

const chatbotHandler = async (req: Request, res: Response) => {
  try {
    const question = req.body.question || req.query.question;
    const sessionId = req.body.sessionId || req.query.sessionId || 'default';
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const session = getSession(sessionId as string);

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
        const warmupMsg = 'The database query took too long to complete. Please try a simpler query or try again later.';
        res.write(`data: ${JSON.stringify({ text: warmupMsg })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      }, timeoutMs);

      try {
        await session.processMessage(req, question as string, (token) => {
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
      const answer = await session.processMessage(req, question as string);
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
};

router.get('/chat', chatbotHandler);
router.post('/chat', chatbotHandler);

import { generateAnswer } from '../ai/rag';
import { getVerifiedIntelligenceContext, IntelligenceDimensions } from '../services/intelligenceService';

router.post('/investigation-summary', async (req: Request, res: Response) => {
  try {
    const { alertDetails } = req.body;
    
    if (!alertDetails || !alertDetails.type) {
      return res.status(400).json({ error: 'Valid alertDetails with type is required' });
    }

    const dimensions: IntelligenceDimensions = {
      type: alertDetails.type,
      districtId: alertDetails.districtId ? Number(alertDetails.districtId) : undefined,
      stationId: alertDetails.stationId ? Number(alertDetails.stationId) : undefined,
      crimeHeadId: alertDetails.crimeHeadId ? Number(alertDetails.crimeHeadId) : undefined,
      dateFrom: alertDetails.dateFrom,
      dateTo: alertDetails.dateTo
    };

    // 1. Fetch completely verified facts from backend service (ignoring any client-provided facts)
    const verifiedData = await getVerifiedIntelligenceContext(req, dimensions);

    const fullContext = {
      alertDetails: {
        id: alertDetails.id,
        type: alertDetails.type,
        severity: alertDetails.severity,
        locationName: alertDetails.locationName,
        explanation: alertDetails.explanation,
        score: alertDetails.score
      },
      ...verifiedData
    };

    const question = `Please provide a concise investigation summary of this intelligence alert. 
    
    CRITICAL INSTRUCTIONS:
    1. Use ONLY the supplied structured context.
    2. Do not invent case details, people, relationships, or crime statistics.
    3. Clearly separate FACTS from RECOMMENDATIONS.
    4. If information is unavailable, explicitly state "Information unavailable".
    5. Do not claim an investigation action has occurred unless the context proves it.
    6. Use language such as "Based on the available case data...".
    `;

    // Bypass standard history/retrieval - directly pass the context to generateAnswer
    const answer = await generateAnswer(question, fullContext, [], req);
    
    res.json({ answer });
  } catch (err: any) {
    aiLogger.error(`Investigation Summary error: ${err.message}`);
    res.status(500).json({ error: err.message });
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
