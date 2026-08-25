// Haversine formula to calculate distance between two coordinates in kilometers
export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

interface Point {
  id: any;
  latitude: number;
  longitude: number;
}

// Custom DBSCAN Implementation
// eps: maximum distance between two samples for one to be considered as in the neighborhood of the other (in km)
// minPts: number of samples in a neighborhood for a point to be considered as a core point
export const performDBSCAN = (points: Point[], eps: number = 2.0, minPts: number = 5) => {
  const NOISE = -1;
  const UNCLASSIFIED = 0;
  
  const labels = new Array(points.length).fill(UNCLASSIFIED);
  let clusterId = 0;

  const getRegion = (pIdx: number): number[] => {
    const region: number[] = [];
    const p1 = points[pIdx];
    for (let i = 0; i < points.length; i++) {
      if (getDistance(p1.latitude, p1.longitude, points[i].latitude, points[i].longitude) <= eps) {
        region.push(i);
      }
    }
    return region;
  };

  const expandCluster = (pIdx: number, neighborPts: number[], cId: number) => {
    labels[pIdx] = cId;
    let i = 0;
    while (i < neighborPts.length) {
      const pnIdx = neighborPts[i];
      
      if (labels[pnIdx] === NOISE) {
        labels[pnIdx] = cId;
      } else if (labels[pnIdx] === UNCLASSIFIED) {
        labels[pnIdx] = cId;
        const pnNeighborPts = getRegion(pnIdx);
        if (pnNeighborPts.length >= minPts) {
          // avoid duplicates when merging
          for (const n of pnNeighborPts) {
            if (!neighborPts.includes(n)) {
              neighborPts.push(n);
            }
          }
        }
      }
      i++;
    }
  };

  for (let i = 0; i < points.length; i++) {
    if (labels[i] !== UNCLASSIFIED) continue;

    const neighborPts = getRegion(i);
    if (neighborPts.length < minPts) {
      labels[i] = NOISE;
    } else {
      clusterId++;
      expandCluster(i, neighborPts, clusterId);
    }
  }

  // Group by cluster
  const clusters = new Map<number, Point[]>();
  for (let i = 0; i < points.length; i++) {
    const cId = labels[i];
    if (cId > 0) {
      if (!clusters.has(cId)) clusters.set(cId, []);
      clusters.get(cId)!.push(points[i]);
    }
  }

  return Array.from(clusters.values());
};

export interface FIRPoint extends Point {
  crimeMajorHeadId?: number;
  gravityOffenceId?: number;
  date?: string;
  categoryName?: string;
}

export const generateHotspotsRiskAnalysis = (clusters: FIRPoint[][], allCases: any[]) => {
  const currentDate = new Date();
  const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000);

  return clusters.map((cluster, idx) => {
    let recentIncidentCount = 0;
    let previousPeriodIncidentCount = 0;
    let highGravityCount = 0;

    const crimeCategories: Record<string, number> = {};

    let centerLat = 0;
    let centerLng = 0;

    cluster.forEach(point => {
      centerLat += point.latitude;
      centerLng += point.longitude;

      if (point.gravityOffenceId === 1 || point.gravityOffenceId === 2) {
        highGravityCount++;
      }

      const catName = point.categoryName || 'Other';
      crimeCategories[catName] = (crimeCategories[catName] || 0) + 1;

      if (point.date) {
        const pointDate = new Date(point.date);
        if (pointDate >= thirtyDaysAgo) {
          recentIncidentCount++;
        } else if (pointDate >= sixtyDaysAgo && pointDate < thirtyDaysAgo) {
          previousPeriodIncidentCount++;
        }
      }
    });

    centerLat /= cluster.length;
    centerLng /= cluster.length;

    let maxDist = 0;
    cluster.forEach(point => {
      const dist = getDistance(centerLat, centerLng, point.latitude, point.longitude);
      if (dist > maxDist) maxDist = dist;
    });

    const radiusKm = Math.max(0.5, maxDist); // minimum 0.5km

    // Growth Rate calculation
    const growthRate = previousPeriodIncidentCount === 0 
        ? (recentIncidentCount > 0 ? 100 : 0) 
        : ((recentIncidentCount - previousPeriodIncidentCount) / previousPeriodIncidentCount) * 100;

    let trend = "STABLE";
    if (growthRate > 15) trend = "INCREASING";
    else if (growthRate < -15) trend = "DECREASING";

    // Risk Scoring (0-100)
    // 30% Frequency (max 50 cases)
    const frequencyScore = Math.min(100, (cluster.length / 50) * 100);
    
    // 25% Trend
    const trendScore = Math.max(0, Math.min(100, 50 + (growthRate / 2)));
    
    // 20% Severity
    const severityScore = Math.min(100, (highGravityCount / cluster.length) * 100 * 2);
    
    // 15% Repeat (using clustering density vs overall count as proxy)
    const repeatScore = Math.min(100, (cluster.length / radiusKm) * 5);
    
    // 10% Diversity
    const diversityScore = Math.min(100, Object.keys(crimeCategories).length * 20);

    const riskScore = Math.round(
      frequencyScore * 0.30 +
      trendScore * 0.25 +
      severityScore * 0.20 +
      repeatScore * 0.15 +
      diversityScore * 0.10
    );

    let riskLevel = "LOW";
    if (riskScore >= 70) riskLevel = "CRITICAL";
    else if (riskScore >= 50) riskLevel = "HIGH";
    else if (riskScore >= 30) riskLevel = "MODERATE";

    // 7-day forecast
    const forecast7DayScore = Math.min(100, Math.round(riskScore * (1 + (growthRate / 100) * 0.25)));
    let forecast7DayLevel = "LOW";
    if (forecast7DayScore >= 70) forecast7DayLevel = "CRITICAL";
    else if (forecast7DayScore >= 50) forecast7DayLevel = "HIGH";
    else if (forecast7DayScore >= 30) forecast7DayLevel = "MODERATE";

    return {
      clusterId: `H-${(idx + 1).toString().padStart(3, '0')}`,
      incidentCount: cluster.length,
      center: { lat: centerLat, lng: centerLng },
      radiusKm: Number(radiusKm.toFixed(2)),
      riskScore,
      riskLevel,
      trend,
      growthRate: Number(growthRate.toFixed(1)),
      crimeCategories,
      forecastAvailable: true,
      forecast7DayScore,
      forecast7DayLevel,
      sampleFirIds: cluster.slice(0, 5).map(c => c.id)
    };
  });
};
