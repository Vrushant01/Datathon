"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const hotspotController_1 = require("../controllers/hotspotController");
const router = express_1.default.Router();
router.get('/', hotspotController_1.getHotspots);
exports.default = router;
