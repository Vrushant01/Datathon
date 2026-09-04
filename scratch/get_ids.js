const { RepositoryFactory } = require('../backend/dist/repositories/RepositoryFactory');
const { getCatalystApp } = require('../backend/dist/repositories/CloudScaleRepository'); // Check if this is exported or we can just use the repository

async function getHighestIds() {
  const req = { headers: {} };
  const db = RepositoryFactory.getRepository(req);
  
  try {
    const cases = await db.getAllCases();
    const accused = await db.scanAll('Accused');
    const victims = await db.scanAll('Victim');
    const complainants = await db.scanAll('Complainant');
    const acts = await db.scanAll('CaseActSection');

    const maxCaseId = Math.max(...cases.map(c => Number(c.CaseMasterID) || 0));
    const maxAccusedId = Math.max(...accused.map(a => Number(a.AccusedMasterID) || 0));
    const maxVictimId = Math.max(...victims.map(v => Number(v.VictimMasterID) || 0));
    const maxComplainantId = Math.max(...complainants.map(c => Number(c.ComplainantMasterID) || 0));
    const maxActId = Math.max(...acts.map(a => Number(a.CaseActSectionID) || 0));
    
    console.log(`Max CaseMasterID: ${maxCaseId}`);
    console.log(`Max AccusedMasterID: ${maxAccusedId}`);
    console.log(`Max VictimMasterID: ${maxVictimId}`);
    console.log(`Max ComplainantMasterID: ${maxComplainantId}`);
    console.log(`Max CaseActSectionID: ${maxActId}`);
  } catch(e) {
    console.error("Error connecting to db", e);
  }
}
getHighestIds();
