"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const RepositoryFactory_1 = require("../repositories/RepositoryFactory");
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
// Dynamic mapping of legacy RankID to modern RBAC SystemRoles
const mapLegacyRankToRole = (rankId) => {
    switch (rankId) {
        case 1: // Constable
            return { SystemRole: 'FIELD_OFFICER', RankString: 'PC', Scope: 'station' };
        case 2: // Head Constable
            return { SystemRole: 'WRITER', RankString: 'HC', Scope: 'station' };
        case 3: // ASI
            return { SystemRole: 'IO', RankString: 'ASI', Scope: 'station' };
        case 4: // SI
            return { SystemRole: 'IO', RankString: 'PSI/SI', Scope: 'station' };
        case 5: // Inspector
            return { SystemRole: 'SHO', RankString: 'PI', Scope: 'station' };
        case 6: // DySP
            return { SystemRole: 'ADMIN_COMMAND', RankString: 'ASP/DySP', Scope: 'range' };
        case 7: // SP
            return { SystemRole: 'ADMIN_COMMAND', RankString: 'SP/DCP', Scope: 'district' };
        case 8: // IGP
            return { SystemRole: 'ADMIN_COMMAND', RankString: 'IGP', Scope: 'statewide' };
        default:
            return { SystemRole: 'FIELD_OFFICER', RankString: 'Unknown', Scope: 'station' };
    }
};
const login = async (req, res) => {
    try {
        const { identifier, password, loginType } = req.body;
        // Hardcoded global admin fallback just in case
        if (loginType === 'admin' && identifier === 'admin@ksp.gov.in' && password === 'admin123') {
            const token = jsonwebtoken_1.default.sign({
                EmployeeID: 999999,
                KGID: 'ADMIN-001',
                SystemRole: 'ADMIN_COMMAND',
                RankString: 'SYSTEM_ADMIN',
                UnitID: 0,
                DistrictID: 0,
                Scope: 'statewide'
            }, JWT_SECRET, { expiresIn: '12h' });
            return res.json({ success: true, token, user: jsonwebtoken_1.default.decode(token) });
        }
        // In a real system, we'd query by identifier & hash-check password.
        // For demo, we just verify the user exists by EmployeeID or KGID.
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        const employees = await db.getEmployees();
        const emp = employees.find((e) => e.EmployeeID.toString() === identifier ||
            (e.KGID && e.KGID.toLowerCase() === identifier.toLowerCase()));
        if (!emp) {
            return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
        }
        if (emp.status === 'Suspended') {
            return res.status(403).json({ success: false, message: 'Account is suspended.' });
        }
        // Dynamic role resolution backward compatibility
        // If the database doesn't have SystemRole natively, derive it from RankID
        const mapped = mapLegacyRankToRole(emp.RankID);
        const SystemRole = emp.SystemRole || mapped.SystemRole;
        const RankString = emp.RankString || mapped.RankString;
        const Scope = emp.Scope || mapped.Scope;
        // Reject wrong login portal attempts
        if (loginType === 'admin' && SystemRole !== 'ADMIN_COMMAND') {
            return res.status(403).json({ success: false, message: 'Not authorized for Command Portal. Please use Officer Login.' });
        }
        // Sign Token
        const token = jsonwebtoken_1.default.sign({
            EmployeeID: emp.EmployeeID,
            KGID: emp.KGID,
            SystemRole,
            RankString,
            UnitID: emp.UnitID,
            DistrictID: emp.DistrictID,
            Scope,
            FirstName: emp.FirstName,
            email: emp.email
        }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ success: true, token, user: jsonwebtoken_1.default.decode(token) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    // If the request made it here, authMiddleware already populated req.user
    res.json({ success: true, user: req.user });
};
exports.getMe = getMe;
