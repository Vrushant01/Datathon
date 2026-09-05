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
        const table = nosql.table('casemasters');
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        // The new cases started at 300001
        const ids = [300001, 300002, 300003, 300004, 300005];
        const keys = ids.map(v => new NoSQLItem().addNumber('CaseMasterID', v));
        const resp = await table.fetchItem({ keys });
        const raw = resp;
        const items = (raw.get || []).map((d) => {
            const item = d.item;
            if (!item)
                return null;
            return typeof item.toJSON === 'function' ? item.toJSON() : item;
        }).filter(Boolean);
        res.json({ success: true, count: items.length, items });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message, stack: e.stack });
    }
});
exports.default = router;
