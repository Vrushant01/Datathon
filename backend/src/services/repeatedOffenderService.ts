import { IDataRepository } from '../repositories/IDataRepository';

export const repeatedOffendersCache = { data: null as any, timestamp: 0 };

export const getRepeatedOffenders = async (db: IDataRepository) => {
  const now = Date.now();

  if (!repeatedOffendersCache.data || (now - repeatedOffendersCache.timestamp > 60000)) {
    // We must cast db to any because scanAll is not in IDataRepository interface
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
      // Ensure we don't count the same case twice for the same person (e.g. if listed multiple times in Accused table)
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

    // Repeat offenders are defined globally as those with more than 1 case total.
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

  return repeatedOffendersCache.data || [];
};
