import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { sseService } from '../services/sseService';

const router = express.Router();

// The SSE endpoint where authenticated clients connect
router.get('/', requireAuth, (req, res) => {
    sseService.connectClient(req, res);
});

export default router;
