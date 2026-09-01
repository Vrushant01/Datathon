"use strict";
/**
 * Rule-based Recommendation Engine.
 * Maps crime types, severity, and contexts to operational responses.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRecommendations = void 0;
const generateRecommendations = (crimeType, severity, context) => {
    const recommendations = [];
    // Base on severity
    if (severity === 'Critical') {
        recommendations.push('Escalate to District SP');
        recommendations.push('Assign Additional Investigating Officer');
    }
    // Base on Crime Type
    const lowerType = crimeType.toLowerCase();
    if (lowerType.includes('theft') || lowerType.includes('robbery') || lowerType.includes('burglary')) {
        recommendations.push('Increase Night Patrol');
        recommendations.push('Deploy Beat Officers');
        recommendations.push('Increase CCTV Monitoring');
    }
    else if (lowerType.includes('economic') || lowerType.includes('cyber') || lowerType.includes('fraud')) {
        recommendations.push('Assign Economic Crime Unit');
        recommendations.push('Generate Investigation Report');
    }
    else if (lowerType.includes('women') || lowerType.includes('harassment')) {
        recommendations.push('Deploy Women Safety Patrol');
        recommendations.push('Open FIR List');
    }
    else if (lowerType.includes('cluster') || lowerType.includes('hotspot')) {
        recommendations.push('Recommend Night Patrol');
        recommendations.push('Temporary Checkpoint');
        recommendations.push('Open GIS Hotspot');
    }
    else if (lowerType.includes('load') || lowerType.includes('workload')) {
        recommendations.push('Assign Officer');
        recommendations.push('Notify Police Station');
    }
    else if (lowerType.includes('recidivism') || lowerType.includes('repeat')) {
        recommendations.push('View Criminal Network');
        recommendations.push('Notify Police Station');
    }
    else {
        // Generic fallbacks
        recommendations.push('Assign Officer');
        recommendations.push('Notify Police Station');
    }
    // Ensure unique and max 5
    return Array.from(new Set(recommendations)).slice(0, 5);
};
exports.generateRecommendations = generateRecommendations;
