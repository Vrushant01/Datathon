import React from 'react';
import { mockDb } from '../../utils/mockDb';
import { 
  FileText, CheckCircle, Clock, AlertTriangle, Shield, MapPin, 
  TrendingUp, Users, Brain, ShieldAlert, Activity
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const cases = mockDb.getCases();
  const officers = mockDb.getEmployees();
  const units = mockDb.getUnits();





  // Metrics computation
  const totalFIR = cases.length;
  const solved = cases.filter(c => c.CaseStatusID === 2 || c.CaseStatusID === 3 || c.CaseStatusID === 4).length;
  const underInvestigation = totalFIR - solved;
  const activeOfficersCount = officers.filter(o => o.status === 'Active').length;
  const totalStations = units.filter(u => u.TypeID === 1).length;

  // Chart 1: Monthly Trends (Dynamically calculated from CrimeRegisteredDate)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthCounts = new Array(12).fill(0);
  
  cases.forEach(c => {
    if (c.CrimeRegisteredDate) {
      const date = new Date(c.CrimeRegisteredDate);
      const m = date.getMonth();
      if (m >= 0 && m < 12) {
        monthCounts[m]++;
      }
    }
  });

  // Limit to first 6 months if we want to preserve the previous look, or show all 12.
  // The python script generated dates for 2026, let's just show Jan-Dec.
  const monthlyData = monthNames.map((name, index) => ({
    name,
    Cases: monthCounts[index]
  }));

  // Chart 2: Crime Categories (Based on CrimeHead)
  const crimeHeads = mockDb.getCrimeHeads();
  const categoryCounts = crimeHeads.map(ch => {
    return {
      name: ch.CrimeGroupName,
      value: cases.filter(c => c.CrimeMajorHeadID === ch.CrimeHeadID).length
    };
  }).filter(item => item.value > 0);

  const COLORS = ['#0B2240', '#D4AF37', '#00529B', '#EF4444', '#10B981', '#8B5CF6'];



  return (
    <div className="space-y-6 select-none">
      
      {/* Header bar */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight">KSP Operations Control</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Real-time Command Centre Dashboard</p>
        </div>
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
          <Activity size={14} className="animate-pulse" /> Live Feed Connected
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-ksp-navy rounded-lg border border-blue-100">
            <FileText size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Total FIRs</div>
            <div className="text-xl font-extrabold text-ksp-navy">{totalFIR}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Pending Cases</div>
            <div className="text-xl font-extrabold text-amber-600">{underInvestigation}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Solved / Closed</div>
            <div className="text-xl font-extrabold text-emerald-600">{solved}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-50 text-slate-700 rounded-lg border border-slate-200">
            <Users size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Active Officers</div>
            <div className="text-xl font-extrabold text-slate-800">{activeOfficersCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4 col-span-2 lg:col-span-1">
          <div className="p-3 bg-slate-50 text-slate-700 rounded-lg border border-slate-200">
            <MapPin size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Police Stations</div>
            <div className="text-xl font-extrabold text-slate-800">{totalStations}</div>
          </div>
        </div>

      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Monthly Trend */}
        <div className="bg-white p-5 rounded-xl border shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-ksp-blue" /> Case Registration Trend (2026)
          </h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="Cases" stroke="#00529B" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Breakdown */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Shield size={14} className="text-ksp-gold-dark" /> Crime Category Distribution
          </h3>
          <div className="h-64 w-full text-xs relative flex items-center justify-center">
            {categoryCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryCounts}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Cases`]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-slate-400">No category data</span>
            )}
            
            {/* Center Summary Label */}
            <div className="absolute text-center">
              <div className="text-xl font-extrabold text-ksp-navy">{totalFIR}</div>
              <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Cases</div>
            </div>
          </div>
          {/* Custom Legends list */}
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[9px] font-bold text-slate-500">
            {categoryCounts.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="truncate">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>



    </div>
  );
};
