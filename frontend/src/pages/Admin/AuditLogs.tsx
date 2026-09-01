import React, { useState } from 'react';
import { mockDb } from '../../utils/mockDb';
import { History, ShieldAlert, Calendar, Search } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs] = useState(mockDb.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter(l => {
    const term = searchQuery.toLowerCase();
    return (
      (l.user_email || '').toLowerCase().includes(term) ||
      (l.action || '').toLowerCase().includes(term) ||
      (l.details || '').toLowerCase().includes(term) ||
      (l.table_name || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-[clamp(16px,4vw,20px)] font-extrabold text-ksp-navy m-0 uppercase tracking-tight">KSP Audit Compliance Logs</h2>
          <p className="text-[clamp(10px,2vw,12px)] text-slate-500 font-bold uppercase tracking-wider mt-1">Immutable session triggers and data modifications logs</p>
        </div>
      </div>

      {/* Roster Controls */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center relative">
        <span className="absolute left-7 text-slate-400">
          <Search size={16} />
        </span>
        <input 
          type="text" 
          placeholder="Search logs by User Email, Action, Table or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ksp-navy focus:border-transparent transition"
        />
      </div>

      {/* Roster Table Grid */}
      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-4">Log ID</th>
              <th className="p-4">Operator Email</th>
              <th className="p-4">Action Trigger</th>
              <th className="p-4">Table & Record ID</th>
              <th className="p-4">Timestamp</th>
              <th className="p-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLogs.map((log) => (
              <tr key={log.LogID} className="hover:bg-slate-50 transition">
                <td className="p-4 font-bold text-slate-400">{log.LogID}</td>
                <td className="p-4 font-bold text-ksp-blue">{log.user_email}</td>
                <td className="p-4">
                  <span className="bg-slate-100 border text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                    {log.action}
                  </span>
                </td>
                <td className="p-4 leading-normal">
                  <span className="font-semibold text-slate-700 block">{log.table_name || 'N/A'}</span>
                  <span className="text-[10px] text-slate-400 font-medium block">ID: {log.record_id || 'N/A'}</span>
                </td>
                <td className="p-4 font-semibold text-slate-500 whitespace-nowrap">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {log.timestamp.replace('T', ' ').substring(0, 19)}</span>
                </td>
                <td className="p-4 text-slate-600 font-medium">{log.details}</td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-8 text-slate-400 font-bold">No compliance audit logs found matching filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
