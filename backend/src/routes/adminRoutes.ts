import express from 'express';
import { adminJwtMiddleware } from '../middleware/adminJwt';
import { startMigration, getMigrationStatus } from '../controllers/adminController';
import { validateMigration } from '../controllers/validationController';

const router = express.Router();

router.use(adminJwtMiddleware);

router.post('/migrate-to-nosql', startMigration);
router.get('/migration-status', getMigrationStatus);
router.get('/validate-migration', validateMigration);

export default router;
