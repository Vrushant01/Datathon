"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminController_1 = require("../controllers/adminController");
const RepositoryFactory_1 = require("../repositories/RepositoryFactory");
const backfillService_1 = require("../services/backfillService");
const CloudScaleRepository_1 = require("../repositories/CloudScaleRepository");
const router = express_1.default.Router();
router.use(authMiddleware_1.authMiddleware);
router.use((0, authMiddleware_1.requireRole)('Admin'));
router.post('/migrate-to-nosql', adminController_1.startMigration);
router.get('/migration-status', adminController_1.getMigrationStatus);
/**
 * Non-blocking Dashboard Stats endpoint
 * Returns ready components immediately (officers, stations) without blocking if cases is scanning.
 */
router.get('/dashboard-stats', async (req, res) => {
    const startTime = Date.now();
    try {
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        // Fetch units and officers fast
        const officersPromise = db.getEmployees().catch(e => {
            console.warn('[Stats] getEmployees error:', e.message);
            return [];
        });
        const unitsPromise = db.getUnits().catch(e => {
            console.warn('[Stats] getUnits error:', e.message);
            return [];
        });
        // Timeout cases at 3500ms so cold-starts don't hang the dashboard
        const casesPromiseWithTimeout = Promise.race([
            db.getCases({}),
            new Promise(resolve => setTimeout(() => resolve(null), 3500))
        ]).catch(e => {
            console.warn('[Stats] getCases error:', e.message);
            return null;
        });
        const [officers, units, cases] = await Promise.all([
            officersPromise,
            unitsPromise,
            casesPromiseWithTimeout
        ]);
        const elapsed = Date.now() - startTime;
        const isCasesLoading = cases === null;
        const totalFirs = cases ? cases.length : null;
        const solvedClosed = cases ? cases.filter((c) => c.CaseStatusID === 2 || c.CaseStatusID === 3 || c.CaseStatusID === 4).length : null;
        const pendingCases = (totalFirs !== null && solvedClosed !== null) ? totalFirs - solvedClosed : null;
        const activeOfficers = officers.length;
        const policeStations = units.filter((u) => u.TypeID === 1).length;
        const casesLight = cases ? cases.map((c) => ({
            d: c.CrimeRegisteredDate,
            h: c.CrimeMajorHeadID,
            s: c.CaseStatusID
        })).filter((c) => c.d) : [];
        console.log(`[Dashboard Stats] officers=${activeOfficers}, units=${units.length}, cases=${totalFirs !== null ? totalFirs : 'LOADING'} (${elapsed}ms)`);
        res.json({
            success: true,
            status: isCasesLoading ? 'warming_up' : 'ready',
            casesLoading: isCasesLoading,
            data: {
                totalFirs,
                pendingCases,
                solvedClosed,
                activeOfficers,
                policeStations,
                casesLight,
                _meta: {
                    elapsed_ms: elapsed,
                    cacheState: isCasesLoading ? 'scanning' : 'warm',
                    tablesLoading: isCasesLoading ? ['casemasters'] : []
                }
            }
        });
    }
    catch (error) {
        const elapsed = Date.now() - startTime;
        console.error(`[Dashboard Stats Error] after ${elapsed}ms:`, error?.message || error);
        res.status(200).json({
            success: true,
            status: 'error_fallback',
            data: {
                totalFirs: null,
                pendingCases: null,
                solvedClosed: null,
                activeOfficers: null,
                policeStations: null,
                casesLight: [],
                _meta: { elapsed_ms: elapsed, error: error?.message }
            }
        });
    }
});
/**
 * Step A & B: Analyze existing CloudScale data and generate dry-run backfill plan
 */
router.get('/backfill/plan', async (req, res) => {
    const startTime = Date.now();
    try {
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        const batchId = req.query.batchId || 'seed-2026-10-29';
        console.log(`[Backfill Plan] Generating plan with batchId: ${batchId}...`);
        const plan = await (0, backfillService_1.createBackfillPlan)(db, batchId);
        const elapsed = Date.now() - startTime;
        // Remove raw generated records from preview response to keep JSON light
        const { generatedCases, generatedAccused, generatedVictims, generatedComplainants, ...preview } = plan;
        res.json({
            success: true,
            elapsed_ms: elapsed,
            plan: preview,
            sampleCase: generatedCases[0],
            sampleAccused: generatedAccused[0],
            sampleVictim: generatedVictims[0],
            sampleComplainant: generatedComplainants[0]
        });
    }
    catch (err) {
        console.error('[Backfill Plan Error]:', err);
        res.status(500).json({ success: false, error: err.message, details: err.message });
    }
});
/**
 * Step C: Execute Backfill Plan (Requires explicit user confirmation)
 */
router.post('/backfill/execute', async (req, res) => {
    const startTime = Date.now();
    try {
        const { batchId = 'seed-2026-10-29', confirmed } = req.body;
        if (!confirmed) {
            return res.status(400).json({ success: false, error: 'Explicit confirmation required. Send confirmed: true.' });
        }
        const catalystApp = (0, CloudScaleRepository_1.getCatalystApp)(req);
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        console.log(`[Backfill Execute] Starting execution for batch: ${batchId}...`);
        const plan = await (0, backfillService_1.createBackfillPlan)(db, batchId);
        const result = await (0, backfillService_1.executeBackfillPlan)(plan, catalystApp);
        // Invalidate caches so the new cases immediately reflect in queries and dashboard stats
        (0, CloudScaleRepository_1.invalidateAllCache)();
        const elapsed = Date.now() - startTime;
        res.json({
            success: true,
            message: 'Backfill completed successfully without touching existing records.',
            elapsed_ms: elapsed,
            result
        });
    }
    catch (err) {
        console.error('[Backfill Execute Error]:', err);
        res.status(500).json({ success: false, error: err.message, details: err.message });
    }
});
exports.default = router;
