import { authFetch } from '../../utils/authFetch';
import React, { useState, useEffect } from 'react';
import { History, ShieldAlert, Calendar, Search, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

export interface AuditLog {
  AuditLogID: string;
  Timestamp: string;
  Action: string;
  EntityType: string;
  EntityID: string;
  Description: string;
  ActorID: string;
  OldValue?: string;
  NewValue?: string;
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState<string[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const limit = 50;

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const fetchLogs = async (currentPage: number) => {
    try {
      setLoading(true);
      setError(null);
      const currentCursor = currentPage > 1 ? cursors[currentPage - 2] : '';
      const url = new URL(`${API_BASE_URL}/api/audit-logs`);
      url.searchParams.append('limit', limit.toString());
      if (currentCursor) {
        url.searchParams.append('cursor', currentCursor);
      }
      
      const res = await authFetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      setLogs(data.data || []);
      
      if (data.nextCursor) {
        setCursors(prev => {
          const newCursors = [...prev];
          newCursors[currentPage - 1] = data.nextCursor;
          return newCursors;
        });
        setHasNextPage(true);
      } else {
        setHasNextPage(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(l => {
    const term = searchQuery.toLowerCase();
    return (
      String(l.ActorID || '').toLowerCase().includes(term) ||
      String(l.Action || '').toLowerCase().includes(term) ||
      String(l.Description || '').toLowerCase().includes(term) ||
      String(l.EntityType || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 select-none">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight">KSP Audit Compliance Logs</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Immutable session triggers and data modifications logs (CloudScale Persistent)</p>
        </div>
      </div>

      {/* Roster Controls */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-wrap gap-4 items-center justify-between relative">
        <div className="flex-1 relative min-w-[300px]">
          <span className="absolute left-3 top-2.5 text-slate-400">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Search logs by Actor, Action, Entity or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ksp-navy focus:border-transparent transition"
          />
        </div>
        
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <button 
            disabled={page <= 1 || loading} 
            onClick={() => setPage(p => p - 1)}
            className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
          >
            <ChevronLeft size={16} />
          </button>
          <span>Page {page}</span>
          <button 
            disabled={!hasNextPage || loading} 
            onClick={() => setPage(p => p + 1)}
            className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
          >
            <ChevronRight size={16} />
          </button>
          <span className="ml-4 border-l pl-4">Showing latest logs</span>
        </div>
      </div>

      {/* Roster Table Grid */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden min-h-[400px] relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
            <Loader className="animate-spin text-ksp-navy" />
          </div>
        )}
        
        {error && !loading && (
          <div className="p-8 text-center text-red-500 font-bold bg-red-50">
            <ShieldAlert className="mx-auto mb-2 opacity-50" size={32} />
            {error}
          </div>
        )}

        {!error && (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Log ID</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Action</th>
                <th className="p-4">Entity & ID</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLogs.map((log) => (
                <tr key={log.AuditLogID} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-bold text-slate-400">{log.AuditLogID}</td>
                  <td className="p-4 font-bold text-ksp-blue">{log.ActorID}</td>
                  <td className="p-4">
                    <span className="bg-slate-100 border text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                      {log.Action}
                    </span>
                  </td>
                  <td className="p-4 leading-normal">
                    <span className="font-semibold text-slate-700 block">{log.EntityType || 'N/A'}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">ID: {log.EntityID || 'N/A'}</span>
                  </td>
                  <td className="p-4 font-semibold text-slate-500 whitespace-nowrap">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {log.Timestamp.replace('T', ' ').substring(0, 19)}</span>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">
                    {log.Description}
                    {log.OldValue && <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">Old: {log.OldValue}</div>}
                    {log.NewValue && <div className="text-[10px] text-green-600 mt-0.5 line-clamp-1">New: {log.NewValue}</div>}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-slate-400 font-bold">No compliance audit logs found matching filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};
