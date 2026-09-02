"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictRiskBatch = exports.predictRisk = void 0;
const quickmlService_1 = require("../services/quickmlService");
const stationFeatureService_1 = require("../services/stationFeatureService");
const RepositoryFactory_1 = require("../repositories/RepositoryFactory");
// Helper to extract human-readable risk drivers from the feature set
const extractRiskDrivers = (f) => {
    const drivers = [];
    if (f.growth_vs_previous_week && f.growth_vs_previous_week > 0.1) {
        drivers.push(`7-day crime count is ${(f.growth_vs_previous_week * 100).toFixed(0)}% above the previous week.`);
    }
    else if (f.case_count_7d > 0 && f.case_count_previous_7d === 0) {
        drivers.push(`Recent spike: ${f.case_count_7d} cases in last 7 days vs 0 in previous week.`);
    }
    if (f.historical_z_score && f.historical_z_score > 1.0) {
        drivers.push(`Recent activity is ${f.historical_z_score.toFixed(1)} standard deviations above the historical mean.`);
    }
    if (f.night_case_ratio && f.night_case_ratio > 0.4) {
        drivers.push(`High proportion of nighttime incidents (${(f.night_case_ratio * 100).toFixed(0)}%).`);
    }
    if (f.repeat_offender_case_count && f.repeat_offender_case_count > 0) {
        drivers.push(`${f.repeat_offender_case_count} recent cases involve known repeat offenders.`);
    }
    // Volume drivers
    const categories = [
        { name: 'property', count: f.property_cases || 0 },
        { name: 'women-related', count: f.women_cases || 0 },
        { name: 'bodily harm', count: f.body_cases || 0 }
    ].sort((a, b) => b.count - a.count);
    if (categories[0].count > 10) {
        drivers.push(`Elevated history of ${categories[0].name} crimes (${categories[0].count} total).`);
    }
    if (f.case_count_7d && f.case_count_7d >= 10) {
        drivers.push(`High absolute volume (${f.case_count_7d} cases in 7 days).`);
    }
    return drivers;
};
const predictRisk = async (req, res) => {
    try {
        const data = req.body;
        if (!data || !data.stationId) {
            return res.status(400).json({ success: false, error: 'Request body must contain stationId.' });
        }
        const stationId = Number(data.stationId);
        // 1. Calculate features from real DB data
        const features = await (0, stationFeatureService_1.calculateFeatures)(req, stationId);
        // 2. Predict risk using QuickML
        const prediction = await (0, quickmlService_1.predictStationRisk)(features);
        // 3. Extract Risk Drivers
        const riskDrivers = extractRiskDrivers(features);
        // 4. Return prediction and the generated features for transparency
        return res.status(200).json({
            ...prediction,
            features,
            riskDrivers
        });
    }
    catch (error) {
        console.error('[StationRiskController] Prediction error:', error.message);
        // QuickML network or internal errors
        const statusCode = error.message.includes('missing in environment') ? 500 : 502;
        // If features were calculated, try to include them in the response for transparency
        let features;
        let riskDrivers = [];
        try {
            features = await (0, stationFeatureService_1.calculateFeatures)(req, Number(req.body.stationId));
            riskDrivers = extractRiskDrivers(features);
        }
        catch (e) { }
        return res.status(statusCode).json({
            success: false,
            error: error.message || 'An error occurred during prediction.',
            features,
            riskDrivers
        });
    }
};
exports.predictRisk = predictRisk;
const predictRiskBatch = async (req, res) => {
    try {
        const repo = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        const units = await repo.getUnits();
        // Only stations (TypeID === 1)
        const stations = units.filter(u => Number(u.TypeID) === 1).slice(0, 10); // limit to 10 for performance in AppSail (timeout prevention)
        console.log(`[Station Risk] Units fetched: ${units.length}`);
        console.log(`[Station Risk] Police stations found: ${stations.length}`);
        if (stations.length === 0) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }
        const results = [];
        let featureGenerationSuccess = 0;
        let featureGenerationFailed = 0;
        let quickmlSuccess = 0;
        let quickmlFailures = 0;
        let lastQuickMlError = '';
        // Batch process to avoid hitting QuickML too hard
        const batchSize = 5;
        for (let i = 0; i < stations.length; i += batchSize) {
            const batch = stations.slice(i, i + batchSize);
            const batchPromises = batch.map(async (station) => {
                let features;
                try {
                    features = await (0, stationFeatureService_1.calculateFeatures)(req, station.UnitID);
                    featureGenerationSuccess++;
                }
                catch (e) {
                    console.error(`[StationRiskController] Feature generation failed for station ${station.UnitID}:`, e.message);
                    featureGenerationFailed++;
                    return null;
                }
                try {
                    const prediction = await (0, quickmlService_1.predictStationRisk)(features);
                    quickmlSuccess++;
                    const riskDrivers = extractRiskDrivers(features);
                    return {
                        stationId: station.UnitID,
                        stationName: station.UnitName,
                        districtId: station.DistrictID,
                        riskScore: prediction.likelihoodScore || 0,
                        riskLevel: prediction.riskLabel || 'UNKNOWN',
                        features,
                        riskDrivers,
                        explanation: prediction.explanation
                    };
                }
                catch (e) {
                    console.error(`[StationRiskController] QuickML failed for station ${station.UnitID}:`, e.message);
                    lastQuickMlError = e.message;
                    quickmlFailures++;
                    return null; // Skip failed stations
                }
            });
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults.filter(r => r !== null));
        }
        console.log(`[Station Risk] Stations processed: ${stations.length}`);
        console.log(`[Station Risk] Feature generation success: ${featureGenerationSuccess}`);
        console.log(`[Station Risk] QuickML success: ${quickmlSuccess}`);
        console.log(`[Station Risk] QuickML failures: ${quickmlFailures}`);
        console.log(`[Station Risk] Predictions returned: ${results.length}`);
        if (results.length === 0 && stations.length > 0) {
            // All failed
            return res.status(502).json({
                success: false,
                error: `Station risk prediction failed. Last error: ${lastQuickMlError}`,
                stationsFound: stations.length,
                predictionsSucceeded: quickmlSuccess,
                predictionsFailed: quickmlFailures
            });
        }
        return res.status(200).json({
            success: true,
            data: results
        });
    }
    catch (error) {
        console.error('[StationRiskController] Batch prediction error:', error.message);
        return res.status(500).json({
            success: false,
            error: 'An error occurred during batch prediction.',
            details: error.message,
            stack: error.stack
        });
    }
};
exports.predictRiskBatch = predictRiskBatch;
