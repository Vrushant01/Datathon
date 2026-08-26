import mongoose from 'mongoose';

const StateSchema = new mongoose.Schema({
  StateID: Number,
  StateName: String,
  NationalityID: Number,
  Active: Boolean,
});

const DistrictSchema = new mongoose.Schema({
  DistrictID: Number,
  DistrictName: String,
  StateID: Number,
  Active: Boolean,
});

const UnitTypeSchema = new mongoose.Schema({
  UnitTypeID: Number,
  UnitTypeName: String,
  CityDistState: String,
  Hierarchy: Number,
  Active: Boolean,
});

const UnitSchema = new mongoose.Schema({
  UnitID: Number,
  UnitName: String,
  TypeID: Number,
  ParentUnit: Number,
  NationalityID: Number,
  StateID: Number,
  DistrictID: Number,
  Active: Boolean,
  latitude: Number,
  longitude: Number,
});

const EmployeeSchema = new mongoose.Schema({
  EmployeeID: Number,
  DistrictID: Number,
  UnitID: Number,
  RankID: Number,
  DesignationID: Number,
  KGID: String,
  FirstName: String,
  EmployeeDOB: String,
  GenderID: Number,
  BloodGroupID: Number,
  PhysicallyChallenged: Boolean,
  AppointmentDate: String,
  email: String,
  status: String,
  photo: String,
  contact: String,
});

const CaseMasterSchema = new mongoose.Schema({
  CaseMasterID: Number,
  CrimeNo: String,
  CaseNo: String,
  CrimeRegisteredDate: String,
  PolicePersonID: Number,
  PoliceStationID: Number,
  CaseCategoryID: Number,
  GravityOffenceID: Number,
  CrimeMajorHeadID: Number,
  CrimeMinorHeadID: Number,
  CaseStatusID: Number,
  CourtID: Number,
  IncidentFromDate: String,
  IncidentToDate: String,
  InfoReceivedPSDate: String,
  latitude: Number,
  longitude: Number,
  BriefFacts: String,
});

const EdgeSchema = new mongoose.Schema({
  EdgeID: String,
  CaseMasterID: Number,
  source: String,
  target: String,
  label: String,
});

const VictimSchema = new mongoose.Schema({
  VictimMasterID: Number,
  CaseMasterID: Number,
  VictimName: String,
  AgeYear: Number,
  GenderID: Number,
  VictimPolice: String,
  PersonID: String,
});

const AccusedSchema = new mongoose.Schema({
  AccusedMasterID: Number,
  CaseMasterID: Number,
  AccusedName: String,
  AgeYear: Number,
  GenderID: Number,
  PersonID: String,
});

const CustomEdgeSchema = new mongoose.Schema({
  EdgeID: String,
  CaseMasterID: Number,
  source: String,
  target: String,
  label: String,
});

export const State = mongoose.model('State', StateSchema);
export const District = mongoose.model('District', DistrictSchema);
export const UnitType = mongoose.model('UnitType', UnitTypeSchema);
export const Unit = mongoose.model('Unit', UnitSchema);
export const Employee = mongoose.model('Employee', EmployeeSchema);
export const CaseMaster = mongoose.model('CaseMaster', CaseMasterSchema);
export const Victim = mongoose.model('Victim', VictimSchema);
export const Accused = mongoose.model('Accused', AccusedSchema);
export const CustomEdge = mongoose.model('CustomEdge', CustomEdgeSchema);
