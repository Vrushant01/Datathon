import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { startMigration, getMigrationStatus } from '../controllers/adminController';

const router = express.Router();

// router.use(authMiddleware);

router.post('/migrate-to-nosql', startMigration);
// router.post('/migrate-to-cloudscale', startCloudScaleMigration);
router.get('/migration-status', getMigrationStatus);


export default router;
