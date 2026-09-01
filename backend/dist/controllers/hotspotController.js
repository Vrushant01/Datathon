"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHotspots = exports.invalidateHotspotCache = exports.lastDataChangeTimestamp = void 0;
const RepositoryFactory_1 = require("../repositories/RepositoryFactory");
const spatialAnalysis_1 = require("../services/ai/spatialAnalysis");
const CRIME_HEADS = {
    100: 'Crimes Against Body',
    200: 'Crimes Against Property',
    300: 'Crimes Against Women',
    400: 'Economic Offences',
    500: 'Cyber Crimes',
    600: 'Special and Local Laws (SLL)'
};
exports.lastDataChangeTimestamp = Date.now();
const invalidateHotspotCache = () => {
    exports.lastDataChangeTimestamp = Date.now();
};
exports.invalidateHotspotCache = invalidateHotspotCache;
const getHotspots = async (req, res) => {
    try {
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        const { district, station, crimeHead, status, gravity, dateFrom, dateTo } = req.query;
        const filter = {
            latitude: { $nin: [null, 0] },
            longitude: { $nin: [null, 0] }
        };
        if (district && district !== 'ALL' && (!station || station === 'ALL')) {
            const stationsInDistrict = await db.getUnits(Number(district));
            const stationIds = stationsInDistrict.map((s) => s.UnitID);
            filter.PoliceStationID = { $in: stationIds };
        }
        if (station && station !== 'ALL') {
            filter.PoliceStationID = Number(station);
        }
        if (crimeHead && crimeHead !== 'ALL') {
            filter.CrimeMajorHeadID = Number(crimeHead);
        }
        if (status && status !== 'ALL') {
            const statusStr = status;
            if (!isNaN(Number(statusStr))) {
                filter.CaseStatusID = Number(statusStr);
            }
            else {
                // Find CaseStatusID by name if passed as string (for Admin map)
                const CASE_STATUSES = {
                    'Under Investigation': 1,
                    'Charge Sheeted': 2,
                    'Closed (False Case)': 3,
                    'Closed (Undetected)': 4,
                    'Re-opened': 5
                };
                if (CASE_STATUSES[statusStr]) {
                    filter.CaseStatusID = CASE_STATUSES[statusStr];
                }
            }
        }
        if (gravity && gravity !== 'ALL') {
            filter.GravityOffenceID = Number(gravity);
        }
        if (dateFrom || dateTo) {
            filter.CrimeRegisteredDate = {};
            if (dateFrom)
                filter.CrimeRegisteredDate.$gte = dateFrom;
            if (dateTo)
                filter.CrimeRegisteredDate.$lte = dateTo;
        }
        const cases = await db.getCases(filter);
        const points = cases.map((c) => ({
            id: c.CaseMasterID,
            latitude: Number(c.latitude),
            longitude: Number(c.longitude),
            crimeMajorHeadId: c.CrimeMajorHeadID,
            gravityOffenceId: c.GravityOffenceID,
            date: c.CrimeRegisteredDate,
            categoryName: CRIME_HEADS[c.CrimeMajorHeadID] || 'Other'
        }));
        // Group points by crimeMajorHeadId
        const pointsByCrime = {};
        points.forEach(p => {
            const typeId = p.crimeMajorHeadId || 0;
            if (!pointsByCrime[typeId])
                pointsByCrime[typeId] = [];
            pointsByCrime[typeId].push(p);
        });
        // Run DBSCAN independently per crime type: eps = 2km, minPts = 3
        let allClusters = [];
        for (const typeId in pointsByCrime) {
            const typeClusters = (0, spatialAnalysis_1.performDBSCAN)(pointsByCrime[typeId], 2.0, 3);
            allClusters = allClusters.concat(typeClusters);
        }
        const hotspots = (0, spatialAnalysis_1.generateHotspotsRiskAnalysis)(allClusters, cases);
        // Sort hotspots by risk score descending
        hotspots.sort((a, b) => b.riskScore - a.riskScore);
        const redZones = hotspots.filter(h => h.riskLevel === 'HIGH' || h.riskLevel === 'CRITICAL');
        res.json({
            success: true,
            generatedAt: new Date().toISOString(),
            totalIncidents: cases.length,
            hotspotCount: hotspots.length,
            redZoneCount: redZones.length,
            hotspots
        });
    }
    catch (error) {
        console.error('Error fetching hotspots:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch hotspots' });
    }
};
exports.getHotspots = getHotspots;
