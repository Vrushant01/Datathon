import { Request, Response } from 'express';
import { predictStationRisk } from '../services/quickmlService';
import { calculateFeatures } from '../services/stationFeatureService';
import { RepositoryFactory } from '../repositories/RepositoryFactory';

export const predictRisk = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (!data || !data.stationId) {
      return res.status(400).json({ success: false, error: 'Request body must contain stationId.' });
    }

    const stationId = Number(data.stationId);
    
    // 1. Calculate features from real DB data
    const features = await calculateFeatures(req, stationId);

    // 2. Predict risk using QuickML
    const prediction = await predictStationRisk(features);
    
    // 3. Return prediction and the generated features for transparency
    return res.status(200).json({
      ...prediction,
      features
    });

  } catch (error: any) {
    console.error('[StationRiskController] Prediction error:', error.message);
    
    // QuickML network or internal errors
    const statusCode = error.message.includes('missing in environment') ? 500 : 502;
    
    // If features were calculated, try to include them in the response for transparency
    let features;
    try {
      features = await calculateFeatures(req, Number(req.body.stationId));
    } catch(e) {}

    return res.status(statusCode).json({
      success: false,
      error: error.message || 'An error occurred during prediction.',
      features
    });
  }
};

export const predictRiskBatch = async (req: Request, res: Response) => {
  try {
    const repo = RepositoryFactory.getRepository(req);
    const units = await repo.getUnits();
    // Only stations (TypeID === 1)
    const stations = units.filter(u => u.TypeID === 1).slice(0, 50); // limit to 50 for performance

    const results = [];
    
    // Batch process to avoid hitting QuickML too hard
    const batchSize = 5;
    for (let i = 0; i < stations.length; i += batchSize) {
      const batch = stations.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (station) => {
        try {
          const features = await calculateFeatures(req, station.UnitID);
          const prediction = await predictStationRisk(features);
          return {
            stationId: station.UnitID,
            stationName: station.UnitName,
            districtId: station.DistrictID,
            riskScore: prediction.likelihoodScore || 0,
            riskLevel: prediction.riskLabel || 'UNKNOWN',
            features,
            explanation: (prediction as any).explanation
          };
        } catch (e: any) {
          console.error(`[StationRiskController] Failed to predict for station ${station.UnitID}:`, e.message);
          return null; // Skip failed stations
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null));
    }
    
    return res.status(200).json({
      success: true,
      data: results
    });

  } catch (error: any) {
    console.error('[StationRiskController] Batch prediction error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during batch prediction.'
    });
  }
};

