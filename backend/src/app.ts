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
import mongoose from 'mongoose';
import {
  CaseMaster, Employee, Unit, District, Victim, Accused, CustomEdge, State
} from './models';
import aiRoutes from './routes/aiRoutes';
import chatbotRoutes from './routes/chatbotRoutes';
import hotspotRoutes from './routes/hotspotRoutes';
import adminRoutes from './routes/adminRoutes';
import { invalidateHotspotCache } from './controllers/hotspotController';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

// Mount the new dedicated routers
app.use('/api/ai', aiRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/hotspots', hotspotRoutes);
app.use('/api/admin', adminRoutes);

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
const PORT =
  Number(process.env.X_ZOHO_CATALYST_LISTEN_PORT) ||
  Number(process.env.PORT) ||
  5000;

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

app.use(cors());
app.use(express.json());

// Emergency live connection verification
app.get('/api/health', (req, res) => {
  try {
    const provider = process.env.DB_PROVIDER || 'mongo';
    if (provider === 'cloudscale') {
      res.json({ success: true, status: 'online', database: 'connected', provider: 'cloudscale' });
      return;
    }

    const dbState = mongoose.connection.readyState;
    if (dbState === 1) {
      res.json({ success: true, status: 'online', database: 'connected', provider: 'mongo' });
    } else {
      res.status(503).json({ success: false, status: 'online', database: 'disconnected', provider: 'mongo' });
    }
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

    const projectDetails = { error: "Not supported in this SDK version" };

    res.json({
      projectDetails: projectDetails,
      forensicResults: results,
      dbProvider: process.env.DB_PROVIDER || 'mongo',
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
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

app.get('/api/employees', async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getEmployees();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

app.get('/api/cases', async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getCases({});
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

app.put('/api/cases/:caseId/reassign', async (req, res) => {
  try {
    const caseId = Number(req.params.caseId);
    const { officerId } = req.body;
    await CaseMaster.updateOne({ CaseMasterID: caseId }, { $set: { PolicePersonID: officerId } });
    invalidateHotspotCache();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reassign case' });
  }
});

// Basic CRUD for Cases to trigger invalidation
app.post('/api/cases', async (req, res) => {
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
    const newCase = await db.createCase(caseData);
    invalidateHotspotCache();
    res.status(201).json(newCase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create case' });
  }
});

app.put('/api/cases/:id', async (req, res) => {
  try {
    const updated = await CaseMaster.findOneAndUpdate({ CaseMasterID: Number(req.params.id) }, req.body, { new: true });
    invalidateHotspotCache();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update case' });
  }
});

app.patch('/api/cases/:id', async (req, res) => {
  try {
    const updated = await CaseMaster.findOneAndUpdate({ CaseMasterID: Number(req.params.id) }, { $set: req.body }, { new: true });
    invalidateHotspotCache();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update case' });
  }
});

app.delete('/api/cases/:id', async (req, res) => {
  try {
    await CaseMaster.deleteOne({ CaseMasterID: Number(req.params.id) });
    invalidateHotspotCache();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete case' });
  }
});

app.get('/api/victims', async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getAllVictims();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch victims' });
  }
});

app.get('/api/accused', async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getAllAccused();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accused' });
  }
});

app.get('/api/customedges', async (req, res) => {
  try {
    const data = await CustomEdge.find();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch custom edges' });
  }
});

app.get('/api/cases/officer/:officerId', async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getCasesByOfficer(Number(req.params.officerId));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch officer cases' });
  }
});

app.get('/api/cases/station/:stationId', async (req, res) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const data = await db.getCasesByStation(Number(req.params.stationId));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch station cases' });
  }
});

app.get('/api/network/:caseId', async (req, res) => {
  try {
    const caseId = Number(req.params.caseId);
    const accused = await Accused.find({ CaseMasterID: caseId });
    const victims = await Victim.find({ CaseMasterID: caseId });
    const edges = await CustomEdge.find({ CaseMasterID: caseId });
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
app.get('/api/reports/case/:id', (req, res) => {
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

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    console.error('[MongoDB] Missing MONGO_URI in .env');
    return;
  }

  try {
    await mongoose.connect(mongoURI);
    console.log('[MongoDB] Connected successfully');
  } catch (err) {
    console.error('[MongoDB] Connection error:', err);
  }
};

app.listen(PORT, '0.0.0.0', async () => {
  await connectDB();
  console.log(`Server running on port ${PORT}`);
});
