import React from 'react';
import { useDbConnection } from '../hooks/useDbConnection';
import { X, RefreshCw, CheckCircle2, XCircle, Clock, Database, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncDiagnosticsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { status, syncReport, retrySync } = useDbConnection();

  if (!isOpen) return null;

  const tableEntries = Object.values(syncReport.tables);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-ksp-navy to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Database size={20} className="text-ksp-gold" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-wide flex items-center gap-2">
                Zoho Catalyst CloudScale Diagnostics
              </h3>
              <p className="text-xs text-slate-300">
                Live Table Synchronization & Gateway Health Status
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Highlights */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gateway Status</div>
            <div className="text-sm font-extrabold capitalize mt-0.5 flex items-center justify-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
              {status}
            </div>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tables Synced</div>
            <div className="text-sm font-extrabold text-emerald-600 mt-0.5">
              {syncReport.loadedTables} / {syncReport.totalTables}
            </div>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tables Skipped</div>
            <div className={`text-sm font-extrabold mt-0.5 ${syncReport.failedTables > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
              {syncReport.failedTables}
            </div>
          </div>
        </div>

        {/* Table Details */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Table Sync Details
          </div>

          <div className="space-y-1.5">
            {tableEntries.map(tbl => {
              const isSuccess = tbl.status === 'success';
              const isFailed = tbl.status === 'failed';
              const isSyncing = tbl.status === 'syncing';

              return (
                <div 
                  key={tbl.table} 
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                    isSuccess 
                      ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950'
                      : isFailed 
                      ? 'bg-red-50/50 border-red-200 text-red-950' 
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isSuccess && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
                    {isFailed && <XCircle size={16} className="text-red-500 shrink-0" />}
                    {isSyncing && <RefreshCw size={16} className="text-blue-500 animate-spin shrink-0" />}
                    {!isSuccess && !isFailed && !isSyncing && <Clock size={16} className="text-slate-400 shrink-0" />}

                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {tbl.table}
                        <span className="font-normal font-sans text-slate-400 ml-2">({tbl.endpoint})</span>
                      </div>
                      {isFailed && tbl.error && (
                        <div className="text-[11px] text-red-600 mt-0.5 truncate max-w-md" title={tbl.error}>
                          {tbl.error}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isSuccess && !tbl.isPartial && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {tbl.recordCount} rows
                      </span>
                    )}
                    {isSuccess && tbl.isPartial && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-[10px]" title="Data may be incomplete (batch errors)">
                        Partial ({tbl.recordCount} rows)
                      </span>
                    )}
                    {isFailed && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                        {tbl.httpStatus ? `HTTP ${tbl.httpStatus}` : 'Error'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {syncReport.lastSyncTime ? `Last attempt: ${new Date(syncReport.lastSyncTime).toLocaleTimeString()}` : 'No sync run yet'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/80 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => retrySync()}
              disabled={syncReport.isSyncing}
              className="px-4 py-2 bg-ksp-navy hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncReport.isSyncing ? 'animate-spin' : ''} />
              {syncReport.isSyncing ? 'Syncing...' : 'Retry All Sync'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

