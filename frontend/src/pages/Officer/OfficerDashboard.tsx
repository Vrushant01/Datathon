import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { authFetch } from '../../utils/authFetch';
import { API_BASE_URL } from '../../config/api';
import { sseClient } from '../../utils/SSEClient';
import { 
  FileText, Clock, CheckCircle2, ChevronRight, 
  MapPin, Shield, ShieldCheck, Activity 
} from 'lucide-react';

export const OfficerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [assignedCases, setAssignedCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCases = async () => {
    if (!user?.employeeId) return;
    try {
      const res = await authFetch(`${API_BASE_URL}/api/cases?officer=${user.employeeId}`);
      if (res.ok) {
        const data = await res.json();
        const cases = Array.isArray(data) ? data : (data.data || []);
        setAssignedCases(cases.filter((c: any) => Number(c.PolicePersonID) === Number(user.employeeId)));
      }
    } catch (e) {
      console.error('Failed to fetch officer cases', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [user?.employeeId]);

  // SSE real-time subscriptions — refresh when FIRs change
  useEffect(() => {
    const handlers = [
      sseClient.subscribe('FIR_CREATED', () => fetchCases()),
      sseClient.subscribe('FIR_UPDATED', () => fetchCases()),
      sseClient.subscribe('FIR_DELETED', () => fetchCases()),
      sseClient.subscribe('ASSIGNMENT_UPDATED', () => fetchCases()),
      sseClient.onReconnect(() => fetchCases()),
    ];
    return () => handlers.forEach(unsub => unsub());
  }, [user]);
  
  // Statistics derived from server data
  const totalAssigned = assignedCases.length;
  const underInvestigation = assignedCases.filter(c => c.CaseStatusID === 1).length;
  const closedOrDisposed = assignedCases.filter(c => c.CaseStatusID === 2 || c.CaseStatusID === 3 || c.CaseStatusID === 4).length;

  const getStatusName = (id: number) => {
    const statuses: Record<number, string> = { 1: 'Under Investigation', 2: 'Charge Sheet Filed', 3: 'Disposed', 4: 'Closed' };
    return statuses[id] || 'Active';
  };

  const getCrimeCategory = (id: number) => {
    const cats: Record<number, string> = { 100: 'Penal Code', 200: 'NDPS Act', 300: 'IT Act' };
    return cats[id] || 'Penal Code';
  };

  return (

    <div className="space-y-6 select-none">
      
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
            <div className="text-lg font-extrabold text-ksp-navy">{totalAssigned}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Active Investigation</div>
            <div className="text-lg font-extrabold text-amber-600">{underInvestigation}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Disposed Cases</div>
            <div className="text-lg font-extrabold text-emerald-600">{closedOrDisposed}</div>
          </div>
        </div>

      </div>

      {/* Cases List */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xs font-extrabold text-ksp-navy uppercase m-0">My Assigned Case Files</h3>
          <span className="text-[10px] text-slate-400 font-bold">Total: {assignedCases.length} Cases</span>
        </div>

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

          {assignedCases.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-bold">
              No cases currently assigned to your desk.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
