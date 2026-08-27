import { District, Unit, Employee, CaseMaster, Accused, Victim, CustomEdge } from '../models';
import { IDataRepository } from './IDataRepository';

export class MongoRepository implements IDataRepository {
  
  async getDistricts(): Promise<any[]> {
    return await District.find().lean();
  }

  async getUnits(districtId?: number): Promise<any[]> {
    if (districtId) {
      return await Unit.find({ DistrictID: districtId }).lean();
    }
    return await Unit.find().lean();
  }

  async getEmployees(): Promise<any[]> {
    return await Employee.find().lean();
  }

  async getCases(filter: any): Promise<any[]> {
    return await CaseMaster.find(filter).lean();
  }

  async createCase(caseData: any): Promise<any> {
    const newCase = new CaseMaster(caseData);
    await newCase.save();
    return newCase.toObject();
  }

  async getCaseById(caseId: number): Promise<any | null> {
    return await CaseMaster.findOne({ CaseMasterID: caseId }).lean();
  }

  async getAllCasesForAnalytics(): Promise<any[]> {
    return await CaseMaster.find({
      latitude: { $nin: [null, 0] },
      longitude: { $nin: [null, 0] }
    }).sort({ CrimeRegisteredDate: -1 }).limit(5000).lean();
  }

  async getAccusedByCase(caseId: number): Promise<any[]> {
    return await Accused.find({ CaseMasterID: caseId }).lean();
  }

  async getVictimsByCase(caseId: number): Promise<any[]> {
    return await Victim.find({ CaseMasterID: caseId }).lean();
  }

  async getCustomEdgesByCase(caseId: number): Promise<any[]> {
    return await CustomEdge.find({ CaseMasterID: caseId }).lean();
  }

  async getRepeatOffenders(): Promise<any[]> {
    return await Accused.aggregate([
      { $match: { PersonID: { $nin: [null, ""] } } },
      { $group: {
          _id: "$PersonID",
          name: { $first: "$AccusedName" },
          offenceCount: { $sum: 1 },
          caseIds: { $push: "$CaseMasterID" }
      }},
      { $match: { offenceCount: { $gt: 1 } } },
      { $sort: { offenceCount: -1, _id: 1 } },
      { $limit: 5 }
    ]);
  }

  async getStationCaseCounts(): Promise<{ stationId: number, count: number }[]> {
    const agg = await CaseMaster.aggregate([
      { $group: { _id: "$PoliceStationID", caseCount: { $sum: 1 } } }
    ]);
    return agg.map(a => ({ stationId: a._id, count: a.caseCount }));
  }

  async getAllAccused(): Promise<any[]> {
    return await Accused.find().lean();
  }

  async getAllVictims(): Promise<any[]> {
    return await Victim.find().lean();
  }

  async getAllCustomEdges(): Promise<any[]> {
    return await CustomEdge.find().lean();
  }

  async getCasesByOfficer(officerId: number): Promise<any[]> {
    return await CaseMaster.find({ PolicePersonID: officerId }).lean();
  }

  async getCasesByStation(stationId: number): Promise<any[]> {
    return await CaseMaster.find({ PoliceStationID: stationId }).lean();
  }
}
