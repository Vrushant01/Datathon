import { Request, Response } from 'express';
import { predictStationRisk } from '../services/quickmlService';
import { calculateFeatures } from '../services/stationFeatureService';

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
