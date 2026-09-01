"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoRepository = void 0;
const models_1 = require("../models");
class MongoRepository {
    async getDistricts() {
        return await models_1.District.find().lean();
    }
    async getUnits(districtId) {
        if (districtId) {
            return await models_1.Unit.find({ DistrictID: districtId }).lean();
        }
        return await models_1.Unit.find().lean();
    }
    async getEmployees() {
        return await models_1.Employee.find().lean();
    }
    async getCases(filter) {
        return await models_1.CaseMaster.find(filter).lean();
    }
    async createCase(caseData) {
        const newCase = new models_1.CaseMaster(caseData);
        await newCase.save();
        return newCase.toObject();
    }
    async getCaseById(caseId) {
        return await models_1.CaseMaster.findOne({ CaseMasterID: caseId }).lean();
    }
    async getAllCasesForAnalytics() {
        return await models_1.CaseMaster.find({
            latitude: { $nin: [null, 0] },
            longitude: { $nin: [null, 0] }
        }).sort({ CrimeRegisteredDate: -1 }).limit(5000).lean();
    }
    async getAccusedByCase(caseId) {
        return await models_1.Accused.find({ CaseMasterID: caseId }).lean();
    }
    async getVictimsByCase(caseId) {
        return await models_1.Victim.find({ CaseMasterID: caseId }).lean();
    }
    async getCustomEdgesByCase(caseId) {
        return await models_1.CustomEdge.find({ CaseMasterID: caseId }).lean();
    }
    async getRepeatOffenders() {
        return await models_1.Accused.aggregate([
            { $match: { PersonID: { $nin: [null, ""] } } },
            { $group: {
                    _id: "$PersonID",
                    name: { $first: "$AccusedName" },
                    offenceCount: { $sum: 1 },
                    caseIds: { $push: "$CaseMasterID" }
                } },
            { $match: { offenceCount: { $gt: 1 } } },
            { $sort: { offenceCount: -1, _id: 1 } },
            { $limit: 5 }
        ]);
    }
    async getStationCaseCounts() {
        const agg = await models_1.CaseMaster.aggregate([
            { $group: { _id: "$PoliceStationID", caseCount: { $sum: 1 } } }
        ]);
        return agg.map(a => ({ stationId: a._id, count: a.caseCount }));
    }
    async getAllAccused() {
        return await models_1.Accused.find().lean();
    }
    async getAllVictims() {
        return await models_1.Victim.find().lean();
    }
    async getAllCustomEdges() {
        return await models_1.CustomEdge.find().lean();
    }
    async getCasesByOfficer(officerId) {
        return await models_1.CaseMaster.find({ PolicePersonID: officerId }).lean();
    }
    async getCasesByStation(stationId) {
        return await models_1.CaseMaster.find({ PoliceStationID: stationId }).lean();
    }
    async updateCaseStatus(caseId, statusId, userEmail) { throw new Error('Not implemented for MongoDB'); }
    async addTimelineNote(note) { throw new Error('Not implemented for MongoDB'); }
    async getTimelineNotesByCase(caseId) { return []; }
    async uploadEvidence(evidence) { throw new Error('Not implemented for MongoDB'); }
    async getEvidenceFilesByCase(caseId) { return []; }
    async submitChargesheet(cs) { throw new Error('Not implemented for MongoDB'); }
    async getChargesheetsByCase(caseId) { return []; }
    async addCustomEdge(edge) { throw new Error('Not implemented for MongoDB'); }
    async addCaseEntity(entityType, entity) { throw new Error('Not implemented for MongoDB'); }
    async updateCaseEntity(entityType, entity) { throw new Error('Not implemented for MongoDB'); }
    async deleteCaseEntity(entityType, entityId) { throw new Error('Not implemented for MongoDB'); }
}
exports.MongoRepository = MongoRepository;
