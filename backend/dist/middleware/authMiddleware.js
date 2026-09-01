"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceStationScope = exports.requirePermission = exports.requireRole = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
    }
};
exports.requireAuth = requireAuth;
const requireRole = (roles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!roles.includes(user.SystemRole)) {
            return res.status(403).json({ error: `Forbidden: Requires one of roles: ${roles.join(', ')}` });
        }
        next();
    };
};
exports.requireRole = requireRole;
const requirePermission = (permission) => {
    // We can evaluate dynamic matrix based on scope/role here if needed
    return (req, res, next) => {
        // For now, handled primarily by role + scope checks
        next();
    };
};
exports.requirePermission = requirePermission;
// Scope Validation Middleware
const enforceStationScope = (stationIdParam) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Unauthorized' });
        if (user.SystemRole === 'ADMIN_COMMAND') {
            // Command users can access based on scope. Assuming District for now.
            // More complex lookup would check if station belongs to their district.
            next();
        }
        else {
            // Station level roles MUST match UnitID
            const requestedStationId = Number(req.params[stationIdParam]);
            if (user.UnitID !== requestedStationId) {
                return res.status(403).json({ error: 'Forbidden: Outside of assigned station scope' });
            }
            next();
        }
    };
};
exports.enforceStationScope = enforceStationScope;
