import { SEED_DISTRICTS, SEED_UNITS, SEED_EMPLOYEES, SEED_CASES } from './seedData';

// KSP Mock Database and Client-Side State Manager
// Implements the exact ER Schema of the Karnataka Police Department
// Stores state in LocalStorage for persistence across page reloads

export interface StateRow { StateID: number; StateName: string; NationalityID: number; Active: boolean; }
export interface DistrictRow { DistrictID: number; DistrictName: string; StateID: number; Active: boolean; }
export interface UnitTypeRow { UnitTypeID: number; UnitTypeName: string; CityDistState: string; Hierarchy: number; Active: boolean; }
export interface UnitRow { UnitID: number; UnitName: string; TypeID: number; ParentUnit: number | null; NationalityID: number; StateID: number; DistrictID: number; Active: boolean; latitude?: number; longitude?: number; }
export interface RankRow { RankID: number; RankName: string; Hierarchy: number; Active: boolean; }
export interface DesignationRow { DesignationID: number; DesignationName: string; Active: boolean; SortOrder: number; }
export interface CasteRow { caste_master_id: number; caste_master_name: string; }
export interface ReligionRow { ReligionID: number; ReligionName: string; }
export interface OccupationRow { OccupationID: number; OccupationName: string; }
export interface CaseCategoryRow { CaseCategoryID: number; LookupValue: string; }
export interface GravityOffenceRow { GravityOffenceID: number; LookupValue: string; }
export interface CaseStatusRow { CaseStatusID: number; CaseStatusName: string; }
export interface CourtRow { CourtID: number; CourtName: string; DistrictID: number; StateID: number; Active: boolean; }
export interface CrimeHeadRow { CrimeHeadID: number; CrimeGroupName: string; Active: boolean; }
export interface CrimeSubHeadRow { CrimeSubHeadID: number; CrimeHeadID: number; CrimeHeadName: string; SeqID: number; }
export interface ActRow { ActCode: string; ActDescription: string; ShortName: string; Active: boolean; }
export interface SectionRow { ActCode: string; SectionCode: string; SectionDescription: string; Active: boolean; }
export interface CrimeHeadActSectionRow { CrimeHeadID: number; ActCode: string; SectionCode: string; }

export interface EmployeeRow {
  EmployeeID: number;
  DistrictID: number;
  UnitID: number;
  RankID: number;
  DesignationID: number;
  KGID: string;
  FirstName: string;
  EmployeeDOB: string;
  GenderID: number;
  BloodGroupID: number;
  PhysicallyChallenged: boolean;
  AppointmentDate: string;
  email: string;
  status: 'Active' | 'Suspended'; // custom status for officer management
  photo?: string;
  contact?: string;
}

export interface CaseMasterRow {
  CaseMasterID: number;
  CrimeNo: string;
  CaseNo: string;
  CrimeRegisteredDate: string;
  PolicePersonID: number;
  PoliceStationID: number;
  CaseCategoryID: number;
  GravityOffenceID: number;
  CrimeMajorHeadID: number;
  CrimeMinorHeadID: number;
  CaseStatusID: number;
  CourtID: number;
  IncidentFromDate: string;
  IncidentToDate: string;
  InfoReceivedPSDate: string;
  latitude: number;
  longitude: number;
  BriefFacts: string;
}

export interface CaseEntityRow {
  EntityID: number;
  CaseMasterID: number;
  type: 'Vehicle' | 'Phone' | 'Weapon' | 'Evidence' | 'Bank' | 'Location';
  value: string;
  description?: string;
  added_date?: string;
}

export interface CustomEdgeRow {
  EdgeID: string;
  CaseMasterID: number;
  source: string;
  target: string;
  label?: string;
}

export interface ComplainantRow {
  ComplainantID: number;
  CaseMasterID: number;
  ComplainantName: string;
  AgeYear: number;
  OccupationID: number;
  ReligionID: number;
  CasteID: number;
  GenderID: number;
}

export interface VictimRow {
  VictimMasterID: number;
  CaseMasterID: number;
  VictimName: string;
  AgeYear: number;
  GenderID: number;
  VictimPolice: string; // "1" or "0"
}

export interface AccusedRow {
  AccusedMasterID: number;
  CaseMasterID: number;
  AccusedName: string;
  AgeYear: number;
  GenderID: number;
  PersonID: string; // A1, A2, etc.
}

export interface ActSectionAssociationRow {
  CaseMasterID: number;
  ActID: string;
  SectionID: string;
  ActOrderID: number;
  SectionOrderID: number;
}

export interface ArrestSurrenderRow {
  ArrestSurrenderID: number;
  CaseMasterID: number;
  ArrestSurrenderTypeID: number;
  ArrestSurrenderDate: string;
  ArrestSurrenderStateId: number;
  ArrestSurrenderDistrictId: number;
  PoliceStationID: number;
  IOID: number;
  CourtID: number;
  AccusedMasterID: number;
  IsAccused: boolean;
  IsComplainantAccused: boolean;
}

export interface InvOccuranceTimeRow {
  CaseMasterID: number;
  OccuranceTimeDetails: string;
}

export interface ChargesheetRow {
  CSID: number;
  CaseMasterID: number;
  csdate: string;
  cstype: string; // A, B, C
  PolicePersonID: number;
}

export interface EvidenceFileRow {
  EvidenceID: number;
  CaseMasterID: number;
  file_path: string;
  file_name: string;
  file_type: string;
  uploaded_by: string; // User email or Name
  uploaded_at: string;
}

export interface TimelineNoteRow {
  NoteID: number;
  CaseMasterID: number;
  event_type: string;
  event_title: string;
  description: string;
  created_by: string;
  created_at: string;
}

export interface AuditLogRow {
  LogID: number;
  user_email: string;
  action: string;
  table_name: string;
  record_id: string;
  timestamp: string;
  details: string;
}

export interface NotificationRow {
  id: number;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  recipient_id?: number; // target officer employee ID, or null for admin
}

// -------------------------------------------------------------
// Seed Data Definitions (Matching seed.sql)
// -------------------------------------------------------------

const STATES: StateRow[] = [
  { StateID: 1, StateName: 'Karnataka', NationalityID: 1, Active: true },
  { StateID: 2, StateName: 'Maharashtra', NationalityID: 1, Active: true },
  { StateID: 3, StateName: 'Tamil Nadu', NationalityID: 1, Active: true },
  { StateID: 4, StateName: 'Kerala', NationalityID: 1, Active: true }
];

const DISTRICTS: DistrictRow[] = [
  { DistrictID: 1001, DistrictName: 'Bengaluru City', StateID: 1, Active: true },
  { DistrictID: 1002, DistrictName: 'Mysuru City', StateID: 1, Active: true },
  { DistrictID: 1003, DistrictName: 'Mangaluru City', StateID: 1, Active: true },
  { DistrictID: 1004, DistrictName: 'Belagavi City', StateID: 1, Active: true },
  { DistrictID: 1005, DistrictName: 'Hubballi-Dharwad City', StateID: 1, Active: true },
  { DistrictID: 1006, DistrictName: 'Shivamogga', StateID: 1, Active: true },
  { DistrictID: 1007, DistrictName: 'Udupi', StateID: 1, Active: true }
];

const UNIT_TYPES: UnitTypeRow[] = [
  { UnitTypeID: 1, UnitTypeName: 'Police Station', CityDistState: 'City', Hierarchy: 4, Active: true },
  { UnitTypeID: 2, UnitTypeName: 'Circle Office', CityDistState: 'District', Hierarchy: 3, Active: true },
  { UnitTypeID: 3, UnitTypeName: 'SDPO Office', CityDistState: 'District', Hierarchy: 2, Active: true },
  { UnitTypeID: 4, UnitTypeName: 'SP Office', CityDistState: 'District', Hierarchy: 1, Active: true }
];

const UNITS: UnitRow[] = [
  { UnitID: 2001, UnitName: 'Cubbon Park PS', TypeID: 1, ParentUnit: null, NationalityID: 1, StateID: 1, DistrictID: 1001, Active: true, latitude: 12.9774, longitude: 77.5960 },
  { UnitID: 2002, UnitName: 'Koramangala PS', TypeID: 1, ParentUnit: null, NationalityID: 1, StateID: 1, DistrictID: 1001, Active: true, latitude: 12.9348, longitude: 77.6189 },
  { UnitID: 2003, UnitName: 'Jayanagar PS', TypeID: 1, ParentUnit: null, NationalityID: 1, StateID: 1, DistrictID: 1001, Active: true, latitude: 12.9298, longitude: 77.5815 },
  { UnitID: 2004, UnitName: 'Indiranagar PS', TypeID: 1, ParentUnit: null, NationalityID: 1, StateID: 1, DistrictID: 1001, Active: true, latitude: 12.9784, longitude: 77.6408 },
  { UnitID: 2005, UnitName: 'Laxmipuram PS', TypeID: 1, ParentUnit: null, NationalityID: 1, StateID: 1, DistrictID: 1002, Active: true, latitude: 12.2987, longitude: 76.6438 },
  { UnitID: 2006, UnitName: 'Devaraja PS', TypeID: 1, ParentUnit: null, NationalityID: 1, StateID: 1, DistrictID: 1002, Active: true, latitude: 12.3087, longitude: 76.6508 },
  { UnitID: 2007, UnitName: 'Kadri PS', TypeID: 1, ParentUnit: null, NationalityID: 1, StateID: 1, DistrictID: 1003, Active: true, latitude: 12.8797, longitude: 74.8569 },
  { UnitID: 2008, UnitName: 'Khade Bazar PS', TypeID: 1, ParentUnit: null, NationalityID: 1, StateID: 1, DistrictID: 1004, Active: true, latitude: 15.8624, longitude: 74.5126 }
];

const RANKS: RankRow[] = [
  { RankID: 1, RankName: 'Constable', Hierarchy: 10, Active: true },
  { RankID: 2, RankName: 'Head Constable', Hierarchy: 9, Active: true },
  { RankID: 3, RankName: 'Assistant Sub-Inspector', Hierarchy: 8, Active: true },
  { RankID: 4, RankName: 'Sub-Inspector', Hierarchy: 7, Active: true },
  { RankID: 5, RankName: 'Inspector', Hierarchy: 6, Active: true },
  { RankID: 6, RankName: 'Deputy Superintendent of Police (DySP)', Hierarchy: 5, Active: true },
  { RankID: 7, RankName: 'Superintendent of Police (SP)', Hierarchy: 4, Active: true },
  { RankID: 8, RankName: 'Inspector General of Police (IGP)', Hierarchy: 3, Active: true }
];

const DESIGNATIONS: DesignationRow[] = [
  { DesignationID: 101, DesignationName: 'Investigating Officer (IO)', Active: true, SortOrder: 1 },
  { DesignationID: 102, DesignationName: 'Station House Officer (SHO)', Active: true, SortOrder: 2 },
  { DesignationID: 103, DesignationName: 'Writer Constable', Active: true, SortOrder: 3 },
  { DesignationID: 104, DesignationName: 'Supervisory Officer', Active: true, SortOrder: 4 }
];

const CASTES: CasteRow[] = [
  { caste_master_id: 1, caste_master_name: 'General' },
  { caste_master_id: 2, caste_master_name: 'Lingayat' },
  { caste_master_id: 3, caste_master_name: 'Vokkaliga' },
  { caste_master_id: 4, caste_master_name: 'Kuruba' },
  { caste_master_id: 5, caste_master_name: 'Scheduled Caste (SC)' },
  { caste_master_id: 6, caste_master_name: 'Scheduled Tribe (ST)' },
  { caste_master_id: 7, caste_master_name: 'Other Backward Classes (OBC)' }
];

const RELIGIONS: ReligionRow[] = [
  { ReligionID: 1, ReligionName: 'Hinduism' },
  { ReligionID: 2, ReligionName: 'Islam' },
  { ReligionID: 3, ReligionName: 'Christianity' },
  { ReligionID: 4, ReligionName: 'Sikhism' },
  { ReligionID: 5, ReligionName: 'Buddhism' },
  { ReligionID: 6, ReligionName: 'Jainism' }
];

const OCCUPATIONS: OccupationRow[] = [
  { OccupationID: 1, OccupationName: 'Farmer / Agriculturalist' },
  { OccupationID: 2, OccupationName: 'Business Owner / Merchant' },
  { OccupationID: 3, OccupationName: 'Private Employee' },
  { OccupationID: 4, OccupationName: 'Government Employee' },
  { OccupationID: 5, OccupationName: 'Unemployed' },
  { OccupationID: 6, OccupationName: 'Student' },
  { OccupationID: 7, OccupationName: 'Daily Wage Laborer' }
];

const CASE_CATEGORIES: CaseCategoryRow[] = [
  { CaseCategoryID: 1, LookupValue: 'FIR (First Information Report)' },
  { CaseCategoryID: 2, LookupValue: 'UDR (Unnatural Death Report)' },
  { CaseCategoryID: 3, LookupValue: 'Zero FIR' },
  { CaseCategoryID: 4, LookupValue: 'PAR (Police Action Report)' }
];

const GRAVITY_OFFENCES: GravityOffenceRow[] = [
  { GravityOffenceID: 1, LookupValue: 'Heinous' },
  { GravityOffenceID: 2, LookupValue: 'Non-Heinous' },
  { GravityOffenceID: 3, LookupValue: 'Petty' },
  { GravityOffenceID: 4, LookupValue: 'Special Case' }
];

const CASE_STATUSES: CaseStatusRow[] = [
  { CaseStatusID: 1, CaseStatusName: 'Under Investigation' },
  { CaseStatusID: 2, CaseStatusName: 'Charge Sheeted' },
  { CaseStatusID: 3, CaseStatusName: 'Closed (False Case)' },
  { CaseStatusID: 4, CaseStatusName: 'Closed (Undetected)' },
  { CaseStatusID: 5, CaseStatusName: 'Re-opened' }
];

const COURTS: CourtRow[] = [
  { CourtID: 3001, CourtName: 'Chief Metropolitan Magistrate Court Bengaluru', DistrictID: 1001, StateID: 1, Active: true },
  { CourtID: 3002, CourtName: 'Fast Track Court-I Bengaluru', DistrictID: 1001, StateID: 1, Active: true },
  { CourtID: 3003, CourtName: 'District & Sessions Court Mysuru', DistrictID: 1002, StateID: 1, Active: true },
  { CourtID: 3004, CourtName: 'JMFC Court Mangaluru', DistrictID: 1003, StateID: 1, Active: true }
];

const CRIME_HEADS: CrimeHeadRow[] = [
  { CrimeHeadID: 100, CrimeGroupName: 'Crimes Against Body', Active: true },
  { CrimeHeadID: 200, CrimeGroupName: 'Crimes Against Property', Active: true },
  { CrimeHeadID: 300, CrimeGroupName: 'Crimes Against Women', Active: true },
  { CrimeHeadID: 400, CrimeGroupName: 'Economic Offences', Active: true },
  { CrimeHeadID: 500, CrimeGroupName: 'Cyber Crimes', Active: true },
  { CrimeHeadID: 600, CrimeGroupName: 'Special and Local Laws (SLL)', Active: true }
];

const CRIME_SUB_HEADS: CrimeSubHeadRow[] = [
  { CrimeSubHeadID: 101, CrimeHeadID: 100, CrimeHeadName: 'Murder (Sec 302 IPC / 103 BNS)', SeqID: 1 },
  { CrimeSubHeadID: 102, CrimeHeadID: 100, CrimeHeadName: 'Attempt to Murder (Sec 307 IPC / 109 BNS)', SeqID: 2 },
  { CrimeSubHeadID: 103, CrimeHeadID: 100, CrimeHeadName: 'Grievous Hurt', SeqID: 3 },
  { CrimeSubHeadID: 201, CrimeHeadID: 200, CrimeHeadName: 'Theft / Larceny', SeqID: 1 },
  { CrimeSubHeadID: 202, CrimeHeadID: 200, CrimeHeadName: 'Robbery', SeqID: 2 },
  { CrimeSubHeadID: 203, CrimeHeadID: 200, CrimeHeadName: 'House Breaking & House Trespass', SeqID: 3 },
  { CrimeSubHeadID: 301, CrimeHeadID: 300, CrimeHeadName: 'Rape', SeqID: 1 },
  { CrimeSubHeadID: 302, CrimeHeadID: 300, CrimeHeadName: 'Dowry Harassment', SeqID: 2 },
  { CrimeSubHeadID: 401, CrimeHeadID: 400, CrimeHeadName: 'Cheating & Forgery', SeqID: 1 },
  { CrimeSubHeadID: 501, CrimeHeadID: 500, CrimeHeadName: 'Phishing / Financial Fraud', SeqID: 1 },
  { CrimeSubHeadID: 601, CrimeHeadID: 600, CrimeHeadName: 'NDPS Act (Drug Trafficking)', SeqID: 1 }
];

const ACTS: ActRow[] = [
  { ActCode: 'IPC', ActDescription: 'Indian Penal Code, 1860', ShortName: 'IPC', Active: true },
  { ActCode: 'BNS', ActDescription: 'Bharatiya Nyaya Sanhita, 2023', ShortName: 'BNS', Active: true },
  { ActCode: 'NDPS', ActDescription: 'Narcotic Drugs and Psychotropic Substances Act, 1985', ShortName: 'NDPS Act', Active: true },
  { ActCode: 'IT_ACT', ActDescription: 'Information Technology Act, 2000', ShortName: 'IT Act', Active: true },
  { ActCode: 'KPA', ActDescription: 'Karnataka Police Act, 1963', ShortName: 'KPA', Active: true }
];

const SECTIONS: SectionRow[] = [
  { ActCode: 'IPC', SectionCode: '302', SectionDescription: 'Punishment for murder', Active: true },
  { ActCode: 'IPC', SectionCode: '307', SectionDescription: 'Attempt to murder', Active: true },
  { ActCode: 'IPC', SectionCode: '379', SectionDescription: 'Punishment for theft', Active: true },
  { ActCode: 'IPC', SectionCode: '392', SectionDescription: 'Punishment for robbery', Active: true },
  { ActCode: 'IPC', SectionCode: '420', SectionDescription: 'Cheating and dishonestly inducing delivery of property', Active: true },
  { ActCode: 'IPC', SectionCode: '498A', SectionDescription: 'Husband or relative of husband of a woman subjecting her to cruelty', Active: true },
  { ActCode: 'BNS', SectionCode: '103', SectionDescription: 'Punishment for murder (under BNS)', Active: true },
  { ActCode: 'BNS', SectionCode: '109', SectionDescription: 'Attempt to murder (under BNS)', Active: true },
  { ActCode: 'NDPS', SectionCode: '20', SectionDescription: 'Punishment for contravention in relation to cannabis plant and cannabis', Active: true },
  { ActCode: 'IT_ACT', SectionCode: '66D', SectionDescription: 'Punishment for cheating by personation by using computer resource', Active: true }
];

const CRIME_HEAD_ACT_SECTIONS: CrimeHeadActSectionRow[] = [
  { CrimeHeadID: 100, ActCode: 'IPC', SectionCode: '302' },
  { CrimeHeadID: 100, ActCode: 'IPC', SectionCode: '307' },
  { CrimeHeadID: 100, ActCode: 'BNS', SectionCode: '103' },
  { CrimeHeadID: 100, ActCode: 'BNS', SectionCode: '109' },
  { CrimeHeadID: 200, ActCode: 'IPC', SectionCode: '379' },
  { CrimeHeadID: 200, ActCode: 'IPC', SectionCode: '392' },
  { CrimeHeadID: 300, ActCode: 'IPC', SectionCode: '498A' },
  { CrimeHeadID: 400, ActCode: 'IPC', SectionCode: '420' },
  { CrimeHeadID: 500, ActCode: 'IT_ACT', SectionCode: '66D' },
  { CrimeHeadID: 600, ActCode: 'NDPS', SectionCode: '20' }
];

const EMPLOYEES: EmployeeRow[] = [
  {
    EmployeeID: 9001, DistrictID: 1001, UnitID: 2001, RankID: 5, DesignationID: 102,
    KGID: 'KGID883492', FirstName: 'Venkatesh Prasad', EmployeeDOB: '1978-05-12',
    GenderID: 1, BloodGroupID: 3, PhysicallyChallenged: false, AppointmentDate: '2002-06-01',
    email: 'admin@ksp.gov.in', status: 'Active', contact: '+91 94408 20192'
  },
  {
    EmployeeID: 9002, DistrictID: 1001, UnitID: 2002, RankID: 4, DesignationID: 101,
    KGID: 'KGID901234', FirstName: 'Vrushant Patil', EmployeeDOB: '1985-08-20',
    GenderID: 1, BloodGroupID: 2, PhysicallyChallenged: false, AppointmentDate: '2010-09-15',
    email: '9002@ksp.gov.in', status: 'Active', contact: '+91 98450 12345'
  },
  {
    EmployeeID: 9003, DistrictID: 1001, UnitID: 2002, RankID: 1, DesignationID: 103,
    KGID: 'KGID920199', FirstName: 'Shivani Gowda', EmployeeDOB: '1992-11-03',
    GenderID: 2, BloodGroupID: 1, PhysicallyChallenged: false, AppointmentDate: '2016-04-10',
    email: '9003@ksp.gov.in', status: 'Active', contact: '+91 99001 88765'
  }
];

const CASES: CaseMasterRow[] = [
  {
    CaseMasterID: 50001, CrimeNo: '110012002202600001', CaseNo: '202600001', CrimeRegisteredDate: '2026-03-10',
    PolicePersonID: 9002, PoliceStationID: 2002, CaseCategoryID: 1, GravityOffenceID: 1,
    CrimeMajorHeadID: 100, CrimeMinorHeadID: 101, CaseStatusID: 1, CourtID: 3001,
    IncidentFromDate: '2026-03-09T23:30:00', IncidentToDate: '2026-03-10T01:00:00', InfoReceivedPSDate: '2026-03-10T03:15:00',
    latitude: 12.935242, longitude: 77.624478,
    BriefFacts: 'A severe altercation broke out in Koramangala 5th Block during a commercial dispute, leading to physical assault with a sharp weapon. The victim sustained critical neck injuries. Suspect fled the scene.'
  },
  {
    CaseMasterID: 50002, CrimeNo: '110012002202600002', CaseNo: '202600002', CrimeRegisteredDate: '2026-04-02',
    PolicePersonID: 9002, PoliceStationID: 2002, CaseCategoryID: 1, GravityOffenceID: 2,
    CrimeMajorHeadID: 200, CrimeMinorHeadID: 202, CaseStatusID: 1, CourtID: 3001,
    IncidentFromDate: '2026-04-01T20:15:00', IncidentToDate: '2026-04-01T21:00:00', InfoReceivedPSDate: '2026-04-02T08:30:00',
    latitude: 12.927923, longitude: 77.618032,
    BriefFacts: 'Robbery of a luxury gold chain worth 1.5 Lakhs at gunpoint from a resident walking near Koramangala park. Suspects were on a Pulsar motorcycle (no plate).'
  },
  {
    CaseMasterID: 50003, CrimeNo: '110012001202600003', CaseNo: '202600003', CrimeRegisteredDate: '2026-05-15',
    PolicePersonID: 9001, PoliceStationID: 2001, CaseCategoryID: 1, GravityOffenceID: 1,
    CrimeMajorHeadID: 600, CrimeMinorHeadID: 601, CaseStatusID: 2, CourtID: 3002,
    IncidentFromDate: '2026-05-15T14:00:00', IncidentToDate: '2026-05-15T15:30:00', InfoReceivedPSDate: '2026-05-15T16:00:00',
    latitude: 12.976378, longitude: 77.592837,
    BriefFacts: 'Based on credible intelligence, a raid was conducted near Cubbon Park metro station, resulting in the seizure of 2.4 kilograms of high-grade Ganja. Two offenders arrested.'
  },
  {
    CaseMasterID: 50004, CrimeNo: '110012002202600004', CaseNo: '202600004', CrimeRegisteredDate: '2026-06-18',
    PolicePersonID: 9002, PoliceStationID: 2002, CaseCategoryID: 1, GravityOffenceID: 3,
    CrimeMajorHeadID: 500, CrimeMinorHeadID: 501, CaseStatusID: 1, CourtID: 3001,
    IncidentFromDate: '2026-06-15T09:00:00', IncidentToDate: '2026-06-17T18:00:00', InfoReceivedPSDate: '2026-06-18T10:00:00',
    latitude: 12.931252, longitude: 77.632120,
    BriefFacts: 'Victim received phishing calls purporting to be from KSP Cyber Cell, inducing him to share Aadhaar and banking OTPs. Total fraud amount: 80,000 INR.'
  }
];

const COMPLAINANTS: ComplainantRow[] = [
  { ComplainantID: 60001, CaseMasterID: 50001, ComplainantName: 'Rajesh Kumar Gowda', AgeYear: 42, OccupationID: 2, ReligionID: 1, CasteID: 3, GenderID: 1 },
  { ComplainantID: 60002, CaseMasterID: 50002, ComplainantName: 'Priya Shastry', AgeYear: 29, OccupationID: 3, ReligionID: 1, CasteID: 1, GenderID: 2 },
  { ComplainantID: 60003, CaseMasterID: 50003, ComplainantName: 'Venkatesh Prasad', AgeYear: 48, OccupationID: 4, ReligionID: 1, CasteID: 1, GenderID: 1 },
  { ComplainantID: 60004, CaseMasterID: 50004, ComplainantName: 'Amit Nair', AgeYear: 34, OccupationID: 3, ReligionID: 1, CasteID: 1, GenderID: 1 }
];

const VICTIMS: VictimRow[] = [
  { VictimMasterID: 70001, CaseMasterID: 50001, VictimName: 'Suresh Kumar Gowda', AgeYear: 38, GenderID: 1, VictimPolice: '0' },
  { VictimMasterID: 70002, CaseMasterID: 50002, VictimName: 'Priya Shastry', AgeYear: 29, GenderID: 2, VictimPolice: '0' },
  { VictimMasterID: 70003, CaseMasterID: 50003, VictimName: 'State of Karnataka', AgeYear: 0, GenderID: 1, VictimPolice: '1' },
  { VictimMasterID: 70004, CaseMasterID: 50004, VictimName: 'Amit Nair', AgeYear: 34, GenderID: 1, VictimPolice: '0' }
];

const ACCUSED: AccusedRow[] = [
  { AccusedMasterID: 80001, CaseMasterID: 50001, AccusedName: 'Harish Murthy alias "Kariya"', AgeYear: 35, GenderID: 1, PersonID: 'A1' },
  { AccusedMasterID: 80002, CaseMasterID: 50002, AccusedName: 'Unknown Motorcyclists', AgeYear: 25, GenderID: 1, PersonID: 'A1' },
  { AccusedMasterID: 80003, CaseMasterID: 50003, AccusedName: 'Imran Khan', AgeYear: 28, GenderID: 1, PersonID: 'A1' },
  { AccusedMasterID: 80004, CaseMasterID: 50003, AccusedName: 'Rahman Shaikh', AgeYear: 30, GenderID: 1, PersonID: 'A2' },
  { AccusedMasterID: 80005, CaseMasterID: 50004, AccusedName: 'Manoj Kumar (Phishing caller ID)', AgeYear: 30, GenderID: 1, PersonID: 'A1' },
  { AccusedMasterID: 80006, CaseMasterID: 50002, AccusedName: 'Harish Murthy alias "Kariya"', AgeYear: 35, GenderID: 1, PersonID: 'A2' },
  { AccusedMasterID: 80007, CaseMasterID: 50004, AccusedName: 'Imran Khan', AgeYear: 28, GenderID: 1, PersonID: 'A2' }
];

const ACT_SECTIONS: ActSectionAssociationRow[] = [
  { CaseMasterID: 50001, ActID: 'IPC', SectionID: '307', ActOrderID: 1, SectionOrderID: 1 },
  { CaseMasterID: 50002, ActID: 'IPC', SectionID: '392', ActOrderID: 1, SectionOrderID: 1 },
  { CaseMasterID: 50003, ActID: 'NDPS', SectionID: '20', ActOrderID: 1, SectionOrderID: 1 },
  { CaseMasterID: 50004, ActID: 'IT_ACT', SectionID: '66D', ActOrderID: 1, SectionOrderID: 1 }
];

const ARREST_SURRENDERS: ArrestSurrenderRow[] = [
  {
    ArrestSurrenderID: 40001, CaseMasterID: 50003, ArrestSurrenderTypeID: 1, ArrestSurrenderDate: '2026-05-15',
    ArrestSurrenderStateId: 1, ArrestSurrenderDistrictId: 1001, PoliceStationID: 2001, IOID: 9001,
    CourtID: 3002, AccusedMasterID: 80003, IsAccused: true, IsComplainantAccused: false
  },
  {
    ArrestSurrenderID: 40002, CaseMasterID: 50003, ArrestSurrenderTypeID: 1, ArrestSurrenderDate: '2026-05-15',
    ArrestSurrenderStateId: 1, ArrestSurrenderDistrictId: 1001, PoliceStationID: 2001, IOID: 9001,
    CourtID: 3002, AccusedMasterID: 80004, IsAccused: true, IsComplainantAccused: false
  }
];

const CHARGESHEETS: ChargesheetRow[] = [
  { CSID: 1, CaseMasterID: 50003, csdate: '2026-06-05T11:00:00', cstype: 'A', PolicePersonID: 9001 }
];

const CASE_ENTITIES: CaseEntityRow[] = [
  { EntityID: 1, CaseMasterID: 50001, type: 'Weapon', value: 'Sharp carving knife' },
  { EntityID: 2, CaseMasterID: 50001, type: 'Location', value: 'Koramangala Safehouse' },
  { EntityID: 3, CaseMasterID: 50002, type: 'Vehicle', value: 'Black SUV (KA-03-MM-9999)' },
  { EntityID: 4, CaseMasterID: 50002, type: 'Bank', value: 'SBI Acc...4112' },
  { EntityID: 5, CaseMasterID: 50003, type: 'Location', value: 'Mangaluru Port' },
  { EntityID: 6, CaseMasterID: 50003, type: 'Vehicle', value: 'Truck (KA-19-F-4321)' },
  { EntityID: 7, CaseMasterID: 50004, type: 'Phone', value: '+91-9988776655' },
  { EntityID: 8, CaseMasterID: 50004, type: 'Bank', value: 'HDFC Acc...9081' }
];

const TIMELINE_NOTES: TimelineNoteRow[] = [
  { NoteID: 1001, CaseMasterID: 50001, event_type: 'FIR Registered', event_title: 'FIR Registered Successfully', description: 'FIR registered based on the statement given by Rajesh Kumar Gowda at 03:15 AM on 2026-03-10.', created_by: 'System', created_at: '2026-03-10T03:30:00' },
  { NoteID: 1002, CaseMasterID: 50001, event_type: 'Note Added', event_title: 'Spot Mahazar Conducted', description: 'Visiting the scene of crime in Koramangala 5th block. Spot sketch drawn. Confiscated broken glass fragments and hair samples for forensic review.', created_by: 'Vrushant Patil', created_at: '2026-03-10T10:30:00' },
  { NoteID: 1003, CaseMasterID: 50002, event_type: 'FIR Registered', event_title: 'FIR Registered', description: 'Case registered under IPC Section 392 (Robbery). CCTV footages of nearby commercial buildings collected.', created_by: 'System', created_at: '2026-04-02T09:00:00' },
  { NoteID: 1004, CaseMasterID: 50003, event_type: 'FIR Registered', event_title: 'Narcotics Raid FIR Registered', description: 'Registered direct state case after metro station raid.', created_by: 'System', created_at: '2026-05-15T16:30:00' },
  { NoteID: 1005, CaseMasterID: 50003, event_type: 'Status Changed', event_title: 'Chargesheet Prepared', description: 'Completed investigation, compiled forensic laboratory reports for seized Ganja, and prepared chargesheet for court submittal.', created_by: 'Venkatesh Prasad', created_at: '2026-06-04T15:00:00' }
];

const AUDIT_LOGS: AuditLogRow[] = [
  { LogID: 1, user_email: 'admin@ksp.gov.in', action: 'CREATE_OFFICER', table_name: 'Employee', record_id: '9002', timestamp: '2026-01-10T10:00:00', details: 'Added new Police Officer Vrushant Patil' },
  { LogID: 2, user_email: 'admin@ksp.gov.in', action: 'CREATE_OFFICER', table_name: 'Employee', record_id: '9003', timestamp: '2026-01-11T11:15:00', details: 'Added new Police Officer Shivani Gowda' }
];

const NOTIFICATIONS: NotificationRow[] = [
  { id: 1, title: 'Case Assignment', message: 'You have been assigned Case No. 202600001 (IPC Sec 307 - Attempt to Murder)', timestamp: '2026-03-10T03:30:00', read: false, recipient_id: 9002 },
  { id: 2, title: 'New Case Assigned', message: 'You have been assigned Case No. 202600002 (IPC Sec 392 - Robbery)', timestamp: '2026-04-02T09:00:00', read: false, recipient_id: 9002 },
  { id: 3, title: 'Evidence Uploaded', message: 'Officer Vrushant uploaded new crime scene photos for Case No. 202600001', timestamp: '2026-03-11T12:00:00', read: false }
];

const EVIDENCE_FILES: EvidenceFileRow[] = [];

// -------------------------------------------------------------
// Database State Manager
// -------------------------------------------------------------

export interface DbState {
  states: StateRow[];
  districts: DistrictRow[];
  unitTypes: UnitTypeRow[];
  units: UnitRow[];
  ranks: RankRow[];
  designations: DesignationRow[];
  castes: CasteRow[];
  religions: ReligionRow[];
  occupations: OccupationRow[];
  caseCategories: CaseCategoryRow[];
  gravityOffences: GravityOffenceRow[];
  caseStatuses: CaseStatusRow[];
  courts: CourtRow[];
  crimeHeads: CrimeHeadRow[];
  crimeSubHeads: CrimeSubHeadRow[];
  acts: ActRow[];
  sections: SectionRow[];
  crimeHeadActSections: CrimeHeadActSectionRow[];
  employees: EmployeeRow[];
  cases: CaseMasterRow[];
  complainants: ComplainantRow[];
  victims: VictimRow[];
  accused: AccusedRow[];
  actSections: ActSectionAssociationRow[];
  arrestSurrenders: ArrestSurrenderRow[];
  chargesheets: ChargesheetRow[];
  evidenceFiles: EvidenceFileRow[];
  timelineNotes: TimelineNoteRow[];
  auditLogs: AuditLogRow[];
  notifications: NotificationRow[];
  caseEntities: CaseEntityRow[];
  customEdges: CustomEdgeRow[];
}

const FIRST_NAMES_MALE = ['Rajesh', 'Suresh', 'Amit', 'Ramesh', 'Ravi', 'Vikram', 'Prakash', 'Sunil', 'Vijay', 'Rahul', 'Manoj', 'Dinesh', 'Sanjay', 'Kiran', 'Deepak', 'Anand', 'Naveen', 'Prashant', 'Santosh', 'Mahesh'];
const FIRST_NAMES_FEMALE = ['Priya', 'Kavita', 'Neha', 'Pooja', 'Anjali', 'Sneha', 'Geeta', 'Laxmi', 'Anita', 'Sunita', 'Rekha', 'Meena', 'Aarti', 'Radha', 'Komal', 'Swati', 'Divya', 'Shweta', 'Shilpa', 'Pallavi'];
const LAST_NAMES = ['Kumar', 'Singh', 'Sharma', 'Gowda', 'Patil', 'Nair', 'Reddy', 'Deshmukh', 'Joshi', 'Yadav', 'Gupta', 'Rao', 'Iyer', 'Menon', 'Hegde', 'Kulkarni', 'Bhat', 'Naidu', 'Chavan', 'Kadam'];
const CRIME_FACTS = [
  'Suspect arrested for possession of illegal narcotics during a routine traffic stop.',
  'Accused caught red-handed attempting to break into a commercial establishment at night.',
  'Victim reported a cyber fraud where OTP was shared over a deceptive phone call.',
  'Domestic dispute escalated into physical assault, leading to neighbor calling the police.',
  'Two-wheeler stolen from residential parking lot during the early hours of the morning.',
  'Gang involved in chain-snatching apprehended after CCTV footage analysis.',
  'Illegal gambling den raided by local police after receiving a tip-off from informants.',
  'Accused involved in a hit-and-run incident resulting in grievous injuries to the victim.',
  'Financial dispute led to kidnapping and ransom demands by known associates.',
  'Suspect detained for smuggling illicit liquor across state borders in a transport truck.'
];

const getMaleName = (i: number) => `${FIRST_NAMES_MALE[i % FIRST_NAMES_MALE.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`;
const getFemaleName = (i: number) => `${FIRST_NAMES_FEMALE[i % FIRST_NAMES_FEMALE.length]} ${LAST_NAMES[(i * 5) % LAST_NAMES.length]}`;
const getName = (i: number, genderId: number) => genderId === 1 ? getMaleName(i) : getFemaleName(i);
const getFact = (i: number) => CRIME_FACTS[i % CRIME_FACTS.length];

const STORAGE_KEY = 'ksp_crime_platform_db_v20';

const defaultState: DbState = {
  states: STATES,
  districts: [],
  unitTypes: UNIT_TYPES,
  units: [],
  ranks: RANKS,
  designations: DESIGNATIONS,
  castes: CASTES,
  religions: RELIGIONS,
  occupations: OCCUPATIONS,
  caseCategories: CASE_CATEGORIES,
  gravityOffences: GRAVITY_OFFENCES,
  caseStatuses: CASE_STATUSES,
  courts: COURTS,
  crimeHeads: CRIME_HEADS,
  crimeSubHeads: CRIME_SUB_HEADS,
  acts: ACTS,
  sections: SECTIONS,
  crimeHeadActSections: CRIME_HEAD_ACT_SECTIONS,
  employees: [],
  cases: [],
  complainants: [],
  victims: [],
  accused: [],
  actSections: ACT_SECTIONS,
  arrestSurrenders: ARREST_SURRENDERS,
  chargesheets: CHARGESHEETS,
  evidenceFiles: EVIDENCE_FILES,
  timelineNotes: TIMELINE_NOTES,
  auditLogs: AUDIT_LOGS,
  notifications: NOTIFICATIONS,
  caseEntities: CASE_ENTITIES,
  customEdges: []
};


export type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'local';
export let dbConnectionStatus: ConnectionStatus = 'connecting';
export let dbConnectionError: string | null = null;
export let dbDataLoaded: boolean = false;

type DbStatusListener = (status: ConnectionStatus) => void;
const dbListeners: DbStatusListener[] = [];
export const subscribeToDbStatus = (listener: DbStatusListener) => {
  dbListeners.push(listener);
  return () => {
    const idx = dbListeners.indexOf(listener);
    if (idx > -1) dbListeners.splice(idx, 1);
  };
};
const setDbStatus = (status: ConnectionStatus, error: string | null = null, dataLoaded: boolean = dbDataLoaded) => {
  dbConnectionStatus = status;
  dbConnectionError = error;
  dbDataLoaded = dataLoaded;
  dbListeners.forEach(l => l(status));
};

const ALL_CAMEL_KEYS = [
  'StateID', 'StateName', 'NationalityID', 'Active',
  'DistrictID', 'DistrictName',
  'UnitTypeID', 'UnitTypeName', 'CityDistState', 'Hierarchy',
  'UnitID', 'UnitName', 'TypeID', 'ParentUnit',
  'RankID', 'RankName',
  'DesignationID', 'DesignationName', 'SortOrder',
  'EmployeeID', 'KGID', 'FirstName', 'EmployeeDOB', 'GenderID', 'BloodGroupID', 'PhysicallyChallenged', 'AppointmentDate',
  'CaseMasterID', 'CrimeNo', 'CaseNo', 'CrimeRegisteredDate', 'PolicePersonID', 'PoliceStationID', 'CaseCategoryID', 'GravityOffenceID', 'CrimeMajorHeadID', 'CrimeMinorHeadID', 'CaseStatusID', 'CourtID', 'IncidentFromDate', 'IncidentToDate', 'InfoReceivedPSDate', 'BriefFacts',
  'ComplainantID', 'ComplainantName', 'AgeYear', 'OccupationID', 'ReligionID', 'CasteID',
  'VictimMasterID', 'VictimName', 'VictimPolice',
  'AccusedMasterID', 'AccusedName', 'PersonID',
  'ActOrderID', 'SectionOrderID',
  'ArrestSurrenderID', 'ArrestSurrenderTypeID', 'ArrestSurrenderDate', 'ArrestSurrenderStateId', 'ArrestSurrenderDistrictId', 'IOID', 'IsAccused', 'IsComplainantAccused',
  'CSID', 'EvidenceID', 'LogID', 'EntityID',
  'ActCode', 'ActDescription', 'ShortName', 'SectionCode', 'SectionDescription'
];

export const mapToCamelCase = (row: any): any => {
  if (!row) return row;
  const mapped: any = {};
  for (const key of Object.keys(row)) {
    const lowerKey = key.toLowerCase();
    const camelKey = ALL_CAMEL_KEYS.find(k => k.toLowerCase() === lowerKey);
    if (camelKey) {
      mapped[camelKey] = row[key];
    } else {
      mapped[key] = row[key];
    }
  }
  return mapped;
};

export const mapToLowercase = (row: any): any => {
  if (!row) return row;
  const mapped: any = {};
  for (const key of Object.keys(row)) {
    mapped[key.toLowerCase()] = row[key];
  }
  return mapped;
};

const cleanPayload = (table: string, record: any) => {
  const clean = { ...record };
  if (table === 'Employee') {
    delete clean.status;
    delete clean.contact;
  }
  return clean;
};



const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

let isSyncing = false;
let pollingInterval: any = null;

export const syncFromMongo = async (): Promise<void> => {
  if (isSyncing) return;
  isSyncing = true;
  
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }

  try {
    console.log('[DB] startup');
    setDbStatus('connecting', null, false);
    
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    
    // 1. Health check with retries
    console.log(`[DB] health check started URL: ${API_BASE_URL}/api/health`);
    let isHealthy = false;
    const backoff = [1000, 2000, 4000, 8000];
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const healthRes = await fetchWithTimeout(`${API_BASE_URL}/api/health`, {}, 10000);
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          console.log(`[DB] health check response:`, healthData);
          if (healthData.success && healthData.database === 'connected') {
            isHealthy = true;
            break;
          }
        } else {
          console.log(`[DB] health check response NOT OK: ${healthRes.status}`);
        }
      } catch (e: any) {
        console.warn(`[DB] health check failed attempt ${attempt}:`, e.message);
      }
      if (attempt < 5) {
        console.log(`[DB] retry #${attempt + 1}...`);
        await wait(backoff[attempt - 1] || 8000);
      }
    }

    if (!isHealthy) {
      throw new Error('Unable to verify database connection after 5 attempts.');
    }

    // Health check succeeded - mark as LIVE immediately
    console.log('[DB] LIVE');
    setDbStatus('connected', null, false);

    // 2. Fetch data (no longer blocks the connection status)
    console.log('[Dashboard] stats request started');
    const fetchTable = async (route: string) => {
      try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/${route}`, {}, 10000);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
      } catch (e: any) {
        console.warn(`[Dashboard] stats failed to fetch ${route}:`, e.message || e);
        return null;
      }
    };

    const [
      districts,
      units,
      employees,
      cases,
      victims,
      accused,
      customEdges
    ] = await Promise.all([
      fetchTable('districts'),
      fetchTable('units'),
      fetchTable('employees'),
      fetchTable('cases'),
      fetchTable('victims'),
      fetchTable('accused'),
      fetchTable('customedges')
    ]);

    console.log('[Dashboard] stats response: Data loaded successfully');

    const state = loadDbState();

    // Update in-memory state
    if (districts && districts.length > 0) state.districts = districts;
    if (units && units.length > 0) state.units = units;
    if (employees && employees.length > 0) {
      state.employees = employees.map((emp: any) => {
        const existing = state.employees.find(e => e.EmployeeID === emp.EmployeeID);
        return {
          ...emp,
          status: existing?.status || 'Active',
          contact: existing?.contact || '+91 90123 45678'
        };
      });
    }
    if (cases && cases.length > 0) state.cases = cases;
    if (victims && victims.length > 0) state.victims = victims;
    if (accused && accused.length > 0) state.accused = accused;
    if (customEdges && customEdges.length > 0) state.customEdges = customEdges;

    saveDbState(state);
    
    // Notify that data is fully loaded
    setDbStatus('connected', null, true);
    console.log('[MongoDB Sync] Complete. Local cache synchronized.');
  } catch (err: any) {
    setDbStatus('error', err.message || err, false);
    console.error('[MongoDB Sync Error] Failed to pull live data:', err.message || err);
    
    // Start background recovery polling every 30s
    if (!pollingInterval) {
      pollingInterval = setInterval(() => {
        console.log('[MongoDB Sync] Background polling for recovery...');
        syncFromMongo();
      }, 30000);
    }
  } finally {
    isSyncing = false;
  }
};

let memoryDbState: DbState | null = null;

export const loadDbState = (): DbState => {
  if (memoryDbState) return memoryDbState;
  
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ksp_crime_platform_db_v')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    } catch (e) {
      console.warn('Failed to save to localStorage. The dataset might be too large.', e);
    }
    memoryDbState = defaultState;
    return defaultState;
  }
  try {
    const parsed = JSON.parse(data);
    memoryDbState = { ...defaultState, ...parsed };
    return memoryDbState;
  } catch (e) {
    memoryDbState = defaultState;
    return defaultState;
  }
};

export const saveDbState = (state: DbState): void => {
  memoryDbState = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save to localStorage (exceeded quota). Using in-memory store instead.', e);
  }
};

export const resetDbState = (): void => {
  memoryDbState = defaultState;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
  } catch (e) {
    console.warn('Failed to save to localStorage. The dataset might be too large.', e);
  }
};

// -------------------------------------------------------------
// Database Query APIs (Fully Type-safe simulated Supabase queries)
// -------------------------------------------------------------

export const mockDb = {
  // Cases Queries
  getCases: () => {
    const state = loadDbState();
    return [...state.cases].sort((a, b) => b.CaseMasterID - a.CaseMasterID);
  },

  getCaseDetails: (caseId: number) => {
    const state = loadDbState();
    const c = state.cases.find(item => item.CaseMasterID === caseId);
    if (!c) return null;

    return {
      ...c,
      Complainant: state.complainants.find(item => item.CaseMasterID === caseId) || null,
      Victims: state.victims.filter(item => item.CaseMasterID === caseId),
      Accused: state.accused.filter(item => item.CaseMasterID === caseId),
      Acts: state.actSections.filter(item => item.CaseMasterID === caseId),
      Arrests: state.arrestSurrenders.filter(item => item.CaseMasterID === caseId),
      Chargesheet: state.chargesheets.find(item => item.CaseMasterID === caseId) || null,
      Evidence: state.evidenceFiles.filter(item => item.CaseMasterID === caseId),
      Timeline: state.timelineNotes.filter(item => item.CaseMasterID === caseId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    };
  },

  createCase: (
    caseData: Omit<CaseMasterRow, 'CaseMasterID' | 'CrimeNo' | 'CaseNo'>,
    complainant: Omit<ComplainantRow, 'ComplainantID' | 'CaseMasterID'>,
    victims: Omit<VictimRow, 'VictimMasterID' | 'CaseMasterID'>[],
    accusedList: Omit<AccusedRow, 'AccusedMasterID' | 'CaseMasterID'>[],
    actSections: Omit<ActSectionAssociationRow, 'CaseMasterID'>[]
  ) => {
    const state = loadDbState();
    const caseId = state.cases.length > 0 ? Math.max(...state.cases.map(c => c.CaseMasterID)) + 1 : 50001;

    // Generate CrimeNo and CaseNo according to official format
    // CrimeNo: 1 digit Case Category + 4 digit District + 4 digit Station (Unit) + 4 digit Year + 5 digit Running Serial
    const categoryCode = caseData.CaseCategoryID.toString().slice(0, 1);
    const districtCode = caseData.PoliceStationID.toString().padStart(4, '0').slice(-4);
    const stationCode = caseData.PoliceStationID.toString().padStart(4, '0').slice(-4);
    const year = new Date(caseData.CrimeRegisteredDate).getFullYear().toString();
    const serialNum = (state.cases.filter(c => c.PoliceStationID === caseData.PoliceStationID).length + 1).toString().padStart(5, '0');
    
    const crimeNo = `${categoryCode}${districtCode}${stationCode}${year}${serialNum}`;
    const caseNo = `${year}${serialNum}`;

    const newCase: CaseMasterRow = {
      ...caseData,
      CaseMasterID: caseId,
      CrimeNo: crimeNo,
      CaseNo: caseNo
    };

    state.cases.push(newCase);

    // Insert Complainant
    const compId = state.complainants.length > 0 ? Math.max(...state.complainants.map(c => c.ComplainantID)) + 1 : 60001;
    state.complainants.push({
      ...complainant,
      ComplainantID: compId,
      CaseMasterID: caseId
    });

    // Insert Victims
    victims.forEach((v, index) => {
      const vId = state.victims.length > 0 ? Math.max(...state.victims.map(item => item.VictimMasterID)) + 1 + index : 70001 + index;
      state.victims.push({
        ...v,
        VictimMasterID: vId,
        CaseMasterID: caseId
      });
    });

    // Insert Accused
    accusedList.forEach((a, index) => {
      const aId = state.accused.length > 0 ? Math.max(...state.accused.map(item => item.AccusedMasterID)) + 1 + index : 80001 + index;
      state.accused.push({
        ...a,
        AccusedMasterID: aId,
        CaseMasterID: caseId,
        PersonID: `A${index + 1}`
      });
    });

    // Insert Acts & Sections
    actSections.forEach((as) => {
      state.actSections.push({
        ...as,
        CaseMasterID: caseId
      });
    });

    // Automatically generate timeline note for registration
    const noteId = state.timelineNotes.length > 0 ? Math.max(...state.timelineNotes.map(n => n.NoteID)) + 1 : 1001;
    const timelineEntry = {
      NoteID: noteId,
      CaseMasterID: caseId,
      event_type: 'FIR Registered',
      event_title: 'FIR Registered Successfully',
      description: `FIR registered officially by Investigating Officer. Assigned to Employee ID ${caseData.PolicePersonID}.`,
      created_by: null,
      created_at: new Date().toISOString()
    };
    state.timelineNotes.push({
      ...timelineEntry,
      created_by: 'System'
    });

    // Log action
    const logId = state.auditLogs.length > 0 ? Math.max(...state.auditLogs.map(l => l.LogID)) + 1 : 1;
    const auditEntry = {
      LogID: logId,
      user_id: null,
      action: 'REGISTER_FIR',
      table_name: 'CaseMaster',
      record_id: caseId.toString(),
      timestamp: new Date().toISOString(),
      details: `Registered FIR No. ${crimeNo}`
    };
    state.auditLogs.push({
      ...auditEntry,
      user_email: 'admin@ksp.gov.in'
    });

    // Add notification to assigned officer
    const notifId = state.notifications.length > 0 ? Math.max(...state.notifications.map(n => n.id)) + 1 : 1;
    state.notifications.push({
      id: notifId,
      title: 'New Case Assigned',
      message: `You have been assigned Case No. ${caseNo} (${crimeNo})`,
      timestamp: new Date().toISOString(),
      read: false,
      recipient_id: caseData.PolicePersonID
    });

    // Add notification to Station Analyst
    state.notifications.push({
      id: notifId + 1,
      title: 'New FIR Registered',
      message: `FIR No. ${caseNo} has been registered at your station and assigned to Officer ID ${caseData.PolicePersonID}.`,
      timestamp: new Date().toISOString(),
      read: false,
      recipient_id: caseData.PoliceStationID
    });

    saveDbState(state);

    // Asynchronously push to Supabase
    victims.forEach((v, index) => {
      const vId = state.victims.find(item => item.CaseMasterID === caseId)?.VictimMasterID || (70001 + index);
    });
    accusedList.forEach((a, index) => {
      const aId = state.accused.find(item => item.CaseMasterID === caseId)?.AccusedMasterID || (80001 + index);
    });
    actSections.forEach((as) => {
    });

    return newCase;
  },

  updateCaseStatus: (caseId: number, statusId: number, officerEmail: string) => {
    const state = loadDbState();
    const cIdx = state.cases.findIndex(item => item.CaseMasterID === caseId);
    if (cIdx === -1) return false;

    const oldStatus = state.caseStatuses.find(s => s.CaseStatusID === state.cases[cIdx].CaseStatusID)?.CaseStatusName;
    state.cases[cIdx].CaseStatusID = statusId;
    const newStatus = state.caseStatuses.find(s => s.CaseStatusID === statusId)?.CaseStatusName;

    // Add timeline note
    const noteId = state.timelineNotes.length > 0 ? Math.max(...state.timelineNotes.map(n => n.NoteID)) + 1 : 1001;
    const timelineEntry = {
      NoteID: noteId,
      CaseMasterID: caseId,
      event_type: 'Status Changed',
      event_title: `Status Updated to: ${newStatus}`,
      description: `Investigation status changed from "${oldStatus}" to "${newStatus}".`,
      created_by: null,
      created_at: new Date().toISOString()
    };
    state.timelineNotes.push({
      ...timelineEntry,
      created_by: officerEmail
    });

    // Add log
    const logId = state.auditLogs.length > 0 ? Math.max(...state.auditLogs.map(l => l.LogID)) + 1 : 1;
    const auditEntry = {
      LogID: logId,
      user_id: null,
      action: 'UPDATE_CASE_STATUS',
      table_name: 'CaseMaster',
      record_id: caseId.toString(),
      timestamp: new Date().toISOString(),
      details: `Status updated from ${oldStatus} to ${newStatus}`
    };
    state.auditLogs.push({
      ...auditEntry,
      user_email: officerEmail
    });

    saveDbState(state);

    // Push updates to Supabase

    return true;
  },

  deleteCase: (caseId: number) => {
    const state = loadDbState();
    state.cases = state.cases.filter(c => c.CaseMasterID !== caseId);
    state.complainants = state.complainants.filter(c => c.CaseMasterID !== caseId);
    state.victims = state.victims.filter(c => c.CaseMasterID !== caseId);
    state.accused = state.accused.filter(c => c.CaseMasterID !== caseId);
    state.actSections = state.actSections.filter(c => c.CaseMasterID !== caseId);
    state.arrestSurrenders = state.arrestSurrenders.filter(c => c.CaseMasterID !== caseId);
    state.chargesheets = state.chargesheets.filter(c => c.CaseMasterID !== caseId);
    state.evidenceFiles = state.evidenceFiles.filter(c => c.CaseMasterID !== caseId);
    state.timelineNotes = state.timelineNotes.filter(c => c.CaseMasterID !== caseId);

    // Add log
    const logId = state.auditLogs.length > 0 ? Math.max(...state.auditLogs.map(l => l.LogID)) + 1 : 1;
    const auditEntry = {
      LogID: logId,
      user_id: null,
      action: 'DELETE_CASE',
      table_name: 'CaseMaster',
      record_id: caseId.toString(),
      timestamp: new Date().toISOString(),
      details: `Deleted Case Master ID ${caseId}`
    };
    state.auditLogs.push({
      ...auditEntry,
      user_email: 'admin@ksp.gov.in'
    });

    saveDbState(state);

    // Push deletion to Supabase

    return true;
  },

  transferCase: (caseId: number, targetOfficerId: number) => {
    const state = loadDbState();
    const cIdx = state.cases.findIndex(item => item.CaseMasterID === caseId);
    if (cIdx === -1) return false;

    const oldOfficer = state.employees.find(e => e.EmployeeID === state.cases[cIdx].PolicePersonID)?.FirstName;
    const newOfficer = state.employees.find(e => e.EmployeeID === targetOfficerId);

    if (!newOfficer) return false;

    state.cases[cIdx].PolicePersonID = targetOfficerId;

    // Timeline note
    const noteId = state.timelineNotes.length > 0 ? Math.max(...state.timelineNotes.map(n => n.NoteID)) + 1 : 1001;
    state.timelineNotes.push({
      NoteID: noteId,
      CaseMasterID: caseId,
      event_type: 'Case Transferred',
      event_title: 'Case Transferred / Re-assigned',
      description: `Case investigation ownership transferred from Officer ${oldOfficer} to Officer ${newOfficer.FirstName}.`,
      created_by: 'Admin',
      created_at: new Date().toISOString()
    });

    // Notif
    const notifId = state.notifications.length > 0 ? Math.max(...state.notifications.map(n => n.id)) + 1 : 1;
    state.notifications.push({
      id: notifId,
      title: 'Case Assigned (Transfer)',
      message: `Case No. ${state.cases[cIdx].CaseNo} has been transferred and assigned to you.`,
      timestamp: new Date().toISOString(),
      read: false,
      recipient_id: targetOfficerId
    });

    // Notify Analyst
    state.notifications.push({
      id: notifId + 1,
      title: 'Case Transferred',
      message: `Case No. ${state.cases[cIdx].CaseNo} was transferred from Officer ${oldOfficer} to Officer ${newOfficer.FirstName}.`,
      timestamp: new Date().toISOString(),
      read: false,
      recipient_id: state.cases[cIdx].PoliceStationID
    });

    saveDbState(state);

    // Persist change to MongoDB
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    try {
      fetch(`${API_BASE_URL}/api/cases/${caseId}/reassign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerId: targetOfficerId })
      }).catch(err => console.error('Failed to update Mongo DB', err));
    } catch (error) { console.error(error); }

    return true;
  },

  // Timeline / Notes Queries
  addTimelineNote: (caseId: number, note: Omit<TimelineNoteRow, 'NoteID' | 'CaseMasterID' | 'created_at'>) => {
    const state = loadDbState();
    const noteId = state.timelineNotes.length > 0 ? Math.max(...state.timelineNotes.map(n => n.NoteID)) + 1 : 1001;
    
    const newNote: TimelineNoteRow = {
      ...note,
      NoteID: noteId,
      CaseMasterID: caseId,
      created_at: new Date().toISOString()
    };

    state.timelineNotes.push(newNote);
    saveDbState(state);
    return newNote;
  },

  // Evidence Queries
  uploadEvidence: (caseId: number, file_name: string, file_type: string, file_path: string, officerName: string) => {
    const state = loadDbState();
    const evId = state.evidenceFiles.length > 0 ? Math.max(...state.evidenceFiles.map(e => e.EvidenceID)) + 1 : 1;

    const newEvidence: EvidenceFileRow = {
      EvidenceID: evId,
      CaseMasterID: caseId,
      file_path: file_path,
      file_name: file_name,
      file_type: file_type,
      uploaded_by: officerName,
      uploaded_at: new Date().toISOString()
    };

    state.evidenceFiles.push(newEvidence);

    // Add Timeline Note
    const noteId = state.timelineNotes.length > 0 ? Math.max(...state.timelineNotes.map(n => n.NoteID)) + 1 : 1001;
    state.timelineNotes.push({
      NoteID: noteId,
      CaseMasterID: caseId,
      event_type: 'Evidence Uploaded',
      event_title: `Evidence Added: ${file_name}`,
      description: `Uploaded evidence attachment of type ${file_type}. File securely saved in KSP Locker.`,
      created_by: officerName,
      created_at: new Date().toISOString()
    });

    saveDbState(state);
    return newEvidence;
  },

  // Chargesheet Queries
  submitChargesheet: (chargesheetData: Omit<ChargesheetRow, 'CSID'>, officerEmail: string) => {
    const state = loadDbState();
    const csId = state.chargesheets.length > 0 ? Math.max(...state.chargesheets.map(c => c.CSID)) + 1 : 1;

    const newCS: ChargesheetRow = {
      ...chargesheetData,
      CSID: csId
    };

    state.chargesheets.push(newCS);

    // Update case status to "Charge Sheeted" (CaseStatusID = 2)
    const cIdx = state.cases.findIndex(c => c.CaseMasterID === chargesheetData.CaseMasterID);
    if (cIdx !== -1) {
      state.cases[cIdx].CaseStatusID = 2;
    }

    // Add Timeline Note
    const noteId = state.timelineNotes.length > 0 ? Math.max(...state.timelineNotes.map(n => n.NoteID)) + 1 : 1001;
    state.timelineNotes.push({
      NoteID: noteId,
      CaseMasterID: chargesheetData.CaseMasterID,
      event_type: 'Chargesheet Filed',
      event_title: 'Chargesheet Filed in Court',
      description: `Final Chargesheet (Report Type: ${chargesheetData.cstype === 'A' ? 'A (Chargesheet)' : chargesheetData.cstype === 'B' ? 'B (False Case)' : 'C (Undetected)'}) officially filed and dispatched to Court.`,
      created_by: officerEmail,
      created_at: new Date().toISOString()
    });

    // Add Log
    const logId = state.auditLogs.length > 0 ? Math.max(...state.auditLogs.map(l => l.LogID)) + 1 : 1;
    state.auditLogs.push({
      LogID: logId,
      user_email: officerEmail,
      action: 'FILE_CHARGESHEET',
      table_name: 'ChargesheetDetails',
      record_id: csId.toString(),
      timestamp: new Date().toISOString(),
      details: `Chargesheet filed for Case ID ${chargesheetData.CaseMasterID}`
    });

    saveDbState(state);
    return newCS;
  },

  // Officer / Employee Management
  getEmployees: () => {
    const state = loadDbState();
    return state.employees;
  },

  createEmployee: (employeeData: Omit<EmployeeRow, 'EmployeeID' | 'status'>) => {
    const state = loadDbState();
    const empId = state.employees.length > 0 ? Math.max(...state.employees.map(e => e.EmployeeID)) + 1 : 9001;

    const newEmp: EmployeeRow = {
      ...employeeData,
      EmployeeID: empId,
      status: 'Active'
    };

    state.employees.push(newEmp);

    // Audit log
    const logId = state.auditLogs.length > 0 ? Math.max(...state.auditLogs.map(l => l.LogID)) + 1 : 1;
    const auditEntry = {
      LogID: logId,
      user_id: null,
      action: 'ADD_OFFICER',
      table_name: 'Employee',
      record_id: empId.toString(),
      timestamp: new Date().toISOString(),
      details: `Created new officer profile for ${employeeData.FirstName} (KGID: ${employeeData.KGID})`
    };
    state.auditLogs.push({
      ...auditEntry,
      user_email: 'admin@ksp.gov.in'
    });

    saveDbState(state);
    return newEmp;
  },

  updateEmployee: (employeeId: number, update: Partial<EmployeeRow>) => {
    const state = loadDbState();
    const empIdx = state.employees.findIndex(e => e.EmployeeID === employeeId);
    if (empIdx === -1) return false;

    state.employees[empIdx] = {
      ...state.employees[empIdx],
      ...update
    };

    // Audit log
    const logId = state.auditLogs.length > 0 ? Math.max(...state.auditLogs.map(l => l.LogID)) + 1 : 1;
    const auditEntry = {
      LogID: logId,
      user_id: null,
      action: 'UPDATE_OFFICER',
      table_name: 'Employee',
      record_id: employeeId.toString(),
      timestamp: new Date().toISOString(),
      details: `Updated officer profile details for ${state.employees[empIdx].FirstName}`
    };
    state.auditLogs.push({
      ...auditEntry,
      user_email: 'admin@ksp.gov.in'
    });

    saveDbState(state);
    return true;
  },

  deleteEmployee: (employeeId: number) => {
    const state = loadDbState();
    const emp = state.employees.find(e => e.EmployeeID === employeeId);
    if (!emp) return false;

    state.employees = state.employees.filter(e => e.EmployeeID !== employeeId);

    // Audit log
    const logId = state.auditLogs.length > 0 ? Math.max(...state.auditLogs.map(l => l.LogID)) + 1 : 1;
    const auditEntry = {
      LogID: logId,
      user_id: null,
      action: 'DELETE_OFFICER',
      table_name: 'Employee',
      record_id: employeeId.toString(),
      timestamp: new Date().toISOString(),
      details: `Deleted officer profile: ${emp.FirstName} (KGID: ${emp.KGID})`
    };
    state.auditLogs.push({
      ...auditEntry,
      user_email: 'admin@ksp.gov.in'
    });

    saveDbState(state);
    return true;
  },

  suspendEmployee: (employeeId: number) => {
    const state = loadDbState();
    const empIdx = state.employees.findIndex(e => e.EmployeeID === employeeId);
    if (empIdx === -1) return false;

    const currentStatus = state.employees[empIdx].status;
    const nextStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
    state.employees[empIdx].status = nextStatus;

    // Audit log
    const logId = state.auditLogs.length > 0 ? Math.max(...state.auditLogs.map(l => l.LogID)) + 1 : 1;
    state.auditLogs.push({
      LogID: logId,
      user_email: 'admin@ksp.gov.in',
      action: nextStatus === 'Suspended' ? 'SUSPEND_OFFICER' : 'ACTIVATE_OFFICER',
      table_name: 'Employee',
      record_id: employeeId.toString(),
      timestamp: new Date().toISOString(),
      details: `${nextStatus === 'Suspended' ? 'Suspended' : 'Activated'} officer ${state.employees[empIdx].FirstName}`
    });

    // Notifications
    const notifId = state.notifications.length > 0 ? Math.max(...state.notifications.map(n => n.id)) + 1 : 1;
    state.notifications.push({
      id: notifId,
      title: `Account ${nextStatus}`,
      message: `Your officer account has been ${nextStatus === 'Suspended' ? 'suspended' : 'activated'}.`,
      timestamp: new Date().toISOString(),
      read: false,
      recipient_id: employeeId
    });
    
    state.notifications.push({
      id: notifId + 1,
      title: `Officer ${nextStatus}`,
      message: `Officer ${state.employees[empIdx].FirstName} (ID: ${employeeId}) has been ${nextStatus === 'Suspended' ? 'suspended' : 'activated'}.`,
      timestamp: new Date().toISOString(),
      read: false,
      recipient_id: state.employees[empIdx].UnitID
    });

    saveDbState(state);
    return true;
  },

  // Audit Logs & Notifications Queries
  getAuditLogs: () => {
    const state = loadDbState();
    return (state.auditLogs || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  getNotifications: (officerId?: number) => {
    const state = loadDbState();
    if (officerId) {
      return (state.notifications || []).filter(n => n.recipient_id === officerId || !n.recipient_id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return (state.notifications || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  markNotificationsAsRead: (officerId?: number) => {
    const state = loadDbState();
    state.notifications = state.notifications.map(n => {
      // If no officerId (Admin), mark all read. If officerId, mark theirs and global as read.
      if (!officerId || n.recipient_id === officerId || !n.recipient_id) {
        return { ...n, read: true };
      }
      return n;
    });
    saveDbState(state);
  },

  createNotification: (title: string, message: string, recipientId?: number) => {
    const state = loadDbState();
    if (!state.notifications) state.notifications = [];
    const notifId = state.notifications.length > 0 ? Math.max(...state.notifications.map((n: any) => n.id)) + 1 : 1;
    const newNotif = {
      id: notifId,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      recipient_id: recipientId
    };
    state.notifications.push(newNotif);
    saveDbState(state);
    return newNotif;
  },

  addAuditLog: (action: string, tableName: string, recordId: string, details: string, userEmail: string) => {
    const state = loadDbState();
    const logId = state.auditLogs.length > 0 ? Math.max(...state.auditLogs.map(l => l.LogID)) + 1 : 1;
    const auditEntry = {
      LogID: logId,
      user_id: null,
      action,
      table_name: tableName,
      record_id: recordId,
      timestamp: new Date().toISOString(),
      details
    };
    state.auditLogs.push({
      ...auditEntry,
      user_email: userEmail
    });
    saveDbState(state);
    return auditEntry;
  },

  // Metadata tables accessors (Read Only)
  getStates: () => loadDbState().states,
  getDistricts: () => loadDbState().districts,
  getUnitTypes: () => loadDbState().unitTypes,
  getUnits: () => loadDbState().units,
  createUnit: (data: Partial<UnitRow>): UnitRow => {
    const state = loadDbState();
    const newId = state.units.length > 0 ? Math.max(...state.units.map(u => u.UnitID)) + 1 : 2000;
    const newUnit: UnitRow = {
      UnitID: newId,
      UnitName: data.UnitName || 'New Unit',
      TypeID: data.TypeID || 1, // Default Police Station
      ParentUnit: data.ParentUnit || null,
      NationalityID: data.NationalityID || 1,
      StateID: data.StateID || 1,
      DistrictID: data.DistrictID || 1001,
      Active: data.Active !== undefined ? data.Active : true,
      latitude: data.latitude,
      longitude: data.longitude
    };
    state.units.push(newUnit);
    saveDbState(state);
    return newUnit;
  },
  getRanks: () => loadDbState().ranks,
  getDesignations: () => loadDbState().designations,
  getCastes: () => loadDbState().castes,
  getReligions: () => loadDbState().religions,
  getOccupations: () => loadDbState().occupations,
  getCaseCategories: () => loadDbState().caseCategories,
  getGravityOffences: () => loadDbState().gravityOffences,
  getCaseStatuses: () => loadDbState().caseStatuses,
  getCourts: () => loadDbState().courts,
  getCrimeHeads: () => loadDbState().crimeHeads,
  getCrimeSubHeads: () => loadDbState().crimeSubHeads,
  getActs: () => loadDbState().acts,
  getSections: () => loadDbState().sections,
  getComplainants: () => loadDbState().complainants,
  getVictims: () => loadDbState().victims,
  getAccused: () => loadDbState().accused,
  getCaseEntities: (caseId: number) => {
    const state = loadDbState();
    return (state.caseEntities || []).filter(e => e.CaseMasterID === caseId);
  },
  addCaseEntity: (caseId: number, type: 'Vehicle' | 'Phone' | 'Weapon' | 'Evidence' | 'Bank' | 'Location', value: string, description: string | undefined, userEmail: string) => {
    const state = loadDbState();
    if (!state.caseEntities) state.caseEntities = [];
    const entId = state.caseEntities.length > 0 ? Math.max(...state.caseEntities.map(e => e.EntityID)) + 1 : 1;
    const newEnt: CaseEntityRow = { EntityID: entId, CaseMasterID: caseId, type, value, description, added_date: new Date().toISOString() };
    state.caseEntities.push(newEnt);
    
    const noteId = state.timelineNotes.length > 0 ? Math.max(...state.timelineNotes.map(n => n.NoteID)) + 1 : 1001;
    const timelineEntry = {
      NoteID: noteId,
      CaseMasterID: caseId,
      event_type: 'Note Added',
      event_title: `Entity Associated: ${type}`,
      description: `Associated node "${value}" of type ${type} to case records.`,
      created_by: null,
      created_at: new Date().toISOString()
    };
    state.timelineNotes.push({
      ...timelineEntry,
      created_by: userEmail
    });

    saveDbState(state);
    return newEnt;
  },
  deleteCaseEntity: (entityId: number, userEmail: string) => {
    const state = loadDbState();
    if (!state.caseEntities) return false;
    const ent = state.caseEntities.find(e => e.EntityID === entityId);
    if (!ent) return false;
    state.caseEntities = state.caseEntities.filter(e => e.EntityID !== entityId);
    
    const noteId = state.timelineNotes.length > 0 ? Math.max(...state.timelineNotes.map(n => n.NoteID)) + 1 : 1001;
    const timelineEntry = {
      NoteID: noteId,
      CaseMasterID: ent.CaseMasterID,
      event_type: 'Note Added',
      event_title: `Entity De-associated: ${ent.type}`,
      description: `Removed node "${ent.value}" of type ${ent.type} from case records.`,
      created_by: null,
      created_at: new Date().toISOString()
    };
    state.timelineNotes.push({
      ...timelineEntry,
      created_by: userEmail
    });

    saveDbState(state);
    return true;
  },
  updateCaseEntity: (entityId: number, value: string, description: string, userEmail: string) => {
    const state = loadDbState();
    if (!state.caseEntities) return false;
    const ent = state.caseEntities.find(e => e.EntityID === entityId);
    if (!ent) return false;
    ent.value = value;
    ent.description = description;

    const noteId = state.timelineNotes.length > 0 ? Math.max(...state.timelineNotes.map(n => n.NoteID)) + 1 : 1001;
    const timelineEntry = {
      NoteID: noteId,
      CaseMasterID: ent.CaseMasterID,
      event_type: 'Note Added',
      event_title: `Entity Updated: ${ent.type}`,
      description: `Updated node "${ent.value}" of type ${ent.type}.`,
      created_by: userEmail,
      created_at: new Date().toISOString()
    };
    state.timelineNotes.push(timelineEntry);

    saveDbState(state);
    return true;
  },
  getCustomEdges: (caseId: number) => {
    const state = loadDbState();
    return (state.customEdges || []).filter(e => e.CaseMasterID === caseId);
  },
  addCustomEdge: (caseId: number, source: string, target: string, label: string) => {
    const state = loadDbState();
    if (!state.customEdges) state.customEdges = [];
    const newEdge = { EdgeID: `${source}-${target}-${Date.now()}`, CaseMasterID: caseId, source, target, label };
    state.customEdges.push(newEdge);
    saveDbState(state);
    // Optionally push to supabase if needed
    return newEdge;
  },
  deleteCustomEdge: (edgeId: string) => {
    const state = loadDbState();
    if (!state.customEdges) return false;
    state.customEdges = state.customEdges.filter(e => e.EdgeID !== edgeId);
    saveDbState(state);
    return true;
  },
  addCaseAccused: (caseId: number, accusedName: string, age: number, genderId: number, userEmail: string) => {
    const state = loadDbState();
    const accId = state.accused.length > 0 ? Math.max(...state.accused.map(a => a.AccusedMasterID)) + 1 : 80001;
    const personPrefix = `A${state.accused.filter(a => a.CaseMasterID === caseId).length + 1}`;
    const newAcc = { AccusedMasterID: accId, CaseMasterID: caseId, AccusedName: accusedName, AgeYear: age, GenderID: genderId, PersonID: personPrefix };
    state.accused.push(newAcc);

    const noteId = state.timelineNotes.length > 0 ? Math.max(...state.timelineNotes.map(n => n.NoteID)) + 1 : 1001;
    const timelineEntry = {
      NoteID: noteId,
      CaseMasterID: caseId,
      event_type: 'Note Added',
      event_title: `Accused Added: ${accusedName}`,
      description: `Enrolled new suspect/accused "${accusedName}" (Age: ${age}) to case records.`,
      created_by: null,
      created_at: new Date().toISOString()
    };
    state.timelineNotes.push({
      ...timelineEntry,
      created_by: userEmail
    });

    saveDbState(state);
    return newAcc;
  },
  deleteCaseAccused: (accusedId: number, userEmail: string) => {
    const state = loadDbState();
    const acc = state.accused.find(a => a.AccusedMasterID === accusedId);
    if (!acc) return false;
    state.accused = state.accused.filter(a => a.AccusedMasterID !== accusedId);

    const noteId = state.timelineNotes.length > 0 ? Math.max(...state.timelineNotes.map(n => n.NoteID)) + 1 : 1001;
    const timelineEntry = {
      NoteID: noteId,
      CaseMasterID: acc.CaseMasterID,
      event_type: 'Note Added',
      event_title: `Accused Removed: ${acc.AccusedName}`,
      description: `Removed suspect/accused "${acc.AccusedName}" from case records.`,
      created_by: null,
      created_at: new Date().toISOString()
    };
    state.timelineNotes.push({
      ...timelineEntry,
      created_by: userEmail
    });

    saveDbState(state);
    return true;
  },
  updateCaseAccused: (accusedId: number, name: string, age: number, genderId: number, userEmail: string) => {
    const state = loadDbState();
    const acc = state.accused.find(a => a.AccusedMasterID === accusedId);
    if (!acc) return false;
    
    acc.AccusedName = name;
    acc.AgeYear = age;
    acc.GenderID = genderId;

    const noteId = state.timelineNotes.length > 0 ? Math.max(...state.timelineNotes.map(n => n.NoteID)) + 1 : 1001;
    const timelineEntry = {
      NoteID: noteId,
      CaseMasterID: acc.CaseMasterID,
      event_type: 'Note Added',
      event_title: `Accused Updated: ${name}`,
      description: `Updated details for suspect "${name}" (Age: ${age}).`,
      created_by: userEmail,
      created_at: new Date().toISOString()
    };
    state.timelineNotes.push(timelineEntry);

    saveDbState(state);
    return true;
  },
  updateCaseVictim: (victimId: number, name: string, age: number, genderId: number, userEmail: string) => {
    const state = loadDbState();
    const vic = state.victims.find(v => v.VictimMasterID === victimId);
    if (!vic) return false;
    
    vic.VictimName = name;
    vic.AgeYear = age;
    vic.GenderID = genderId;

    const noteId = state.timelineNotes.length > 0 ? Math.max(...state.timelineNotes.map(n => n.NoteID)) + 1 : 1001;
    const timelineEntry = {
      NoteID: noteId,
      CaseMasterID: vic.CaseMasterID,
      event_type: 'Note Added',
      event_title: `Victim Updated: ${name}`,
      description: `Updated details for victim "${name}" (Age: ${age}).`,
      created_by: userEmail,
      created_at: new Date().toISOString()
    };
    state.timelineNotes.push(timelineEntry);

    saveDbState(state);
    return true;
  }
};
