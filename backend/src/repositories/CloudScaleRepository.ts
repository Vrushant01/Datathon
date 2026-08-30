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
  victims: { data: null, promise: null, timestamp: 0 },
  customedges: { data: null, promise: null, timestamp: 0 },
  complainants: { data: null, promise: null, timestamp: 0 },
  actsections: { data: null, promise: null, timestamp: 0 }
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Singleton Catalyst app instance.
// In AppSail, CATALYST_CONFIG env var is always set by the platform and contains
// the project credentials. initializeApp() reads it without needing request headers.
// This avoids the "unable to find the type of initialisation" error that occurs
// when catalyst.initialize(req) is called with a browser-originating request
// that lacks Catalyst's internal proxy headers.
let _catalystApp: any = null;
export function getCatalystApp(req?: any): any {
  if (_catalystApp) return _catalystApp;
  
  // Try initializeApp() — reads CATALYST_CONFIG env var set by AppSail
  if (process.env.CATALYST_CONFIG) {
    try {
      _catalystApp = (catalyst as any).initializeApp();
      console.log('[DB] Catalyst initialized via CATALYST_CONFIG env var');
      return _catalystApp;
    } catch (e: any) {
      console.warn('[DB] initializeApp() failed:', e.message);
    }
  }
  
  // Fallback: use request headers (works locally via catalyst serve proxy)
  if (req && req.headers && (req.headers['x-zc-projectid'] || req.headers['x-zc-project-key'])) {
    try {
      _catalystApp = catalyst.initialize(req);
      console.log('[DB] Catalyst initialized via request headers');
      return _catalystApp;
    } catch (e: any) {
      console.warn('[DB] catalyst.initialize(req) failed:', e.message);
    }
  }
  
  // Last resort: try initialize with req (may work in catalyst serve local mode)
  if (req) {
    try {
      _catalystApp = catalyst.initialize(req);
      console.log('[DB] Catalyst initialized via req (local mode)');
      return _catalystApp;
    } catch (e: any) {
      console.error('[DB] All Catalyst init methods failed. Last error:', e.message);
      throw new Error(`Catalyst SDK init failed: ${e.message}`);
    }
  }
  
  throw new Error('Cannot initialize Catalyst SDK: no CATALYST_CONFIG env var and no valid request');
}

export class CloudScaleRepository implements IDataRepository {
  private app: any;
  private metrics: any;

  constructor(req: any) {
    this.app = getCatalystApp(req);
    
    if (req) {
      if (!(req as any).metrics) {
          (req as any).metrics = { nosqlCalls: 0, cacheHits: 0, cacheMisses: 0, startTime: Date.now() };
      }
      this.metrics = (req as any).metrics;
    } else {
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

    // REASONING FOR 5-MINUTE CACHE (Operational Requirement):
    // The Catalyst NoSQL 'fetchItem' API limits lookups to 25 keys per batch.
    // Downloading 9,674 rows sequentially requires 400 API requests and takes ~80-100 seconds.
    // ZCQL aggregation would be faster but requires AppSail context initialized securely.
    // To ensure AI queries return within timeout windows, a 5-minute memory cache is mandatory.
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
            case 'units': pkField = 'UnitID'; for (let i = 2000; i <= 2930; i++) ids.push(i); break;
            case 'employees': pkField = 'EmployeeID'; for (let i = 10001; i <= 11900; i++) ids.push(i); for (let i = 30001; i <= 30930; i++) ids.push(i); break;
            // Range extended: MongoDB has 9,674 cases (100001–109674). Using 110000 ceiling with growth headroom.
            case 'casemasters': pkField = 'CaseMasterID'; for (let i = 100001; i <= 110000; i++) ids.push(i); break;
            // Range extended: MongoDB has 9,674 accused (80001–89674).
            case 'accuseds': pkField = 'AccusedMasterID'; for (let i = 80001; i <= 90000; i++) ids.push(i); break;
            // Range extended: MongoDB has 9,674 victims (70001–79674).
            case 'victims': pkField = 'VictimMasterID'; for (let i = 70001; i <= 80000; i++) ids.push(i); break;
        }

        const allItems: any[] = [];
        let batchErrors = 0;
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        
        // Fetch in batches of 25 (max supported by fetchItem)
        // Fetch in batches of 25 (max supported by fetchItem)
        const fetchPromises: (() => Promise<void>)[] = [];
        for (let i = 0; i < ids.length; i += 25) {
            const batch = ids.slice(i, i + 25);
            const keys = batch.map(v => new NoSQLItem().addNumber(pkField, v));
            
            fetchPromises.push(async () => {
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
                } catch (e: any) {
                    batchErrors++;
                    console.error(`[DB] fetchItem batch failed for ${actualTableName}:`, e?.message || e);
                }
            });
        }

        // Run fetchPromises in controlled concurrency batches.
        // CONCURRENCY=4: safe against CloudScale rate limits while still being ~4x faster than sequential.
        // 400 batches / 4 concurrent = 100 rounds * ~150ms avg = ~15 seconds for casemasters (cold start).
        // After first load, 5-minute cache makes all subsequent calls instant.

        const CONCURRENCY = 4;
        for (let i = 0; i < fetchPromises.length; i += CONCURRENCY) {
            const chunk = fetchPromises.slice(i, i + CONCURRENCY);
            await Promise.all(chunk.map(fn => fn()));
            // Small delay between rounds to stay well within CloudScale rate limits
            if (i + CONCURRENCY < fetchPromises.length) {
                await new Promise(r => setTimeout(r, 50));
            }
        }
        if (batchErrors > 0) {
            console.warn(`[DB] scanAll(${actualTableName}): ${batchErrors} batch(es) failed silently. Data may be partial.`);
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

  async createCase(caseData: any): Promise<any> {
    const nosql = this.app.nosql();
    const table = nosql.table('casemasters');
    const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
    const item = NoSQLItem.from(caseData);
    
    // Explicitly using the already-proven insertItems
    await table.insertItems({ item });
    
    // Invalidate caches explicitly
    GLOBAL_CACHE['casemasters'] = { data: null, promise: null, timestamp: 0 };
    
    return caseData;
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

  async getAllCases(): Promise<any[]> {
    return await this.scanAll('CaseMaster');
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

  async getAllCustomEdges(): Promise<any[]> {
    try {
      const zcql = this.app.zcql();
      const res = await zcql.executeZCQLQuery("SELECT * FROM customedges LIMIT 200");
      return res.map((r: any) => r.customedges);
    } catch(e: any) {
      console.error('getAllCustomEdges ZCQL error:', e.message);
      return [];
    }
  }

  async getComplainants(): Promise<any[]> {
    try {
      const zcql = this.app.zcql();
      const res = await zcql.executeZCQLQuery("SELECT * FROM complainants LIMIT 200");
      return res.map((r: any) => r.complainants);
    } catch(e: any) {
      console.error('getComplainants ZCQL error:', e.message);
      return [];
    }
  }

  async getActSections(): Promise<any[]> {
    try {
      const zcql = this.app.zcql();
      const res = await zcql.executeZCQLQuery("SELECT * FROM actsections LIMIT 200");
      return res.map((r: any) => r.actsections);
    } catch(e: any) {
      console.error('getActSections ZCQL error:', e.message);
      return [];
    }
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


  
  async getCasesByOfficer(officerId: number): Promise<any[]> {
    const cases = await this.scanAll('CaseMaster');
    return cases.filter(c => Number(c.PolicePersonID) === officerId);
  }

  async getCasesByStation(stationId: number): Promise<any[]> {
    const cases = await this.scanAll('CaseMaster');
    return cases.filter(c => Number(c.PoliceStationID) === stationId);
  }

  // --- Case Mutations ---
  async updateCaseStatus(caseId: number, statusId: number, userEmail: string): Promise<boolean> {
    const nosql = this.app.nosql();
    const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
    const table = nosql.table('casemasters');
    try {
      await table.updateItems({
        keys: new NoSQLItem().addNumber('CaseMasterID', caseId),
        update_attributes: [
          {
            operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT,
            update_value: NoSQLMarshall.make(statusId),
            attribute_path: ['CaseStatusID']
          }
        ]
      });
      // Invalidate cache
      GLOBAL_CACHE['casemasters'] = { data: null, promise: null, timestamp: 0 };
      return true;
    } catch(e) {
      console.error('updateCaseStatus error', e);
      return false;
    }
  }

  // --- Timeline, Evidence, Chargesheets ---
  async addTimelineNote(note: any): Promise<any> {
    const nosql = this.app.nosql();
    const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
    // Ensure NoteID is present
    if (!note.NoteID) note.NoteID = Date.now();
    const item = NoSQLItem.from(note);
    await nosql.table('timelinenotes').insertItems({ item });
    return note;
  }

  async getTimelineNotesByCase(caseId: number): Promise<any[]> {
    const nosql = this.app.nosql();
    const { NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
    try {
        const resp = await nosql.table('timelinenotes').queryTable({
            key_condition: {
                attribute: ['CaseMasterID'],
                operator: NoSQLEnum.NoSQLOperator.EQUALS,
                value: NoSQLMarshall.makeNumber(caseId)
            }
        });
        const raw = resp as any;
        return (raw.get || []).map((d: any) => typeof d.item?.toJSON === 'function' ? d.item.toJSON() : d.item).filter(Boolean);
    } catch(e: any) {
        if(e.message?.includes('Table Not Found')) return [];
        console.error('getTimelineNotesByCase error:', e);
        return [];
    }
  }

  async uploadEvidence(evidence: any): Promise<any> {
    const nosql = this.app.nosql();
    const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
    if (!evidence.EvidenceID) evidence.EvidenceID = Date.now();
    const item = NoSQLItem.from(evidence);
    await nosql.table('evidencefiles').insertItems({ item });
    return evidence;
  }

  async getEvidenceFilesByCase(caseId: number): Promise<any[]> {
    const nosql = this.app.nosql();
    const { NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
    try {
        const resp = await nosql.table('evidencefiles').queryTable({
            key_condition: {
                attribute: ['CaseMasterID'],
                operator: NoSQLEnum.NoSQLOperator.EQUALS,
                value: NoSQLMarshall.makeNumber(caseId)
            }
        });
        const raw = resp as any;
        return (raw.get || []).map((d: any) => typeof d.item?.toJSON === 'function' ? d.item.toJSON() : d.item).filter(Boolean);
    } catch(e) {
        return [];
    }
  }

  async submitChargesheet(cs: any): Promise<any> {
    const nosql = this.app.nosql();
    const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
    if (!cs.CSID) cs.CSID = Date.now();
    const item = NoSQLItem.from(cs);
    await nosql.table('chargesheets').insertItems({ item });
    return cs;
  }

  async getChargesheetsByCase(caseId: number): Promise<any[]> {
    const nosql = this.app.nosql();
    const { NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
    try {
        const resp = await nosql.table('chargesheets').queryTable({
            key_condition: {
                attribute: ['CaseMasterID'],
                operator: NoSQLEnum.NoSQLOperator.EQUALS,
                value: NoSQLMarshall.makeNumber(caseId)
            }
        });
        const raw = resp as any;
        return (raw.get || []).map((d: any) => typeof d.item?.toJSON === 'function' ? d.item.toJSON() : d.item).filter(Boolean);
    } catch(e) {
        return [];
    }
  }

  // --- Network Mutations ---
  async addCustomEdge(edge: any): Promise<any> {
    const nosql = this.app.nosql();
    const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
    if (!edge.EdgeID) {
      const crypto = require('crypto');
      edge.EdgeID = crypto.randomUUID();
    }
    const item = NoSQLItem.from(edge);
    await nosql.table('customedges').insertItems({ item });
    return edge;
  }

  async addCaseEntity(entityType: string, entity: any): Promise<any> {
    const nosql = this.app.nosql();
    const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
    
    let table = 'accuseds';
    if (entityType === 'Victim') table = 'victims';
    if (entityType === 'Complainant') table = 'complainants';
    
    const item = NoSQLItem.from(entity);
    await nosql.table(table).insertItems({ item });
    GLOBAL_CACHE[table] = { data: null, promise: null, timestamp: 0 };
    return entity;
  }

  async getCaseStatistics(metric: string, filters: { district?: number, station?: number, crime_category?: number }): Promise<any> {
    const cases = await this.scanAll('CaseMaster');
    
    // Apply filters
    const filteredCases = cases.filter(c => {
      if (c.latitude == null || c.latitude === 0 || c.longitude == null || c.longitude === 0) return false;
      if (filters.station && Number(c.PoliceStationID) !== filters.station) return false;
      if (filters.crime_category && Number(c.CrimeMajorHeadID) !== filters.crime_category) return false;
      // We assume station implies district. If district is provided without station, we'd ideally need a join,
      // but for simplicity we rely on frontend/LLM sending the station IDs if needed, or if DistrictID exists on CaseMaster.
      if (filters.district && c.DistrictID && Number(c.DistrictID) !== filters.district) return false;
      return true;
    });

    switch (metric) {
      case 'total_cases':
        return { metric: 'total_cases', value: filteredCases.length, source: 'CloudScale' };
      
      case 'pending_cases': {
        // MATCHING DASHBOARD LOGIC: Solved/Closed are StatusID 2, 3, or 4.
        // Therefore Pending is total minus solved.
        const solved = filteredCases.filter(c => c.CaseStatusID === 2 || c.CaseStatusID === 3 || c.CaseStatusID === 4).length;
        const pending = filteredCases.length - solved;
        return { metric: 'pending_cases', value: pending, source: 'CloudScale' };
      }
      
      case 'solved_cases': {
        // MATCHING DASHBOARD LOGIC: Solved/Closed are StatusID 2, 3, or 4.
        const solved = filteredCases.filter(c => c.CaseStatusID === 2 || c.CaseStatusID === 3 || c.CaseStatusID === 4).length;
        return { metric: 'solved_cases', value: solved, source: 'CloudScale' };
      }
      
      case 'crime_category_breakdown': {
        const counts: Record<number, number> = {};
        filteredCases.forEach(c => {
          const cat = Number(c.CrimeMajorHeadID);
          counts[cat] = (counts[cat] || 0) + 1;
        });
        return { metric, breakdown: Object.entries(counts).map(([k, v]) => ({ crime_category: Number(k), count: v })), source: 'CloudScale' };
      }
      
      case 'station_breakdown': {
        const counts: Record<number, number> = {};
        filteredCases.forEach(c => {
          const st = Number(c.PoliceStationID);
          counts[st] = (counts[st] || 0) + 1;
        });
        return { metric, breakdown: Object.entries(counts).map(([k, v]) => ({ station_id: Number(k), count: v })), source: 'CloudScale' };
      }

      case 'district_breakdown': {
        const counts: Record<number, number> = {};
        filteredCases.forEach(c => {
          // If DistrictID is not populated on CaseMaster, we fallback to PoliceStationID as a proxy or 0
          const dist = Number(c.DistrictID) || 0;
          counts[dist] = (counts[dist] || 0) + 1;
        });
        return { metric, breakdown: Object.entries(counts).map(([k, v]) => ({ district_id: Number(k), count: v })), source: 'CloudScale' };
      }

      default:
        throw new Error(`Metric '${metric}' is not supported.`);
    }
  }

  async updateCaseEntity(entityType: string, entity: any): Promise<any> {
    throw new Error('Update entity not fully implemented in CloudScale repo mock');
  }

  async deleteCaseEntity(entityType: string, entityId: number): Promise<boolean> {
    throw new Error('Delete entity not fully implemented in CloudScale repo mock');
  }
}
