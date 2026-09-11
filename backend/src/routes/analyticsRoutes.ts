import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { RepositoryFactory } from '../repositories/RepositoryFactory';

const router = express.Router();

const CENSUS_DATA = [
  { distId: 1001, censusCode: 572, name: 'Bangalore', pop: 9621551, urbanPop: 8749944, literacy: 87.67 },
  { distId: 1002, censusCode: 577, name: 'Mysore', pop: 3001127, urbanPop: 1245413, literacy: 72.79 },
  { distId: 1003, censusCode: 567, name: 'Davanagere', pop: 1945497, urbanPop: 628179, literacy: 75.74 },
  { distId: 1004, censusCode: 555, name: 'Belgaum', pop: 4779661, urbanPop: 1211195, literacy: 75.40 },
  { distId: 1005, censusCode: 562, name: 'Dharwad', pop: 1847023, urbanPop: 1049539, literacy: 80.00 },
  { distId: 1006, censusCode: 568, name: 'Shimoga', pop: 1752753, urbanPop: 623727, literacy: 80.45 },
  { distId: 1007, censusCode: 569, name: 'Udupi', pop: 1177361, urbanPop: 334061, literacy: 86.24 },
];

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

router.get('/socio-economic', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const cases = await db.getCases({});
    const units = await db.getUnits(); 

    const stationToDistrict = new Map<number, number>();
    units.forEach(u => stationToDistrict.set(u.UnitID, u.DistrictID));

    const firCounts = new Map<number, number>();
    cases.forEach(c => {
      const distId = stationToDistrict.get(c.PoliceStationID);
      if (distId) {
        firCounts.set(distId, (firCounts.get(distId) || 0) + 1);
      }
    });

    const selectedDistrict = req.query.district ? req.query.district : 'ALL';
    const selectedStation = req.query.station ? req.query.station : 'ALL';

    let targetDistrictId: number | 'ALL' = 'ALL';
    if (selectedStation !== 'ALL') {
       targetDistrictId = stationToDistrict.get(Number(selectedStation)) || 'ALL';
    } else if (selectedDistrict !== 'ALL') {
       targetDistrictId = Number(selectedDistrict);
    }

    const dataPoints: any[] = [];
    CENSUS_DATA.forEach(d => {
       if (targetDistrictId === 'ALL' || targetDistrictId === d.distId) {
           const firs = firCounts.get(d.distId) || 0;
           const urbanPercent = (d.urbanPop / d.pop) * 100;
           const crimeRate = (firs / d.pop) * 100000;
           dataPoints.push({
               DistrictID: d.distId,
               name: d.name, 
               FIRCount: firs,
               CrimeRate: Number(crimeRate.toFixed(2)),
               Urbanization: Number(urbanPercent.toFixed(2)),
               LiteracyRate: d.literacy,
               Population: d.pop
           });
       }
    });

    let corrUrban = null;
    let corrLit = null;

    if (dataPoints.length > 1) {
       const cr = dataPoints.map(d => d.CrimeRate);
       const ur = dataPoints.map(d => d.Urbanization);
       const lit = dataPoints.map(d => d.LiteracyRate);
       corrUrban = pearsonCorrelation(cr, ur);
       corrLit = pearsonCorrelation(cr, lit);
    }

    res.json({
        data: dataPoints,
        correlation: {
           urbanization: corrUrban,
           literacy: corrLit
        }
    });
  } catch(e: any) {
     res.status(500).json({ error: e.message });
  }
});

export default router;
