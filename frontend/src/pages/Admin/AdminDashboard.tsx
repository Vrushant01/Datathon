import React, { useMemo } from 'react';
import { mockDb, syncFromMongo } from '../../utils/mockDb';
import { useDbConnection } from '../../hooks/useDbConnection';
import { 
  FileText, CheckCircle, Clock, AlertTriangle, Shield, MapPin, 
  TrendingUp, Users, Brain, ShieldAlert, Activity
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  // Metrics computation
  const { status: dbConnectionStatus, dataLoaded } = useDbConnection();
  const isConnecting = dbConnectionStatus === 'connecting' || (dbConnectionStatus === 'connected' && !dataLoaded);

  // Re-read from mockDb every time dataLoaded changes.
  // Without useMemo keyed on dataLoaded, the data variables captured at initial render
  // remain stale empty arrays — they never see the records that arrive after syncFromMongo completes.
  const cases = useMemo(() => mockDb.getCases(), [dataLoaded]);
  const officers = useMemo(() => mockDb.getEmployees(), [dataLoaded]);
  const units = useMemo(() => mockDb.getUnits(), [dataLoaded]);
  const crimeHeads = useMemo(() => mockDb.getCrimeHeads(), [dataLoaded]);

  const [timeFilter, setTimeFilter] = React.useState<'24H' | '7D' | '30D' | 'ALL'>('ALL');

  // Filter cases based on the selected time boundary
  const filteredCases = useMemo(() => {
    if (timeFilter === 'ALL') return cases;
    const now = Date.now();
    const boundary = now - (timeFilter === '24H' ? 24 * 3600000 : timeFilter === '7D' ? 7 * 86400000 : 30 * 86400000);
    return cases.filter(c => {
      const ts = c.CrimeRegisteredDateTime ? new Date(c.CrimeRegisteredDateTime).getTime() : new Date(c.CrimeRegisteredDate).getTime();
      return ts >= boundary && ts <= now;
    });
  }, [cases, timeFilter]);

  const totalFIR = filteredCases.length;
  const solved = filteredCases.filter(c => c.CaseStatusID === 2 || c.CaseStatusID === 3 || c.CaseStatusID === 4).length;
  const underInvestigation = totalFIR - solved;
  const activeOfficersCount = officers.filter(o => o.status === 'Active').length;
  const totalStations = units.filter(u => u.TypeID === 1).length;

  // Chart 1: Dynamic Trends
  const trendData = useMemo(() => {
    const buckets: Record<string, number> = {};
    const now = new Date();
    
    if (timeFilter === '24H') {
      // 24 hourly buckets
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 3600000);
        buckets[`${d.getHours().toString().padStart(2, '0')}:00`] = 0;
      }
      filteredCases.forEach(c => {
        const d = new Date(c.CrimeRegisteredDateTime || c.CrimeRegisteredDate);
        buckets[`${d.getHours().toString().padStart(2, '0')}:00`] = (buckets[`${d.getHours().toString().padStart(2, '0')}:00`] || 0) + 1;
      });
    } else if (timeFilter === '7D' || timeFilter === '30D') {
      // Daily buckets
      const days = timeFilter === '7D' ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        buckets[`${d.getMonth()+1}/${d.getDate()}`] = 0;
      }
      filteredCases.forEach(c => {
        const d = new Date(c.CrimeRegisteredDateTime || c.CrimeRegisteredDate);
        buckets[`${d.getMonth()+1}/${d.getDate()}`] = (buckets[`${d.getMonth()+1}/${d.getDate()}`] || 0) + 1;
      });
    } else {
      // All time - but graph only shows last 6 months buckets for readability
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}`;
        buckets[key] = 0;
      }
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).getTime();
      filteredCases.forEach(c => {
        const d = new Date(c.CrimeRegisteredDateTime || c.CrimeRegisteredDate);
        if (d.getTime() >= sixMonthsAgo) {
          const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}`;
          if (buckets[key] !== undefined) {
             buckets[key] = (buckets[key] || 0) + 1;
          }
        }
      });
    }
    
    // Convert to sorted array for Recharts
    return Object.entries(buckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => {
         let displayName = name;
         if (timeFilter !== '24H' && timeFilter !== '7D' && timeFilter !== '30D') {
             // name is "YYYY-MM"
             const parts = name.split('-');
             if (parts.length === 2) {
                 const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                 displayName = d.toLocaleString('en-US', { month: 'short' });
             }
         }
         return { name: displayName, Cases: count };
      });
  }, [filteredCases, timeFilter]);

  const trendTitle = timeFilter === '24H' ? 'Last 24 Hours' : timeFilter === '7D' ? 'Last 7 Days' : timeFilter === '30D' ? 'Last 30 Days' : 'Historical Registration Trend';

  // Chart 2: Crime Categories (Based on CrimeHead)
  const categoryCounts = crimeHeads.map(ch => {
    return {
      name: ch.CrimeGroupName,
      value: filteredCases.filter(c => c.CrimeMajorHeadID === ch.CrimeHeadID).length
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
        <div className="flex items-center gap-3">
          <select 
            value={timeFilter} 
            onChange={e => setTimeFilter(e.target.value as any)}
            className="text-xs font-bold border rounded px-2 py-1 outline-none text-slate-700 bg-slate-50"
          >
            <option value="24H">Last 24 Hours</option>
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
            <option value="ALL">All Time</option>
          </select>

          {dbConnectionStatus === 'error' && (
            <button 
              onClick={() => syncFromMongo()} 
              className="text-xs bg-ksp-navy hover:bg-ksp-navy-light text-white px-3 py-1 rounded shadow-sm font-bold transition"
            >
              Retry Connection
            </button>
          )}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
            dbConnectionStatus === 'connected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            dbConnectionStatus === 'connecting' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <Activity size={14} className={dbConnectionStatus !== 'error' ? 'animate-pulse' : ''} /> 
            {dbConnectionStatus === 'connected' ? 'Live Feed Connected' : 
             dbConnectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
          </div>
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
            <div className="text-xl font-extrabold text-ksp-navy">{isConnecting ? <span className="text-sm font-normal text-slate-400">Loading...</span> : totalFIR}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Pending Cases</div>
            <div className="text-xl font-extrabold text-amber-600">{isConnecting ? <span className="text-sm font-normal text-slate-400">Loading...</span> : underInvestigation}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Solved / Closed</div>
            <div className="text-xl font-extrabold text-emerald-600">{isConnecting ? <span className="text-sm font-normal text-slate-400">Loading...</span> : solved}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-50 text-slate-700 rounded-lg border border-slate-200">
            <Users size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Active Officers</div>
            <div className="text-xl font-extrabold text-slate-800">{isConnecting ? <span className="text-sm font-normal text-slate-400">Loading...</span> : activeOfficersCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4 col-span-2 lg:col-span-1">
          <div className="p-3 bg-slate-50 text-slate-700 rounded-lg border border-slate-200">
            <MapPin size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Police Stations</div>
            <div className="text-xl font-extrabold text-slate-800">{isConnecting ? <span className="text-sm font-normal text-slate-400">Loading...</span> : totalStations}</div>
          </div>
        </div>

      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Monthly Trend */}
        <div className="bg-white p-5 rounded-xl border shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-ksp-blue" /> {trendTitle}
          </h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              <span className="text-slate-400">{isConnecting ? 'Loading...' : 'No category data'}</span>
            )}
            
            {/* Center Summary Label */}
            <div className="absolute text-center">
              <div className="text-xl font-extrabold text-ksp-navy">{isConnecting ? '...' : totalFIR}</div>
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
