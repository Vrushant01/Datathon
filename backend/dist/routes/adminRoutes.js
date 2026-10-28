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
const reconcileService_1 = require("../services/reconcileService");
const CloudScaleRepository_1 = require("../repositories/CloudScaleRepository");
const analyticsRoutes_1 = require("./analyticsRoutes");
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
 * Clear in-memory table cache on demand
 */
router.post('/cache/clear', (req, res) => {
    (0, CloudScaleRepository_1.invalidateAllCache)();
    (0, analyticsRoutes_1.invalidateAnalyticsCache)();
    res.json({ success: true, message: 'All in-memory table caches cleared successfully' });
});
/**
 * Read-only Data Reconciliation & Audit Endpoint
 * Implements 3 independent counting methods, 18-month historical trends, real max IDs, and exact gap analysis.
 */
router.get('/reconcile', async (req, res) => {
    const startTime = Date.now();
    try {
        console.log('[Reconcile] Starting comprehensive data reconciliation...');
        const report = await (0, reconcileService_1.runReconciliation)(req);
        const elapsed = Date.now() - startTime;
        res.json({
            success: true,
            elapsed_ms: elapsed,
            report
        });
    }
    catch (err) {
        console.error('[Reconcile Error]:', err);
        res.status(500).json({ success: false, error: err.message, details: err.message });
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
        const { batchId = 'seed-2026-10-29', confirmed, singleDay } = req.body;
        if (!confirmed) {
            return res.status(400).json({ success: false, error: 'Explicit confirmation required. Send confirmed: true.' });
        }
        const catalystApp = (0, CloudScaleRepository_1.getCatalystApp)(req);
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        console.log(`[Backfill Execute] Starting execution for batch: ${batchId} (singleDay: ${singleDay || 'all'})...`);
        let plan = await (0, backfillService_1.createBackfillPlan)(db, batchId, singleDay);
        const result = await (0, backfillService_1.executeBackfillPlan)(plan, catalystApp);
        // Invalidate caches so the new cases immediately reflect in queries and dashboard stats
        (0, CloudScaleRepository_1.invalidateAllCache)();
        (0, analyticsRoutes_1.invalidateAnalyticsCache)();
        const elapsed = Date.now() - startTime;
        res.json({
            success: true,
            message: `Backfill batch ${batchId} completed successfully.`,
            elapsed_ms: elapsed,
            result
        });
    }
    catch (err) {
        console.error('[Backfill Execute Error]:', err);
        res.status(500).json({ success: false, error: err.message, details: err.message });
    }
});
/**
 * Step D: Rollback Backfill for a given SeedBatchId
 */
router.post('/backfill/rollback', async (req, res) => {
    const startTime = Date.now();
    try {
        const { batchId = 'seed-2026-10-29', confirmed } = req.body;
        if (!confirmed) {
            return res.status(400).json({ success: false, error: 'Explicit confirmation required. Send confirmed: true.' });
        }
        const catalystApp = (0, CloudScaleRepository_1.getCatalystApp)(req);
        console.log(`[Backfill Rollback] Starting rollback for batch: ${batchId}...`);
        const result = await (0, backfillService_1.rollbackBackfill)(catalystApp, batchId);
        (0, CloudScaleRepository_1.invalidateAllCache)();
        (0, analyticsRoutes_1.invalidateAnalyticsCache)();
        const elapsed = Date.now() - startTime;
        res.json({
            success: true,
            message: `Rollback completed successfully for batch ${batchId}.`,
            elapsed_ms: elapsed,
            result
        });
    }
    catch (err) {
        console.error('[Backfill Rollback Error]:', err);
        res.status(500).json({ success: false, error: err.message, details: err.message });
    }
});
exports.default = router;
