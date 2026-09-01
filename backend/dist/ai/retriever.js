"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveContext = void 0;
const findDocuments_1 = require("./tools/findDocuments");
const aggregate_1 = require("./tools/aggregate");
const countDocuments_1 = require("./tools/countDocuments");
const logger_1 = require("./logger");
const CloudScaleRepository_1 = require("../repositories/CloudScaleRepository");
const MAJOR_HEADS_MAP = {
    100: 'Crimes Against Body',
    200: 'Crimes Against Property',
    300: 'Crimes Against Women',
    400: 'Economic Offences',
    500: 'Cyber Crimes',
    600: 'Special and Local Laws (SLL)'
};
// NOTE: similaritySearch/vectorStore/embeddings (Gemini-embedding-based cosine
// search over MongoDB) are retired as part of the Catalyst migration.
// Knowledge/explanatory questions route to Catalyst QuickML RAG instead —
// RAG's Knowledge Base handles retrieval itself, so no custom vector store
// is needed here. (RAG endpoint wiring is a follow-up; see chatbot.ts.)
const retrieveContext = async (plan, req) => {
    try {
        if (plan.tool === 'none') {
            return null;
        }
        if (plan.tool === 'similaritySearch') {
            return { useRag: true, ragQuery: plan.query };
        }
        if (!plan.collection && ['findDocuments', 'aggregate', 'countDocuments'].includes(plan.tool)) {
            throw new Error("Collection is required for database tools.");
        }
        switch (plan.tool) {
            case 'findDocuments':
                return await (0, findDocuments_1.findDocuments)(plan.collection, plan.query, undefined, undefined, req);
            case 'aggregate':
                return await (0, aggregate_1.aggregate)(plan.collection, plan.query, req);
            case 'countDocuments': {
                const count = await (0, countDocuments_1.countDocuments)(plan.collection, plan.query, req);
                logger_1.aiLogger.info(`countDocuments returned: ${count}`);
                return { count };
            }
            case 'getCaseCountByPerson':
            case 'listCasesByPerson': {
                const repo = new CloudScaleRepository_1.CloudScaleRepository(req);
                const allAccused = await repo.getAllAccused();
                const allVictims = await repo.getAllVictims();
                const nameUpper = (plan.personName || '').toUpperCase();
                const matchingAccused = allAccused.filter(a => (a.AccusedName || '').toUpperCase().includes(nameUpper));
                const matchingVictims = allVictims.filter(v => (v.VictimName || '').toUpperCase().includes(nameUpper));
                const caseIds = new Set();
                matchingAccused.forEach(a => caseIds.add(Number(a.CaseMasterID)));
                matchingVictims.forEach(v => caseIds.add(Number(v.CaseMasterID)));
                if (caseIds.size === 0) {
                    return { message: `No cases found for person matching '${plan.personName}'` };
                }
                if (plan.tool === 'getCaseCountByPerson') {
                    return { personName: plan.personName, totalCases: caseIds.size };
                }
                const allCases = await repo.getAllCases();
                const cases = allCases.filter(c => caseIds.has(Number(c.CaseMasterID)));
                // Trim down case records to avoid LLM token limits
                const trimmedCases = cases.slice(0, 50).map(c => ({
                    CaseNo: c.CaseMasterID,
                    Date: c.CrimeRegisteredDate,
                    MajorHead: MAJOR_HEADS_MAP[Number(c.CrimeMajorHeadID)] || c.CrimeMajorHeadID,
                    Station: c.PoliceStationName || c.PoliceStationID
                }));
                return { personName: plan.personName, totalCases: cases.length, cases: trimmedCases };
            }
            case 'getCaseDetail': {
                const repo = new CloudScaleRepository_1.CloudScaleRepository(req);
                const allCases = await repo.getAllCases();
                const caseRecord = allCases.find(c => Number(c.CaseMasterID) === plan.caseId);
                if (!caseRecord)
                    return { error: `Case ${plan.caseId} not found` };
                const accused = await repo.getAccusedByCase(plan.caseId);
                const victims = await repo.getVictimsByCase(plan.caseId);
                return { caseRecord, accused, victims };
            }
            case 'getCrimeStatsByCategory': {
                const repo = new CloudScaleRepository_1.CloudScaleRepository(req);
                let cases = await repo.getAllCases();
                const cat = (plan.category || '').toLowerCase();
                // Date filtering
                if (plan.dateRange?.start) {
                    cases = cases.filter(c => c.CrimeRegisteredDate >= plan.dateRange.start);
                }
                if (plan.dateRange?.end) {
                    cases = cases.filter(c => c.CrimeRegisteredDate <= plan.dateRange.end);
                }
                let isFuzzyMatch = false;
                let unresolvedCategory = false;
                let resolvedCategory = '';
                if (cat === 'all' || cat === '' || cat === 'all crimes' || cat === 'any') {
                    resolvedCategory = 'All Crimes';
                }
                else if (cat.includes('vehicle theft')) {
                    cases = cases.filter(c => (c.StolenProperty || '').toLowerCase().includes('vehicle'));
                    isFuzzyMatch = true;
                    resolvedCategory = 'Crimes Against Property';
                }
                else if (cat.includes('murder') && !cat.includes('attempt')) {
                    cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 101);
                    resolvedCategory = 'Crimes Against Body';
                }
                else if (cat.includes('attempt to murder')) {
                    cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 102);
                    resolvedCategory = 'Crimes Against Body';
                }
                else if (cat.includes('grievous hurt')) {
                    cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 103);
                    resolvedCategory = 'Crimes Against Body';
                }
                else if (cat.includes('theft') || cat.includes('larceny')) {
                    cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 201);
                    resolvedCategory = 'Crimes Against Property';
                }
                else if (cat.includes('robbery')) {
                    cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 202);
                    resolvedCategory = 'Crimes Against Property';
                }
                else if (cat.includes('house breaking')) {
                    cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 203);
                    resolvedCategory = 'Crimes Against Property';
                }
                else if (cat.includes('rape')) {
                    cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 301);
                    resolvedCategory = 'Crimes Against Women';
                }
                else if (cat.includes('dowry')) {
                    cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 302);
                    resolvedCategory = 'Crimes Against Women';
                }
                else if (cat.includes('cheating') || cat.includes('forgery')) {
                    cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 401);
                    resolvedCategory = 'Economic Offences';
                }
                else if (cat.includes('phishing') || cat.includes('financial fraud')) {
                    cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 501);
                    resolvedCategory = 'Cyber Crimes';
                }
                else if (cat.includes('cyber')) {
                    cases = cases.filter(c => Number(c.CrimeMajorHeadID) === 500);
                    resolvedCategory = 'Cyber Crimes';
                }
                else if (cat.includes('ndps') || cat.includes('drug')) {
                    cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 601);
                    resolvedCategory = 'Special and Local Laws (SLL)';
                }
                else if (cat.includes('property')) {
                    cases = cases.filter(c => Number(c.CrimeMajorHeadID) === 200);
                    resolvedCategory = 'Crimes Against Property';
                }
                else if (cat.includes('body')) {
                    cases = cases.filter(c => Number(c.CrimeMajorHeadID) === 100);
                    resolvedCategory = 'Crimes Against Body';
                }
                else if (cat.includes('women')) {
                    cases = cases.filter(c => Number(c.CrimeMajorHeadID) === 300);
                    resolvedCategory = 'Crimes Against Women';
                }
                else if (cat.includes('economic')) {
                    cases = cases.filter(c => Number(c.CrimeMajorHeadID) === 400);
                    resolvedCategory = 'Economic Offences';
                }
                else if (cat.includes('special') || cat.includes('sll')) {
                    cases = cases.filter(c => Number(c.CrimeMajorHeadID) === 600);
                    resolvedCategory = 'Special and Local Laws (SLL)';
                }
                else {
                    // If no specific match, explicitly return unresolved
                    unresolvedCategory = true;
                    cases = [];
                }
                if (unresolvedCategory) {
                    return {
                        category: plan.category,
                        unresolvedCategory: true,
                        message: `Unrecognized crime category: '${plan.category}'. Cannot map this to a database schema.`
                    };
                }
                const trimmedCases = cases.slice(0, 50).map(c => ({
                    CaseNo: c.CaseMasterID,
                    Date: c.CrimeRegisteredDate,
                    MajorHead: MAJOR_HEADS_MAP[Number(c.CrimeMajorHeadID)] || c.CrimeMajorHeadID,
                    Station: c.PoliceStationName || c.PoliceStationID
                }));
                return {
                    category: plan.category,
                    resolvedCategory,
                    totalCases: cases.length,
                    isFuzzyMatch,
                    cases: trimmedCases
                };
            }
            case 'getCaseTrend': {
                const repo = new CloudScaleRepository_1.CloudScaleRepository(req);
                let cases = await repo.getAllCases();
                let resolvedCategory = '';
                if (plan.category) {
                    const cat = plan.category.toLowerCase();
                    if (cat === 'all' || cat === '' || cat === 'all crimes' || cat === 'any') {
                        resolvedCategory = 'All Crimes';
                    }
                    else if (cat.includes('vehicle theft')) {
                        cases = cases.filter(c => (c.StolenProperty || '').toLowerCase().includes('vehicle'));
                        resolvedCategory = 'Crimes Against Property';
                    }
                    else if (cat.includes('murder') && !cat.includes('attempt')) {
                        cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 101);
                        resolvedCategory = 'Crimes Against Body';
                    }
                    else if (cat.includes('attempt to murder')) {
                        cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 102);
                        resolvedCategory = 'Crimes Against Body';
                    }
                    else if (cat.includes('grievous hurt')) {
                        cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 103);
                        resolvedCategory = 'Crimes Against Body';
                    }
                    else if (cat.includes('theft') || cat.includes('larceny')) {
                        cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 201);
                        resolvedCategory = 'Crimes Against Property';
                    }
                    else if (cat.includes('robbery')) {
                        cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 202);
                        resolvedCategory = 'Crimes Against Property';
                    }
                    else if (cat.includes('house breaking')) {
                        cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 203);
                        resolvedCategory = 'Crimes Against Property';
                    }
                    else if (cat.includes('rape')) {
                        cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 301);
                        resolvedCategory = 'Crimes Against Women';
                    }
                    else if (cat.includes('dowry')) {
                        cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 302);
                        resolvedCategory = 'Crimes Against Women';
                    }
                    else if (cat.includes('cheating') || cat.includes('forgery')) {
                        cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 401);
                        resolvedCategory = 'Economic Offences';
                    }
                    else if (cat.includes('phishing') || cat.includes('financial fraud')) {
                        cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 501);
                        resolvedCategory = 'Cyber Crimes';
                    }
                    else if (cat.includes('cyber')) {
                        cases = cases.filter(c => Number(c.CrimeMajorHeadID) === 500);
                        resolvedCategory = 'Cyber Crimes';
                    }
                    else if (cat.includes('ndps') || cat.includes('drug')) {
                        cases = cases.filter(c => Number(c.CrimeMinorHeadID) === 601);
                        resolvedCategory = 'Special and Local Laws (SLL)';
                    }
                    else if (cat.includes('property')) {
                        cases = cases.filter(c => Number(c.CrimeMajorHeadID) === 200);
                        resolvedCategory = 'Crimes Against Property';
                    }
                    else if (cat.includes('body')) {
                        cases = cases.filter(c => Number(c.CrimeMajorHeadID) === 100);
                        resolvedCategory = 'Crimes Against Body';
                    }
                    else if (cat.includes('women')) {
                        cases = cases.filter(c => Number(c.CrimeMajorHeadID) === 300);
                        resolvedCategory = 'Crimes Against Women';
                    }
                    else if (cat.includes('economic')) {
                        cases = cases.filter(c => Number(c.CrimeMajorHeadID) === 400);
                        resolvedCategory = 'Economic Offences';
                    }
                    else if (cat.includes('special') || cat.includes('sll')) {
                        cases = cases.filter(c => Number(c.CrimeMajorHeadID) === 600);
                        resolvedCategory = 'Special and Local Laws (SLL)';
                    }
                    else {
                        return {
                            category: plan.category,
                            unresolvedCategory: true,
                            message: `Unrecognized crime category: '${plan.category}'. Cannot map this to a database schema.`
                        };
                    }
                }
                // Date filtering
                if (plan.dateRange?.start) {
                    cases = cases.filter(c => c.CrimeRegisteredDate >= plan.dateRange.start);
                }
                if (plan.dateRange?.end) {
                    cases = cases.filter(c => c.CrimeRegisteredDate <= plan.dateRange.end);
                }
                const counts = {};
                cases.forEach(c => {
                    if (!c.CrimeRegisteredDate)
                        return;
                    let periodKey = c.CrimeRegisteredDate;
                    if (plan.groupBy === 'month') {
                        periodKey = c.CrimeRegisteredDate.substring(0, 7); // YYYY-MM
                    }
                    else if (plan.groupBy === 'year') {
                        periodKey = c.CrimeRegisteredDate.substring(0, 4); // YYYY
                    }
                    counts[periodKey] = (counts[periodKey] || 0) + 1;
                });
                // Convert to array and sort chronologically, taking only the most recent 12 periods
                // to avoid exceeding Catalyst LLM's strict token limits which can trigger a 500 Error.
                const trend = Object.entries(counts)
                    .map(([period, count]) => ({ period, count }))
                    .sort((a, b) => b.period.localeCompare(a.period)) // Sort descending to get newest first
                    .slice(0, 12)
                    .sort((a, b) => a.period.localeCompare(b.period)); // Sort ascending again for the chart
                return { groupBy: plan.groupBy, category: plan.category, resolvedCategory, trend };
            }
            case 'getOfficerPerformance': {
                const repo = new CloudScaleRepository_1.CloudScaleRepository(req);
                let cases = await repo.getAllCases();
                const employees = await repo.getEmployees();
                const ident = plan.officerIdentifier?.toLowerCase().trim() || '';
                const officer = employees.find(e => e.FirstName.toLowerCase().includes(ident) || String(e.EmployeeID) === ident);
                if (!officer) {
                    return { error: `Officer '${plan.officerIdentifier}' not found.` };
                }
                const officerCases = cases.filter(c => Number(c.PolicePersonID) === Number(officer.EmployeeID));
                const totalAssigned = officerCases.length;
                const closedCases = officerCases.filter(c => Number(c.CaseStatusID) === 8 || Number(c.CaseStatusID) === 9).length; // assuming 8/9 are closed/charge-sheeted
                const pendingCases = totalAssigned - closedCases;
                return {
                    officerName: officer.FirstName,
                    employeeId: officer.EmployeeID,
                    totalAssigned,
                    closedCases,
                    pendingCases,
                    performanceNote: 'Metrics derived from casemasters where PolicePersonID matches the officer.'
                };
            }
            case 'getTopCrimeDistricts': {
                const repo = new CloudScaleRepository_1.CloudScaleRepository(req);
                let cases = await repo.getAllCases();
                const districts = await repo.getDistricts();
                if (plan.dateRange?.start)
                    cases = cases.filter(c => c.CrimeRegisteredDate >= plan.dateRange.start);
                if (plan.dateRange?.end)
                    cases = cases.filter(c => c.CrimeRegisteredDate <= plan.dateRange.end);
                const counts = {};
                cases.forEach(c => {
                    if (!c.DistrictID)
                        return;
                    const dName = districts.find(d => Number(d.DistrictID) === Number(c.DistrictID))?.DistrictName || String(c.DistrictID);
                    counts[dName] = (counts[dName] || 0) + 1;
                });
                const topDistricts = Object.entries(counts)
                    .map(([district, count]) => ({ district, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, plan.limit || 5);
                return { topDistricts, dateRange: plan.dateRange };
            }
            case 'getRecentAlerts': {
                const repo = new CloudScaleRepository_1.CloudScaleRepository(req);
                let cases = await repo.getAllCases();
                const districts = await repo.getDistricts();
                if (plan.dateRange?.start)
                    cases = cases.filter(c => c.CrimeRegisteredDate >= plan.dateRange.start);
                if (plan.dateRange?.end)
                    cases = cases.filter(c => c.CrimeRegisteredDate <= plan.dateRange.end);
                if (plan.districtName) {
                    const d = districts.find(d => d.DistrictName.toLowerCase().includes(plan.districtName.toLowerCase()));
                    if (d) {
                        cases = cases.filter(c => Number(c.DistrictID) === Number(d.DistrictID));
                    }
                    else {
                        return { error: `District '${plan.districtName}' not found.` };
                    }
                }
                // Filter high priority: e.g. GravityOffenceID === 1 or 2 (Heinous/Major)
                cases = cases.filter(c => Number(c.GravityOffenceID) === 1 || Number(c.GravityOffenceID) === 2);
                cases = cases.sort((a, b) => new Date(b.CrimeRegisteredDate).getTime() - new Date(a.CrimeRegisteredDate).getTime());
                cases = cases.slice(0, plan.limit || 10);
                const alerts = cases.map(c => ({
                    CaseNo: c.CaseMasterID,
                    Date: c.CrimeRegisteredDate,
                    MajorHead: MAJOR_HEADS_MAP[Number(c.CrimeMajorHeadID)] || c.CrimeMajorHeadID,
                    Station: c.PoliceStationName || c.PoliceStationID
                }));
                return { alerts, dateRange: plan.dateRange, districtName: plan.districtName };
            }
            default:
                return null;
        }
    }
    catch (err) {
        logger_1.aiLogger.error(`Retriever error: ${err.message}`);
        return { error: err.message };
    }
};
exports.retrieveContext = retrieveContext;
