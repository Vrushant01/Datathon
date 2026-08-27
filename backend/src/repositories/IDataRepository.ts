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
  
  // Single Entity queries for cases
  getCasesByOfficer(officerId: number): Promise<any[]>;
  getCasesByStation(stationId: number): Promise<any[]>;
}
