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
  
  // New Case Update Operations
  updateCase(caseId: number, updateData: CaseUpdatePayload, actorId?: string): Promise<any>;
  reassignCase(caseId: number, targetOfficerId: number, actorId?: string): Promise<boolean>;

  // Audit Logs
  createAuditLog(log: AuditLogPayload): Promise<void>;
  getAuditLogs(filter?: AuditLogFilter): Promise<AuditLogResult>;
}

export interface AuditLogPayload {
  Action: string;
  EntityType: string;
  EntityID: string;
  Description: string;
  ActorID: string;
  OldValue?: string;
  NewValue?: string;
}

export interface AuditLogFilter {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface AuditLog {
  AuditLogID: string;
  Timestamp: string;
  Action: string;
  EntityType: string;
  EntityID: string;
  Description: string;
  ActorID: string;
  OldValue?: string;
  NewValue?: string;
}

export interface AuditLogResult {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  nextCursor?: string;
}

export interface CaseUpdatePayload {
  PoliceStationID?: number;
  CaseCategoryID?: number;
  GravityOffenceID?: number;
  CrimeMajorHeadID?: number;
  CrimeMinorHeadID?: number;
  CaseStatusID?: number;
  CourtID?: number;
  IncidentFromDate?: string;
  IncidentToDate?: string;
  InfoReceivedPSDate?: string;
  latitude?: number;
  longitude?: number;
  BriefFacts?: string;
  GDEntryNumber?: string;
  GDEntryTimestamp?: string;
  DelayInReporting?: boolean;
  DelayReason?: string;
  BNSApplicable?: boolean;
  CrimeSceneLocation?: string;
  DistanceDirection?: string;
  JurisdictionFlag?: 'Inside' | 'Outside';
  StolenProperty?: string;
}
