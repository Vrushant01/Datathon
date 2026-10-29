import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockDb } from '../../../data/mockDb';
import { useDbConnection } from '../../hooks/useDbConnection';
import { SyncStatusBanner } from '../../components/SyncStatusBanner';
import { useLanguage } from '../../context/LanguageContext';
import { authFetch } from '../../utils/authFetch';
import { sseClient } from '../../utils/SSEClient';
import { API_BASE_URL } from '../../config/api';
import { 
  FileText, CheckCircle, Clock, AlertTriangle, Shield, MapPin, 
  TrendingUp, Users, Activity
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';

export type TimeFilter = '24H' | '7D' | '30D' | 'ALL';

/**
 * Shared date-window function based on CrimeRegisteredDateTime (or CrimeRegisteredDate).
 * Window ends at the current time.
 */
export const isCaseInWindow = (
  dateOrDateTime: string | Date | number,
  filter: TimeFilter,
  nowTs: number = Date.now()
): boolean => {
  if (filter === 'ALL') return true;
  if (!dateOrDateTime) return false;
  const ts = typeof dateOrDateTime === 'number'
    ? dateOrDateTime
    : typeof dateOrDateTime === 'string'
    ? new Date(dateOrDateTime).getTime()
    : dateOrDateTime.getTime();
  if (isNaN(ts)) return false;

  const windowDurationMs = filter === '24H'
    ? 24 * 3600000
    : filter === '7D'
    ? 7 * 86400000
    : 30 * 86400000;

  const boundary = nowTs - windowDurationMs;
  return ts >= boundary && ts <= nowTs;
};

export const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState<{
    range?: string;
    totalFirs: number;
    pendingCases: number;
    solvedClosed: number;
    activeOfficers: number;
    policeStations: number;
    casesLight: { d: string; h: number; s: number }[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  
  const { dataLoaded, syncReport } = useDbConnection();

  const fetchStats = async (range: TimeFilter, isRetry = false) => {
    try {
      if (!isRetry) setIsLoading(true);
      setError(null);
      const res = await authFetch(`${API_BASE_URL}/api/admin/dashboard-stats?range=${range.toLowerCase()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        // Safeguard against backend returning zeros on cold start failures
        if (data.data.totalFirs === 0 && data.data.policeStations === 0) {
          throw new Error('Database loading, please wait...');
        }
        setStats(data.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Refetch on range change or when dataLoaded changes
  useEffect(() => {
    if (!dataLoaded) return;
    fetchStats(timeFilter);
  }, [dataLoaded, timeFilter]);

  // Real-time SSE subscriptions
  useEffect(() => {
    const refetch = () => {
      authFetch(`${API_BASE_URL}/api/admin/dashboard-stats?range=${timeFilter.toLowerCase()}`)
        .then(r => r.json())
        .then(data => { if (data.success) setStats(data.data); })
        .catch(() => {});
    };
    const handlers = [
      sseClient.subscribe('FIR_CREATED', refetch),
      sseClient.subscribe('FIR_UPDATED', refetch),
      sseClient.subscribe('FIR_DELETED', refetch),
      sseClient.subscribe('OFFICER_CREATED', refetch),
      sseClient.subscribe('OFFICER_UPDATED', refetch),
      sseClient.subscribe('OFFICER_DELETED', refetch),
      sseClient.subscribe('STATION_CREATED', refetch),
      sseClient.subscribe('STATION_UPDATED', refetch),
      sseClient.subscribe('STATION_DELETED', refetch)
    ];
    return () => handlers.forEach(unsub => unsub());
  }, [timeFilter]);

  const crimeHeads = useMemo(() => mockDb.getCrimeHeads(), []);

  // Fallbacks using local mockDb if stats endpoint is not yet loaded
  const fallbackCases = useMemo(() => mockDb.getCases(), [dataLoaded]);
  const fallbackUnits = useMemo(() => mockDb.getUnits(), [dataLoaded]);
  const fallbackOfficers = useMemo(() => mockDb.getEmployees(), [dataLoaded]);

  const casesLoadedFromBackend = syncReport.tables['cases']?.status === 'success' && fallbackCases.length > 0;
  const unitsLoadedFromBackend = syncReport.tables['units']?.status === 'success' && fallbackUnits.length > 0;
  const officersLoadedFromBackend = syncReport.tables['employees']?.status === 'success' && fallbackOfficers.length > 0;

  // Shared date-window filtered cases
  const filteredCasesLight = useMemo(() => {
    if (stats?.casesLight && stats.range && stats.range.toLowerCase() === timeFilter.toLowerCase()) {
      return stats.casesLight;
    }
    if (stats?.casesLight) {
      const now = Date.now();
      return stats.casesLight.filter(c => isCaseInWindow(c.d, timeFilter, now));
    }
    if (casesLoadedFromBackend) {
      const now = Date.now();
      return fallbackCases
        .filter(c => isCaseInWindow(c.CrimeRegisteredDateTime || c.CrimeRegisteredDate, timeFilter, now))
        .map(c => ({
          d: (c.CrimeRegisteredDateTime || c.CrimeRegisteredDate) as string,
          h: c.CrimeMajorHeadID,
          s: c.CaseStatusID
        }));
    }
    return [];
  }, [stats?.casesLight, stats?.range, timeFilter, casesLoadedFromBackend, fallbackCases]);

  // Total FIRs, Pending (status 1 & 5), Solved (status 2, 3, 4) follow the selected range
  const totalFIR = stats != null
    ? stats.totalFirs
    : (casesLoadedFromBackend ? filteredCasesLight.length : null);

  const underInvestigation = stats != null
    ? stats.pendingCases
    : (casesLoadedFromBackend ? filteredCasesLight.filter(c => c.s === 1 || c.s === 5).length : null);

  const solved = stats != null
    ? stats.solvedClosed
    : (casesLoadedFromBackend ? filteredCasesLight.filter(c => c.s === 2 || c.s === 3 || c.s === 4).length : null);

  // Keep Police Stations and Active Officers as current totals
  const activeOfficersCount = stats != null
    ? stats.activeOfficers
    : (officersLoadedFromBackend ? fallbackOfficers.filter(e => e.status === 'Active').length : null);

  const totalStations = stats != null
    ? stats.policeStations
    : (unitsLoadedFromBackend ? fallbackUnits.length : null);

  // Chart 1: Dynamic Trends (strictly chronological based on current time window)
  const trendData = useMemo(() => {
    const now = new Date();
    
    if (timeFilter === '24H') {
      const hourlyData: { name: string; Cases: number }[] = [];
      const slotCounts = new Array(24).fill(0);
      filteredCasesLight.forEach(c => {
        const diffMs = now.getTime() - new Date(c.d).getTime();
        const hoursAgo = Math.floor(diffMs / 3600000);
        if (hoursAgo >= 0 && hoursAgo < 24) {
          slotCounts[hoursAgo]++;
        }
      });
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 3600000);
        const h = d.getHours();
        hourlyData.push({
          name: `${h.toString().padStart(2, '0')}:00`,
          Cases: slotCounts[i] || 0
        });
      }
      return hourlyData;
    } 
    
    if (timeFilter === '7D' || timeFilter === '30D') {
      const days = timeFilter === '7D' ? 7 : 30;
      const dailyData: { name: string; Cases: number }[] = [];
      const dayCounts: Record<string, number> = {};
      for (let i = days; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        if (dayCounts[key] === undefined) {
          dayCounts[key] = 0;
        }
      }
      filteredCasesLight.forEach(c => {
        const d = new Date(c.d);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        if (dayCounts[key] !== undefined) {
          dayCounts[key] = (dayCounts[key] || 0) + 1;
        }
      });
      Object.keys(dayCounts).forEach(key => {
        dailyData.push({
          name: key,
          Cases: dayCounts[key] || 0
        });
      });
      return dailyData;
    }

    // ALL (Monthly Trend for past 6 months)
    const monthlyData: { name: string; Cases: number }[] = [];
    const monthBuckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      monthBuckets[key] = 0;
    }
    filteredCasesLight.forEach(c => {
      const d = new Date(c.d);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (monthBuckets[key] !== undefined) {
        monthBuckets[key] = (monthBuckets[key] || 0) + 1;
      }
    });
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthName = d.toLocaleString('en-US', { month: 'short' });
      monthlyData.push({
        name: monthName,
        Cases: monthBuckets[key] || 0
      });
    }
    return monthlyData;
  }, [filteredCasesLight, timeFilter]);

  const trendTitle = timeFilter === '24H' ? t('time.24h') : timeFilter === '7D' ? t('time.7d') : timeFilter === '30D' ? t('time.30d') : t('charts.historical_trend');

  // Chart 2: Crime Categories (Based on CrimeHead in the selected window)
  const categoryCounts = useMemo(() => {
    return crimeHeads.map(ch => {
      return {
        name: ch.CrimeGroupName,
        value: filteredCasesLight.filter(c => c.h === ch.CrimeHeadID).length
      };
    }).filter(item => item.value > 0);
  }, [crimeHeads, filteredCasesLight]);

  if (error) {
    return (
      <div className="space-y-6 select-none">
        <SyncStatusBanner />
        <div className="bg-red-50/50 border border-red-100 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Failed to load Dashboard</h3>
          <p className="text-sm text-slate-500 max-w-md mb-4">{error}</p>
          <button onClick={() => fetchStats(timeFilter, true)} className="bg-ksp-navy text-white px-4 py-2 rounded-md font-bold">Retry</button>
        </div>
      </div>
    );
  }

  const COLORS = ['#0B2240', '#D4AF37', '#00529B', '#EF4444', '#10B981', '#8B5CF6'];

  return (
    <div className="space-y-6 select-none">
      <SyncStatusBanner />
      
      {/* Header bar */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight">{t('dashboard.title')}</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={timeFilter} 
            onChange={e => {
              const val = e.target.value as TimeFilter;
              setTimeFilter(val);
            }}
            className="text-xs font-bold border rounded px-2.5 py-1.5 outline-none text-slate-700 bg-slate-50 shadow-xs cursor-pointer hover:border-slate-300"
          >
            <option value="24H">{t('time.24h')}</option>
            <option value="7D">{t('time.7d')}</option>
            <option value="30D">{t('time.30d')}</option>
            <option value="ALL">{t('time.all')}</option>
          </select>

          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
            !error ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <Activity size={14} className={!error ? 'animate-pulse' : ''} /> 
            {!error ? t('dashboard.live_connected') : t('dashboard.offline')}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        
        {/* Total FIRs (Follows Range) */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-ksp-navy rounded-lg border border-blue-100">
            <FileText size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{t('dashboard.total_firs')}</div>
            <div className="text-xl font-extrabold text-ksp-navy">
              {(isLoading || totalFIR === null) ? <span className="text-sm font-normal text-slate-400">{t('common.loading')}</span> : totalFIR}
            </div>
          </div>
        </div>

        {/* Pending Cases (Status 1 & 5 - Follows Range) */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{t('dashboard.pending_cases')}</div>
            <div className="text-xl font-extrabold text-amber-600">
              {(isLoading || underInvestigation === null) ? <span className="text-sm font-normal text-slate-400">{t('common.loading')}</span> : underInvestigation}
            </div>
          </div>
        </div>

        {/* Solved Cases (Status 2, 3, 4 - Follows Range) */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{t('dashboard.solved_cases')}</div>
            <div className="text-xl font-extrabold text-emerald-600">
              {(isLoading || solved === null) ? <span className="text-sm font-normal text-slate-400">{t('common.loading')}</span> : solved}
            </div>
          </div>
        </div>

        {/* Active Officers (Current Total) */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-50 text-slate-700 rounded-lg border border-slate-200">
            <Users size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{t('dashboard.active_officers')}</div>
            <div className="text-xl font-extrabold text-slate-800">
              {(isLoading || activeOfficersCount === null) ? <span className="text-sm font-normal text-slate-400">{t('common.loading')}</span> : activeOfficersCount}
            </div>
          </div>
        </div>

        {/* Police Stations (Current Total) */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4 col-span-2 xl:col-span-1">
          <div className="p-3 bg-slate-50 text-slate-700 rounded-lg border border-slate-200">
            <MapPin size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{t('dashboard.police_stations')}</div>
            <div className="text-xl font-extrabold text-slate-800">
              {(isLoading || totalStations === null) ? <span className="text-sm font-normal text-slate-400">{t('common.loading')}</span> : totalStations}
            </div>
          </div>
        </div>

      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Chart 1: Dynamic Trend */}
        <div className="bg-white p-5 rounded-xl border shadow-sm xl:col-span-2 flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-ksp-blue" /> {trendTitle}
          </h3>
          <div className="h-64 w-full text-xs flex items-center justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-8 h-8 border-3 border-ksp-blue border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.loading')}</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Cases" stroke="#00529B" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Category Breakdown Donut */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Shield size={14} className="text-ksp-gold-dark" /> {t('charts.category_distribution')}
          </h3>
          <div className="h-64 w-full text-xs relative flex items-center justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-8 h-8 border-3 border-ksp-gold border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.loading')}</span>
              </div>
            ) : categoryCounts.length > 0 ? (
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
              <span className="text-slate-400">{t('charts.no_category_data')}</span>
            )}
            
            {/* Center Summary Label (Follows selected range) */}
            {!isLoading && totalFIR !== null && (
              <div className="absolute text-center pointer-events-none">
                <div className="text-xl font-extrabold text-ksp-navy">{totalFIR}</div>
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">{t('charts.cases')}</div>
              </div>
            )}
          </div>
          {/* Custom Legends list */}
          {!isLoading && (
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[9px] font-bold text-slate-500">
              {categoryCounts.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="truncate">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
