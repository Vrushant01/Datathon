export interface IDataRepository {
  getDistricts(): Promise<any[]>;
  getUnits(districtId?: number): Promise<any[]>;
  getEmployees(): Promise<any[]>;
  
  // Cases & Filtering
  getCases(filter: any): Promise<any[]>;
  getCaseById(caseId: number): Promise<any | null>;
  getAllCasesForAnalytics(): Promise<any[]>;
  createCase(caseData: any): Promise<any>;
  
  // Relationships
  getAccusedByCase(caseId: number): Promise<any[]>;
  getVictimsByCase(caseId: number): Promise<any[]>;
  getCustomEdgesByCase(caseId: number): Promise<any[]>;
  
  // Analytics
  getRepeatOffenders(): Promise<any[]>;
  getStationCaseCounts(): Promise<{ stationId: number, count: number }[]>;
  
  // General Data Dumps
  getAllAccused(): Promise<any[]>;
  getAllVictims(): Promise<any[]>;
  getAllCustomEdges(): Promise<any[]>;
  getComplainants(): Promise<any[]>;
  getActSections(): Promise<any[]>;
  
  // Single Entity queries for cases
  getCasesByOfficer(officerId: number): Promise<any[]>;
  getCasesByStation(stationId: number): Promise<any[]>;
  
  // Case Mutations
  updateCaseStatus(caseId: number, statusId: number, userEmail: string): Promise<boolean>;
  
  // Timeline, Evidence, Chargesheets
  addTimelineNote(note: any): Promise<any>;
  getTimelineNotesByCase(caseId: number): Promise<any[]>;
  uploadEvidence(evidence: any): Promise<any>;
  getEvidenceFilesByCase(caseId: number): Promise<any[]>;
  submitChargesheet(cs: any): Promise<any>;
  getChargesheetsByCase(caseId: number): Promise<any[]>;
  
  // Network Mutations
  addCustomEdge(edge: any): Promise<any>;
  addCaseEntity(entityType: string, entity: any): Promise<any>;
  updateCaseEntity(entityType: string, entity: any): Promise<any>;
  deleteCaseEntity(entityType: string, entityId: number): Promise<boolean>;
}
