import { aiLogger } from './logger';
import { CloudScaleRepository } from '../repositories/CloudScaleRepository';

const ALIASES: Record<string, string> = {
  CaseMaster: 'casemasters', cases: 'casemasters', FIR: 'casemasters', firs: 'casemasters', FIRs: 'casemasters',
  Accused: 'accuseds', accused: 'accuseds',
  Victim: 'victims', victims: 'victims',
  District: 'districts',
  Unit: 'units', stations: 'units', Station: 'units',
  Employee: 'employees', officers: 'employees', Officer: 'employees',
};

const TABLE_NAMES = [
  'casemasters', 'accuseds', 'victims', 'districts', 'units', 'employees'
];

export const resolveTable = (name: string): string => {
  const resolved = ALIASES[name] || name;
  if (!TABLE_NAMES.includes(resolved)) {
    throw new Error(`Security Violation: table "${name}" does not exist or is restricted.`);
  }
  return resolved;
};

export const listTables = (): string[] => TABLE_NAMES;

export const getTableData = async (name: string, req?: any): Promise<any[]> => {
  const table = resolveTable(name);
  const repo = new CloudScaleRepository(req);

  try {
    let records: any[] = [];
    
    switch(table) {
      case 'casemasters':
        records = await repo.getAllCases();
        break;
      case 'districts':
        records = await repo.getDistricts();
        break;
      case 'units':
        records = await repo.getUnits();
        break;
      case 'accuseds':
        records = await repo.getAllAccused();
        break;
      case 'victims':
        records = await repo.getAllVictims();
        break;
      case 'employees':
        records = await repo.getEmployees();
        break;
      default:
        throw new Error(`Unhandled table: ${table}`);
    }

    if (table === 'casemasters') {
      // Denormalize districts into cases for AI grouping
      const units = await repo.getUnits();
      const districts = await repo.getDistricts();
      
      const unitToDistrictId = new Map<number, number>(
        units.map((u: any) => [Number(u.UnitID), Number(u.DistrictID)])
      );
      const unitIdToName = new Map<number, string>(
        units.map((u: any) => [Number(u.UnitID), u.UnitName])
      );
      const districtIdToName = new Map<number, string>(
        districts.map((d: any) => [Number(d.DistrictID), d.DistrictName])
      );
      
      records = records.map((c: any) => {
        const districtId = unitToDistrictId.get(Number(c.PoliceStationID));
        const stationName = unitIdToName.get(Number(c.PoliceStationID));
        return {
          ...c,
          DistrictID: districtId ?? null,
          DistrictName: districtId != null ? (districtIdToName.get(districtId) ?? null) : null,
          PoliceStationName: stationName ?? null,
        };
      });
    }

    aiLogger.info(`[CloudScale AI] Retrieved ${table}: ${records.length} records`);
    return records;
    
  } catch (err: any) {
    aiLogger.error(`[CloudScale AI] Failed to retrieve ${table}: ${err.message}`);
    throw err; // Propagate the real error instead of returning []
  }
};

export const invalidateCache = (name?: string) => {
  // We no longer manage cache here; CloudScaleRepository manages its own cache.
};
