"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateCache = exports.getTableData = exports.listTables = exports.resolveTable = void 0;
const logger_1 = require("./logger");
const CloudScaleRepository_1 = require("../repositories/CloudScaleRepository");
const ALIASES = {
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
const resolveTable = (name) => {
    const resolved = ALIASES[name] || name;
    if (!TABLE_NAMES.includes(resolved)) {
        throw new Error(`Security Violation: table "${name}" does not exist or is restricted.`);
    }
    return resolved;
};
exports.resolveTable = resolveTable;
const listTables = () => TABLE_NAMES;
exports.listTables = listTables;
const getTableData = async (name, req) => {
    const table = (0, exports.resolveTable)(name);
    const repo = new CloudScaleRepository_1.CloudScaleRepository(req);
    try {
        let records = [];
        switch (table) {
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
            const unitToDistrictId = new Map(units.map((u) => [Number(u.UnitID), Number(u.DistrictID)]));
            const unitIdToName = new Map(units.map((u) => [Number(u.UnitID), u.UnitName]));
            const districtIdToName = new Map(districts.map((d) => [Number(d.DistrictID), d.DistrictName]));
            records = records.map((c) => {
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
        logger_1.aiLogger.info(`[CloudScale AI] Retrieved ${table}: ${records.length} records`);
        return records;
    }
    catch (err) {
        logger_1.aiLogger.error(`[CloudScale AI] Failed to retrieve ${table}: ${err.message}`);
        throw err; // Propagate the real error instead of returning []
    }
};
exports.getTableData = getTableData;
const invalidateCache = (name) => {
    // We no longer manage cache here; CloudScaleRepository manages its own cache.
};
exports.invalidateCache = invalidateCache;
