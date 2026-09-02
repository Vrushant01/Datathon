"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
const authMiddleware_2 = require("../middleware/authMiddleware");
router.use(authMiddleware_1.authMiddleware);
router.use((0, authMiddleware_2.requireRole)('Admin'));
router.post('/migrate-to-nosql', adminController_1.startMigration);
// router.post('/migrate-to-cloudscale', startCloudScaleMigration);
router.get('/migration-status', adminController_1.getMigrationStatus);
exports.default = router;
