import React, { useState, useMemo } from 'react';
import { mockDb, CaseMasterRow } from '../../../data/mockDb';
import { useAuth } from '../../context/AuthContext';
import { useDbConnection } from '../../hooks/useDbConnection';
import { FileText, Search, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { FIRDocument } from '../../components/FIRDocument';
import { printFIRDocument } from '../../utils/printFIRDocument';

export const AnalyticsFIRs: React.FC = () => {
  const { user } = useAuth();
  const unitId = user?.unitId;

  const { syncReport, retrySync, dataLoaded } = useDbConnection();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | 'ALL'>('ALL');
  
  const [viewFirModalOpen, setViewFirModalOpen] = useState(false);
  const [selectedFirDetails, setSelectedFirDetails] = useState<any>(null);

  const casesStatus = syncReport.tables['cases']?.status;
  const isCasesLoading = !casesStatus || casesStatus === 'idle' || casesStatus === 'syncing';
  const casesFailed = casesStatus === 'failed';

  const cases = useMemo(() => mockDb.getCases(), [dataLoaded, syncReport.tables['cases']?.recordCount]);
  const employees = useMemo(() => mockDb.getEmployees().filter(e => e.status === 'Active'), [dataLoaded]);
  const stations = useMemo(() => mockDb.getUnits().filter(u => u.TypeID === 1), [dataLoaded]);
  const categories = useMemo(() => mockDb.getCaseCategories(), [dataLoaded]);
  const caseStatuses = useMemo(() => mockDb.getCaseStatuses(), [dataLoaded]);

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // Analytics only sees their station's FIRs
      if (c.PoliceStationID !== unitId) return false;
      if (filterStatus !== 'ALL' && c.CaseStatusID !== filterStatus) return false;

      const term = String(searchQuery || '').toLowerCase();
      const stationName = String(stations.find(s => s.UnitID === c.PoliceStationID)?.UnitName || '').toLowerCase();
      const officerName = String(employees.find(e => e.EmployeeID === c.PolicePersonID)?.FirstName || '').toLowerCase();
      return (
        String(c.CrimeNo || '').toLowerCase().includes(term) ||
        String(c.CaseNo || '').toLowerCase().includes(term) ||
        stationName.includes(term) ||
        officerName.includes(term) ||
        String(c.BriefFacts || '').toLowerCase().includes(term)
      );
    });
  }, [cases, unitId, filterStatus, searchQuery, stations, employees]);

  if (!unitId) return <div className="p-8 text-center text-red-500 font-bold">No Station Assigned to this Profile</div>;

  const hasFatalError = casesFailed && cases.length === 0 && !isCasesLoading;

  if (hasFatalError) {
    return (
      <div className="space-y-6 select-none">
        <div className="bg-red-50/50 border border-red-100 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Failed to load Station FIR Records</h3>
          <p className="text-sm text-slate-500 max-w-md mb-4">
            {syncReport.tables['cases']?.error || 'Database connection error while syncing case records.'}
          </p>
          <button 
            onClick={retrySync} 
            className="bg-ksp-navy hover:bg-ksp-navy-light text-white px-4 py-2 rounded-lg font-bold text-xs shadow transition flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            Retry Sync
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      
      {/* Header section */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight flex items-center gap-2">
            <FileText size={24} className="text-ksp-gold" />
            Station FIR Records
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Read-only view of {user?.stationName} case files</p>
        </div>
        <span className="text-xs font-bold text-slate-400">
          {isCasesLoading ? 'Loading records...' : `Total: ${filteredCases.length} Records`}
        </span>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-xl shadow-sm border">
        <div className="relative flex-grow max-w-md">
          <span className="absolute left-3 top-2.5 text-slate-400">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Search by FIR no, officer, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isCasesLoading}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ksp-navy transition"
          />
        </div>

        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
          disabled={isCasesLoading}
          className="w-full md:w-48 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:border-slate-300 transition"
        >
          <option value="ALL">All Statuses</option>
          {caseStatuses.map(s => <option key={s.CaseStatusID} value={s.CaseStatusID}>{s.CaseStatusName}</option>)}
        </select>
      </div>

      {/* Table Grid */}
      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-4">Case / FIR No.</th>
              <th className="p-4">Registered Date</th>
              <th className="p-4">Police Station</th>
              <th className="p-4">Investigating Officer</th>
              <th className="p-4">Category</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isCasesLoading ? (
              [1, 2, 3, 4, 5].map(idx => (
                <tr key={idx} className="animate-pulse">
                  <td className="p-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                  <td className="p-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                  <td className="p-4"><div className="h-4 bg-slate-100 rounded w-28"></div></td>
                  <td className="p-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                  <td className="p-4"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                  <td className="p-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                  <td className="p-4 text-center"><div className="h-4 bg-slate-100 rounded w-12 mx-auto"></div></td>
                </tr>
              ))
            ) : filteredCases.length > 0 ? (
              filteredCases.map((c) => {
                const stationName = stations.find(s => s.UnitID === c.PoliceStationID)?.UnitName || 'Unknown';
                const officer = employees.find(e => e.EmployeeID === c.PolicePersonID);
                const categoryName = categories.find(cat => cat.CaseCategoryID === c.CaseCategoryID)?.LookupValue.split(' ')[0] || 'FIR';
                const statusName = caseStatuses.find(s => s.CaseStatusID === c.CaseStatusID)?.CaseStatusName || 'Active';

                return (
                  <tr key={c.CaseMasterID} className="hover:bg-slate-50 transition">
                    <td className="p-4 leading-normal">
                      <span className="font-bold text-slate-900 block">Case #{c.CaseNo}</span>
                      <span className="text-[10px] font-mono text-slate-400 block">{c.CrimeNo}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-600">{c.CrimeRegisteredDate}</td>
                    <td className="p-4 font-semibold text-slate-700">{stationName}</td>
                    <td className="p-4 font-bold text-slate-800">{officer ? officer.FirstName : 'Unassigned'}</td>
                    <td className="p-4">
                      <span className="bg-slate-100 border text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {categoryName}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        c.CaseStatusID === 1 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : c.CaseStatusID === 2 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {statusName}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => {
                          const detailed = mockDb.getCaseDetails(c.CaseMasterID);
                          setSelectedFirDetails(detailed || c);
                          setViewFirModalOpen(true);
                        }}
                        className="text-ksp-blue hover:text-ksp-blue-dark font-bold underline"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                  No FIR records found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FIR Print Document Modal */}
      {viewFirModalOpen && selectedFirDetails && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-ksp-navy text-white flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-wide">FIRST INFORMATION REPORT (FORM 154 Cr.P.C.)</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => printFIRDocument(selectedFirDetails)}
                  className="bg-ksp-gold text-ksp-navy px-3 py-1 rounded text-xs font-bold hover:bg-ksp-gold-light transition"
                >
                  Print FIR
                </button>
                <button 
                  onClick={() => setViewFirModalOpen(false)}
                  className="text-white hover:text-slate-300"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-grow bg-slate-50">
              <FIRDocument caseData={selectedFirDetails} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
