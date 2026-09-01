"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActSectionAssociation = exports.Complainant = exports.CustomEdge = exports.Accused = exports.Victim = exports.CaseMaster = exports.Employee = exports.Unit = exports.UnitType = exports.District = exports.State = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const StateSchema = new mongoose_1.default.Schema({
    StateID: Number,
    StateName: String,
    NationalityID: Number,
    Active: Boolean,
});
const DistrictSchema = new mongoose_1.default.Schema({
    DistrictID: Number,
    DistrictName: String,
    StateID: Number,
    Active: Boolean,
});
const UnitTypeSchema = new mongoose_1.default.Schema({
    UnitTypeID: Number,
    UnitTypeName: String,
    CityDistState: String,
    Hierarchy: Number,
    Active: Boolean,
});
const UnitSchema = new mongoose_1.default.Schema({
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
const EmployeeSchema = new mongoose_1.default.Schema({
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
const CaseMasterSchema = new mongoose_1.default.Schema({
    CaseMasterID: Number,
    CrimeNo: String,
    CaseNo: String,
    CrimeRegisteredDate: String,
    CrimeRegisteredDateTime: String,
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
    GDEntryNumber: String,
    GDEntryTimestamp: String,
    DelayInReporting: Boolean,
    DelayReason: String,
    BNSApplicable: Boolean,
    CrimeSceneLocation: String,
    DistanceDirection: String,
    JurisdictionFlag: String,
    StolenProperty: String,
    InformantSignature: String,
    RecordingOfficerRank: String,
    DispatchCopyHanded: Boolean,
    DispatchCopyDate: String,
});
const EdgeSchema = new mongoose_1.default.Schema({
    EdgeID: String,
    CaseMasterID: Number,
    source: String,
    target: String,
    label: String,
});
const VictimSchema = new mongoose_1.default.Schema({
    VictimMasterID: Number,
    CaseMasterID: Number,
    VictimName: String,
    AgeYear: Number,
    GenderID: Number,
    VictimPolice: String,
    PersonID: String,
    RelationshipToComplainant: String,
});
const AccusedSchema = new mongoose_1.default.Schema({
    AccusedMasterID: Number,
    CaseMasterID: Number,
    AccusedName: String,
    AgeYear: Number,
    GenderID: Number,
    PersonID: String,
    FatherSpouseName: String,
    Address: String,
    Aliases: String,
    PhysicalDescription: String,
    Status: String,
});
const CustomEdgeSchema = new mongoose_1.default.Schema({
    EdgeID: String,
    CaseMasterID: Number,
    source: String,
    target: String,
    label: String,
});
exports.State = mongoose_1.default.model('State', StateSchema);
exports.District = mongoose_1.default.model('District', DistrictSchema);
exports.UnitType = mongoose_1.default.model('UnitType', UnitTypeSchema);
exports.Unit = mongoose_1.default.model('Unit', UnitSchema);
exports.Employee = mongoose_1.default.model('Employee', EmployeeSchema);
exports.CaseMaster = mongoose_1.default.model('CaseMaster', CaseMasterSchema);
exports.Victim = mongoose_1.default.model('Victim', VictimSchema);
exports.Accused = mongoose_1.default.model('Accused', AccusedSchema);
exports.CustomEdge = mongoose_1.default.model('CustomEdge', CustomEdgeSchema);
const ComplainantSchema = new mongoose_1.default.Schema({
    ComplainantID: Number,
    CaseMasterID: Number,
    ComplainantName: String,
    AgeYear: Number,
    OccupationID: Number,
    ReligionID: Number,
    CasteID: Number,
    GenderID: Number,
    FatherSpouseName: String,
    Phone: String,
    PermanentAddress: String,
    IdentityProof: String,
});
exports.Complainant = mongoose_1.default.model('Complainant', ComplainantSchema);
const ActSectionAssociationSchema = new mongoose_1.default.Schema({
    CaseMasterID: Number,
    ActID: String,
    SectionID: String,
    ActOrderID: Number,
    SectionOrderID: Number,
});
exports.ActSectionAssociation = mongoose_1.default.model('ActSectionAssociation', ActSectionAssociationSchema);
