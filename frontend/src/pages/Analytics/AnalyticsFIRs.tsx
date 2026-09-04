import React, { useState } from 'react';
import { mockDb, CaseMasterRow } from '../../utils/mockDb';
import { useAuth } from '../../context/AuthContext';
import { FileText, Search } from 'lucide-react';

export const AnalyticsFIRs: React.FC = () => {
  const { user } = useAuth();
  const unitId = user?.unitId;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | 'ALL'>('ALL');
  
  const cases = mockDb.getCases();
  const employees = mockDb.getEmployees().filter(e => e.status === 'Active');
  const stations = mockDb.getUnits().filter(u => u.TypeID === 1);
  const categories = mockDb.getCaseCategories();
  const caseStatuses = mockDb.getCaseStatuses();

  const filteredCases = cases.filter(c => {
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

  if (!unitId) return <div className="p-8 text-center text-red-500">No Station Assigned to this Profile</div>;

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
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ksp-navy transition"
          />
        </div>

        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
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
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredCases.map((c) => {
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
                </tr>
              );
            })}
            {filteredCases.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-8 text-slate-400 font-bold">No active FIR records found matching filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
