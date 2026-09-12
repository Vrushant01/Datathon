"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const RepositoryFactory_1 = require("../repositories/RepositoryFactory");
const sseService_1 = require("../services/sseService");
const router = express_1.default.Router();
// GET /api/network/search?query=...
router.get('/search', authMiddleware_1.requireAuth, async (req, res) => {
    try {
        const query = (req.query.query || '').toLowerCase();
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        const allCases = await db.getCases({});
        // Filter cases based on CaseNo, CrimeNo, BriefFacts
        let matched = allCases;
        if (query) {
            matched = allCases.filter((c) => {
                return ((c.CaseNo && String(c.CaseNo).toLowerCase().includes(query)) ||
                    (c.CrimeNo && String(c.CrimeNo).toLowerCase().includes(query)) ||
                    (c.BriefFacts && String(c.BriefFacts).toLowerCase().includes(query)));
            });
        }
        // Limit to 30 cases
        matched = matched.slice(0, 30);
        // Format response
        const formatted = matched.map((c) => ({
            CaseMasterID: c.CaseMasterID,
            CaseNo: c.CaseNo,
            CrimeNo: c.CrimeNo,
            CrimeRegisteredDate: c.CrimeRegisteredDate,
            BriefFacts: c.BriefFacts,
            PolicePersonID: c.PolicePersonID,
            PoliceStationID: c.PoliceStationID
        }));
        res.json(formatted);
    }
    catch (error) {
        console.error('Network search error:', error);
        res.status(500).json({ error: 'Failed to search cases', details: error.message });
    }
});
// GET /api/network/cases/:caseId/graph
router.get('/cases/:caseId/graph', authMiddleware_1.requireAuth, async (req, res) => {
    try {
        const caseId = Number(req.params.caseId);
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        // Fetch core components
        const mainCase = await db.getCaseById(caseId);
        if (!mainCase) {
            return res.status(404).json({ error: 'Case not found' });
        }
        const accusedList = await db.getAccusedByCase(caseId);
        const victimsList = await db.getVictimsByCase(caseId);
        const customEdges = await db.getCustomEdgesByCase(caseId);
        const caseEntities = await db.getCaseEntities(caseId);
        // Let's resolve the unit and officer
        const employees = await db.getEmployees();
        const units = await db.getUnits();
        const officer = employees.find((e) => Number(e.EmployeeID) === Number(mainCase.PolicePersonID));
        const station = units.find((u) => Number(u.UnitID) === Number(mainCase.PoliceStationID));
        const nodes = [];
        const edges = [];
        const centerX = 400;
        const centerY = 300;
        // 1. Center Node (FIR)
        nodes.push({
            id: `fir:${mainCase.CaseMasterID}`,
            type: 'custom',
            position: { x: centerX, y: centerY },
            data: {
                label: `FIR #${mainCase.CaseNo}`,
                color: '#3B82F6',
                symbol: 'FIR',
                type: 'case',
                rawData: mainCase
            }
        });
        let currentAngle = 0;
        const angleStep = Math.PI / 4;
        let radius = 250;
        const getPos = () => {
            const x = centerX + Math.cos(currentAngle) * radius;
            const y = centerY + Math.sin(currentAngle) * radius;
            currentAngle += angleStep;
            return { x, y };
        };
        // 2. Accused Nodes
        accusedList.forEach((acc) => {
            const nodeId = `accused:${acc.AccusedMasterID || acc.AccusedName}`;
            nodes.push({
                id: nodeId,
                type: 'custom',
                position: getPos(),
                data: {
                    label: `${acc.AccusedName} (Age: ${acc.AgeYear || '?'})`,
                    color: '#6366F1',
                    symbol: 'A',
                    type: 'accused',
                    rawData: {
                        name: acc.AccusedName,
                        AccusedMasterID: acc.AccusedMasterID,
                        age: acc.AgeYear || 'Unknown',
                        gender: acc.GenderID === 1 ? 'Male' : (acc.GenderID === 2 ? 'Female' : 'Other')
                    }
                }
            });
            edges.push({
                id: `e-fir-${mainCase.CaseMasterID}-${nodeId}`,
                source: `fir:${mainCase.CaseMasterID}`,
                target: nodeId,
                type: 'straight',
                label: 'Offender',
                animated: true,
                style: { stroke: '#94A3B8', strokeWidth: 1.5 },
                labelStyle: { fill: '#94A3B8', fontWeight: 700, fontSize: 11 },
                labelBgStyle: { fill: '#0f172a' }
            });
        });
        // 3. Victim Nodes
        victimsList.forEach((vic) => {
            const nodeId = `victim:${vic.VictimMasterID || vic.VictimName}`;
            nodes.push({
                id: nodeId,
                type: 'custom',
                position: getPos(),
                data: {
                    label: `${vic.VictimName} (Age: ${vic.AgeYear || '?'})`,
                    color: '#EC4899',
                    symbol: 'V',
                    type: 'victim',
                    rawData: {
                        name: vic.VictimName,
                        VictimMasterID: vic.VictimMasterID,
                        age: vic.AgeYear || 'Unknown',
                        gender: vic.GenderID === 1 ? 'Male' : (vic.GenderID === 2 ? 'Female' : 'Other')
                    }
                }
            });
            edges.push({
                id: `e-fir-${mainCase.CaseMasterID}-${nodeId}`,
                source: nodeId,
                target: `fir:${mainCase.CaseMasterID}`,
                type: 'straight',
                label: 'Victim',
                animated: true,
                style: { stroke: '#EC4899', strokeWidth: 1.5 },
                labelStyle: { fill: '#EC4899', fontWeight: 700, fontSize: 11 },
                labelBgStyle: { fill: '#0f172a' }
            });
        });
        // 4. Station Node
        if (station) {
            const nodeId = `station:${station.UnitID}`;
            nodes.push({
                id: nodeId,
                type: 'custom',
                position: getPos(),
                data: {
                    label: station.UnitName,
                    color: '#EAB308', // Gold
                    symbol: 'PS',
                    type: 'Location',
                    rawData: {
                        description: `Police Station Jurisdiction: ${station.UnitName}`,
                        UnitID: station.UnitID
                    }
                }
            });
            edges.push({
                id: `e-fir-${mainCase.CaseMasterID}-${nodeId}`,
                source: `fir:${mainCase.CaseMasterID}`,
                target: nodeId,
                type: 'straight',
                label: 'Registered At',
                animated: true,
                style: { stroke: '#EAB308', strokeWidth: 1.5, opacity: 0.6 },
                labelStyle: { fill: '#94A3B8', fontWeight: 700, fontSize: 11 },
                labelBgStyle: { fill: '#0f172a' }
            });
        }
        // 5. Officer Node
        if (officer) {
            const nodeId = `officer:${officer.EmployeeID}`;
            nodes.push({
                id: nodeId,
                type: 'custom',
                position: getPos(),
                data: {
                    label: officer.FirstName,
                    color: '#06B6D4', // Cyan
                    symbol: 'IO',
                    type: 'officer',
                    rawData: {
                        description: `Investigating Officer: ${officer.FirstName} (${officer.KGID})`,
                        EmployeeID: officer.EmployeeID
                    }
                }
            });
            edges.push({
                id: `e-fir-${mainCase.CaseMasterID}-${nodeId}`,
                source: `fir:${mainCase.CaseMasterID}`,
                target: nodeId,
                type: 'straight',
                label: 'Investigated By',
                animated: true,
                style: { stroke: '#06B6D4', strokeWidth: 1.5, opacity: 0.6 },
                labelStyle: { fill: '#94A3B8', fontWeight: 700, fontSize: 11 },
                labelBgStyle: { fill: '#0f172a' }
            });
        }
        // 6. Custom Edges
        customEdges.forEach((ce) => {
            edges.push({
                id: ce.EdgeID,
                source: ce.source,
                target: ce.target,
                type: 'straight',
                label: ce.label || 'Linked',
                animated: true,
                style: { stroke: '#eab308', strokeWidth: 2, strokeDasharray: '5, 5' },
                labelStyle: { fill: '#eab308', fontWeight: 700, fontSize: 11 },
                labelBgStyle: { fill: '#0f172a' }
            });
        });
        // 7. Case Entities
        caseEntities.forEach((ent) => {
            const entityNodeId = `entity-${ent.EntityID}`;
            const getNodeColor = (type) => {
                if (type === 'Vehicle')
                    return '#F97316';
                if (type === 'Phone')
                    return '#06B6D4';
                if (type === 'Bank')
                    return '#EAB308';
                if (type === 'Location')
                    return '#84CC16';
                if (type === 'Weapon')
                    return '#EF4444';
                return '#10B981';
            };
            const getNodeSymbol = (type) => {
                if (type === 'Vehicle')
                    return 'VEH';
                if (type === 'Phone')
                    return 'TEL';
                if (type === 'Bank')
                    return 'BNK';
                if (type === 'Location')
                    return 'LOC';
                if (type === 'Weapon')
                    return 'WEP';
                return 'EVI';
            };
            nodes.push({
                id: entityNodeId,
                type: 'custom',
                position: getPos(),
                data: {
                    label: ent.value,
                    color: getNodeColor(ent.type),
                    symbol: getNodeSymbol(ent.type),
                    type: ent.type,
                    rawData: ent
                }
            });
            let relationLabel = 'Associated';
            if (ent.type === 'Vehicle')
                relationLabel = 'Transported In';
            if (ent.type === 'Phone')
                relationLabel = 'Calls From';
            if (ent.type === 'Bank')
                relationLabel = 'Wire Transfer';
            if (ent.type === 'Location')
                relationLabel = 'Frequents';
            if (ent.type === 'Weapon')
                relationLabel = 'Used In Crime';
            if (ent.type === 'Evidence')
                relationLabel = 'Seized';
            edges.push({
                id: `e-case-${mainCase.CaseMasterID}-${entityNodeId}`,
                source: `fir:${mainCase.CaseMasterID}`,
                target: entityNodeId,
                type: 'straight',
                label: relationLabel,
                animated: true,
                style: { stroke: getNodeColor(ent.type), strokeWidth: 1.5, opacity: 0.6 },
                labelStyle: { fill: '#94A3B8', fontWeight: 700, fontSize: 11 },
                labelBgStyle: { fill: '#0f172a' }
            });
        });
        res.json({
            case: mainCase,
            nodes,
            edges
        });
    }
    catch (error) {
        console.error('Network trace error:', error);
        res.status(500).json({ error: 'Failed to trace FIR', details: error.message });
    }
});
exports.default = router;
// ADD POST ROUTES FOR ENTITIES AND EDGES
router.post('/cases/:caseId/entities', authMiddleware_1.requireAuth, async (req, res) => {
    try {
        const caseId = Number(req.params.caseId);
        const { type, value, description } = req.body;
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        const userEmail = req.user?.email || 'system';
        const newEntity = await db.addCaseEntity(type, {
            EntityID: Date.now(),
            CaseMasterID: caseId,
            type,
            value,
            description
        }, userEmail);
        sseService_1.sseService.broadcast('CASE_ENTITY_CREATED', newEntity);
        res.json(newEntity);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/cases/:caseId/edges', authMiddleware_1.requireAuth, async (req, res) => {
    try {
        const caseId = Number(req.params.caseId);
        const { source, target, label } = req.body;
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        const userEmail = req.user?.email || 'system';
        const crypto = require('crypto');
        const newEdge = await db.addCustomEdge({
            EdgeID: crypto.randomUUID(),
            CaseMasterID: caseId,
            source,
            target,
            label
        }, userEmail);
        sseService_1.sseService.broadcast('CASE_EDGE_CREATED', newEdge);
        res.json(newEdge);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.delete('/cases/:caseId/entities/:entityId', authMiddleware_1.requireAuth, async (req, res) => {
    try {
        const caseId = Number(req.params.caseId);
        const entityId = req.params.entityId;
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        const userEmail = req.user?.email || 'system';
        await db.deleteCaseEntity(caseId, entityId, userEmail);
        sseService_1.sseService.broadcast('CASE_ENTITY_DELETED', { CaseMasterID: caseId, id: entityId });
        res.json({ success: true, id: entityId });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.put('/cases/:caseId/entities/:entityId', authMiddleware_1.requireAuth, async (req, res) => {
    try {
        const caseId = Number(req.params.caseId);
        const entityId = req.params.entityId;
        const { type, value, description } = req.body;
        const db = RepositoryFactory_1.RepositoryFactory.getRepository(req);
        const userEmail = req.user?.email || 'system';
        const updatedEntity = await db.updateCaseEntity(entityId, type, value, description, userEmail);
        sseService_1.sseService.broadcast('CASE_ENTITY_UPDATED', { CaseMasterID: caseId, ...updatedEntity });
        res.json(updatedEntity);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
