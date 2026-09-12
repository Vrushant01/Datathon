import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockDb, syncData } from '../../../data/mockDb';
import { useDbConnection } from '../../hooks/useDbConnection';
import { useMockDb } from '../../hooks/useMockDb';
import { useLanguage } from '../../context/LanguageContext';
import { getAIDashboard } from '../../services/aiService';
import { 
  FileText, CheckCircle, Clock, AlertTriangle, Shield, MapPin, 
  TrendingUp, Users, Brain, ShieldAlert, Activity, Zap, BarChart2, ExternalLink, Database, RefreshCw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  // Metrics computation
  const { status: dbConnectionStatus, dataLoaded } = useDbConnection();
  const isConnecting = dbConnectionStatus === 'connecting' || (dbConnectionStatus === 'connected' && !dataLoaded);
  const navigate = useNavigate();

  const dbVersion = useMockDb();

  // Re-read from mockDb every time dataLoaded or dbVersion changes.
  const cases = useMemo(() => mockDb.getCases(), [dataLoaded, dbVersion]);
  const officers = useMemo(() => mockDb.getEmployees(), [dataLoaded, dbVersion]);
  const units = useMemo(() => mockDb.getUnits(), [dataLoaded, dbVersion]);
  const crimeHeads = useMemo(() => mockDb.getCrimeHeads(), [dataLoaded, dbVersion]);

  const [timeFilter, setTimeFilter] = React.useState<'24H' | '7D' | '30D' | 'ALL'>('ALL');



  // Filter cases based on the selected time boundary
  const filteredCases = useMemo(() => {
    if (timeFilter === 'ALL') return cases;
    const now = Date.now();
    const boundary = now - (timeFilter === '24H' ? 24 * 3600000 : timeFilter === '7D' ? 7 * 86400000 : 30 * 86400000);
    return cases.filter(c => {
      const ts = new Date(c.CrimeRegisteredDate).getTime();
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
        const d = new Date(c.CrimeRegisteredDate);
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
        const d = new Date(c.CrimeRegisteredDate);
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
        const d = new Date(c.CrimeRegisteredDate);
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

  const trendTitle = timeFilter === '24H' ? t('time.24h') : timeFilter === '7D' ? t('time.7d') : timeFilter === '30D' ? t('time.30d') : t('charts.historical_trend');

  // Chart 2: Crime Categories (Based on CrimeHead)
  const categoryCounts = crimeHeads.map(ch => {
    return {
      name: ch.CrimeGroupName,
      value: filteredCases.filter(c => c.CrimeMajorHeadID === ch.CrimeHeadID).length
    };
  }).filter(item => item.value > 0);

  if (dbConnectionStatus === 'error') {
    return (
      <div className="space-y-6 select-none">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight">{t('dashboard.title')}</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => syncData()} 
              className="text-xs bg-ksp-navy hover:bg-ksp-navy-light text-white px-3 py-1.5 rounded-full shadow-sm font-bold transition flex items-center gap-1"
            >
              <RefreshCw size={14} /> {t('dashboard.retry')}
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm bg-red-50 text-red-700 border-red-200">
              <AlertTriangle size={14} /> {t('dashboard.offline')}
            </div>
          </div>
        </div>
        
        <div className="bg-red-50/50 border border-red-100 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            <Database className="text-red-500" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">{t('dashboard.db_offline_title')}</h3>
          <p className="text-sm text-slate-500 max-w-md">
            {t('dashboard.db_offline_desc')}
          </p>
        </div>
      </div>
    );
  }

  const COLORS = ['#0B2240', '#D4AF37', '#00529B', '#EF4444', '#10B981', '#8B5CF6'];

  return (
    <div className="space-y-6 select-none">
      
      {/* Header bar */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight">{t('dashboard.title')}</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={timeFilter} 
            onChange={e => setTimeFilter(e.target.value as any)}
            className="text-xs font-bold border rounded px-2 py-1 outline-none text-slate-700 bg-slate-50"
          >
            <option value="24H">{t('time.24h')}</option>
            <option value="7D">{t('time.7d')}</option>
            <option value="30D">{t('time.30d')}</option>
            <option value="ALL">{t('time.all')}</option>
          </select>

          {dbConnectionStatus === 'error' && (
            <button 
              onClick={() => syncData()} 
              className="text-xs bg-ksp-navy hover:bg-ksp-navy-light text-white px-3 py-1 rounded shadow-sm font-bold transition"
            >
              {t('dashboard.retry')}
            </button>
          )}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
            dbConnectionStatus === 'connected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            dbConnectionStatus === 'connecting' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <Activity size={14} className={dbConnectionStatus !== 'error' ? 'animate-pulse' : ''} /> 
            {dbConnectionStatus === 'connected' ? t('dashboard.live_connected') : 
             dbConnectionStatus === 'connecting' ? t('dashboard.connecting') : t('dashboard.offline')}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        
        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-ksp-navy rounded-lg border border-blue-100">
            <FileText size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{t('dashboard.total_firs')}</div>
            <div className="text-xl font-extrabold text-ksp-navy">{isConnecting ? <span className="text-sm font-normal text-slate-400">{t('common.loading')}</span> : totalFIR}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{t('dashboard.pending_cases')}</div>
            <div className="text-xl font-extrabold text-amber-600">{isConnecting ? <span className="text-sm font-normal text-slate-400">{t('common.loading')}</span> : underInvestigation}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{t('dashboard.solved_cases')}</div>
            <div className="text-xl font-extrabold text-emerald-600">{isConnecting ? <span className="text-sm font-normal text-slate-400">{t('common.loading')}</span> : solved}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-50 text-slate-700 rounded-lg border border-slate-200">
            <Users size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{t('dashboard.active_officers')}</div>
            <div className="text-xl font-extrabold text-slate-800">{isConnecting ? <span className="text-sm font-normal text-slate-400">{t('common.loading')}</span> : activeOfficersCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4 col-span-2 xl:col-span-1">
          <div className="p-3 bg-slate-50 text-slate-700 rounded-lg border border-slate-200">
            <MapPin size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{t('dashboard.police_stations')}</div>
            <div className="text-xl font-extrabold text-slate-800">{isConnecting ? <span className="text-sm font-normal text-slate-400">{t('common.loading')}</span> : totalStations}</div>
          </div>
        </div>

      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Chart 1: Monthly Trend */}
        <div className="bg-white p-5 rounded-xl border shadow-sm xl:col-span-2 flex flex-col">
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
            <Shield size={14} className="text-ksp-gold-dark" /> {t('charts.category_distribution')}
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
                  <Tooltip formatter={(value) => [`${value} ${t('charts.cases')}`]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-slate-400">{isConnecting ? t('common.loading') : t('charts.no_category_data')}</span>
            )}
            
            {/* Center Summary Label */}
            <div className="absolute text-center">
              <div className="text-xl font-extrabold text-ksp-navy">{isConnecting ? '...' : totalFIR}</div>
              <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">{t('charts.cases')}</div>
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
