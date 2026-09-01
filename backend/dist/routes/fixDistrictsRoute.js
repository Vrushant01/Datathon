"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zcatalyst_sdk_node_1 = __importDefault(require("zcatalyst-sdk-node"));
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const app = zcatalyst_sdk_node_1.default.initialize(req);
        const nosql = app.nosql();
        const districtsTable = nosql.table('districts');
        const unitsTable = nosql.table('units');
        const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        const logs = [];
        // 1. Rename District 1004 to "Davanagere"
        try {
            await districtsTable.updateItems({
                keys: new NoSQLItem().addNumber('DistrictID', 1004),
                update_attributes: [
                    {
                        operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT,
                        update_value: NoSQLMarshall.makeString('Davanagere'),
                        attribute_path: ['DistrictName']
                    }
                ]
            });
            logs.push("Renamed District 1004 from Mangaluru to Davanagere.");
        }
        catch (e) {
            logs.push("Error updating district: " + e.message);
        }
        // 2. Fetch units for 1004
        const unitIds = [];
        for (let i = 2000; i <= 2930; i++)
            unitIds.push(i);
        const unitKeys = unitIds.map(v => new NoSQLItem().addNumber('UnitID', v));
        let allUnits = [];
        const unitThunks = [];
        for (let i = 0; i < unitKeys.length; i += 25) {
            const batchKeys = unitKeys.slice(i, i + 25);
            unitThunks.push(async () => {
                try {
                    const r = await unitsTable.fetchItem({ keys: batchKeys });
                    if (r && r.get) {
                        allUnits.push(...r.get.map((u) => u.item.toJSON()));
                    }
                }
                catch (e) { }
            });
        }
        for (let i = 0; i < unitThunks.length; i += 4) {
            await Promise.all(unitThunks.slice(i, i + 4).map(fn => fn()));
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        const unitsToUpdate = allUnits.filter(u => {
            const dId = u.DistrictID?.N || u.DistrictID;
            return dId === '1004' || dId === 1004;
        });
        logs.push(`Found ${unitsToUpdate.length} units in District 1004.`);
        for (const u of unitsToUpdate) {
            const oldName = u.UnitName?.S || u.UnitName;
            const updates = [];
            if (oldName && oldName.includes('Mangaluru')) {
                const newName = oldName.replace(/Mangaluru/g, 'Davanagere');
                updates.push({
                    operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT,
                    update_value: NoSQLMarshall.makeString(newName),
                    attribute_path: ['UnitName']
                });
            }
            const oldAddress = u.Address?.S || u.Address;
            if (oldAddress && oldAddress.includes('Mangaluru')) {
                const newAddress = oldAddress.replace(/Mangaluru/g, 'Davanagere');
                updates.push({
                    operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT,
                    update_value: NoSQLMarshall.makeString(newAddress),
                    attribute_path: ['Address']
                });
            }
            if (updates.length > 0) {
                try {
                    await unitsTable.updateItems({
                        keys: new NoSQLItem().addNumber('UnitID', parseInt(u.UnitID?.N || u.UnitID)),
                        update_attributes: updates
                    });
                }
                catch (e) {
                    logs.push(`Failed to update unit ${u.UnitID?.N || u.UnitID}: ${e.message}`);
                }
            }
        }
        logs.push(`Finished updating units.`);
        res.json({ success: true, logs });
    }
    catch (e) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});
exports.default = router;
