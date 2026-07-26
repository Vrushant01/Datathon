import express from 'express';
import * as aiController from '../controllers/aiController';

const router = express.Router();

router.get('/dashboard', aiController.getDashboard);
router.get('/report/pdf', aiController.generatePdfReport);

export default router;
