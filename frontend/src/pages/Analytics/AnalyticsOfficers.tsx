import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDbConnection } from '../../hooks/useDbConnection';
import { mockDb } from '../../../data/mockDb';
import { Users, AlertTriangle, RefreshCw } from 'lucide-react';

export const AnalyticsOfficers: React.FC = () => {
  const { user } = useAuth();
  const unitId = user?.unitId;

  const { syncReport, retrySync, dataLoaded } = useDbConnection();

  if (!unitId) return <div className="p-8 text-center text-red-500 font-bold">No Station Assigned to this Profile</div>;

  const empStatus = syncReport.tables['employees']?.status;
  const casesStatus = syncReport.tables['cases']?.status;

  const isEmpLoading = !empStatus || empStatus === 'idle' || empStatus === 'syncing';
  const isCasesLoading = !casesStatus || casesStatus === 'idle' || casesStatus === 'syncing';
  const isLoading = isEmpLoading || isCasesLoading;

  const empFailed = empStatus === 'failed';
  const casesFailed = casesStatus === 'failed';

  const allFirs = useMemo(() => {
    return mockDb.getCases().filter(c => c.PoliceStationID === unitId);
  }, [unitId, dataLoaded, syncReport.tables['cases']?.recordCount]);

  const officers = useMemo(() => {
    return mockDb.getEmployees().filter(e => e.UnitID === unitId);
  }, [unitId, dataLoaded, syncReport.tables['employees']?.recordCount]);

  const hasFatalError = (empFailed || casesFailed) && officers.length === 0 && !isLoading;

  // Officer Tasks Table
  const getTasksForOfficer = (empId: number) => {
    return allFirs.filter(f => f.PolicePersonID === empId);
  };

  if (hasFatalError) {
    return (
      <div className="space-y-6 select-none">
        <div className="bg-red-50/50 border border-red-100 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Failed to load Station Officers</h3>
          <p className="text-sm text-slate-500 max-w-md mb-4">
            {syncReport.tables['employees']?.error || syncReport.tables['cases']?.error || 'Database connection error'}
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
      <div>
        <h2 className="text-2xl font-extrabold text-ksp-navy tracking-tight uppercase">Station Officers</h2>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">
          Personnel Roster and Active Assignments for {user?.stationName}
        </p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-ksp-gold-light/30 p-2 rounded-lg text-ksp-navy">
              <Users size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Officers & Active Assignments</h3>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {isLoading ? 'Loading...' : `Total: ${officers.length} Officers`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Officer Name</th>
                <th className="p-4">KGID</th>
                <th className="p-4">Status</th>
                <th className="p-4">Assigned Cases (IO)</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-slate-600">
              {isLoading ? (
                [1, 2, 3, 4].map(idx => (
                  <tr key={idx} className="border-b animate-pulse">
                    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                    <td className="p-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="p-4"><div className="h-4 bg-slate-100 rounded w-28"></div></td>
                  </tr>
                ))
              ) : officers.length > 0 ? (
                officers.map(off => {
                  const assigned = getTasksForOfficer(off.EmployeeID);
                  return (
                    <tr key={off.EmployeeID} className="border-b last:border-0 hover:bg-slate-50 transition">
                      <td className="p-4">{off.FirstName}</td>
                      <td className="p-4 text-slate-500">{off.KGID}</td>
                      <td className="p-4">
                        {off.status === 'Active' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-red-50 text-red-700 border border-red-200">
                            Suspended
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {assigned.length > 0 ? (
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                            {assigned.length} Active Cases
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">
                    No officers assigned to this station.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
