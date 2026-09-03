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
        const table = nosql.table('auditlogs');
        const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        const { NoSQLOperator } = NoSQLEnum;
        const timestamp = new Date().toISOString();
        const logId = `${Date.now()}-test`;
        // 1. Insert a log
        const item = new NoSQLItem();
        item.addString('AuditLogID', logId);
        item.addString('Timestamp', timestamp);
        item.addString('LogGroup', 'ALL');
        item.addString('ActorID', 'System');
        item.addString('Action', 'TEST');
        item.addString('Description', 'Testing index');
        let inserted = false;
        try {
            await table.insertItems({ item });
            inserted = true;
        }
        catch (e) {
            return res.json({ success: false, step: 'insert', error: e.message });
        }
        let queryRes;
        let tableDetails;
        let realTable;
        try {
            tableDetails = await nosql.getTable('auditlogs');
            const detailsJson = tableDetails.toJSON ? tableDetails.toJSON() : tableDetails;
            const index = detailsJson.global_index?.find((idx) => idx.name === 'LogGroupIndex' || idx.id === 'LogGroupIndex')
                || detailsJson.local_index?.find((idx) => idx.name === 'LogGroupIndex' || idx.id === 'LogGroupIndex');
            realTable = nosql.table(detailsJson);
            const indexIdToUse = index ? index.id : 'LogGroupIndex';
            const query = {
                key_condition: {
                    attribute: ['LogGroup'],
                    operator: NoSQLOperator.EQUALS,
                    value: NoSQLMarshall.makeString('ALL')
                },
                forward_scan: false,
                limit: 5
            };
            queryRes = await realTable.queryIndex(indexIdToUse, query);
        }
        catch (e) {
            return res.json({ success: false, step: 'queryIndex', error: e.message, tableDetails });
        }
        res.json({
            success: true,
            insertedLogId: logId,
            indexQuery: queryRes
        });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message, stack: e.stack });
    }
});
exports.default = router;
