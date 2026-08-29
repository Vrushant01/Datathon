import express from 'express';
import * as stationRiskController from '../controllers/stationRiskController';

const router = express.Router();

router.post('/predict', stationRiskController.predictRisk);

export default router;
