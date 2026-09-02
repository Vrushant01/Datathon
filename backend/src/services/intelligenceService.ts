import { Request } from 'express';
import { RepositoryFactory } from '../repositories/RepositoryFactory';
import axios from 'axios';

/**
 * Normalise a date string to the number of complete UTC days since Unix epoch.
 */
function toDayIndex(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 86_400_000);
}

export interface IntelligenceDimensions {
  type: 'ANOMALY' | 'RISK';
  districtId?: number;
  stationId?: number;
  crimeHeadId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const getVerifiedIntelligenceContext = async (req: Request, dimensions: IntelligenceDimensions) => {
  const repo = RepositoryFactory.getRepository(req);
  const allCases = await repo.getAllCasesForAnalytics();

  // 1. Correlate Cases
  let affectedCases: any[] = [];
  
  if (dimensions.type === 'ANOMALY') {
    const startDayIdx = dimensions.dateFrom ? toDayIndex(dimensions.dateFrom) : null;
    const endDayIdx = dimensions.dateTo ? toDayIndex(dimensions.dateTo) : null;

    affectedCases = allCases.filter((c: any) => {
      // Station filter takes precedence if present, otherwise District
      if (dimensions.stationId) {
        if (c.PoliceStationID !== dimensions.stationId) return false;
      }

      if (dimensions.crimeHeadId && c.CrimeMajorHeadID !== dimensions.crimeHeadId) {
        return false;
      }

      if (startDayIdx !== null || endDayIdx !== null) {
        const caseDayIdx = toDayIndex(c.CrimeRegisteredDateTime || c.CrimeRegisteredDate);
        if (caseDayIdx === null) return false;
        if (startDayIdx !== null && caseDayIdx < startDayIdx) return false;
        if (endDayIdx !== null && caseDayIdx > endDayIdx) return false;
      }

      return true;
    });

    // If district filter is requested but no station filter, fetch units to filter by district
    if (dimensions.districtId && !dimensions.stationId) {
       const units = await repo.getUnits();
       const districtStations = new Set(units.filter((u: any) => u.DistrictID === dimensions.districtId).map((u: any) => u.UnitID));
       affectedCases = affectedCases.filter((c: any) => districtStations.has(c.PoliceStationID));
    }

  } else if (dimensions.type === 'RISK' && dimensions.stationId) {
    affectedCases = allCases.filter((c: any) => c.PoliceStationID === dimensions.stationId);
  }

  // Optimize payload - only return what is needed
  const slimCases = affectedCases.map((c: any) => ({
    CaseMasterID: c.CaseMasterID,
    CaseNo: c.CaseNo,
    CrimeNo: c.CrimeNo,
    CrimeMajorHeadID: c.CrimeMajorHeadID,
    PoliceStationID: c.PoliceStationID,
    CrimeRegisteredDate: c.CrimeRegisteredDate,
    CaseStatusID: c.CaseStatusID,
  }));

  // 2. Correlate Hotspots
  let hotspots: any[] = [];
  try {
    const query = new URLSearchParams();
    if (dimensions.districtId) query.append('district', dimensions.districtId.toString());
    if (dimensions.stationId) query.append('station', dimensions.stationId.toString());
    if (dimensions.crimeHeadId) query.append('crimeHead', dimensions.crimeHeadId.toString());
    if (dimensions.dateFrom) query.append('dateFrom', dimensions.dateFrom);
    if (dimensions.dateTo) query.append('dateTo', dimensions.dateTo);

    const port = process.env.PORT || 3000;
    const hotspotRes = await axios.get(`http://127.0.0.1:${port}/api/hotspots?${query.toString()}`, {
      headers: { 'Authorization': req.headers.authorization }
    });
    if (hotspotRes.data && hotspotRes.data.success) {
      hotspots = hotspotRes.data.hotspots;
    }
  } catch (err: any) {
    console.warn('[IntelligenceService] Failed to fetch hotspots:', err.message);
  }

  // 3. Correlate Repeated Offenders
  let offenders: any[] = [];
  try {
    const allAccused = await repo.getAllAccused();
    
    // Build repeated offenders exactly like the repeatedOffenderController does
    const counts = new Map<string, { personId: string; name: string; caseIds: Set<number> }>();
    for (const a of allAccused) {
      if (!a.PersonID || !a.CaseMasterID) continue;
      if (!counts.has(a.PersonID)) {
        counts.set(a.PersonID, { personId: a.PersonID, name: a.AccusedName || 'Unknown', caseIds: new Set() });
      }
      counts.get(a.PersonID)!.caseIds.add(a.CaseMasterID);
    }
    
    const matchedCaseIds = new Set(slimCases.map((c: any) => c.CaseMasterID));
    
    for (const data of counts.values()) {
      if (data.caseIds.size >= 2) {
        // Is this offender linked to our affected cases?
        const isLinked = Array.from(data.caseIds).some(cid => matchedCaseIds.has(cid));
        if (isLinked) {
          offenders.push({
            PersonID: data.personId,
            AccusedName: data.name,
            TotalCases: data.caseIds.size
          });
        }
      }
    }
  } catch (err: any) {
    console.warn('[IntelligenceService] Failed to correlate offenders:', err.message);
  }

  return {
    affectedCases: slimCases,
    hotspots,
    offenders
  };
};
