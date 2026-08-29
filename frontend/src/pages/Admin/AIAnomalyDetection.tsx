import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAIDashboard } from '../../services/aiService';
import { Zap, Activity, ShieldAlert, Shield, MapPin, ExternalLink } from 'lucide-react';

export const AIAnomalyDetection: React.FC = () => {
  const navigate = useNavigate();

  // ── AI Anomaly Terminal ────────────────────────────────────────────────────
  const [anomalyAlerts, setAnomalyAlerts] = useState<any[]>([]);
  const [anomalyLoading, setAnomalyLoading] = useState(true);
  const [anomalyError, setAnomalyError] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setAnomalyLoading(true);
    getAIDashboard()
      .then(data => {
        if (!data) { setAnomalyError(true); return; }
        // Filter to only temporal anomaly alerts (from the detectTemporalAnomalies engine)
        const temporal = (data.alerts || []).filter((a: any) =>
          typeof a.id === 'string' && a.id.startsWith('ALT-TEMP-')
        );
        // Sort: CRITICAL first, then HIGH; within tier by riskScore desc
        temporal.sort((a: any, b: any) => {
          const severityRank = (s: string) => s === 'Critical' ? 0 : 1;
          const sr = severityRank(a.severity) - severityRank(b.severity);
          return sr !== 0 ? sr : (b.riskScore || 0) - (a.riskScore || 0);
        });
        setAnomalyAlerts(temporal);
      })
      .catch(() => setAnomalyError(true))
      .finally(() => setAnomalyLoading(false));
  }, []);

  const handleViewGIS = (alert: any) => {
    navigate('/admin-portal/gis');
  };

  const handleViewCases = (alert: any) => {
    navigate('/admin-portal/fir-management');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-extrabold text-ksp-navy mb-6">AI Anomaly Detection Center</h1>
      
      {/* ── AI ANOMALY DETECTION TERMINAL ───────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-slate-900 to-ksp-navy">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ksp-gold/20 rounded-lg border border-ksp-gold/30">
              <Zap size={16} className="text-ksp-gold" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-widest m-0">
                AI ANOMALY DETECTION CENTER
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Temporal Z-Score deviation from 8-week non-overlapping baseline · District &amp; Station level
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!anomalyLoading && !anomalyError && (
              <>
                <span className="bg-red-600/20 text-red-400 border border-red-600/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {anomalyAlerts.filter(a => a.severity === 'Critical').length} CRITICAL
                </span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {anomalyAlerts.filter(a => a.severity === 'High').length} HIGH
                </span>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {anomalyLoading && (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Activity size={16} className="animate-pulse" />
              <span className="text-xs font-semibold">Running anomaly detection...</span>
            </div>
          )}

          {anomalyError && !anomalyLoading && (
            <div className="flex items-center gap-2 text-red-500 text-xs font-semibold py-6 justify-center">
              <ShieldAlert size={16} />
              <span>Could not reach AI backend. Check connection.</span>
            </div>
          )}

          {!anomalyLoading && !anomalyError && anomalyAlerts.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
              <Shield size={28} className="text-emerald-400" />
              <p className="text-xs font-semibold text-emerald-600">No significant temporal anomalies detected.</p>
              <p className="text-[10px] text-slate-400">All district and station crime rates are within historical norms.</p>
            </div>
          )}

          {!anomalyLoading && !anomalyError && anomalyAlerts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {anomalyAlerts.map((alert: any) => {
                const isCritical = alert.severity === 'Critical';
                const levelLabel = alert.level || 'DISTRICT';
                return (
                  <div
                    key={alert.id}
                    className={`rounded-lg border p-4 flex flex-col gap-2.5 ${
                      isCritical
                        ? 'border-red-200 bg-red-50'
                        : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    {/* Top row: severity badge + level */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        isCritical
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {levelLabel}
                      </span>
                    </div>

                    {/* Location + crime type */}
                    <div>
                      <div className="text-sm font-extrabold text-ksp-navy leading-tight">
                        {alert.locationName || alert.district || '—'}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                        {alert.crimeType}
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Current</span>
                        <span className="font-extrabold text-slate-800">{alert.currentValue ?? alert.currentCount} cases</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Baseline</span>
                        <span className="font-extrabold text-slate-800">{alert.historicalAverage ?? alert.baselineMean}/wk</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Z-Score</span>
                        <span className={`font-extrabold ${ isCritical ? 'text-red-600' : 'text-amber-600' }`}>
                          {typeof alert.zScore === 'number' ? alert.zScore.toFixed(2) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Change</span>
                        <span className={`font-extrabold ${ isCritical ? 'text-red-600' : 'text-amber-600' }`}>
                          +{alert.percentIncrease ?? alert.percentageChange}%
                        </span>
                      </div>
                    </div>

                    {/* Detection window */}
                    {alert.windowStart && (
                      <div className="text-[9px] font-medium text-slate-400 bg-white/70 rounded px-2 py-1 border border-slate-100">
                        Window: {alert.windowStart} → {alert.windowEnd}
                        {alert.baselinePeriods && ` · ${alert.baselinePeriods}-wk baseline`}
                      </div>
                    )}

                    {/* Reason */}
                    <p className="text-[10px] text-slate-600 leading-relaxed border-t border-slate-200/60 pt-2">
                      {alert.reason}
                    </p>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-auto pt-1">
                      <button
                        onClick={() => handleViewGIS(alert)}
                        className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded border border-ksp-navy text-ksp-navy hover:bg-ksp-navy hover:text-white transition-colors"
                      >
                        <MapPin size={10} /> VIEW ON GIS
                      </button>
                      <button
                        onClick={() => handleViewCases(alert)}
                        className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <ExternalLink size={10} /> VIEW CASES
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* ── END AI ANOMALY DETECTION TERMINAL ──────────────────────────── */}
    </div>
  );
};
