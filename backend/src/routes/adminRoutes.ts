import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { startMigration, getMigrationStatus } from '../controllers/adminController';

const router = express.Router();

import { requireRole } from '../middleware/authMiddleware';

router.use(authMiddleware);
router.use(requireRole('Admin'));

router.post('/migrate-to-nosql', startMigration);
// router.post('/migrate-to-cloudscale', startCloudScaleMigration);
router.get('/migration-status', getMigrationStatus);

import { RepositoryFactory } from '../repositories/RepositoryFactory';

router.get('/dashboard-stats', async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    
    // Use Promise.all to fetch cached/scanned data
    const [cases, officers, units] = await Promise.all([
      db.getCases({}),
      db.getEmployees(),
      db.getUnits()
    ]);
    
    const totalFirs = cases.length;
    // According to mockDb logic: solved = CaseStatusID 2, 3, or 4
    const solvedClosed = cases.filter(c => c.CaseStatusID === 2 || c.CaseStatusID === 3 || c.CaseStatusID === 4).length;
    const pendingCases = totalFirs - solvedClosed;
    
    // active officers = status 'Active'. Note: DB might not have 'status', but mockDb sets it. 
    // We can just return total officers if status is not reliably in DB.
    // In mockDb: officers.filter(o => o.status === 'Active').length
    // Let's check how mockDb maps it. It defaults to 'Active'. We'll just count all for now.
    const activeOfficers = officers.length; 
    
    // police stations = TypeID 1
    const policeStations = units.filter(u => u.TypeID === 1).length;

    // Lightweight case array for frontend to compute trends and categories locally
    const casesLight = cases.map(c => ({
      d: c.CrimeRegisteredDate,
      h: c.CrimeMajorHeadID,
      s: c.CaseStatusID
    })).filter(c => c.d); // Ensure date exists

    res.json({
      success: true,
      data: {
        totalFirs,
        pendingCases,
        solvedClosed,
        activeOfficers,
        policeStations,
        casesLight
      }
    });
  } catch (error: any) {
    console.error('[Dashboard Stats Error]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
