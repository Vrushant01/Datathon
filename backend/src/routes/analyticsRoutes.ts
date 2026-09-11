import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { RepositoryFactory } from '../repositories/RepositoryFactory';

const router = express.Router();

const CENSUS_DATA_MAPPING: Record<string, any> = {
  'Bengaluru City': { pop: 9621551, urbanPop: 8749944, literacy: 87.67, isCensus: true },
  'Mysuru City': { pop: 3001127, urbanPop: 1245413, literacy: 72.79, isCensus: true },
  'Davanagere City': { pop: 1945497, urbanPop: 628179, literacy: 75.74, isCensus: true },
  'Belagavi City': { pop: 4779661, urbanPop: 1211195, literacy: 75.40, isCensus: true },
  'Hubballi-Dharwad City': { pop: 1847023, urbanPop: 1049539, literacy: 80.00, isCensus: true },
  'Shivamogga': { pop: 1752753, urbanPop: 623727, literacy: 80.45, isCensus: true },
  'Udupi': { pop: 1177361, urbanPop: 334061, literacy: 86.24, isCensus: true },
};

// Fallback logic for unmapped districts
function getSocioEconomicRefData(districtName: string) {
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

function pearsonCorrelation(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 2) return null;
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return null;
  return Number((numerator / denominator).toFixed(2));
}

// Cache for District Data
interface DistrictCacheData {
  dataPoints: any[];
  correlation: any;
  usesDemoData: boolean;
  timestamp: number;
}
let globalDistrictCache: DistrictCacheData | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

router.get('/socio-economic', requireAuth, async (req, res) => {
  const t0 = Date.now();
  try {
    const db = RepositoryFactory.getRepository(req);
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

      const stationToDistrict = new Map<number, number>();
      units.forEach(u => stationToDistrict.set(u.UnitID, u.DistrictID));

      const firCounts = new Map<number, number>();
      stationCounts.forEach(sc => {
        const distId = stationToDistrict.get(sc.stationId);
        if (distId) {
          firCounts.set(distId, (firCounts.get(distId) || 0) + sc.count);
        }
      });

      let cacheUsesDemoData = false;
      const cacheDataPoints: any[] = [];
      
      districts.forEach(d => {
        const firs = firCounts.get(d.DistrictID) || 0;
        const refData = getSocioEconomicRefData(d.DistrictName);
        if (!refData.isCensus) cacheUsesDemoData = true;

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

    const cache = globalDistrictCache!;
    let responseDataPoints = cache.dataPoints;
    let responseCorrelation = cache.correlation;
    let targetDistrictId: number | 'ALL' = 'ALL';

    if (selectedStation !== 'ALL') {
       // We need units to map station -> district
       const units = await db.getUnits();
       const u = units.find(unit => unit.UnitID === Number(selectedStation));
       if (u) targetDistrictId = u.DistrictID;
    } else if (selectedDistrict !== 'ALL') {
       targetDistrictId = Number(selectedDistrict);
    }

    if (targetDistrictId !== 'ALL') {
        responseDataPoints = cache.dataPoints.filter(d => d.DistrictID === targetDistrictId);
        responseCorrelation = { urbanization: null, literacy: null };
    }

    // TOP CRIME AREAS LOGIC
    // We fetch cases for the specific target context and aggregate by CrimeSceneLocation
    let topCrimeAreas: { location: string, count: number }[] = [];
    if (targetDistrictId !== 'ALL' || selectedStation !== 'ALL') {
        const units = await db.getUnits();
        const filter: any = {};
        if (selectedStation !== 'ALL') {
            filter.PoliceStationID = Number(selectedStation);
        } else {
            const districtStations = units.filter(u => u.DistrictID === targetDistrictId).map(u => u.UnitID);
            filter.PoliceStationID = { $in: districtStations };
        }
        
        // This is still a db.getCases call, but it's heavily filtered down to a single district/station.
        // We do not do this when targetDistrictId === 'ALL'.
        const casesForAreas = await db.getCases(filter);
        const areaCounts = new Map<string, number>();
        casesForAreas.forEach(c => {
            let loc = c.CrimeSceneLocation || 'Unknown Location';
            if (loc.trim() === '') loc = 'Unknown Location';
            areaCounts.set(loc, (areaCounts.get(loc) || 0) + 1);
        });

        topCrimeAreas = Array.from(areaCounts.entries())
            .map(([location, count]) => ({ location, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }

    const t1 = Date.now();
    console.log(`[API] /api/analytics/socio-economic took ${t1 - t0}ms, response points: ${responseDataPoints.length}`);

    res.json({
        data: responseDataPoints,
        usesDemoData: cache.usesDemoData,
        correlation: responseCorrelation,
        topCrimeAreas
    });
  } catch(e: any) {
     res.status(500).json({ error: e.message });
  }
});

export default router;
