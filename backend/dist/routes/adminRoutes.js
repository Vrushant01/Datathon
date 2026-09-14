"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
const authMiddleware_2 = require("../middleware/authMiddleware");
router.use(authMiddleware_1.authMiddleware);
router.use((0, authMiddleware_2.requireRole)('Admin'));
router.post('/migrate-to-nosql', adminController_1.startMigration);
// router.post('/migrate-to-cloudscale', startCloudScaleMigration);
router.get('/migration-status', adminController_1.getMigrationStatus);
const RepositoryFactory_1 = require("../repositories/RepositoryFactory");
router.get('/dashboard-stats', async (req, res) => {
    const startTime = Date.now();
    try {
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        // Use Promise.all to fetch cached/scanned data
        const [cases, officers, units] = await Promise.all([
            db.getCases({}),
            db.getEmployees(),
            db.getUnits()
        ]);
        const elapsed = Date.now() - startTime;
        console.log(`[Dashboard Stats] cases=${cases.length}, officers=${officers.length}, units=${units.length} (${elapsed}ms)`);
        const totalFirs = cases.length;
        // According to mockDb logic: solved = CaseStatusID 2, 3, or 4
        const solvedClosed = cases.filter(c => c.CaseStatusID === 2 || c.CaseStatusID === 3 || c.CaseStatusID === 4).length;
        const pendingCases = totalFirs - solvedClosed;
        // Count all registered officers (status not reliably stored in DB)
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
                casesLight,
                _meta: { elapsed_ms: elapsed, cacheState: 'warm' }
            }
        });
    }
    catch (error) {
        const elapsed = Date.now() - startTime;
        console.error(`[Dashboard Stats Error] after ${elapsed}ms:`, error?.message || error);
        res.status(500).json({ success: false, error: error?.message || 'Failed to fetch dashboard stats', elapsed_ms: elapsed });
    }
});
exports.default = router;
