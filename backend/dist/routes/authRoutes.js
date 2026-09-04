"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.generateAccessToken = void 0;
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const RepositoryFactory_1 = require("../repositories/RepositoryFactory");
const router = express_1.default.Router();
// Accept both JSON and URL-encoded form bodies (form-encoded avoids CORS preflight via ZGS)
router.use(express_1.default.json());
router.use(express_1.default.urlencoded({ extended: false }));
// ── Token secrets ────────────────────────────────────────────────────────────
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-demo';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret-for-demo';
// Access token: short-lived (1 hour)
const generateAccessToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
};
exports.generateAccessToken = generateAccessToken;
// Keep old name as alias so any other internal callers still work
exports.generateToken = exports.generateAccessToken;
const refreshTokenStore = new Map();
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
function issueRefreshToken(payload) {
    const token = crypto_1.default.randomBytes(40).toString('hex');
    refreshTokenStore.set(token, {
        payload,
        expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
    });
    return token;
}
function consumeRefreshToken(token) {
    const entry = refreshTokenStore.get(token);
    if (!entry)
        return null;
    if (Date.now() > entry.expiresAt) {
        refreshTokenStore.delete(token);
        return null;
    }
    // Rotate: delete old token (one-time use), caller will issue a new one
    refreshTokenStore.delete(token);
    return entry.payload;
}
// ── Cookie helpers ────────────────────────────────────────────────────────────
const COOKIE_NAME = 'ksp_rt';
function setRefreshCookie(res, token) {
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: true, // HTTPS-only (Catalyst AppSail is always HTTPS)
        sameSite: 'none', // Cross-subdomain (frontend ≠ backend domain)
        maxAge: REFRESH_TOKEN_TTL_MS,
        path: '/',
    });
}
function clearRefreshCookie(res) {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
    });
}
// ── Shared login helper ───────────────────────────────────────────────────────
function loginResponse(res, userPayload, message) {
    const accessToken = (0, exports.generateAccessToken)(userPayload);
    const refreshToken = issueRefreshToken(userPayload);
    setRefreshCookie(res, refreshToken);
    return res.json({ success: true, token: accessToken, user: userPayload, message });
}
// ── Routes ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { idOrEmail, passcode, loginType } = req.body;
        if (loginType === 'admin') {
            if ((idOrEmail.toLowerCase() === 'admin@ksp.gov.in' || idOrEmail.toLowerCase() === 'admin') &&
                passcode === 'admin123') {
                const adminUser = {
                    email: 'admin@ksp.gov.in',
                    role: 'Admin',
                    firstName: 'Administrator KSP'
                };
                return loginResponse(res, adminUser, 'Admin authenticated successfully');
            }
            return res.status(401).json({ success: false, message: 'Invalid Admin credentials' });
        }
        else if (loginType === 'analytics') {
            const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
            const allUnits = await db.getUnits();
            const stations = allUnits.filter((u) => u.TypeID === 1);
            if (passcode !== 'analytics123') {
                return res.status(401).json({ success: false, message: 'Invalid Analytics passcode. Try "analytics123"' });
            }
            const targetStation = stations.find((s) => s.UnitID.toString() === idOrEmail ||
                s.UnitName.toLowerCase().includes(idOrEmail.toLowerCase().replace('analytics_', '').replace('_analytics', '')));
            if (!targetStation) {
                return res.status(401).json({ success: false, message: 'Station not found for analytics access.' });
            }
            const districts = await db.getDistricts();
            const district = districts.find((d) => d.DistrictID === targetStation.DistrictID)?.DistrictName || 'Unknown District';
            const analyticsUser = {
                email: `analytics_${targetStation.UnitID}@ksp.gov.in`,
                role: 'Analytics',
                firstName: 'Station Analytics',
                stationName: targetStation.UnitName,
                districtName: district,
                unitId: targetStation.UnitID
            };
            return loginResponse(res, analyticsUser, 'Analytics portal authenticated successfully');
        }
        else {
            // Officer
            const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
            const employees = await db.getEmployees();
            const emp = employees.find((e) => e.EmployeeID.toString() === idOrEmail || (e.KGID && e.KGID.toLowerCase() === idOrEmail.toLowerCase()));
            if (!emp) {
                return res.status(401).json({ success: false, message: 'Employee ID or KGID not found' });
            }
            if (emp.status === 'Suspended') {
                return res.status(403).json({ success: false, message: 'This officer profile has been suspended. Contact Admin.' });
            }
            if (passcode === 'password' || passcode === 'ksp123') {
                const stations = await db.getUnits();
                const districts = await db.getDistricts();
                const station = stations.find((s) => s.UnitID === emp.UnitID)?.UnitName || 'Unknown Station';
                const district = districts.find((d) => d.DistrictID === emp.DistrictID)?.DistrictName || 'Unknown District';
                const officerUser = {
                    email: emp.email || `${emp.EmployeeID}@ksp.gov.in`,
                    role: 'Officer',
                    employeeId: emp.EmployeeID,
                    kgid: emp.KGID,
                    firstName: emp.FirstName,
                    stationName: station,
                    districtName: district
                };
                return loginResponse(res, officerUser, 'Officer authenticated successfully');
            }
            return res.status(401).json({ success: false, message: 'Invalid password. Try "password"' });
        }
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});
// ── POST /api/auth/refresh ────────────────────────────────────────────────────
// Silently issues a new access token using the httpOnly refresh cookie.
// Rotates the refresh token on success (one-time use).
router.post('/refresh', (req, res) => {
    const incomingRefreshToken = req.cookies?.[COOKIE_NAME];
    if (!incomingRefreshToken) {
        return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }
    const payload = consumeRefreshToken(incomingRefreshToken);
    if (!payload) {
        clearRefreshCookie(res);
        return res.status(401).json({ success: false, message: 'Refresh token expired or invalid. Please log in again.' });
    }
    // Strip JWT-internal fields (iat, exp) before re-signing
    const { iat, exp, ...userClaims } = payload;
    const newAccessToken = (0, exports.generateAccessToken)(userClaims);
    const newRefreshToken = issueRefreshToken(userClaims);
    setRefreshCookie(res, newRefreshToken);
    return res.json({ success: true, token: newAccessToken });
});
// ── POST /api/auth/logout ─────────────────────────────────────────────────────
// Invalidates the refresh token server-side and clears the cookie.
router.post('/logout', (req, res) => {
    const incomingRefreshToken = req.cookies?.[COOKIE_NAME];
    if (incomingRefreshToken) {
        refreshTokenStore.delete(incomingRefreshToken);
    }
    clearRefreshCookie(res);
    return res.json({ success: true, message: 'Logged out successfully' });
});
exports.default = router;
