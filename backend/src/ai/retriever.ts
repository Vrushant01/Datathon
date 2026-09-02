import { QueryPlan } from './planner';
import { aiLogger } from './logger';
import { CloudScaleRepository } from '../repositories/CloudScaleRepository';
import { matchesFilter } from './queryEngine';

const MAJOR_HEADS_MAP: Record<number, string> = {
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

export const retrieveContext = async (plan: QueryPlan, req?: any): Promise<any> => {
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
      case 'executeDatabaseQuery': {
        const repo = new CloudScaleRepository(req);
        
        let allData = [];
        if (plan.collection === 'accuseds') allData = await repo.getAllAccused();
        else if (plan.collection === 'victims') allData = await repo.getAllVictims();
        else if (plan.collection === 'districts') allData = await repo.getDistricts();
        else if (plan.collection === 'units') allData = await repo.getUnits();
        else if (plan.collection === 'employees') allData = await repo.getEmployees();
        else allData = await repo.getAllCases();

        if (plan.dateRange?.start && plan.collection === 'casemasters') {
          allData = allData.filter(c => c.CrimeRegisteredDate >= plan.dateRange!.start);
        }
        if (plan.dateRange?.end && plan.collection === 'casemasters') {
          allData = allData.filter(c => c.CrimeRegisteredDate <= plan.dateRange!.end);
        }

        
        // Enrich casemasters with DistrictID from units if needed
        if (plan.collection === 'casemasters' || !plan.collection) {
           const units = await repo.getUnits();
           const districts = await repo.getDistricts();
           const employees = await repo.getEmployees();
           const unitMap = new Map();
           units.forEach(u => unitMap.set(Number(u.UnitID), u));
           const distMap = new Map();
           districts.forEach(d => distMap.set(Number(d.DistrictID), d));
           const empMap = new Map();
           employees.forEach(e => empMap.set(Number(e.EmployeeID), e));
           
           allData = allData.map(c => {
              if (c.PoliceStationID && !c.DistrictID) {
                 const u = unitMap.get(Number(c.PoliceStationID));
                 if (u) {
                    c.DistrictID = u.DistrictID;
                    c.PoliceStationName = u.UnitName;
                    const d = distMap.get(Number(u.DistrictID));
                    if (d) c.DistrictName = d.DistrictName;
                 }
              }
              if (c.PolicePersonID) {
                 const emp = empMap.get(Number(c.PolicePersonID));
                 if (emp) c.OfficerName = `${emp.FirstName} ${emp.LastName}`.trim();
              }
              return c;
           });
        }
        let filtered = allData;

        if (plan.filters && Object.keys(plan.filters).length > 0) {
          filtered = allData.filter(d => matchesFilter(d, plan.filters));
        }

        if (plan.groupBy) {
          console.log('GROUP BY:', plan.groupBy);
          const counts: Record<string, number> = {};
          filtered.forEach(d => {
            let key: string = "Unknown";
            if (plan.groupBy === 'month' && d.CrimeRegisteredDate) {
              key = d.CrimeRegisteredDate.substring(0, 7);
            } else if (plan.groupBy === 'year' && d.CrimeRegisteredDate) {
              key = d.CrimeRegisteredDate.substring(0, 4);
            } else if (plan.groupBy === 'day' && d.CrimeRegisteredDate) {
              key = d.CrimeRegisteredDate.substring(0, 10);
            } else if (plan.groupBy!.toLowerCase().includes('district')) {
              key = d.DistrictName || d.DistrictID || 'Unknown';
            } else if (plan.groupBy!.toLowerCase().includes('station')) {
              key = d.PoliceStationName || d.PoliceStationID || 'Unknown';
            } else if (plan.groupBy === 'PolicePersonID' || plan.groupBy === 'OfficerName') {
              key = d.OfficerName || d.PolicePersonID || 'Unknown';
            } else {
              key = d[plan.groupBy!] || 'Unknown';
            }
            counts[key] = (counts[key] || 0) + 1;
          });

          let trend = Object.entries(counts).map(([label, value]) => ({ label, value }));
          
          if (plan.sort) {
             const [sortField, sortDir] = Object.entries(plan.sort)[0] as [string, number] || ["value", -1];
             trend.sort((a, b) => ((a as any)[sortField] > (b as any)[sortField] ? 1 : -1) * (sortDir as number));
          } else {
             trend.sort((a, b) => (b.value as number) - (a.value as number));
          }

          if (plan.limit) {
            trend = trend.slice(0, plan.limit);
          } else {
            trend = trend.slice(0, 50); // safety limit
          }

          return { 
            intent: plan.intent,
            isFollowUp: plan.isFollowUp,
            totalMatched: filtered.length,
            groupBy: plan.groupBy,
            results: trend
          };
        } else {
          // Just count/find
          if (plan.limit) {
             let results = filtered;
             if (plan.sort) {
               const [sortField, sortDir] = Object.entries(plan.sort)[0] as [string, number] || ["", 1];
               if (sortField) {
                 results.sort((a, b) => ((a as any)[sortField] > (b as any)[sortField] ? 1 : -1) * sortDir);
               }
             }
             return {
               intent: plan.intent,
               isFollowUp: plan.isFollowUp,
               totalMatched: filtered.length,
               results: results.slice(0, plan.limit).map(c => {
                 if (plan.collection === 'casemasters' || !plan.collection) {
                   return {
                     CaseNo: c.CaseMasterID,
                     Date: c.CrimeRegisteredDate,
                     MajorHead: MAJOR_HEADS_MAP[Number(c.CrimeMajorHeadID)] || c.CrimeMajorHeadID,
                     Station: c.PoliceStationName || c.PoliceStationID
                   };
                 }
                 return c;
               })
             };
          } else {
             return {
               intent: plan.intent,
               isFollowUp: plan.isFollowUp,
               count: filtered.length
             };
          }
        }
      }
      case 'getCaseCountByPerson':
      case 'listCasesByPerson': {
        const repo = new CloudScaleRepository(req);
        const allAccused = await repo.getAllAccused();
        const allVictims = await repo.getAllVictims();
        
        const nameUpper = (plan.personName || '').toUpperCase();
        const matchingAccused = allAccused.filter(a => (a.AccusedName || '').toUpperCase().includes(nameUpper));
        const matchingVictims = allVictims.filter(v => (v.VictimName || '').toUpperCase().includes(nameUpper));
        
        const caseIds = new Set<number>();
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
        const repo = new CloudScaleRepository(req);
        const allCases = await repo.getAllCases();
        const caseRecord = allCases.find(c => Number(c.CaseMasterID) === plan.caseId);
        if (!caseRecord) return { error: `Case ${plan.caseId} not found` };
        
        const accused = await repo.getAccusedByCase(plan.caseId!);
        const victims = await repo.getVictimsByCase(plan.caseId!);
        return { caseRecord, accused, victims };
      }
      case 'getOfficerPerformance': {
        const repo = new CloudScaleRepository(req);
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
        const repo = new CloudScaleRepository(req);
        let cases = await repo.getAllCases();
        const districts = await repo.getDistricts();

        if (plan.dateRange?.start) cases = cases.filter(c => c.CrimeRegisteredDate >= plan.dateRange!.start);
        if (plan.dateRange?.end) cases = cases.filter(c => c.CrimeRegisteredDate <= plan.dateRange!.end);

        const counts: Record<string, number> = {};
        cases.forEach(c => {
          if (!c.DistrictID) return;
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
        const repo = new CloudScaleRepository(req);
        let cases = await repo.getAllCases();
        const districts = await repo.getDistricts();

        if (plan.dateRange?.start) cases = cases.filter(c => c.CrimeRegisteredDate >= plan.dateRange!.start);
        if (plan.dateRange?.end) cases = cases.filter(c => c.CrimeRegisteredDate <= plan.dateRange!.end);

        if (plan.districtName) {
          const d = districts.find(d => d.DistrictName.toLowerCase().includes(plan.districtName!.toLowerCase()));
          if (d) {
            cases = cases.filter(c => Number(c.DistrictID) === Number(d.DistrictID));
          } else {
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
  } catch (err: any) {
    aiLogger.error(`Retriever error: ${err.message}`);
    return { error: err.message };
  }
};
