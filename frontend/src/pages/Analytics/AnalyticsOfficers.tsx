import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { mockDb } from '../../utils/mockDb';
import { Users } from 'lucide-react';

export const AnalyticsOfficers: React.FC = () => {
  const { user } = useAuth();
  const unitId = user?.unitId;

  if (!unitId) return <div>No Station Assigned</div>;

  const allFirs = mockDb.getCases().filter(c => c.PoliceStationID === unitId);
  const officers = mockDb.getEmployees().filter(e => e.UnitID === unitId);

  // Officer Tasks Table
  const getTasksForOfficer = (empId: number) => {
    return allFirs.filter(f => f.PolicePersonID === empId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-ksp-navy tracking-tight uppercase">Station Officers</h2>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">
          Personnel Roster and Active Assignments for {user?.stationName}
        </p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="bg-ksp-gold-light/30 p-2 rounded-lg text-ksp-navy">
            <Users size={20} />
          </div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Officers & Active Assignments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Officer Name</th>
                <th className="p-4">KGID</th>
                <th className="p-4">Status</th>
                <th className="p-4">Assigned Cases (IO)</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-slate-600">
              {officers.map(off => {
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
              })}
              {officers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 italic">
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
