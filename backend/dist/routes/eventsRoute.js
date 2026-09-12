"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const sseService_1 = require("../services/sseService");
const router = express_1.default.Router();
// The SSE endpoint where authenticated clients connect
router.get('/', authMiddleware_1.requireAuth, (req, res) => {
    sseService_1.sseService.connectClient(req, res);
});
exports.default = router;
