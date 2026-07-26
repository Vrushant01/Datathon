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
