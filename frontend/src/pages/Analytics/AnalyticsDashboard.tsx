import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { mockDb } from '../../utils/mockDb';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { FileText, Users, AlertTriangle, CheckCircle } from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const unitId = user?.unitId;

  if (!unitId) return <div>No Station Assigned</div>;

  const allFirs = mockDb.getCases().filter(c => c.PoliceStationID === unitId);
  const officers = mockDb.getEmployees().filter(e => e.UnitID === unitId);
  const statuses = mockDb.getCaseStatuses();

  // Stats
  const totalFirs = allFirs.length;
  const underInvestigation = allFirs.filter(c => c.CaseStatusID === 1).length; 
  const chargeSheeted = allFirs.filter(c => c.CaseStatusID === 2).length; 
  const totalOfficers = officers.length;

  // Chart Data: FIRs by Status
  const statusData = statuses.map(st => ({
    name: st.CaseStatusName,
    count: allFirs.filter(c => c.CaseStatusID === st.CaseStatusID).length
  })).filter(d => d.count > 0);

  const COLORS = ['#0B2240', '#D4AF37', '#64748b', '#ef4444', '#10b981'];



  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-ksp-navy tracking-tight uppercase">Station Analytics</h2>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">
          Performance and Resource Overview for {user?.stationName}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total FIRs</p>
              <h3 className="text-2xl font-black text-slate-800">{totalFirs}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-lg text-amber-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Under Investigation</p>
              <h3 className="text-2xl font-black text-slate-800">{underInvestigation}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Charge Sheeted</p>
              <h3 className="text-2xl font-black text-slate-800">{chargeSheeted}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-ksp-gold-light/30 p-3 rounded-lg text-ksp-navy">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Officers</p>
              <h3 className="text-2xl font-black text-slate-800">{totalOfficers}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6">FIR Distribution by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6">FIRs by Status (Bar)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" fill="#0B2240" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>


    </div>
  );
};
