"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePdfReport = exports.getDashboard = void 0;
const aiService = __importStar(require("../services/aiService"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const getDashboard = async (req, res) => {
    try {
        const dashboardData = await aiService.getDashboardData();
        res.json(dashboardData);
    }
    catch (error) {
        console.error('Error generating AI dashboard data:', error);
        res.status(500).json({ error: 'Failed to generate AI dashboard data' });
    }
};
exports.getDashboard = getDashboard;
const generatePdfReport = async (req, res) => {
    try {
        const dashboardData = await aiService.getDashboardData();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=AI_Intelligence_Report_${Date.now()}.pdf`);
        const doc = new pdfkit_1.default({ margin: 50 });
        doc.pipe(res);
        // Header
        doc
            .fillColor('#0B2240')
            .fontSize(18)
            .font('Helvetica-Bold')
            .text('KARNATAKA STATE POLICE', { align: 'center' });
        doc
            .fillColor('#D4AF37')
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('AI INTELLIGENCE REPORT', { align: 'center' })
            .moveDown(0.5);
        doc
            .fillColor('#475569')
            .fontSize(10)
            .font('Helvetica')
            .text(`Generated officially on: ${new Date().toLocaleString()}`, { align: 'center' })
            .moveDown(1.5);
        // Separator
        doc
            .strokeColor('#D4AF37')
            .lineWidth(2)
            .moveTo(50, doc.y)
            .lineTo(550, doc.y)
            .stroke()
            .moveDown(1);
        // Executive Summary
        doc
            .fillColor('#0F172A')
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('1. EXECUTIVE SUMMARY')
            .moveDown(0.5)
            .fontSize(10)
            .font('Helvetica')
            .text(dashboardData.summary.text, { width: 500, align: 'left' })
            .moveDown(1.5);
        // District Intelligence
        doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('2. DISTRICT INTELLIGENCE')
            .moveDown(0.5)
            .fontSize(10)
            .font('Helvetica')
            .text(`Most Improved: ${dashboardData.districtIntelligence.insights.mostImproved.name} (-${dashboardData.districtIntelligence.insights.mostImproved.val}% growth)`)
            .text(`Highest Growth: ${dashboardData.districtIntelligence.insights.highestGrowth.name}`)
            .text(`Highest Violent Crime: ${dashboardData.districtIntelligence.insights.highestViolent.name}`)
            .moveDown(1.5);
        // Critical Alerts
        doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('3. CRITICAL ALERTS')
            .moveDown(0.5);
        dashboardData.alerts.filter((a) => a.severity === 'Critical' || a.severity === 'High').slice(0, 5).forEach((alert, idx) => {
            doc
                .fontSize(10)
                .font('Helvetica-Bold')
                .fillColor('#D97706')
                .text(`[${alert.severity.toUpperCase()}] ${alert.crimeType} - ${alert.policeStation}`)
                .fillColor('#475569')
                .font('Helvetica')
                .text(`Algorithm: ${alert.algorithmUsed} (Confidence: ${alert.confidence}%)`)
                .text(`Reason: ${alert.reason}`)
                .text(`Action: ${alert.recommendedActions[0] || 'Investigate further'}`)
                .moveDown(0.8);
        });
        // Signature
        doc.moveDown(3);
        doc
            .fillColor('#0F172A')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Authorized Signature / System Generated', { align: 'right' });
        doc.end();
    }
    catch (error) {
        console.error('Error generating PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate PDF report' });
        }
    }
};
exports.generatePdfReport = generatePdfReport;
