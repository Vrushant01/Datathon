"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zcatalyst_sdk_node_1 = __importDefault(require("zcatalyst-sdk-node"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/', authMiddleware_1.requireAuth, (0, authMiddleware_1.requireRole)('Admin'), async (req, res) => {
    try {
        const app = zcatalyst_sdk_node_1.default.initialize(req);
        const nosql = app.nosql();
        const { NoSQLItem, NoSQLEnum } = require('zcatalyst-sdk-node/lib/no-sql');
        const commit = req.body?.commit === true;
        const minLat = 14.1;
        const maxLat = 14.8;
        const minLon = 75.5;
        const maxLon = 76.5;
        const getRandomDavanagerePoint = () => {
            return {
                latitude: minLat + Math.random() * (maxLat - minLat),
                longitude: minLon + Math.random() * (maxLon - minLon)
            };
        };
        const isWithinDavanagere = (lat, lon) => {
            return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
        };
        const unitsTable = nosql.table('units');
        let ids = [];
        for (let i = 2000; i <= 2930; i++)
            ids.push(i);
        const keys = ids.map(v => new NoSQLItem().addNumber('UnitID', v));
        let allUnits = [];
        let fetchErrors = [];
        let rawResp = null;
        for (let i = 0; i < keys.length; i += 25) {
            const batch = keys.slice(i, i + 25);
            try {
                const resp = await unitsTable.fetchItem({ keys: batch });
                if (!rawResp)
                    rawResp = resp;
                allUnits.push(...(resp.get || []).map((d) => typeof d.item.toJSON === 'function' ? d.item.toJSON() : d.item));
            }
            catch (e) {
                fetchErrors.push(`Units fetch error: ${e.message}`);
            }
        }
        const getVal = (v) => {
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                return v.N !== undefined ? v.N : (v.S !== undefined ? v.S : v);
            }
            return v;
        };
        const davanagereUnits = allUnits.filter(u => Number(getVal(u.DistrictID)) === 1004);
        const unitIds = davanagereUnits.map(u => Number(getVal(u.UnitID)));
        const casesTable = nosql.table('casemasters');
        ids = [];
        for (let i = 100001; i <= 110000; i++)
            ids.push(i);
        const ckeys = ids.map(v => new NoSQLItem().addNumber('CaseMasterID', v));
        let allCases = [];
        for (let i = 0; i < ckeys.length; i += 25) {
            const batch = ckeys.slice(i, i + 25);
            try {
                const resp = await casesTable.fetchItem({ keys: batch });
                allCases.push(...(resp.get || []).map((d) => typeof d.item.toJSON === 'function' ? d.item.toJSON() : d.item));
            }
            catch (e) {
                fetchErrors.push(`Cases fetch error: ${e.message}`);
            }
        }
        const davanagereCases = allCases.filter(c => unitIds.includes(Number(getVal(c.PoliceStationID))));
        let unitsToUpdate = [];
        let casesToUpdate = [];
        let skippedUnits = 0;
        let skippedCases = 0;
        let samples = [];
        // Check Units
        for (const u of davanagereUnits) {
            const lat = Number(getVal(u.latitude));
            const lon = Number(getVal(u.longitude));
            if (lat && lon && isWithinDavanagere(lat, lon)) {
                skippedUnits++;
            }
            else {
                const pt = getRandomDavanagerePoint();
                unitsToUpdate.push({ original: u, newPoint: pt });
                if (samples.length < 5) {
                    samples.push(`Unit ${getVal(u.UnitID)} [${lat}, ${lon}] -> [${pt.latitude.toFixed(4)}, ${pt.longitude.toFixed(4)}]`);
                }
            }
        }
        // Check Cases
        for (const c of davanagereCases) {
            const lat = Number(getVal(c.latitude));
            const lon = Number(getVal(c.longitude));
            if (lat && lon && isWithinDavanagere(lat, lon)) {
                skippedCases++;
            }
            else {
                const pt = getRandomDavanagerePoint();
                casesToUpdate.push({ original: c, newPoint: pt });
            }
        }
        let log = [];
        if (commit) {
            // Update Units
            for (const update of unitsToUpdate) {
                const keys = new NoSQLItem().addNumber('UnitID', Number(getVal(update.original.UnitID)));
                const updateItem = {
                    keys,
                    update_attributes: [
                        { operation_type: NoSQLEnum.NoSQLUpdateOperationType.SET, attribute_path: ['latitude'], update_value: { [NoSQLEnum.DataType.N]: String(update.newPoint.latitude) } },
                        { operation_type: NoSQLEnum.NoSQLUpdateOperationType.SET, attribute_path: ['longitude'], update_value: { [NoSQLEnum.DataType.N]: String(update.newPoint.longitude) } }
                    ]
                };
                try {
                    await unitsTable.updateItems(updateItem);
                    log.push(`Updated Unit ${getVal(update.original.UnitID)}`);
                }
                catch (e) { }
            }
            // Update Cases
            for (let i = 0; i < casesToUpdate.length; i += 20) {
                const batch = casesToUpdate.slice(i, i + 20);
                const items = batch.map(c => ({
                    keys: new NoSQLItem().addNumber('CaseMasterID', Number(getVal(c.original.CaseMasterID))),
                    update_attributes: [
                        { operation_type: NoSQLEnum.NoSQLUpdateOperationType.SET, attribute_path: ['latitude'], update_value: { [NoSQLEnum.DataType.N]: String(c.newPoint.latitude) } },
                        { operation_type: NoSQLEnum.NoSQLUpdateOperationType.SET, attribute_path: ['longitude'], update_value: { [NoSQLEnum.DataType.N]: String(c.newPoint.longitude) } }
                    ]
                }));
                try {
                    await Promise.all(items.map(item => casesTable.updateItems(item)));
                }
                catch (e) { }
            }
            log.push(`Updated ${casesToUpdate.length} Cases`);
        }
        res.json({
            success: true,
            mode: commit ? 'LIVE (Committed)' : 'DRY RUN',
            summary: {
                totalEvaluated: { units: davanagereUnits.length, cases: davanagereCases.length },
                neededFixing: { units: unitsToUpdate.length, cases: casesToUpdate.length },
                skippedIdempotent: { units: skippedUnits, cases: skippedCases },
                samples,
                fetchErrors,
                rawResp
            },
            log: commit ? log : undefined
        });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message, stack: e.stack });
    }
});
exports.default = router;
