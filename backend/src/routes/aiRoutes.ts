import express from 'express';
import * as aiController from '../controllers/aiController';

const router = express.Router();

import { getVerifiedIntelligenceContext, IntelligenceDimensions } from '../services/intelligenceService';

router.get('/dashboard', aiController.getDashboard);
router.get('/report/pdf', aiController.generatePdfReport);

router.get('/intelligence-context', async (req, res) => {
  try {
    const dimensions: IntelligenceDimensions = {
      type: req.query.type as 'ANOMALY' | 'RISK',
      districtId: req.query.districtId ? Number(req.query.districtId) : undefined,
      stationId: req.query.stationId ? Number(req.query.stationId) : undefined,
      crimeHeadId: req.query.crimeHeadId ? Number(req.query.crimeHeadId) : undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined
    };

    if (!dimensions.type) {
      return res.status(400).json({ error: 'type is required' });
    }

    const context = await getVerifiedIntelligenceContext(req, dimensions);
    res.json({ success: true, ...context });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
