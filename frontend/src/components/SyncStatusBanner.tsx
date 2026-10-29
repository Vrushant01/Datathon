import React, { useState } from 'react';
import { useDbConnection } from '../hooks/useDbConnection';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, XCircle, CheckCircle2, Database, AlertCircle } from 'lucide-react';

export interface SyncStatusBannerProps {
  requiredTables?: string[];
  className?: string;
}

export const SyncStatusBanner: React.FC<SyncStatusBannerProps> = ({ requiredTables, className = '' }) => {
  const { syncReport, retrySync } = useDbConnection();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Filter tables if requiredTables specified, else all
  const tableEntries = Object.entries(syncReport.tables).filter(([name]) => 
    !requiredTables || requiredTables.includes(name)
  );

  const totalTables = requiredTables ? requiredTables.length : syncReport.totalTables;
  const loadedTables = tableEntries.filter(([_, t]) => t.status === 'success').length;
  const failedTableList = tableEntries.map(([_, t]) => t).filter(t => t.status === 'failed');
  const partialTableList = tableEntries.map(([_, t]) => t).filter(t => t.isPartial);
  const failedTables = failedTableList.length;
  const partialTables = partialTableList.length;

  // Determine if required tables are still syncing:
  // Either syncReport is syncing and not all required tables finished,
  // or no required table has loaded or failed yet (initial startup)
  const isSyncing = syncReport.isSyncing
    ? (loadedTables + failedTables < totalTables)
    : (loadedTables === 0 && failedTables === 0);

  const isComplete = (loadedTables === totalTables) && failedTables === 0 && partialTables === 0;

  // If sync is healthy (all required tables loaded, no failures, no partial data) and not currently syncing, hide banner
  if (isComplete && !isSyncing) {
    return null;
  }

  const hasIssues = failedTables > 0 || partialTables > 0;

  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      await retrySync();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className={`mb-6 rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm text-slate-800 transition-all duration-200 select-none ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
            {isSyncing ? (
              <RefreshCw size={18} className="animate-spin text-amber-600" />
            ) : (
              <AlertTriangle size={18} className="text-amber-600" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-amber-900">
                {isSyncing ? 'Syncing Database Tables...' : 'CloudScale Sync Notice'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-800 font-semibold">
                {loadedTables} / {totalTables} Loaded
                {failedTables > 0 ? ` (${failedTables} Skipped)` : ''}
              </span>
              {partialTables > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-200 text-orange-800 font-bold flex items-center gap-1">
                  <AlertCircle size={12} /> Data may be incomplete (${partialTables} partial)
                </span>
              )}
            </div>
            <p className="text-xs text-amber-700 mt-0.5 truncate max-w-2xl">
              {isSyncing 
                ? 'Fetching latest records from Zoho Catalyst CloudScale...' 
                : partialTables > 0 && failedTables === 0
                ? `Data may be incomplete: some database batches failed for ${partialTableList.map(p => p.table).join(', ')}. Numbers shown reflect successfully fetched records.`
                : `Some tables could not be synced: ${failedTableList.map(f => f.table).join(', ')}. Cached or fallback data is being used.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasIssues && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 rounded-lg flex items-center gap-1 transition cursor-pointer"
            >
              {isExpanded ? (
                <>Hide Details <ChevronUp size={14} /></>
              ) : (
                <>View Diagnostics ({failedTables + partialTables}) <ChevronDown size={14} /></>
              )}
            </button>
          )}

          <button
            onClick={handleRetry}
            disabled={isSyncing || isRetrying}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={13} className={isSyncing || isRetrying ? 'animate-spin' : ''} />
            {isSyncing || isRetrying ? 'Retrying...' : 'Retry Sync'}
          </button>
        </div>
      </div>

      {/* Expandable Breakdown Drawer */}
      {isExpanded && hasIssues && (
        <div className="mt-3 pt-3 border-t border-amber-200/80 text-xs">
          <div className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Database size={14} className="text-amber-600" />
            Table-Level Sync Diagnostics:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
            {failedTableList.map(item => (
              <div 
                key={item.table} 
                className="p-2.5 bg-white/90 rounded-lg border border-red-200 shadow-2xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between font-mono font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <XCircle size={13} className="text-red-500 shrink-0" />
                    <span>{item.table}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                    {item.httpStatus ? `HTTP ${item.httpStatus}` : 'Net Error'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 line-clamp-2" title={item.error}>
                  {item.error || 'Table fetch failed or table missing'}
                </div>
              </div>
            ))}
            {partialTableList.map(item => (
              <div 
                key={item.table + '-partial'} 
                className="p-2.5 bg-white/90 rounded-lg border border-orange-200 shadow-2xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between font-mono font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle size={13} className="text-orange-500 shrink-0" />
                    <span>{item.table}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-semibold">
                    Partial ({item.recordCount} records)
                  </span>
                </div>
                <div className="text-[11px] text-orange-700 mt-1">
                  Data may be incomplete: some CloudScale batches failed on server.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
