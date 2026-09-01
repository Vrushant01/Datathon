"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCloudscaleIndexes = void 0;
const zcatalyst_sdk_node_1 = __importDefault(require("zcatalyst-sdk-node"));
const getCloudscaleIndexes = async (req, res) => {
    try {
        const app = zcatalyst_sdk_node_1.default.initialize(req);
        const nosql = app.nosql();
        const tables = ['districts', 'units', 'employees', 'casemasters', 'accuseds', 'victims'];
        const result = {};
        for (const t of tables) {
            try {
                const table = nosql.table(t);
                // We have to call an API to load the details first? Actually, toJSON() might be synchronous if loaded.
                // There is no table.getDetails() in the d.ts except maybe it's loaded automatically?
                // Let's just try to call a dummy query and catch error to see if it loads
                try {
                    await table.queryTable({});
                }
                catch (e) { }
                result[t] = typeof table.toJSON === 'function' ? table.toJSON() : 'no toJSON';
            }
            catch (e) {
                result[t] = e.message;
            }
        }
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.getCloudscaleIndexes = getCloudscaleIndexes;
