import express from 'express';
import { adminJwtMiddleware } from '../middleware/adminJwt';
import { startMigration, getMigrationStatus } from '../controllers/adminController';

const router = express.Router();

// router.use(adminJwtMiddleware);

router.post('/migrate-to-nosql', startMigration);
// router.post('/migrate-to-cloudscale', startCloudScaleMigration);
router.get('/migration-status', getMigrationStatus);


export default router;
