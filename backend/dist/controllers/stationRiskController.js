"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictRiskBatch = exports.predictRisk = void 0;
const quickmlService_1 = require("../services/quickmlService");
const stationFeatureService_1 = require("../services/stationFeatureService");
const RepositoryFactory_1 = require("../repositories/RepositoryFactory");
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
        // 3. Return prediction and the generated features for transparency
        return res.status(200).json({
            ...prediction,
            features
        });
    }
    catch (error) {
        console.error('[StationRiskController] Prediction error:', error.message);
        // QuickML network or internal errors
        const statusCode = error.message.includes('missing in environment') ? 500 : 502;
        // If features were calculated, try to include them in the response for transparency
        let features;
        try {
            features = await (0, stationFeatureService_1.calculateFeatures)(req, Number(req.body.stationId));
        }
        catch (e) { }
        return res.status(statusCode).json({
            success: false,
            error: error.message || 'An error occurred during prediction.',
            features
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
                    return {
                        stationId: station.UnitID,
                        stationName: station.UnitName,
                        districtId: station.DistrictID,
                        riskScore: prediction.likelihoodScore || 0,
                        riskLevel: prediction.riskLabel || 'UNKNOWN',
                        features,
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
