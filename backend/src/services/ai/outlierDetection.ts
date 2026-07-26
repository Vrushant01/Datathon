import { getDistance } from './spatialAnalysis';

interface Point {
  id: any;
  latitude: number;
  longitude: number;
}

export interface OutlierResult {
  id: any;
  latitude: number;
  longitude: number;
  outlierScore: number;
  algorithmUsed: string;
  confidence: number;
}

/**
 * Calculates Distance-Based Outliers (DBO) as a fallback for LOF.
 * Finds points whose distance to their kth nearest neighbor is abnormally large.
 */
export const detectDistanceBasedOutliers = (points: Point[], k: number = 5): OutlierResult[] => {
  if (points.length < k + 1) return []; // Not enough data

  // O(N^2) optimization: we only pass a limited subset of points (e.g. 1000) to this.
  const distances = points.map(p1 => {
    const dists: number[] = [];
    for (const p2 of points) {
      if (p1.id !== p2.id) {
        dists.push(getDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude));
      }
    }
    dists.sort((a, b) => a - b);
    return { point: p1, kDistance: dists[k - 1] };
  });

  // Calculate mean and stdDev of k-distances
  const kDistances = distances.map(d => d.kDistance);
  const mean = kDistances.reduce((a, b) => a + b, 0) / kDistances.length;
  const variance = kDistances.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (kDistances.length - 1);
  const stdDev = Math.sqrt(variance);

  const outliers: OutlierResult[] = [];
  
  if (stdDev === 0) return []; // No anomalies if completely uniform

  for (const d of distances) {
    const zScore = (d.kDistance - mean) / stdDev;
    if (zScore > 3) { // Highly anomalous isolation
      outliers.push({
        id: d.point.id,
        latitude: d.point.latitude,
        longitude: d.point.longitude,
        outlierScore: zScore,
        algorithmUsed: 'Distance-Based Outlier (DBO) + Z-Score',
        confidence: Math.min(99, Math.round(70 + (zScore * 5)))
      });
    }
  }

  return outliers.sort((a, b) => b.outlierScore - a.outlierScore);
};
