import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, AlertTriangle, Activity, Database, 
  Search, SlidersHorizontal, ArrowLeftRight, Eye, ShieldAlert,
  MapPin, Calendar, Clock, History, User, FileText, X
} from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import { mockDb } from '../../utils/mockDb';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const RepeatedOffenders: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [minCases, setMinCases] = useState<number>(2);
  const [filterDistrict, setFilterDistrict] = useState<number | 'ALL'>('ALL');
  const [filterStation, setFilterStation] = useState<number | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<number | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<number | 'ALL'>('ALL');

  // Master lists
  const districts = mockDb.getDistricts();
  const stations = mockDb.getUnits().filter(u => u.TypeID === 1);
  const categories = mockDb.getCrimeHeads();
  const caseStatuses = mockDb.getCaseStatuses();
  const gravityList = mockDb.getGravityOffences();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/repeated-offenders`);
      setData(response.data);
    } catch (e: any) {
      console.error(e);
      setError('Failed to load repeated offenders data.');
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------
  // Data Processing
  // -----------------------------------------------------
  const processedData = useMemo(() => {
    return data.filter(offender => {
      // 1. Min Cases Filter
      if (offender.TotalCases < minCases) return false;

      // 2. Text Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!offender.AccusedName.toLowerCase().includes(q) && !offender.PersonID.toLowerCase().includes(q)) {
          return false;
        }
      }

      // 3. District
      if (filterDistrict !== 'ALL' && !offender.Districts.includes(filterDistrict)) return false;

      // 4. Station
      if (filterStation !== 'ALL' && !offender.Stations.includes(filterStation)) return false;

      // 5. Category
      if (filterCategory !== 'ALL' && !offender.CrimeCategories.includes(filterCategory)) return false;

      // 6. Status (Active/Closed approximation for filtering)
      if (filterStatus !== 'ALL') {
        const hasStatus = offender.Cases.some((c: any) => c.CaseStatusID === filterStatus);
        if (!hasStatus) return false;
      }

      return true;
    });
  }, [data, minCases, searchQuery, filterDistrict, filterStation, filterCategory, filterStatus]);

  // Statistics
  const totalOffenders = processedData.length;
  const totalRepeatCases = processedData.reduce((acc, curr) => acc + curr.TotalCases, 0);
  const highRiskCount = processedData.filter(p => p.MaxGravity === 1 || p.MaxGravity === 2).length;
  
  let mostActive = { AccusedName: 'N/A', TotalCases: 0 };
  if (processedData.length > 0) {
    mostActive = processedData.reduce((prev, current) => (prev.TotalCases > current.TotalCases) ? prev : current);
  }

  // Details Modal
  const [selectedOffender, setSelectedOffender] = useState<any | null>(null);

  const getSeverityLabel = (gravityId: number) => {
    const rec = gravityList.find(g => g.GravityOffenceID === gravityId);
    if (!rec) return 'Unknown';
    return rec.GravityOffenceName;
  };

  const getSeverityColor = (gravityId: number) => {
    if (gravityId === 1) return 'bg-red-100 text-red-700 border-red-200';
    if (gravityId === 2) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (gravityId === 3) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase">
            <Users size={24} className="text-ksp-gold" />
            Repeated Offender Intelligence
          </h1>
          <p className="text-sm text-slate-500 font-medium tracking-wide mt-1 uppercase">
            Identify, Analyze and Monitor Recidivist Offenders
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ksp-gold"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle size={24} />
          <span className="font-semibold">{error}</span>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Repeated Offenders</p>
                <p className="text-2xl font-black text-slate-800">{totalOffenders}</p>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <Database size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Repeat Cases</p>
                <p className="text-2xl font-black text-slate-800">{totalRepeatCases}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                <ShieldAlert size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">High-Risk Offenders</p>
                <p className="text-2xl font-black text-slate-800">{highRiskCount}</p>
                <p className="text-[10px] text-slate-400 font-medium">Heinous / Grave</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Most Active</p>
                <p className="text-lg font-black text-slate-800 truncate" title={mostActive.AccusedName}>{mostActive.AccusedName}</p>
                <p className="text-[10px] text-slate-400 font-medium">{mostActive.TotalCases} associated FIRs</p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-grow min-w-[200px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Search ID / Name</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search offenders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="w-32">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Min Cases</label>
                <input
                  type="number"
                  min="2"
                  value={minCases}
                  onChange={(e) => setMinCases(parseInt(e.target.value) || 2)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="w-40">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">District</label>
                <select
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Districts</option>
                  {districts.map(d => (
                    <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
                  ))}
                </select>
              </div>

              <div className="w-48">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Station</label>
                <select
                  value={filterStation}
                  onChange={(e) => setFilterStation(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Stations</option>
                  {stations.filter(s => filterDistrict === 'ALL' || s.DistrictID === filterDistrict).map(s => (
                    <option key={s.UnitID} value={s.UnitID}>{s.UnitName}</option>
                  ))}
                </select>
              </div>
              
              <div className="w-40">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Crime Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => (
                    <option key={c.CrimeHeadID} value={c.CrimeHeadID}>{c.CrimeGroupName}</option>
                  ))}
                </select>
              </div>

              <div className="w-40">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status (Includes)</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  {caseStatuses.map(s => (
                    <option key={s.CaseStatusID} value={s.CaseStatusID}>{s.CaseStatusName}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={() => {
                  setSearchQuery('');
                  setMinCases(2);
                  setFilterDistrict('ALL');
                  setFilterStation('ALL');
                  setFilterCategory('ALL');
                  setFilterStatus('ALL');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-semibold transition"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4">Offender Profile</th>
                    <th className="p-4 text-center">Total FIRs</th>
                    <th className="p-4 text-center">Active / Closed</th>
                    <th className="p-4">Highest Severity</th>
                    <th className="p-4">First Offence</th>
                    <th className="p-4">Latest Offence</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {processedData.length > 0 ? (
                    processedData.map((offender, idx) => (
                      <tr key={offender.PersonID} className="border-b border-slate-100 hover:bg-blue-50/50 transition">
                        <td className="p-4">
                          <p className="font-bold text-slate-800">{offender.AccusedName}</p>
                          <p className="text-xs text-slate-500 font-mono">ID: {offender.PersonID}</p>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-md">
                            {offender.TotalCases}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{offender.ActiveCases} Act</span>
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{offender.ClosedCases} Cls</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-1 border rounded text-[10px] font-bold uppercase tracking-wider ${getSeverityColor(offender.MaxGravity)}`}>
                            {getSeverityLabel(offender.MaxGravity)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Calendar size={14} className="text-slate-400" />
                            {offender.FirstCaseDate?.split('T')[0] || 'N/A'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Clock size={14} className="text-slate-400" />
                            {offender.LatestCaseDate?.split('T')[0] || 'N/A'}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => setSelectedOffender(offender)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition"
                          >
                            <Eye size={14} /> Profile
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                        No repeated offenders found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Details Modal */}
      {selectedOffender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
            
            {/* Modal Header */}
            <div className="bg-ksp-navy text-white p-5 flex justify-between items-center shrink-0 border-b-4 border-ksp-gold">
              <div>
                <h2 className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
                  <User size={20} className="text-ksp-gold" />
                  {selectedOffender.AccusedName}
                </h2>
                <p className="text-xs text-slate-300 font-mono mt-1">Person ID: {selectedOffender.PersonID}</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate(`/admin-portal/firs?personId=${selectedOffender.PersonID}`)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <FileText size={14} /> VIEW CASES
                </button>
                <button 
                  onClick={() => navigate(`/admin-portal/gis?personId=${selectedOffender.PersonID}`)}
                  className="px-3 py-1.5 bg-ksp-gold hover:bg-yellow-500 text-ksp-navy rounded font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <MapPin size={14} /> VIEW ON GIS
                </button>
                <button 
                  onClick={() => setSelectedOffender(null)}
                  className="p-1 hover:bg-white/10 rounded-full transition ml-2 text-slate-300 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto bg-slate-50 flex-grow">
              
              {/* Summary Strip */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Incidents</p>
                  <p className="text-lg font-black text-slate-800">{selectedOffender.TotalCases}</p>
                </div>
                <div className="w-px bg-slate-200"></div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Status</p>
                  <p className="text-lg font-black text-blue-600">{selectedOffender.ActiveCases} Active</p>
                </div>
                <div className="w-px bg-slate-200"></div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Max Severity</p>
                  <span className={`mt-1 inline-block px-2 py-0.5 border rounded text-[10px] font-bold uppercase tracking-wider ${getSeverityColor(selectedOffender.MaxGravity)}`}>
                    {getSeverityLabel(selectedOffender.MaxGravity)}
                  </span>
                </div>
                <div className="w-px bg-slate-200"></div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Activity Span</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">
                    {selectedOffender.FirstCaseDate?.split('T')[0]} <ArrowLeftRight size={12} className="inline mx-1 text-slate-400" /> {selectedOffender.LatestCaseDate?.split('T')[0]}
                  </p>
                </div>
              </div>

              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                <History size={16} className="text-ksp-gold" />
                Chronological Case History
              </h3>

              {/* Timeline */}
              <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
                {selectedOffender.Cases.map((c: any, index: number) => {
                  const sLabel = getSeverityLabel(c.GravityOffenceID);
                  const sColor = getSeverityColor(c.GravityOffenceID);
                  const dist = districts.find(d => d.DistrictID === (c.DistrictID || c.PoliceStationID))?.DistrictName || 'Unknown';
                  const stat = stations.find(s => s.UnitID === c.PoliceStationID)?.UnitName || 'Unknown';
                  const cat = categories.find(ch => ch.CrimeHeadID === c.CrimeMajorHeadID)?.CrimeGroupName || 'Unknown';
                  const status = caseStatuses.find(cs => cs.CaseStatusID === c.CaseStatusID)?.CaseStatusName || 'Unknown';

                  return (
                    <div key={c.CaseMasterID} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-blue-500 shadow"></div>
                      
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-blue-400 transition"></div>
                        
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-2 pl-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{c.CaseNo || `FIR-${c.CaseMasterID}`}</span>
                              <span className={`px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${sColor}`}>
                                {sLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mt-1">
                              <span className="flex items-center gap-1"><Calendar size={12} /> {c.CrimeRegisteredDate?.split('T')[0]}</span>
                              <span className="flex items-center gap-1"><MapPin size={12} /> {dist} - {stat}</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded uppercase tracking-wider border border-slate-200">
                              {status}
                            </span>
                          </div>
                        </div>

                        <div className="pl-2 mt-3">
                          <p className="text-sm font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded border border-slate-100">
                            {cat}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
