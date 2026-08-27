import { Request, Response } from 'express';
import * as aiService from '../services/aiService';
import PDFDocument from 'pdfkit';

import { RepositoryFactory } from '../repositories/RepositoryFactory';

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const dashboardData = await aiService.getDashboardData(db);
    res.json(dashboardData);
  } catch (error) {
    console.error('Error generating AI dashboard data:', error);
    res.status(500).json({ error: 'Failed to generate AI dashboard data' });
  }
};

export const generatePdfReport = async (req: Request, res: Response) => {
  try {
    const db = RepositoryFactory.getRepository(req);
    const dashboardData = await aiService.getDashboardData(db);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=AI_Intelligence_Report_${Date.now()}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
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

    dashboardData.alerts.filter((a: any) => a.severity === 'Critical' || a.severity === 'High').slice(0, 5).forEach((alert: any, idx: number) => {
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
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF report' });
    }
  }
};
