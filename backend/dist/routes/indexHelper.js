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
        const { NoSQLMarshall, NoSQLEnum } = require('zcatalyst-sdk-node/lib/no-sql');
        try {
            const result = await table.queryTable({
                key_condition: {
                    attribute: ['CaseMasterID'],
                    operator: NoSQLEnum.NoSQLOperator.IN,
                    value: [NoSQLMarshall.makeNumber(100001), NoSQLMarshall.makeNumber(100002)]
                }
            });
            const arr = typeof result.toJSON === 'function' ? result.toJSON() : result;
            res.json({ success: true, count: Array.isArray(arr) ? arr.length : (arr.data ? arr.data.length : null) });
        }
        catch (e) {
            res.json({ success: false, message: e.message, code: e.code });
        }
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
exports.default = router;
