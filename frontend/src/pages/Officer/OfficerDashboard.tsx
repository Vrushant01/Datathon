import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDbConnection } from '../../hooks/useDbConnection';
import { SyncStatusBanner } from '../../components/SyncStatusBanner';
import { mockDb } from '../../../data/mockDb';
import { Link } from 'react-router-dom';
import { authFetch } from '../../utils/authFetch';
import { API_BASE_URL } from '../../config/api';
import { sseClient } from '../../utils/SSEClient';
import { 
  FileText, Clock, CheckCircle2, ChevronRight, 
  MapPin, Shield, AlertTriangle, RefreshCw
} from 'lucide-react';

const OFFICER_REQUIRED_TABLES = ['cases', 'accused', 'victims', 'units', 'employees'];

export const OfficerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { syncReport, retrySync, dataLoaded } = useDbConnection();
  
  const [assignedCases, setAssignedCases] = useState<any[]>([]);
  const [isFetchLoading, setIsFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Check required tables status from syncReport
  const requiredTableStatuses = useMemo(() => {
    return OFFICER_REQUIRED_TABLES.map(t => syncReport.tables[t]);
  }, [syncReport]);

  const anyRequiredTableFailed = useMemo(() => {
    return requiredTableStatuses.some(t => t?.status === 'failed');
  }, [requiredTableStatuses]);

  const allRequiredTablesLoaded = useMemo(() => {
    return requiredTableStatuses.every(t => t?.status === 'success');
  }, [requiredTableStatuses]);

  const fetchCases = async () => {
    if (!user?.employeeId) return;
    setIsFetchLoading(true);
    setFetchError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/cases?officer=${user.employeeId}`);
      if (res.ok) {
        const data = await res.json();
        const cases = Array.isArray(data) ? data : (data.data || []);
        const filtered = cases.filter((c: any) => Number(c.PolicePersonID) === Number(user.employeeId));
        setAssignedCases(filtered);
      } else {
        // Fallback to mockDb if synced
        const localCases = mockDb.getCases().filter((c: any) => Number(c.PolicePersonID) === Number(user.employeeId));
        if (localCases.length > 0) {
          setAssignedCases(localCases);
        } else {
          setFetchError(`HTTP ${res.status}: Failed to load assigned cases`);
        }
      }
    } catch (e: any) {
      console.error('Failed to fetch officer cases', e);
      const localCases = mockDb.getCases().filter((c: any) => Number(c.PolicePersonID) === Number(user.employeeId));
      if (localCases.length > 0) {
        setAssignedCases(localCases);
      } else {
        setFetchError(e.message || 'Connection to security gateway failed.');
      }
    } finally {
      setIsFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [user?.employeeId]);

  // Re-check or populate when tables finish syncing
  useEffect(() => {
    if (allRequiredTablesLoaded && assignedCases.length === 0) {
      const localCases = mockDb.getCases().filter((c: any) => Number(c.PolicePersonID) === Number(user?.employeeId));
      if (localCases.length > 0) {
        setAssignedCases(localCases);
      }
    }
  }, [allRequiredTablesLoaded, user?.employeeId]);

  // SSE real-time subscriptions — refresh when FIRs change
  useEffect(() => {
    const handlers = [
      sseClient.subscribe('FIR_CREATED', () => fetchCases()),
      sseClient.subscribe('FIR_UPDATED', () => fetchCases()),
      sseClient.subscribe('FIR_DELETED', () => fetchCases()),
      sseClient.subscribe('ASSIGNMENT_UPDATED', () => fetchCases()),
    ];
    return () => handlers.forEach(unsub => unsub());
  }, [user]);

  // Determine overall page loading state:
  // True if API fetch is loading OR if required tables are still pending/syncing
  const isPageLoading = isFetchLoading || (!allRequiredTablesLoaded && !anyRequiredTableFailed);

  // Statistics derived from server data (only when not loading)
  const totalAssigned = assignedCases.length;
  const underInvestigation = assignedCases.filter(c => c.CaseStatusID === 1).length;
  const closedOrDisposed = assignedCases.filter(c => c.CaseStatusID === 2 || c.CaseStatusID === 3 || c.CaseStatusID === 4).length;

  const hasFatalError = (anyRequiredTableFailed || fetchError) && assignedCases.length === 0 && !isPageLoading;

  const getStatusName = (id: number) => {
    const statuses: Record<number, string> = { 1: 'Under Investigation', 2: 'Charge Sheet Filed', 3: 'Disposed', 4: 'Closed' };
    return statuses[id] || 'Active';
  };

  const getCrimeCategory = (id: number) => {
    const cats: Record<number, string> = { 100: 'Penal Code', 200: 'NDPS Act', 300: 'IT Act' };
    return cats[id] || 'Penal Code';
  };

  const handleRetryAll = async () => {
    fetchCases();
    await retrySync();
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Table-specific sync status banner for the Officer portal */}
      <SyncStatusBanner requiredTables={OFFICER_REQUIRED_TABLES} />

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-ksp-navy-dark to-ksp-navy text-white p-6 rounded-xl border border-ksp-gold/20 shadow-md relative overflow-hidden">
        {/* Accent symbol */}
        <div className="absolute right-5 bottom-0 opacity-10 pointer-events-none scale-125 select-none">
          <Shield size={100} />
        </div>
        
        <div className="relative z-10 space-y-1">
          <span className="bg-ksp-gold/20 text-ksp-gold border border-ksp-gold/30 text-[9px] font-bold px-2 py-0.5 rounded select-none uppercase tracking-wider">
            Investigating Officer Desk
          </span>
          <h2 className="text-xl font-extrabold text-white m-0 tracking-tight">Welcome, Officer {user?.firstName}</h2>
          <p className="text-xs text-slate-300">
            Station Duty: <strong className="text-slate-100">{user?.stationName}</strong> • District: <strong className="text-slate-100">{user?.districtName}</strong>
          </p>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-ksp-navy rounded-lg border border-blue-100">
            <FileText size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Assigned FIRs</div>
            <div className="text-lg font-extrabold text-ksp-navy">
              {isPageLoading ? <span className="text-sm font-normal text-slate-400">Loading...</span> : totalAssigned}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Active Investigation</div>
            <div className="text-lg font-extrabold text-amber-600">
              {isPageLoading ? <span className="text-sm font-normal text-slate-400">Loading...</span> : underInvestigation}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Disposed Cases</div>
            <div className="text-lg font-extrabold text-emerald-600">
              {isPageLoading ? <span className="text-sm font-normal text-slate-400">Loading...</span> : closedOrDisposed}
            </div>
          </div>
        </div>

      </div>

      {/* Cases List */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xs font-extrabold text-ksp-navy uppercase m-0">My Assigned Case Files</h3>
          <span className="text-[10px] text-slate-400 font-bold">
            Total: {isPageLoading ? 'Loading...' : `${assignedCases.length} Cases`}
          </span>
        </div>

        {/* Loading Skeletons */}
        {isPageLoading ? (
          <div className="divide-y">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse">
                <div className="space-y-2 max-w-xl w-full">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-slate-200 rounded w-36"></div>
                    <div className="h-4 bg-slate-100 rounded w-16"></div>
                    <div className="h-4 bg-slate-200 rounded w-20"></div>
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-slate-200 rounded w-28 shrink-0"></div>
              </div>
            ))}
          </div>
        ) : hasFatalError ? (
          /* Error State with Retry Button */
          <div className="p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
            <div className="bg-red-50 p-3 rounded-full text-red-500 mb-3 border border-red-200">
              <AlertTriangle size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">Failed to load Assigned Cases</h4>
            <p className="text-xs text-slate-500 max-w-md mb-4 leading-relaxed">
              {fetchError || 'Unable to sync case records with CloudScale database.'}
            </p>
            <button
              onClick={handleRetryAll}
              className="bg-ksp-navy hover:bg-ksp-navy-light text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              <RefreshCw size={13} />
              Retry
            </button>
          </div>
        ) : (
          /* Live Cases List */
          <div className="divide-y">
            {assignedCases.map((c) => (
              <div key={c.CaseMasterID} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 block">Case No: {c.CaseNo}</span>
                    <span className="text-[9px] font-mono text-slate-400 font-medium">({c.CrimeNo})</span>
                    <span className="bg-slate-100 border text-slate-700 px-2 py-0.5 rounded text-[9px] font-bold">
                      {getCrimeCategory(c.CrimeMajorHeadID).split(' ').slice(-1)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed m-0 font-medium">
                    {c.BriefFacts}
                  </p>
                  <div className="flex gap-4 text-[10px] font-bold text-slate-400 pt-1">
                    <span>Registered: {c.CrimeRegisteredDate}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> Koramangala block</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    c.CaseStatusID === 1 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : c.CaseStatusID === 2 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {getStatusName(c.CaseStatusID)}
                  </span>
                  
                  <Link 
                    to={`/officer-portal/case/${c.CaseMasterID}`}
                    className="bg-ksp-navy hover:bg-ksp-navy-light text-white text-[10px] font-bold px-3.5 py-2 rounded-lg flex items-center gap-1 shadow-sm transition border border-ksp-gold/25"
                  >
                    Open Case File <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            ))}

            {/* Empty State ONLY after sync is complete AND result is genuinely empty */}
            {assignedCases.length === 0 && (
              <div className="p-12 text-center text-slate-400 font-bold">
                No cases currently assigned to your desk.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
