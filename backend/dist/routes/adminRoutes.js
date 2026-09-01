"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
// router.use(adminJwtMiddleware);
router.post('/migrate-to-nosql', adminController_1.startMigration);
// router.post('/migrate-to-cloudscale', startCloudScaleMigration);
router.get('/migration-status', adminController_1.getMigrationStatus);
exports.default = router;
