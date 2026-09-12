import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { RepositoryFactory } from '../repositories/RepositoryFactory';

const router = express.Router();

// GET /api/network/search?query=...
router.get('/search', requireAuth, async (req, res) => {
  try {
    const query = (req.query.query as string || '').toLowerCase();
    const db = RepositoryFactory.getRepository(req);
    const allCases = await db.getCases({});
    
    // Filter cases based on CaseNo, CrimeNo, BriefFacts
    let matched = allCases;
    if (query) {
        matched = allCases.filter((c: any) => {
            return (
                (c.CaseNo && String(c.CaseNo).toLowerCase().includes(query)) ||
                (c.CrimeNo && String(c.CrimeNo).toLowerCase().includes(query)) ||
                (c.BriefFacts && String(c.BriefFacts).toLowerCase().includes(query))
            );
        });
    }

    // Limit to 30 cases
    matched = matched.slice(0, 30);
    
    // Format response
    const formatted = matched.map((c: any) => ({
        CaseMasterID: c.CaseMasterID,
        CaseNo: c.CaseNo,
        CrimeNo: c.CrimeNo,
        CrimeRegisteredDate: c.CrimeRegisteredDate,
        BriefFacts: c.BriefFacts,
        PolicePersonID: c.PolicePersonID,
        PoliceStationID: c.PoliceStationID
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('Network search error:', error);
    res.status(500).json({ error: 'Failed to search cases', details: error.message });
  }
});

// GET /api/network/cases/:caseId/graph
router.get('/cases/:caseId/graph', requireAuth, async (req, res) => {
    try {
        const caseId = Number(req.params.caseId);
        const db = RepositoryFactory.getRepository(req);

        // Fetch core components
        const mainCase = await db.getCaseById(caseId);
        if (!mainCase) {
            return res.status(404).json({ error: 'Case not found' });
        }

        const accusedList = await db.getAccusedByCase(caseId);
        const victimsList = await db.getVictimsByCase(caseId);
        const customEdges = await db.getCustomEdgesByCase(caseId);
        
        // Let's resolve the unit and officer
        const employees = await db.getEmployees();
        const units = await db.getUnits();
        
        const officer = employees.find((e: any) => Number(e.EmployeeID) === Number(mainCase.PolicePersonID));
        const station = units.find((u: any) => Number(u.UnitID) === Number(mainCase.PoliceStationID));

        const nodes: any[] = [];
        const edges: any[] = [];
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
        accusedList.forEach((acc: any) => {
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
        victimsList.forEach((vic: any) => {
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
        customEdges.forEach((ce: any) => {
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

        res.json({
            case: mainCase,
            nodes,
            edges
        });

    } catch (error: any) {
        console.error('Network trace error:', error);
        res.status(500).json({ error: 'Failed to trace FIR', details: error.message });
    }
});

export default router;
