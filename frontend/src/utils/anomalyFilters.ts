import { mockDb } from './mockDb';

/**
 * Normalise a CrimeRegisteredDateTime (ISO string) or CrimeRegisteredDate ("YYYY-MM-DD")
 * to the number of complete UTC days since Unix epoch.
 */
function toDayIndex(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 86_400_000);
}

export interface AnomalyFilterParams {
  district?: string | number | 'ALL';
  station?: string | number | 'ALL';
  crimeType?: string | number | 'ALL';
  startDate?: string;
  endDate?: string;
  status?: string | number | 'ALL';
  personId?: string;
}

/**
 * Shared filtering function to ensure anomaly counts, GIS maps, and FIR tables
 * all display the exact same case set.
 */
export function getCasesForAnomaly(cases: any[], filters: AnomalyFilterParams): any[] {
  const districts = mockDb.getDistricts();
  const stations = mockDb.getUnits();
  const crimeHeads = mockDb.getCrimeHeads();

  // Resolve filter values to IDs
  let filterDistrictId: number | 'ALL' = 'ALL';
  if (filters.district && filters.district !== 'ALL') {
    if (typeof filters.district === 'number') {
      filterDistrictId = filters.district;
    } else {
      const d = districts.find(x => x.DistrictName === filters.district);
      if (d) filterDistrictId = d.DistrictID;
    }
  }

  let filterStationId: number | 'ALL' = 'ALL';
  if (filters.station && filters.station !== 'ALL') {
    if (typeof filters.station === 'number') {
      filterStationId = filters.station;
    } else {
      const s = stations.find(x => x.UnitName === filters.station && x.TypeID === 1);
      if (s) filterStationId = s.UnitID;
    }
  }

  let filterCrimeHeadId: number | 'ALL' = 'ALL';
  if (filters.crimeType && filters.crimeType !== 'ALL') {
    if (typeof filters.crimeType === 'number') {
      filterCrimeHeadId = filters.crimeType;
    } else {
      const typeStr = filters.crimeType.toLowerCase().replace(/[^a-z]/g, '');
      const ch = crimeHeads.find(x => x.CrimeGroupName.toLowerCase().replace(/[^a-z]/g, '').includes(typeStr) || typeStr.includes(x.CrimeGroupName.toLowerCase().replace(/[^a-z]/g, '')));
      if (ch) filterCrimeHeadId = ch.CrimeHeadID;
    }
  }

  let filterStatusId: number | 'ALL' = 'ALL';
  if (filters.status && filters.status !== 'ALL') {
    filterStatusId = Number(filters.status);
  }

  const startDayIdx = filters.startDate ? toDayIndex(filters.startDate) : null;
  const endDayIdx = filters.endDate ? toDayIndex(filters.endDate) : null;
  
  const accused = filters.personId ? mockDb.getAccused() : [];

  return cases.filter(c => {
    // 1. District Filter
    if (filterDistrictId !== 'ALL') {
      const station = stations.find(s => s.UnitID === c.PoliceStationID);
      if (!station || station.DistrictID !== filterDistrictId) return false;
    }

    // 2. Station Filter
    if (filterStationId !== 'ALL' && c.PoliceStationID !== filterStationId) {
      return false;
    }

    // 3. Crime Type Filter
    if (filterCrimeHeadId !== 'ALL' && c.CrimeMajorHeadID !== filterCrimeHeadId) {
      return false;
    }

    // 4. Status Filter
    if (filterStatusId !== 'ALL' && c.CaseStatusID !== filterStatusId) {
      return false;
    }

    // 5. Date Window Filter (using precise UTC day indices to match AI backend exactly)
    if (startDayIdx !== null || endDayIdx !== null) {
      const caseDayIdx = toDayIndex(c.CrimeRegisteredDateTime || c.CrimeRegisteredDate);
      if (caseDayIdx === null) return false;
      
      if (startDayIdx !== null && caseDayIdx < startDayIdx) return false;
      if (endDayIdx !== null && caseDayIdx > endDayIdx) return false;
    }
    
    // 6. Person ID Filter
    if (filters.personId) {
      const hasPerson = accused.some(a => a.CaseMasterID === c.CaseMasterID && a.PersonID === filters.personId);
      if (!hasPerson) return false;
    }

    return true;
  });
}
