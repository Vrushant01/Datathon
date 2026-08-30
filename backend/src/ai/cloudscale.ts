import { aiLogger } from './logger';
import { getCatalystApp } from '../repositories/CloudScaleRepository';

// Mirrors backend/src/repositories/CloudScaleRepository.ts's scan pattern,
// but exposes generic table access for the AI assistant's query tools.

interface TableCacheEntry {
  data: any[] | null;
  promise: Promise<any[]> | null;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes — same TTL as the rest of the app
const cache: Record<string, TableCacheEntry> = {};

// Keep this in sync with backend/src/repositories/CloudScaleRepository.ts.
// If you add/rename a Catalyst NoSQL table, update both places.
const TABLE_CONFIG: Record<string, { pk: string; ranges: [number, number][] }> = {
  districts:    { pk: 'DistrictID',      ranges: [[1001, 1031]] },
  units:        { pk: 'UnitID',          ranges: [[2000, 2929]] },
  employees:    { pk: 'EmployeeID',      ranges: [[10001, 10930], [30001, 30930]] },
  casemasters:  { pk: 'CaseMasterID',    ranges: [[100001, 105000]] },
  accuseds:     { pk: 'AccusedMasterID', ranges: [[80001, 85000]] },
  victims:      { pk: 'VictimMasterID',  ranges: [[70001, 75000]] },
};

// So the LLM planner (and any legacy Mongo-style names in prompts) still resolve.
const ALIASES: Record<string, string> = {
  CaseMaster: 'casemasters', cases: 'casemasters', FIR: 'casemasters', firs: 'casemasters', FIRs: 'casemasters',
  Accused: 'accuseds', accused: 'accuseds',
  Victim: 'victims', victims: 'victims',
  District: 'districts',
  Unit: 'units', stations: 'units', Station: 'units',
  Employee: 'employees', officers: 'employees', Officer: 'employees',
};

function unmarshall(item: any) {
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
}

async function scanTable(table: string, req?: any): Promise<any[]> {
  const entry = cache[table] || (cache[table] = { data: null, promise: null, timestamp: 0 });
  const now = Date.now();
  if (entry.data && now - entry.timestamp < CACHE_TTL) return entry.data;
  if (entry.promise) return entry.promise;

  const cfg = TABLE_CONFIG[table];
  if (!cfg) throw new Error(`Unknown CloudScale table: ${table}`);

  entry.promise = (async () => {
    const app = getCatalystApp(req);
    const nosql = app.nosql();
    const tbl = nosql.table(table);
    const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');

    const ids: number[] = [];
    for (const [start, end] of cfg.ranges) for (let i = start; i <= end; i++) ids.push(i);

    const allItems: any[] = [];
    for (let i = 0; i < ids.length; i += 25) {
      const batch = ids.slice(i, i + 25);
      const keys = batch.map(v => new NoSQLItem().addNumber(cfg.pk, v));
      try {
        const resp: any = await tbl.fetchItem({ keys });
        const items = (resp.get || [])
          .map((d: any) => d.item && (typeof d.item.toJSON === 'function' ? d.item.toJSON() : d.item))
          .filter(Boolean)
          .map(unmarshall);
        allItems.push(...items);
      } catch {
        // missing keys in a range are expected — skip
      }
    }

    let finalItems = allItems;

    // casemasters only carries PoliceStationID, not district — denormalize
    // DistrictID/DistrictName onto each case here so the LLM planner can
    // $group by district directly without needing an unsupported $lookup.
    // (See catalyst_schema.json: CaseMaster.PoliceStationID -> Unit.UnitID
    // -> Unit.DistrictID -> District.DistrictName.)
    if (table === 'casemasters') {
      const [units, districts] = await Promise.all([
        scanTable('units', req),
        scanTable('districts', req),
      ]);
      const unitToDistrictId = new Map<number, number>(
        units.map((u: any) => [Number(u.UnitID), Number(u.DistrictID)])
      );
      const districtIdToName = new Map<number, string>(
        districts.map((d: any) => [Number(d.DistrictID), d.DistrictName])
      );
      finalItems = allItems.map((c: any) => {
        const districtId = unitToDistrictId.get(Number(c.PoliceStationID));
        return {
          ...c,
          DistrictID: districtId ?? null,
          DistrictName: districtId != null ? (districtIdToName.get(districtId) ?? null) : null,
        };
      });
    }

    entry.data = finalItems;
    entry.timestamp = Date.now();
    entry.promise = null;
    aiLogger.info(`[CloudScale] Scanned ${table}: ${finalItems.length} records`);
    return finalItems;
  })();

  try {
    return await entry.promise;
  } catch (e: any) {
    entry.promise = null;
    aiLogger.error(`[CloudScale] Scan failed for ${table}: ${e.message}`);
    throw e;
  }
}

export const resolveTable = (name: string): string => {
  const resolved = ALIASES[name] || name;
  if (!TABLE_CONFIG[resolved]) {
    throw new Error(`Security Violation: table "${name}" does not exist or is restricted.`);
  }
  return resolved;
};

export const listTables = (): string[] => Object.keys(TABLE_CONFIG);

export const getTableData = async (name: string, req?: any): Promise<any[]> => {
  return scanTable(resolveTable(name), req);
};

export const invalidateCache = (name?: string) => {
  if (name) {
    const t = resolveTable(name);
    cache[t] = { data: null, promise: null, timestamp: 0 };
  } else {
    for (const t of Object.keys(cache)) cache[t] = { data: null, promise: null, timestamp: 0 };
  }
};
