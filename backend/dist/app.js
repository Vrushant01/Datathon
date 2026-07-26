"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("./models");
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const chatbotRoutes_1 = __importDefault(require("./routes/chatbotRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Emergency live connection verification
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString(), platform: 'KSP-AI-Analytics' });
});
// REST ENDPOINTS FOR MONGO DB MIGRATION
app.get('/api/districts', async (req, res) => {
    try {
        const data = await models_1.District.find();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch districts' });
    }
});
app.get('/api/units', async (req, res) => {
    try {
        const data = await models_1.Unit.find();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch units' });
    }
});
app.get('/api/employees', async (req, res) => {
    try {
        const data = await models_1.Employee.find();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});
app.get('/api/cases', async (req, res) => {
    try {
        const data = await models_1.CaseMaster.find(); // Fetch all 5000 cases
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch cases' });
    }
});
app.put('/api/cases/:caseId/reassign', async (req, res) => {
    try {
        const caseId = Number(req.params.caseId);
        const { officerId } = req.body;
        await models_1.CaseMaster.updateOne({ CaseMasterID: caseId }, { $set: { PolicePersonID: officerId } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reassign case' });
    }
});
app.get('/api/victims', async (req, res) => {
    try {
        const data = await models_1.Victim.find();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch victims' });
    }
});
app.get('/api/accused', async (req, res) => {
    try {
        const data = await models_1.Accused.find();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch accused' });
    }
});
app.get('/api/customedges', async (req, res) => {
    try {
        const data = await models_1.CustomEdge.find();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch custom edges' });
    }
});
app.get('/api/cases/officer/:officerId', async (req, res) => {
    try {
        const data = await models_1.CaseMaster.find({ PolicePersonID: Number(req.params.officerId) });
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch officer cases' });
    }
});
app.get('/api/cases/station/:stationId', async (req, res) => {
    try {
        const data = await models_1.CaseMaster.find({ PoliceStationID: Number(req.params.stationId) });
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch station cases' });
    }
});
app.get('/api/network/:caseId', async (req, res) => {
    try {
        const caseId = Number(req.params.caseId);
        const accused = await models_1.Accused.find({ CaseMasterID: caseId });
        const victims = await models_1.Victim.find({ CaseMasterID: caseId });
        const edges = await models_1.CustomEdge.find({ CaseMasterID: caseId });
        res.json({ accused, victims, edges });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch network' });
    }
});
app.use('/api/ai', aiRoutes_1.default);
app.use('/api/chatbot', chatbotRoutes_1.default);
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
    if (offenderAge >= 18 && offenderAge <= 25)
        riskScore += 35;
    else if (offenderAge > 25 && offenderAge <= 35)
        riskScore += 20;
    // History factor: heavy weight
    riskScore += Math.min(previousOffences * 15, 45);
    // Offence gravity factor
    if (gravityId === 1)
        riskScore += 15; // Heinous
    // Cap at 99%
    riskScore = Math.min(riskScore, 99);
    // Determine threat category
    let category = 'Low Risk';
    if (riskScore >= 70)
        category = 'Critical Threat (Red Zone)';
    else if (riskScore >= 40)
        category = 'Moderate Risk';
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
    const doc = new pdfkit_1.default({ margin: 50 });
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
    // Finalize PDF file stream
    doc.end();
});
const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
        console.error('[MongoDB] Missing MONGO_URI in .env');
        return;
    }
    try {
        await mongoose_1.default.connect(mongoURI);
        console.log('[MongoDB] Connected successfully');
    }
    catch (err) {
        console.error('[MongoDB] Connection error:', err);
    }
};
app.listen(PORT, async () => {
    await connectDB();
    console.log(`Server running on port ${PORT}`);
});
