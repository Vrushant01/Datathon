"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const RepositoryFactory_1 = require("../repositories/RepositoryFactory");
const router = express_1.default.Router();
const CENSUS_DATA_MAPPING = {
    'Bengaluru City': { pop: 9621551, urbanPop: 8749944, literacy: 87.67, isCensus: true },
    'Mysuru City': { pop: 3001127, urbanPop: 1245413, literacy: 72.79, isCensus: true },
    'Davanagere City': { pop: 1945497, urbanPop: 628179, literacy: 75.74, isCensus: true },
    'Belagavi City': { pop: 4779661, urbanPop: 1211195, literacy: 75.40, isCensus: true },
    'Hubballi-Dharwad City': { pop: 1847023, urbanPop: 1049539, literacy: 80.00, isCensus: true },
    'Shivamogga': { pop: 1752753, urbanPop: 623727, literacy: 80.45, isCensus: true },
    'Udupi': { pop: 1177361, urbanPop: 334061, literacy: 86.24, isCensus: true },
};
// Fallback logic for unmapped districts
function getSocioEconomicRefData(districtName) {
    if (CENSUS_DATA_MAPPING[districtName]) {
        return CENSUS_DATA_MAPPING[districtName];
    }
    // Deterministic demo reference values based on length/hash of name
    const nameLen = districtName.length;
    return {
        pop: 1000000 + (nameLen * 50000), // ~1M to 1.5M
        urbanPop: 300000 + (nameLen * 20000), // ~30% to 40% urban
        literacy: 70 + (nameLen % 15), // 70 to 85%
        isCensus: false
    };
}
function pearsonCorrelation(x, y) {
    if (x.length !== y.length || x.length < 2)
        return null;
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    if (denominator === 0)
        return null;
    return Number((numerator / denominator).toFixed(2));
}
let globalDistrictCache = null;
const CACHE_TTL_MS = 5 * 60 * 1000;
router.get('/socio-economic', authMiddleware_1.requireAuth, async (req, res) => {
    const t0 = Date.now();
    try {
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        const selectedDistrict = req.query.district ? req.query.district : 'ALL';
        const selectedStation = req.query.station ? req.query.station : 'ALL';
        // 1. Load or Build District Cache
        const now = Date.now();
        if (!globalDistrictCache || (now - globalDistrictCache.timestamp > CACHE_TTL_MS)) {
            const [districts, units, stationCounts] = await Promise.all([
                db.getDistricts(),
                db.getUnits(),
                db.getStationCaseCounts()
            ]);
            const stationToDistrict = new Map();
            units.forEach(u => stationToDistrict.set(u.UnitID, u.DistrictID));
            const firCounts = new Map();
            stationCounts.forEach(sc => {
                const distId = stationToDistrict.get(sc.stationId);
                if (distId) {
                    firCounts.set(distId, (firCounts.get(distId) || 0) + sc.count);
                }
            });
            let cacheUsesDemoData = false;
            const cacheDataPoints = [];
            districts.forEach(d => {
                const firs = firCounts.get(d.DistrictID) || 0;
                const refData = getSocioEconomicRefData(d.DistrictName);
                if (!refData.isCensus)
                    cacheUsesDemoData = true;
                const urbanPercent = (refData.urbanPop / refData.pop) * 100;
                const crimeRate = (firs / refData.pop) * 100000;
                cacheDataPoints.push({
                    DistrictID: d.DistrictID,
                    name: d.DistrictName,
                    FIRCount: firs,
                    CrimeRate: Number(crimeRate.toFixed(2)),
                    Urbanization: Number(urbanPercent.toFixed(2)),
                    LiteracyRate: Number(refData.literacy.toFixed(2)),
                    Population: refData.pop,
                    isCensus: refData.isCensus
                });
            });
            let corrUrban = null;
            let corrLit = null;
            if (cacheDataPoints.length > 1) {
                const cr = cacheDataPoints.map(d => d.CrimeRate);
                const ur = cacheDataPoints.map(d => d.Urbanization);
                const lit = cacheDataPoints.map(d => d.LiteracyRate);
                corrUrban = pearsonCorrelation(cr, ur);
                corrLit = pearsonCorrelation(cr, lit);
            }
            globalDistrictCache = {
                dataPoints: cacheDataPoints,
                correlation: { urbanization: corrUrban, literacy: corrLit },
                usesDemoData: cacheUsesDemoData,
                timestamp: now
            };
        }
        const cache = globalDistrictCache;
        let responseDataPoints = cache.dataPoints;
        let responseCorrelation = cache.correlation;
        let targetDistrictId = 'ALL';
        if (selectedStation !== 'ALL') {
            // We need units to map station -> district
            const units = await db.getUnits();
            const u = units.find(unit => unit.UnitID === Number(selectedStation));
            if (u)
                targetDistrictId = u.DistrictID;
        }
        else if (selectedDistrict !== 'ALL') {
            targetDistrictId = Number(selectedDistrict);
        }
        if (targetDistrictId !== 'ALL') {
            responseDataPoints = cache.dataPoints.filter(d => d.DistrictID === targetDistrictId);
            responseCorrelation = { urbanization: null, literacy: null };
        }
        // Top Crime Areas is removed from here to prevent blocking.
        // It will be fetched via a separate endpoint /top-crime-areas.
        const t1 = Date.now();
        console.log(`[API] /api/analytics/socio-economic took ${t1 - t0}ms, response points: ${responseDataPoints.length}`);
        res.json({
            data: responseDataPoints,
            usesDemoData: cache.usesDemoData,
            correlation: responseCorrelation
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/top-crime-areas', authMiddleware_1.requireAuth, async (req, res) => {
    const t0 = Date.now();
    try {
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        const selectedDistrict = req.query.district ? req.query.district : 'ALL';
        const selectedStation = req.query.station ? req.query.station : 'ALL';
        let targetDistrictId = 'ALL';
        if (selectedStation !== 'ALL') {
            const units = await db.getUnits();
            const u = units.find(unit => unit.UnitID === Number(selectedStation));
            if (u)
                targetDistrictId = u.DistrictID;
        }
        else if (selectedDistrict !== 'ALL') {
            targetDistrictId = Number(selectedDistrict);
        }
        let topCrimeAreas = [];
        if (targetDistrictId !== 'ALL' || selectedStation !== 'ALL') {
            const units = await db.getUnits();
            const filter = {};
            if (selectedStation !== 'ALL') {
                filter.PoliceStationID = Number(selectedStation);
            }
            else {
                const districtStations = units.filter(u => u.DistrictID === targetDistrictId).map(u => u.UnitID);
                filter.PoliceStationID = { $in: districtStations };
            }
            const casesForAreas = await db.getCases(filter);
            const areaCounts = new Map();
            casesForAreas.forEach(c => {
                let loc = c.CrimeSceneLocation || 'Unknown Location';
                if (loc.trim() === '')
                    loc = 'Unknown Location';
                areaCounts.set(loc, (areaCounts.get(loc) || 0) + 1);
            });
            topCrimeAreas = Array.from(areaCounts.entries())
                .map(([location, count]) => ({ location, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
        }
        const t1 = Date.now();
        console.log(`[API] /api/analytics/top-crime-areas took ${t1 - t0}ms, areas: ${topCrimeAreas.length}`);
        res.json({ data: topCrimeAreas });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Static Crime Heads for Dashboard Aggregation
const CRIME_HEADS = [
    { CrimeHeadID: 100, CrimeGroupName: 'Crimes Against Body' },
    { CrimeHeadID: 200, CrimeGroupName: 'Crimes Against Property' },
    { CrimeHeadID: 300, CrimeGroupName: 'Crimes Against Women' },
    { CrimeHeadID: 400, CrimeGroupName: 'Economic Offences' },
    { CrimeHeadID: 500, CrimeGroupName: 'Cyber Crimes' },
    { CrimeHeadID: 600, CrimeGroupName: 'Special and Local Laws (SLL)' }
];
let globalDashboardCache = {};
const DASHBOARD_CACHE_TTL = 60 * 1000; // 1 minute
router.get('/dashboard', authMiddleware_1.requireAuth, async (req, res) => {
    const t0 = Date.now();
    try {
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        const selectedDistrict = req.query.district ? req.query.district : 'ALL';
        const selectedStation = req.query.station ? req.query.station : 'ALL';
        let targetDistrictId = 'ALL';
        let targetStationId = 'ALL';
        const units = await db.getUnits();
        const districts = await db.getDistricts();
        if (selectedStation !== 'ALL') {
            const u = units.find(unit => unit.UnitID === Number(selectedStation));
            if (u) {
                targetDistrictId = u.DistrictID;
                targetStationId = u.UnitID;
            }
        }
        else if (selectedDistrict !== 'ALL') {
            targetDistrictId = Number(selectedDistrict);
        }
        const cacheKey = `${targetDistrictId}-${targetStationId}`;
        if (globalDashboardCache[cacheKey] && (t0 - globalDashboardCache[cacheKey].timestamp < DASHBOARD_CACHE_TTL)) {
            return res.json(globalDashboardCache[cacheKey].data);
        }
        // Get all data
        const [cases, victims, accused, officers] = await Promise.all([
            db.getAllCasesForAnalytics(),
            db.getAllVictims(),
            db.getAllAccused(),
            db.getEmployees()
        ]);
        // Apply filters
        const filteredCases = cases.filter(c => {
            if (targetDistrictId !== 'ALL') {
                const station = units.find(s => s.UnitID === c.PoliceStationID);
                if (station?.DistrictID !== targetDistrictId)
                    return false;
            }
            if (targetStationId !== 'ALL' && c.PoliceStationID !== targetStationId) {
                return false;
            }
            return true;
        });
        const totalCases = filteredCases.length;
        const solvedCases = filteredCases.filter(c => c.CaseStatusID === 2 || c.CaseStatusID === 3 || c.CaseStatusID === 4).length;
        // 1. Crime by District / Station (Graph 1)
        let chart1Data = [];
        if (targetDistrictId === 'ALL') {
            chart1Data = districts.map(d => {
                const districtStations = units.filter(s => s.DistrictID === d.DistrictID);
                const caseCount = filteredCases.filter(c => districtStations.some(s => s.UnitID === c.PoliceStationID)).length;
                return { name: String(d.DistrictName || '').replace(' City', '').replace(' Rural', ''), Cases: caseCount };
            }).filter(item => item.Cases > 0).sort((a, b) => b.Cases - a.Cases).slice(0, 10);
        }
        else if (targetStationId === 'ALL') {
            const districtStations = units.filter(s => s.DistrictID === targetDistrictId);
            chart1Data = districtStations.map(s => {
                const caseCount = filteredCases.filter(c => c.PoliceStationID === s.UnitID).length;
                return { name: String(s.UnitName || '').replace(' PS', ''), Cases: caseCount };
            }).filter(item => item.Cases > 0).sort((a, b) => b.Cases - a.Cases).slice(0, 10);
        }
        else {
            const s = units.find(s => s.UnitID === targetStationId);
            chart1Data = s ? [{ name: String(s.UnitName || '').replace(' PS', ''), Cases: totalCases }] : [];
        }
        // 2. Crime Categories
        const categoryData = CRIME_HEADS.map(ch => {
            const caseCount = filteredCases.filter(c => c.CrimeMajorHeadID === ch.CrimeHeadID).length;
            return { name: String(ch.CrimeGroupName || '').split(' ').slice(-2).join(' '), Cases: caseCount };
        }).filter(c => c.Cases > 0).sort((a, b) => b.Cases - a.Cases).slice(0, 8);
        // 3. Victim Age Demographics
        const victimAgeData = [
            { name: 'Under 18', Count: victims.filter(v => v.AgeYear < 18 && filteredCases.some(c => c.CaseMasterID === v.CaseMasterID)).length },
            { name: '18 - 30', Count: victims.filter(v => v.AgeYear >= 18 && v.AgeYear <= 30 && filteredCases.some(c => c.CaseMasterID === v.CaseMasterID)).length },
            { name: '31 - 50', Count: victims.filter(v => v.AgeYear > 30 && v.AgeYear <= 50 && filteredCases.some(c => c.CaseMasterID === v.CaseMasterID)).length },
            { name: 'Over 50', Count: victims.filter(v => v.AgeYear > 50 && filteredCases.some(c => c.CaseMasterID === v.CaseMasterID)).length }
        ].filter(v => v.Count > 0);
        // 4. Accused Age Demographics
        const accusedAgeData = [
            { name: 'Under 18', Count: accused.filter(a => a.AgeYear < 18 && filteredCases.some(c => c.CaseMasterID === a.CaseMasterID)).length },
            { name: '18 - 30', Count: accused.filter(a => a.AgeYear >= 18 && a.AgeYear <= 30 && filteredCases.some(c => c.CaseMasterID === a.CaseMasterID)).length },
            { name: '31 - 50', Count: accused.filter(a => a.AgeYear > 30 && a.AgeYear <= 50 && filteredCases.some(c => c.CaseMasterID === a.CaseMasterID)).length },
            { name: 'Over 50', Count: accused.filter(a => a.AgeYear > 50 && filteredCases.some(c => c.CaseMasterID === a.CaseMasterID)).length }
        ].filter(a => a.Count > 0);
        // 5. Officer Case Load
        const officerData = officers.map(o => {
            const assignedCount = filteredCases.filter(c => c.PolicePersonID === o.EmployeeID).length;
            const solvedCount = filteredCases.filter(c => c.PolicePersonID === o.EmployeeID && (c.CaseStatusID === 2 || c.CaseStatusID === 3)).length;
            return {
                uid: o.KGID || String(o.EmployeeID), kgid: o.KGID || 'N/A', fullName: String(o.FirstName || ''),
                name: String(o.FirstName || '').split(' ')[0], Assigned: assignedCount, Solved: solvedCount
            };
        }).filter(o => o.Assigned > 0).sort((a, b) => b.Assigned - a.Assigned).slice(0, 10);
        const t1 = Date.now();
        console.log(`[API] /api/analytics/dashboard took ${t1 - t0}ms`);
        const result = {
            totalCases, solvedCases, activeCases: totalCases - solvedCases,
            solvedRate: totalCases > 0 ? ((solvedCases / totalCases) * 100).toFixed(1) : '0.0',
            chart1Data, categoryData, victimAgeData, accusedAgeData, officerData
        };
        globalDashboardCache[cacheKey] = { data: result, timestamp: t0 };
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
exports.default = router;
