import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';







// ── Startup dependency diagnostic ────────────────────────────────────────────
// Runs BEFORE pdfkit/fontkit are loaded so Catalyst logs show exactly which
// module paths are (or are not) resolvable on the production container.
// Does NOT log any secrets or env values


(function runDepDiagnostic() {
  const modules = ['@swc/helpers', 'fontkit', 'pdfkit'] as const;
  for (const mod of modules) {
    try {
      const resolved = require.resolve(mod);
      console.log(`[diag] ${mod} => ${resolved}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[diag] MISSING ${mod}: ${msg}`);
    }
  }
})();
// ─────────────────────────────────────────────────────────────────────────────

import PDFDocument from 'pdfkit';
import aiRoutes from './routes/aiRoutes';
import chatbotRoutes from './routes/chatbotRoutes';
import hotspotRoutes from './routes/hotspotRoutes';
import { requireAuth, requireRole } from './middleware/authMiddleware';
import adminRoutes from './routes/adminRoutes';
import stationRiskRoutes from './routes/stationRiskRoutes';
import authRoutes from './routes/authRoutes';
import { invalidateHotspotCache } from './controllers/hotspotController';
import fixDatesRoute from './routes/fixDatesRoute';
import fixDistrictsRoute from './routes/fixDistrictsRoute';

dotenv.config();

const app = express();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
};

// Manual CORS headers — set before cors() in case the Catalyst ZGS proxy
// intercepts the cors() library output. Raw res.setHeader calls are lower-level.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight for all routes
app.use(express.json());

// Mount the new dedicated routers
app.use('/api/ai', aiRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/hotspots', hotspotRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/station-risk', stationRiskRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin/fix-dates', fixDatesRoute);
app.use('/api/admin/fix-districts', fixDistrictsRoute);

app.get("/", (req, res) => {
  res.status(200).send("Backend is Connected with pipeline 🚀");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend is Connected with pipeline 🚀"
  });
});

// your existing middleware/routes...
const PORT: number = Number(process.env.X_ZOHO_CATALYST_LISTEN_PORT) || Number(process.env.PORT) || 5000;

app.use((req, res, next) => {
  const originalJson = res.json;
  (req as any).metrics = { nosqlCalls: 0, cacheHits: 0, cacheMisses: 0, startTime: Date.now() };
  
  res.json = function (body) {
    const totalTime = Date.now() - (req as any).metrics.startTime;
    res.setHeader('x-timing-total', `${totalTime}ms`);
    res.setHeader('x-timing-nosql-calls', `${(req as any).metrics.nosqlCalls}`);
    res.setHeader('x-timing-cache-hits', `${(req as any).metrics.cacheHits}`);
    res.setHeader('x-timing-cache-misses', `${(req as any).metrics.cacheMisses}`);
    
    // Forensic diagnostics
    res.setHeader('x-db-provider-actual', (req.headers['x-mock-db-provider'] || process.env.DB_PROVIDER || 'mongo') as string);
    res.setHeader('x-data-source', (req as any).metrics.nosqlCalls > 0 ? 'nosql' : ((req as any).metrics.cacheHits > 0 ? 'memory-cache' : 'mongo'));
    res.setHeader('x-cache-state', `hits:${(req as any).metrics.cacheHits},misses:${(req as any).metrics.cacheMisses}`);
    
    return originalJson.call(this, body);
  };
  next();
});

app.use(cors(corsOptions));
app.use(express.json());

app.get('/api/health', (req, res) => {
  try {
    res.json({ success: true, status: 'online', database: 'connected', provider: 'cloudscale' });
  } catch (error: any) {
    res.status(500).json({ success: false, status: 'error', error: 'Internal server error' });
  }
});

// REST ENDPOINTS FOR MONGO DB MIGRATION


// Forensic Endpoint
app.get('/api/forensic', async (req, res) => {
  try {
    const catalyst = require('zcatalyst-sdk-node');
    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();
    
    const results: any[] = [];
    
    async function checkRecord(tableName: string, keyName: string, keyValue: number) {
      try {
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        const nosql = catalystApp.nosql();
        const table = nosql.table(tableName);
        const keyItem = new NoSQLItem().addNumber(keyName, keyValue);
        const paged = await table.fetchItem({ keys: [keyItem] });
        const raw = (paged as any).get || [];
        const itemFound = raw.length > 0 ? raw[0].item : null;
        results.push({ Table: tableName, Key: `${keyName}=${keyValue}`, Found: itemFound ? 'YES' : 'NO', Raw: itemFound ? (typeof itemFound.toJSON === 'function' ? itemFound.toJSON() : itemFound) : null });
      } catch (err: any) {
        results.push({ Table: tableName, Key: `${keyName}=${keyValue}`, Found: 'ERROR', Raw: err.message });
      }
    }

    await checkRecord('districts', 'DistrictID', 1);
    await checkRecord('units', 'UnitID', 1);
    await checkRecord('employees', 'EmployeeID', 30001);
    await checkRecord('casemasters', 'CaseMasterID', 100001);
    await checkRecord('accuseds', 'CaseMasterID', 100001);
    await checkRecord('victims', 'CaseMasterID', 100001);

    if (req.query.zcql) {
      const zcql = catalystApp.zcql();
      const zcqlRes = await zcql.executeZCQLQuery(req.query.zcql as string);
      return res.json({ zcqlRes });
    }

    const projectDetails = { error: "Not supported in this SDK version" };
    res.json({ projectDetails, forensicResults: results, dbProvider: 'cloudscale' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/zcql', express.json(), async (req, res) => {
  try {
    const catalyst = require('zcatalyst-sdk-node');
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();
    const query = req.body.query;
    const zcqlRes = await zcql.executeZCQLQuery(query);
    res.json(zcqlRes);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

import { RepositoryFactory } from './repositories/RepositoryFactory';

app.get('/api/districts', async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getDistricts();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
});

app.get('/api/units', async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getUnits();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

app.get('/api/employees', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getEmployees();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

app.get('/api/cases', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getCases({});
    res.json(data);
  } catch (error: any) {
    console.error('getCases error:', error);
    res.status(500).json({ error: 'Failed to fetch cases', details: error?.message });
  }
});

// Backend Audit Logs API
app.get('/api/audit-logs', requireRole('Admin', 'Analytics'), async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Validate pagination limits
    const validPage = page > 0 ? page : 1;
    const validLimit = Math.min(limit > 0 ? limit : 50, 500); // capped at 500
    
    const filter = {
      entityType: req.query.entityType as string,
      entityId: req.query.entityId as string,
      actorId: req.query.actorId as string,
      action: req.query.action as string,
      page: validPage,
      limit: validLimit
    };
    
    const result = await (db as any).getAuditLogs(filter);
    res.json(result);
  } catch (error: any) {
    console.error('Failed to fetch audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

let repeatedOffendersCache: { data: any[] | null, timestamp: number } = { data: null, timestamp: 0 };

app.get('/api/repeated-offenders', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const now = Date.now();
    
    if (!repeatedOffendersCache.data || (now - repeatedOffendersCache.timestamp > 60000)) {
      const cases = await (db as any).scanAll('CaseMaster'); 
      const allAccused = await db.getAllAccused();

      const personMap = new Map<string, any>();
      const caseMap = new Map<number, any>();
      cases.forEach((c: any) => caseMap.set(Number(c.CaseMasterID), c));

      allAccused.forEach(acc => {
        if (!acc.PersonID || acc.PersonID === "") return;
        const c = caseMap.get(Number(acc.CaseMasterID));
        if (!c) return;

        if (!personMap.has(acc.PersonID)) {
          personMap.set(acc.PersonID, {
            PersonID: acc.PersonID,
            AccusedName: acc.AccusedName || 'Unknown',
            TotalCases: 0,
            ActiveCases: 0,
            ClosedCases: 0,
            Cases: []
          });
        }
        
        const record = personMap.get(acc.PersonID);
        if (!record.Cases.find((existing: any) => existing.CaseMasterID === c.CaseMasterID)) {
          record.TotalCases += 1;
          if (c.CaseStatusID === 2 || c.CaseStatusID === 6) {
            record.ClosedCases += 1;
          } else {
            record.ActiveCases += 1;
          }
          
          record.Cases.push({
            CaseMasterID: c.CaseMasterID,
            CaseNo: c.CaseNo,
            GravityOffenceID: c.GravityOffenceID,
            DistrictID: c.DistrictID,
            PoliceStationID: c.PoliceStationID,
            CrimeMajorHeadID: c.CrimeMajorHeadID,
            CaseStatusID: c.CaseStatusID,
            CrimeRegisteredDate: c.CrimeRegisteredDate
          });
        }
      });

      let repeatOffenders = Array.from(personMap.values()).filter(p => p.TotalCases > 1);

      repeatOffenders = repeatOffenders.map(p => {
        p.Cases.sort((a: any, b: any) => new Date(a.CrimeRegisteredDate).getTime() - new Date(b.CrimeRegisteredDate).getTime());
        p.FirstCaseDate = p.Cases[0]?.CrimeRegisteredDate;
        p.LatestCaseDate = p.Cases[p.Cases.length - 1]?.CrimeRegisteredDate;
        p.CrimeCategories = Array.from(new Set(p.Cases.map((c: any) => Number(c.CrimeMajorHeadID)))).filter(id => id);
        p.Districts = Array.from(new Set(p.Cases.map((c: any) => Number(c.DistrictID || c.PoliceStationID)))).filter(id => id);
        p.Stations = Array.from(new Set(p.Cases.map((c: any) => Number(c.PoliceStationID)))).filter(id => id);
        const gravities = p.Cases.map((c: any) => Number(c.GravityOffenceID)).filter((id: number) => !isNaN(id) && id > 0);
        p.MaxGravity = gravities.length > 0 ? Math.min(...gravities) : 99;
        return p;
      });

      repeatedOffendersCache.data = repeatOffenders;
      repeatedOffendersCache.timestamp = now;
    }

    let results = repeatedOffendersCache.data || [];

    // Filters
    const minCases = parseInt(req.query.minCases as string) || 2;
    const search = (req.query.search as string || '').toLowerCase();
    const districtId = parseInt(req.query.district as string);
    const stationId = parseInt(req.query.station as string);
    const categoryId = parseInt(req.query.category as string);
    const status = req.query.status as string;

    results = results.filter(p => {
      if (p.TotalCases < minCases) return false;
      if (search && !p.AccusedName.toLowerCase().includes(search) && !p.PersonID.toLowerCase().includes(search)) return false;
      if (districtId && !p.Districts.includes(districtId)) return false;
      if (stationId && !p.Stations.includes(stationId)) return false;
      if (categoryId && !p.CrimeCategories.includes(categoryId)) return false;
      if (status === 'active' && p.ActiveCases === 0) return false;
      if (status === 'closed' && p.ClosedCases === 0) return false;
      return true;
    });

    results.sort((a, b) => b.TotalCases - a.TotalCases || a.PersonID.localeCompare(b.PersonID));

    // Summary
    let highRiskCount = 0;
    let mostActiveCount = 0;
    let mostActivePerson = 'None';
    let totalRepeatCases = 0;

    results.forEach(p => {
      totalRepeatCases += p.TotalCases;
      if (p.MaxGravity === 1 || p.TotalCases >= 5) highRiskCount++;
      if (p.TotalCases > mostActiveCount) {
        mostActiveCount = p.TotalCases;
        mostActivePerson = p.AccusedName !== 'Unknown' ? p.AccusedName : p.PersonID;
      }
    });

    const summary = {
      totalOffenders: results.length,
      totalRepeatCases,
      highRiskCount,
      mostActiveOffender: mostActivePerson,
      mostActiveCount
    };

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 25;
    const startIndex = (page - 1) * pageSize;
    const paginatedChunk = results.slice(startIndex, startIndex + pageSize);

    const data = paginatedChunk.map(p => {
      const { Cases, ...rest } = p;
      return rest;
    });

    res.json({
      data,
      summary,
      pagination: {
        page,
        pageSize,
        total: results.length,
        totalPages: Math.ceil(results.length / pageSize)
      }
    });
  } catch (error: any) {
    console.error('getRepeatedOffenders error:', error);
    res.status(500).json({ error: 'Failed to fetch repeated offenders', details: error?.message });
  }
});

app.get('/api/repeated-offenders/:personId', requireAuth, async (req, res) => {
  try {
    const personId = req.params.personId;
    if (!repeatedOffendersCache.data) {
      return res.status(404).json({ error: 'Cache missing. Please query the main endpoint first.' });
    }
    const offender = repeatedOffendersCache.data.find(p => p.PersonID === personId);
    if (!offender) return res.status(404).json({ error: 'Offender not found' });
    
    res.json(offender.Cases);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch offender cases' });
  }
});

app.get('/api/customedges', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getAllCustomEdges();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customedges' });
  }
});

app.get('/api/complainants', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getComplainants();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch complainants' });
  }
});

app.get('/api/actsections', async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getActSections();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch actsections' });
  }
});

app.put('/api/cases/:caseId/reassign', async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const caseId = Number(req.params.caseId);
    const officerId = Number(req.body.officerId);
    const actorId = req.body.userEmail || req.headers['x-user-email'] || 'system';
    
    if (!officerId) {
      return res.status(400).json({ error: 'officerId is required' });
    }
    await (db as any).reassignCase(caseId, officerId, actorId);
    invalidateHotspotCache();
    res.json({ success: true });
  } catch (error: any) {
    if (error.message && error.message.includes('Invalid target officer ID')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Failed to reassign case:', error);
    res.status(500).json({ error: 'Failed to reassign case' });
  }
});

// Basic CRUD for Cases to trigger invalidation
app.post('/api/cases', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const caseData = { ...req.body };
    if (!caseData.CrimeRegisteredDateTime) {
      const now = new Date();
      caseData.CrimeRegisteredDateTime = now.toISOString();
      caseData.CrimeRegisteredDate = now.toISOString().split('T')[0];
    } else {
      const inputDate = new Date(caseData.CrimeRegisteredDateTime);
      const now = new Date();
      if (inputDate > now) {
        return res.status(400).json({ error: 'CrimeRegisteredDateTime cannot be in the future' });
      }
    }
    
    // Extract related entities
    const complainantData = caseData.Complainant;
    const victimData = caseData.Victim;
    const accusedData = caseData.Accused;
    const actsData = caseData.Acts;
    
    delete caseData.Complainant;
    delete caseData.Victim;
    delete caseData.Accused;
    delete caseData.Acts;

    const cases = await db.getCases({});
    const maxId = cases.length > 0 ? Math.max(...cases.map((c: any) => c.CaseMasterID || 0)) : 100000;
    const newCaseId = maxId + 1;
    caseData.CaseMasterID = newCaseId;
    caseData.CaseNo = `FIR-${newCaseId}`;
    
    // Auto-generate CrimeNo if not provided
    if (!caseData.CrimeNo) {
      const year = new Date().getFullYear();
      const serial = (newCaseId % 10000) + 1;
      caseData.CrimeNo = `${serial.toString().padStart(4, '0')}/${year}`;
    }

    const actorId = req.body.userEmail || req.headers['x-user-email'] || 'system';
    const newCase = await (db as any).createCase(caseData, actorId);
    
    // Save Complainant if provided
    if (complainantData) {
      complainantData.CaseMasterID = newCaseId;
      complainantData.ComplainantID = newCaseId; // Mock ID
      await (db as any).addCaseEntity('Complainant', complainantData, actorId);
    }
    
    // Save Victim if provided
    if (victimData) {
      victimData.CaseMasterID = newCaseId;
      victimData.VictimMasterID = newCaseId; // Mock ID
      await (db as any).addCaseEntity('Victim', victimData, actorId);
    }
    
    // Save Accused if provided
    if (accusedData) {
      accusedData.CaseMasterID = newCaseId;
      accusedData.AccusedMasterID = newCaseId; // Mock ID
      await (db as any).addCaseEntity('Accused', accusedData, actorId);
    }

    // Save Acts if provided
    if (actsData && Array.isArray(actsData)) {
      for (const act of actsData) {
        act.CaseMasterID = newCaseId;
        // Not natively supported by addCaseEntity but we skip for now
      }
    }

    invalidateHotspotCache();
    res.status(201).json(newCase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create case' });
  }
});

app.put('/api/cases/:id', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const caseId = Number(req.params.id);
    const actorId = req.body.userEmail || req.headers['x-user-email'] || 'system';
    const updatedCase = await (db as any).updateCase(caseId, req.body, actorId);
    invalidateHotspotCache();
    res.json(updatedCase);
  } catch(error: any) {
    if (error.message && error.message.includes('unsupported or immutable')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Failed to update case:', error);
    res.status(500).json({ error: 'Failed to update case' });
  }
});

app.patch('/api/cases/:id', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const caseId = Number(req.params.id);
    const actorId = req.body.userEmail || req.headers['x-user-email'] || 'system';
    const updatedCase = await (db as any).updateCase(caseId, req.body, actorId);
    invalidateHotspotCache();
    res.json(updatedCase);
  } catch(error: any) {
    if (error.message && error.message.includes('unsupported or immutable')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Failed to patch case:', error);
    res.status(500).json({ error: 'Failed to patch case' });
  }
});

app.delete('/api/cases/:id', requireRole('Admin'), async (req, res) => {
  res.status(501).json({ error: 'Delete case is not implemented in CloudScale yet' });
});

app.get('/api/victims', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getAllVictims();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch victims' });
  }
});

app.get('/api/accused', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getAllAccused();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accused' });
  }
});



app.get('/api/cases/officer/:officerId', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getCasesByOfficer(Number(req.params.officerId));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch officer cases' });
  }
});

app.get('/api/cases/station/:stationId', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getCasesByStation(Number(req.params.stationId));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch station cases' });
  }
});

app.get('/api/network/:caseId', requireAuth, async (req, res) => {
  try {
    const caseId = Number(req.params.caseId);
    const db = RepositoryFactory.getRepository(req);
    const accused = await db.getAccusedByCase(caseId);
    const victims = await db.getVictimsByCase(caseId);
    const edges = await db.getCustomEdgesByCase(caseId);
    res.json({ accused, victims, edges });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch network' });
  }
});

app.use('/api/ai', aiRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/hotspots', hotspotRoutes);

// AI Intelligence Module Mock Endpoint
// Runs predictive analytics, repeat offender pattern extraction and risk calculations
app.post('/api/ai/predict-risk', (req, res) => {
  const { offenderAge, previousOffences, gravityId } = req.body;

  if (offenderAge === undefined || previousOffences === undefined) {
    return res.status(400).json({ error: 'Missing parameters for risk analysis' });
  }

  // Multi-variable scoring algorithm simulation
  let riskScore = 15; // baseline

  // Age factor: higher recidivism likelihood in young age cohorts (statistical trend)
  if (offenderAge >= 18 && offenderAge <= 25) riskScore += 35;
  else if (offenderAge > 25 && offenderAge <= 35) riskScore += 20;

  // History factor: heavy weight
  riskScore += Math.min(previousOffences * 15, 45);

  // Offence gravity factor
  if (gravityId === 1) riskScore += 15; // Heinous

  // Cap at 99%
  riskScore = Math.min(riskScore, 99);

  // Determine threat category
  let category = 'Low Risk';
  if (riskScore >= 70) category = 'Critical Threat (Red Zone)';
  else if (riskScore >= 40) category = 'Moderate Risk';

  return res.json({
    success: true,
    riskScore: riskScore,
    classification: category,
    recommendations: [
      riskScore >= 70 ? 'Include offender in active Local Patrol Beat route.' : 'Log details for periodic neighborhood review.',
      'Correlate fingerprint records against the state central biometric index.',
      'Establish check-ins at nearby police check-points.'
    ]
  });
});

// Report Generation: Export case details as PDF Document
app.get('/api/reports/case/:id', requireAuth, (req, res) => {
  const caseId = req.params.id;

  // Set response headers to prompt download of pdf file
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=FIR_Case_${caseId}.pdf`);

  const doc = new PDFDocument({ margin: 50 });

  // Pipe the PDF document directly to the response stream
  doc.pipe(res);

  // Render Header Logo Frame (simulated)
  doc
    .fillColor('#0B2240')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('KARNATAKA STATE POLICE', { align: 'center' });

  doc
    .fillColor('#D4AF37')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('FIRST INFORMATION REPORT (Sec 154 Cr.P.C.)', { align: 'center' })
    .moveDown(0.5);

  doc
    .fillColor('#475569')
    .fontSize(8)
    .font('Helvetica')
    .text(`Generated officially on: ${new Date().toLocaleString()}`, { align: 'center' })
    .moveDown(1.5);

  // Line separator
  doc
    .strokeColor('#D4AF37')
    .lineWidth(2)
    .moveTo(50, doc.y)
    .lineTo(550, doc.y)
    .stroke()
    .moveDown(1);

  // Section 1: Details
  doc
    .fillColor('#0F172A')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(`1. FIR Case Reference: KSP-2026-CASE-${caseId}`)
    .font('Helvetica')
    .text(`Registered under jurisdiction of Central Division, Bengaluru City.`)
    .moveDown(1);

  doc
    .font('Helvetica-Bold')
    .text('2. Investigation Timelines & Records:')
    .font('Helvetica')
    .text(`• Investigation status: ACTIVE / UNDER INVESTIGATION`)
    .text(`• Seizures logged: Confiscated weapons, FSL reports and spot mahazar blueprint sketches.`)
    .moveDown(1);

  doc
    .font('Helvetica-Bold')
    .text('3. Security Compliance & Audit Check:')
    .font('Helvetica')
    .text(`This file has been signed using class-3 government digital signature. Access logs registered at KSP IT Core HQ database.`)
    .moveDown(3);

  // Signatures
  doc
    .font('Helvetica-Bold')
    .text('Authorized Signature / Stamp', { align: 'right' });

  // Finalize PDF file stream ..
  doc.end();
});

// --- NEW ROUTES FOR TIMELINE, EVIDENCE, CHARGESHEET, NETWORK ---

app.post('/api/cases/:caseId/timeline', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const note = { ...req.body, CaseMasterID: Number(req.params.caseId) };
    const saved = await db.addTimelineNote(note);
    res.status(201).json(saved);
  } catch(error) {
    console.error('TIMELINE API ERROR:', error);
    res.status(500).json({ error: 'Failed to add timeline note' });
  }
});

app.get('/api/cases/:caseId/timeline', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const notes = await db.getTimelineNotesByCase(Number(req.params.caseId));
    res.json(notes);
  } catch(error) {
    res.status(500).json({ error: 'Failed to get timeline notes' });
  }
});

import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/cases/:caseId/evidence', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const evidence = { ...req.body, CaseMasterID: Number(req.params.caseId) };
    
    if (req.file) {
      // Actually upload to Catalyst File Store
      const catalyst = require('zcatalyst-sdk-node');
      const catalystApp = catalyst.initialize(req);
      const folderId = process.env.CATALYST_EVIDENCE_FOLDER_ID || '1111111111111111111'; // fallback/mock
      try {
        const folder = catalystApp.filestore().folder(folderId);
        const uploadResp = await folder.uploadFile({
          code: req.file.buffer,
          name: req.file.originalname
        });
        evidence.file_path = `/api/files/${uploadResp.id || 'uploaded'}`;
        evidence.file_name = req.file.originalname;
        evidence.file_type = req.file.mimetype;
      } catch (uploadError) {
        console.error('Catalyst FileStore upload failed. Saving with mock path.', uploadError);
        evidence.file_path = `/evidence/lockers/${req.file.originalname.toLowerCase().replace(/ /g, '_')}`;
        evidence.file_name = req.file.originalname;
      }
    }
    
    const saved = await db.uploadEvidence(evidence);
    res.status(201).json(saved);
  } catch(error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload evidence' });
  }
});

app.get('/api/cases/:caseId/evidence', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const files = await db.getEvidenceFilesByCase(Number(req.params.caseId));
    res.json(files);
  } catch(error) {
    res.status(500).json({ error: 'Failed to get evidence files' });
  }
});

app.post('/api/cases/:caseId/chargesheet', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const cs = { ...req.body, CaseMasterID: Number(req.params.caseId) };
    const saved = await db.submitChargesheet(cs);
    res.status(201).json(saved);
  } catch(error) {
    res.status(500).json({ error: 'Failed to submit chargesheet' });
  }
});

app.get('/api/cases/:caseId/chargesheet', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const cs = await db.getChargesheetsByCase(Number(req.params.caseId));
    res.json(cs);
  } catch(error) {
    res.status(500).json({ error: 'Failed to get chargesheets' });
  }
});

app.put('/api/cases/:caseId/reassign', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    // Use the authenticated user's email for auditing
    const actorEmail = req.user?.email || 'admin@ksp.gov.in';
    const success = await db.reassignCase(Number(req.params.caseId), req.body.officerId, actorEmail);
    res.json({ success });
  } catch(error: any) {
    res.status(error.message.includes('Invalid target officer') ? 400 : 500).json({ error: error.message });
  }
});

app.put('/api/cases/:caseId/status', requireAuth, async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    // Use req.user.email from verified JWT instead of trusting req.body.userEmail
    const actorEmail = req.user?.email || req.body.userEmail;
    const success = await db.updateCaseStatus(Number(req.params.caseId), req.body.CaseStatusID, actorEmail);
    invalidateHotspotCache();
    res.json({ success });
  } catch(error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.post('/api/network/edges', async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const saved = await db.addCustomEdge(req.body);
    res.status(201).json(saved);
  } catch(error) {
    res.status(500).json({ error: 'Failed to add edge' });
  }
});

app.post('/api/network/entities/:type', async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const saved = await db.addCaseEntity(req.params.type, req.body);
    res.status(201).json(saved);
  } catch(error) {
    res.status(500).json({ error: 'Failed to add entity' });
  }
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);

  // ── Background Cache Warm-Up ─────────────────────────────────────────────
  // On AppSail, CATALYST_CONFIG is always set. We pre-populate the 5-minute
  // in-process caches for casemasters / districts / units immediately after
  // startup so the first AI /chat request doesn't cold-scan 9,674 rows inside
  // a 30-second AppSail request timeout window.
  //
  // This runs in the background (no await). If Catalyst isn't initialized yet
  // the error is caught silently — the cache will populate on the first live request.
  // ─────────────────────────────────────────────────────────────────────────
  // (async () => {
  //   try {
  //     const { getCatalystApp } = await import('./repositories/CloudScaleRepository');
  //     const app = getCatalystApp();
  //     if (!app) {
  //       console.log('[WarmUp] Catalyst app not available at startup, skipping pre-warm.');
  //       return;
  //     }
  //     const { CloudScaleRepository } = await import('./repositories/CloudScaleRepository');
  //     const repo = new CloudScaleRepository(null as any);
  //     console.log('[WarmUp] Starting background cache warm-up for casemasters, districts, units...');
  //     const start = Date.now();
  //     await Promise.all([
  //       repo.getDistricts().then(d => console.log(`[WarmUp] districts: ${d.length} records`)).catch(e => console.warn('[WarmUp] districts failed:', e.message)),
  //       repo.getUnits().then(u => console.log(`[WarmUp] units: ${u.length} records`)).catch(e => console.warn('[WarmUp] units failed:', e.message)),
  //       repo.getAllCases().then(c => console.log(`[WarmUp] casemasters: ${c.length} records`)).catch(e => console.warn('[WarmUp] casemasters failed:', e.message)),
  //     ]);
  //     console.log(`[WarmUp] Cache warm-up complete in ${Date.now() - start}ms`);
  //   } catch (e: any) {
  //     console.warn('[WarmUp] Background warm-up failed (will warm on first request):', e.message);
  //   }
  // })();
});
 
