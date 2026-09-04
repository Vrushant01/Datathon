"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zcatalyst_sdk_node_1 = __importDefault(require("zcatalyst-sdk-node"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
const removeEmptyValues = (obj) => {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null && v !== ''));
};
router.get('/', async (req, res) => {
    try {
        const app = zcatalyst_sdk_node_1.default.initialize(req);
        const nosql = app.nosql();
        // Read the newly generated cases
        const seedPath = path_1.default.join(__dirname, '../../data/new_cases_to_seed.json');
        if (!fs_1.default.existsSync(seedPath)) {
            return res.status(404).json({ success: false, error: 'Seed file not found' });
        }
        const seed = JSON.parse(fs_1.default.readFileSync(seedPath, 'utf8'));
        const insertBatch = async (table, records) => {
            let count = 0;
            const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
            for (let i = 0; i < records.length; i += 25) {
                const batch = records.slice(i, i + 25).map(r => ({ item: NoSQLItem.from(removeEmptyValues(r)) }));
                await table.insertItems(...batch);
                count += batch.length;
            }
            return count;
        };
        const results = [];
        results.push(await insertBatch(nosql.table('casemasters'), seed.cases));
        results.push(await insertBatch(nosql.table('accuseds'), seed.accused));
        results.push(await insertBatch(nosql.table('victims'), seed.victims));
        results.push(await insertBatch(nosql.table('complainants'), seed.complainants));
        results.push(await insertBatch(nosql.table('actsectionassociations'), seed.acts));
        res.json({ success: true, message: 'New cases seeded successfully', results });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
exports.default = router;
