import catalyst from 'zcatalyst-sdk-node';
import { IDataRepository } from './IDataRepository';

interface AppCacheState {
  data: any[] | null;
  promise: Promise<any[]> | null;
  timestamp: number;
}

const GLOBAL_CACHE: Record<string, AppCacheState> = {
  districts: { data: null, promise: null, timestamp: 0 },
  units: { data: null, promise: null, timestamp: 0 },
  employees: { data: null, promise: null, timestamp: 0 },
  casemasters: { data: null, promise: null, timestamp: 0 },
  accuseds: { data: null, promise: null, timestamp: 0 },
  victims: { data: null, promise: null, timestamp: 0 }
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class CloudScaleRepository implements IDataRepository {
  private app: any;
  private metrics: any;

  constructor(req: any) {
    if (req) {
      this.app = catalyst.initialize(req);
      if (!(req as any).metrics) {
          (req as any).metrics = { nosqlCalls: 0, cacheHits: 0, cacheMisses: 0, startTime: Date.now() };
      }
      this.metrics = (req as any).metrics;
    } else {
      console.warn('[DB] CloudScale initialized without Request context.');
      this.app = catalyst.initialize(undefined as any);
      this.metrics = { nosqlCalls: 0, cacheHits: 0, cacheMisses: 0, startTime: Date.now() };
    }
  }

  private async scanAll(tableName: string): Promise<any[]> {
    let actualTableName = tableName;
    if (tableName === 'District') actualTableName = 'districts';
    if (tableName === 'Unit') actualTableName = 'units';
    if (tableName === 'Employee') actualTableName = 'employees';
    if (tableName === 'CaseMaster') actualTableName = 'casemasters';
    if (tableName === 'Accused') actualTableName = 'accuseds';
    if (tableName === 'Victim') actualTableName = 'victims';
    
    const cacheEntry = GLOBAL_CACHE[actualTableName];
    if (!cacheEntry) throw new Error(`scanAll not supported for table: ${tableName}`);

    const now = Date.now();
    if (cacheEntry.data && (now - cacheEntry.timestamp < CACHE_TTL)) {
        this.metrics.cacheHits++;
        return cacheEntry.data;
    }

    if (cacheEntry.promise) {
        this.metrics.cacheHits++;
        return cacheEntry.promise;
    }

    this.metrics.cacheMisses++;
    
    cacheEntry.promise = (async () => {
        const nosql = this.app.nosql();
        const table = nosql.table(actualTableName);
        
        let ids: number[] = [];
        let pkField = '';
        switch (actualTableName) {
            case 'districts': pkField = 'DistrictID'; for (let i = 1001; i <= 1031; i++) ids.push(i); break;
            case 'units': pkField = 'UnitID'; for (let i = 2000; i <= 2929; i++) ids.push(i); break;
            case 'employees': pkField = 'EmployeeID'; for (let i = 10001; i <= 10930; i++) ids.push(i); for (let i = 30001; i <= 30930; i++) ids.push(i); break;
            case 'casemasters': pkField = 'CaseMasterID'; for (let i = 100001; i <= 105000; i++) ids.push(i); break;
            case 'accuseds': pkField = 'AccusedMasterID'; for (let i = 80001; i <= 85000; i++) ids.push(i); break;
            case 'victims': pkField = 'VictimMasterID'; for (let i = 70001; i <= 75000; i++) ids.push(i); break;
        }

        const allItems: any[] = [];
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        
        // Fetch in batches of 25 (max supported by fetchItem)
        for (let i = 0; i < ids.length; i += 25) {
            const batch = ids.slice(i, i + 25);
            const keys = batch.map(v => new NoSQLItem().addNumber(pkField, v));
            try {
                this.metrics.nosqlCalls++;
                const resp = await table.fetchItem({ keys });
                const raw = resp as any;
                const items = (raw.get || []).map((d: any) => {
                    const item = d.item;
                    if (!item) return null;
                    return typeof item.toJSON === 'function' ? item.toJSON() : item;
                }).filter(Boolean);
                allItems.push(...items);
            } catch (e) {
                // Ignore missing
            }
        }
        
        const cleaned = allItems.map(item => {
            const clean: any = {};
            for (const [k, v] of Object.entries(item)) {
                if (v && typeof v === 'object') {
                    if ('S' in (v as any)) clean[k] = (v as any).S;
                    else if ('N' in (v as any)) clean[k] = Number((v as any).N);
                    else if ('BOOL' in (v as any)) clean[k] = (v as any).BOOL === true || (v as any).BOOL === 'true';
                    else clean[k] = v;
                } else {
                    clean[k] = v;
                }
            }
            return clean;
        });

        cacheEntry.data = cleaned;
        cacheEntry.timestamp = Date.now();
        cacheEntry.promise = null;
        return cleaned;
    })();

    try {
        return await cacheEntry.promise;
    } catch (e) {
        cacheEntry.promise = null;
        throw e;
    }
  }

  // --- Implementation ---
  
  async getDistricts(): Promise<any[]> {
    return await this.scanAll('District');
  }

  async getUnits(districtId?: number): Promise<any[]> {
    const units = await this.scanAll('Unit');
    if (districtId) {
      return units.filter(u => Number(u.DistrictID) === districtId);
    }
    return units;
  }

  async getEmployees(): Promise<any[]> {
    return await this.scanAll('Employee');
  }

  async getCases(filter: any): Promise<any[]> {
    const cases = await this.scanAll('CaseMaster');
    return cases.filter(c => {
      if (c.latitude == null || c.latitude === 0) return false;
      if (c.longitude == null || c.longitude === 0) return false;
      if (filter.PoliceStationID) {
        if (typeof filter.PoliceStationID === 'number' && Number(c.PoliceStationID) !== filter.PoliceStationID) return false;
        if (filter.PoliceStationID.$in && !filter.PoliceStationID.$in.includes(Number(c.PoliceStationID))) return false;
      }
      if (filter.CrimeMajorHeadID && Number(c.CrimeMajorHeadID) !== filter.CrimeMajorHeadID) return false;
      if (filter.CaseStatusID && Number(c.CaseStatusID) !== filter.CaseStatusID) return false;
      if (filter.GravityOffenceID && Number(c.GravityOffenceID) !== filter.GravityOffenceID) return false;
      if (filter.CrimeRegisteredDate) {
        if (filter.CrimeRegisteredDate.$gte && c.CrimeRegisteredDate < filter.CrimeRegisteredDate.$gte) return false;
        if (filter.CrimeRegisteredDate.$lte && c.CrimeRegisteredDate > filter.CrimeRegisteredDate.$lte) return false;
      }
      return true;
    });
  }

  async getCaseById(caseId: number): Promise<any | null> {
    const cases = await this.scanAll('CaseMaster');
    return cases.find(c => Number(c.CaseMasterID) === caseId) || null;
  }

  async getAllCasesForAnalytics(): Promise<any[]> {
    const cases = await this.scanAll('CaseMaster');
    const valid = cases.filter(c => c.latitude != null && c.latitude !== 0 && c.longitude != null && c.longitude !== 0);
    valid.sort((a, b) => new Date(b.CrimeRegisteredDate).getTime() - new Date(a.CrimeRegisteredDate).getTime());
    return valid.slice(0, 5000);
  }

  async getAccusedByCase(caseId: number): Promise<any[]> {
    const all = await this.scanAll('Accused');
    return all.filter(a => Number(a.CaseMasterID) === caseId);
  }

  async getVictimsByCase(caseId: number): Promise<any[]> {
    const all = await this.scanAll('Victim');
    return all.filter(v => Number(v.CaseMasterID) === caseId);
  }

  async getCustomEdgesByCase(caseId: number): Promise<any[]> {
    return [];
  }

  async getRepeatOffenders(): Promise<any[]> {
    const allAccused = await this.scanAll('Accused');
    const personMap = new Map<string, any>();
    
    allAccused.forEach(acc => {
      if (!acc.PersonID || acc.PersonID === "") return;
      if (!personMap.has(acc.PersonID)) {
        personMap.set(acc.PersonID, {
          _id: acc.PersonID,
          name: acc.AccusedName,
          offenceCount: 0,
          caseIds: []
        });
      }
      const record = personMap.get(acc.PersonID);
      record.offenceCount += 1;
      record.caseIds.push(acc.CaseMasterID);
    });
    
    return Array.from(personMap.values())
      .filter(p => p.offenceCount > 1)
      .sort((a, b) => (b.offenceCount - a.offenceCount) || a._id.localeCompare(b._id))
      .slice(0, 5);
  }

  async getStationCaseCounts(): Promise<{ stationId: number, count: number }[]> {
    const cases = await this.scanAll('CaseMaster');
    const countMap = new Map<number, number>();
    cases.forEach(c => {
      const sId = Number(c.PoliceStationID);
      if (!countMap.has(sId)) countMap.set(sId, 0);
      countMap.set(sId, countMap.get(sId)! + 1);
    });
    return Array.from(countMap.entries()).map(([stationId, count]) => ({ stationId, count }));
  }

  async getAllAccused(): Promise<any[]> {
    return await this.scanAll('Accused');
  }

  async getAllVictims(): Promise<any[]> {
    return await this.scanAll('Victim');
  }

  async getAllCustomEdges(): Promise<any[]> {
    return [];
  }
  
  async getCasesByOfficer(officerId: number): Promise<any[]> {
    const cases = await this.scanAll('CaseMaster');
    return cases.filter(c => Number(c.PolicePersonID) === officerId);
  }

  async getCasesByStation(stationId: number): Promise<any[]> {
    const cases = await this.scanAll('CaseMaster');
    return cases.filter(c => Number(c.PoliceStationID) === stationId);
  }
}
