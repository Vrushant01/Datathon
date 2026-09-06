"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepeatedOffenders = exports.repeatedOffendersCache = void 0;
exports.repeatedOffendersCache = { data: null, timestamp: 0 };
const getRepeatedOffenders = async (db) => {
    const now = Date.now();
    if (!exports.repeatedOffendersCache.data || (now - exports.repeatedOffendersCache.timestamp > 60000)) {
        // We must cast db to any because scanAll is not in IDataRepository interface
        const cases = await db.scanAll('CaseMaster');
        const allAccused = await db.getAllAccused();
        const personMap = new Map();
        const caseMap = new Map();
        cases.forEach((c) => caseMap.set(Number(c.CaseMasterID), c));
        allAccused.forEach(acc => {
            if (!acc.PersonID || acc.PersonID === "")
                return;
            const c = caseMap.get(Number(acc.CaseMasterID));
            if (!c)
                return;
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
            // Ensure we don't count the same case twice for the same person (e.g. if listed multiple times in Accused table)
            if (!record.Cases.find((existing) => existing.CaseMasterID === c.CaseMasterID)) {
                record.TotalCases += 1;
                if (c.CaseStatusID === 2 || c.CaseStatusID === 6) {
                    record.ClosedCases += 1;
                }
                else {
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
        // Repeat offenders are defined globally as those with more than 1 case total.
        let repeatOffenders = Array.from(personMap.values()).filter(p => p.TotalCases > 1);
        repeatOffenders = repeatOffenders.map(p => {
            p.Cases.sort((a, b) => new Date(a.CrimeRegisteredDate).getTime() - new Date(b.CrimeRegisteredDate).getTime());
            p.FirstCaseDate = p.Cases[0]?.CrimeRegisteredDate;
            p.LatestCaseDate = p.Cases[p.Cases.length - 1]?.CrimeRegisteredDate;
            p.CrimeCategories = Array.from(new Set(p.Cases.map((c) => Number(c.CrimeMajorHeadID)))).filter(id => id);
            p.Districts = Array.from(new Set(p.Cases.map((c) => Number(c.DistrictID || c.PoliceStationID)))).filter(id => id);
            p.Stations = Array.from(new Set(p.Cases.map((c) => Number(c.PoliceStationID)))).filter(id => id);
            const gravities = p.Cases.map((c) => Number(c.GravityOffenceID)).filter((id) => !isNaN(id) && id > 0);
            p.MaxGravity = gravities.length > 0 ? Math.min(...gravities) : 99;
            return p;
        });
        exports.repeatedOffendersCache.data = repeatOffenders;
        exports.repeatedOffendersCache.timestamp = now;
    }
    return exports.repeatedOffendersCache.data || [];
};
exports.getRepeatedOffenders = getRepeatedOffenders;
