import express from 'express';
import { getHotspots } from '../controllers/hotspotController';

const router = express.Router();

router.get('/', getHotspots);

export default router;
