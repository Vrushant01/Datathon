import { CloudScaleRepository } from './src/repositories/CloudScaleRepository';

(async () => {
  const repo = new CloudScaleRepository({} as any);
  const cases = await repo.getAllCases();
  const majorHeads = new Map();
  const minorHeads = new Map();
  cases.forEach((c: any) => {
    if (c.CrimeMajorHeadID && c.CrimeMajorHeadName) majorHeads.set(c.CrimeMajorHeadID, c.CrimeMajorHeadName);
    if (c.CrimeMinorHeadID && c.CrimeMinorHeadName) minorHeads.set(c.CrimeMinorHeadID, c.CrimeMinorHeadName);
  });
  console.log('MAJOR HEADS:');
  console.log(Object.fromEntries(majorHeads));
})();
