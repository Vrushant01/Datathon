import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAIDashboard } from '../../services/aiService';
import { Zap, Activity, ShieldAlert, Shield, MapPin, ExternalLink } from 'lucide-react';
import { getCasesForAnomaly } from '../../utils/anomalyFilters';
import { mockDb } from '../../utils/mockDb';
import { API_BASE_URL } from '../../config/api';

interface StationRiskResult {
  stationId: number;
  stationName: string;
  districtId: number;
  riskScore: number;
  riskLevel: string;
  features: any;
  explanation?: string;
}

export const AIAnomalyDetection: React.FC = () => {
  const navigate = useNavigate();
  const cases = mockDb.getCases();

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
    const params = new URLSearchParams();
    if (alert.district) params.set('district', alert.district);
    if (alert.crimeType) params.set('crimeType', alert.crimeType);
    if (alert.level === 'STATION' && alert.locationName) {
      params.set('station', alert.locationName);
    }
    navigate(`/admin-portal/gis?${params.toString()}`);
  };

  const handleViewCases = (alert: any) => {
    const params = new URLSearchParams();
    if (alert.district) params.set('district', alert.district);
    if (alert.crimeType) params.set('crimeType', alert.crimeType);
    if (alert.level === 'STATION' && alert.locationName) {
      params.set('station', alert.locationName);
    }
    if (alert.windowStart && alert.windowEnd) {
      params.set('startDate', alert.windowStart);
      params.set('endDate', alert.windowEnd);
    }
    navigate(`/admin-portal/firs?${params.toString()}`);
  };

  // ── Station Risk Prediction ────────────────────────────────────────────────
  const [stationRisks, setStationRisks] = useState<StationRiskResult[]>([]);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState(false);
  const riskFetchedRef = useRef(false);

  const fetchStationRisks = async () => {
    setRiskError(false);
    setRiskLoading(true);
    const url = `${API_BASE_URL}/api/station-risk/batch-predict`;
    console.log(`[Station Risk] Request URL: ${url}`);
    
    try {
      const response = await fetch(url);
      console.log(`[Station Risk] HTTP status: ${response.status}`);
      
      const rawText = await response.text();
      console.log(`[Station Risk] Raw response: ${rawText.substring(0, 150)}...`);
      
      let body;
      try {
        body = JSON.parse(rawText);
      } catch (e) {
        console.error('[Station Risk] Failed to parse JSON', e);
        setRiskError(true);
        return;
      }
      
      console.log(`[Station Risk] Response type: ${typeof body}, isArray: ${Array.isArray(body)}`);
      
      const predictions =
          Array.isArray(body)
            ? body
            : Array.isArray(body.predictions)
              ? body.predictions
              : Array.isArray(body.data)
                ? body.data
                : [];
                
      console.log(`[Station Risk] Prediction count: ${predictions.length}`);
      if (predictions.length > 0) {
        console.log(`[Station Risk] First prediction:`, predictions[0]);
      }
      
      if (predictions.length > 0) {
        const sorted = [...predictions].sort((a: any, b: any) => (b.riskScore || 0) - (a.riskScore || 0));
        setStationRisks(sorted);
      } else {
        // If it's explicitly { success: false }, treat as error, otherwise empty
        if (body && body.success === false) {
          setRiskError(true);
        } else {
          setStationRisks([]);
        }
      }
    } catch (e) {
      console.error('[Station Risk] Fetch error', e);
      setRiskError(true);
    } finally {
      setRiskLoading(false);
    }
  };

  useEffect(() => {
    if (riskFetchedRef.current) return;
    riskFetchedRef.current = true;
    fetchStationRisks();
  }, []);

  const [selectedStation, setSelectedStation] = useState<StationRiskResult | null>(null);

  const getRiskColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL': return 'text-red-600 bg-red-100 border-red-300';
      case 'HIGH': return 'text-amber-600 bg-amber-100 border-amber-300';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      case 'LOW': return 'text-green-600 bg-green-100 border-green-300';
      default: return 'text-slate-600 bg-slate-100 border-slate-300';
    }
  };

  const handleRiskViewGIS = (station: StationRiskResult) => {
    const params = new URLSearchParams();
    params.set('station', station.stationName);
    navigate(`/admin-portal/gis?${params.toString()}`);
  };

  const handleRiskViewCases = (station: StationRiskResult) => {
    const params = new URLSearchParams();
    params.set('station', station.stationName);
    navigate(`/admin-portal/firs?${params.toString()}`);
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
                        <span className="font-extrabold text-slate-800">
                          {getCasesForAnomaly(cases, {
                            district: alert.district,
                            station: alert.level === 'STATION' ? alert.locationName : 'ALL',
                            crimeType: alert.crimeType,
                            startDate: alert.windowStart,
                            endDate: alert.windowEnd,
                            status: 'ALL'
                          }).length} cases
                        </span>
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

      {/* ── STATION RISK PREDICTION ───────────────────────────────────── */}
      <div className="mt-8 bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-slate-50 flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg border border-blue-200">
            <Activity size={16} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-ksp-navy tracking-widest uppercase m-0">
              STATION RISK PREDICTION
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              XGBoost predictive assessment of police station crime risk
            </p>
          </div>
        </div>

        <div className="p-5">
          {riskLoading ? (
            <div className="text-sm text-slate-500 font-medium py-8 text-center animate-pulse">Loading predictive models...</div>
          ) : riskError ? (
            <div className="text-sm text-red-500 font-medium py-8 text-center flex flex-col items-center gap-3">
              Unable to load station risk predictions.
              <button 
                onClick={() => fetchStationRisks()}
                className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : stationRisks.length === 0 ? (
            <div className="text-sm text-slate-500 font-medium py-8 text-center">No predictions available.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {stationRisks.map((station, i) => (
                <div 
                  key={i} 
                  className="border border-slate-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer bg-white"
                  onClick={() => setSelectedStation(station)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{station.stationName}</h4>
                      <p className="text-[11px] text-slate-500">District ID: {station.districtId}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${getRiskColor(station.riskLevel)}`}>
                      {station.riskLevel}
                    </span>
                  </div>
                  
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Model Confidence</p>
                      <p className="text-xl font-extrabold text-slate-800">{(station.riskScore * 100).toFixed(1)}%</p>
                      <p className="text-[9px] text-slate-400">confidence in {station.riskLevel} prediction</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRiskViewGIS(station); }}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[10px] sm:text-xs font-bold text-slate-500 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded transition"
                        title="View on GIS"
                      >
                        <MapPin size={14} /> View GIS
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRiskViewCases(station); }}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[10px] sm:text-xs font-bold text-slate-500 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded transition"
                        title="View Cases"
                      >
                        <ExternalLink size={14} /> View Cases
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* ── END STATION RISK PREDICTION ───────────────────────────────── */}

      {/* ── STATION DETAILS MODAL ─────────────────────────────────────── */}
      {selectedStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">{selectedStation.stationName} Prediction Details</h3>
                <p className="text-xs text-slate-500">District ID: {selectedStation.districtId}</p>
              </div>
              <button 
                onClick={() => setSelectedStation(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex gap-4 mb-6">
                <div className={`px-4 py-3 rounded-lg border flex-1 ${getRiskColor(selectedStation.riskLevel)}`}>
                  <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">Risk Level</p>
                  <p className="text-xl font-extrabold">{selectedStation.riskLevel}</p>
                </div>
                <div className="px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Model Confidence</p>
                  <p className="text-xl font-extrabold text-slate-800">{(selectedStation.riskScore * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">XGBoost confidence in <strong>{selectedStation.riskLevel}</strong> prediction</p>
                </div>
              </div>

              {selectedStation.explanation && (
                <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <ShieldAlert size={14} /> Why is this station high risk?
                  </h4>
                  <p className="text-sm text-blue-900">{selectedStation.explanation}</p>
                </div>
              )}

              <h4 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2">XGBoost Input Features</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                <div>
                  <p className="text-xs text-slate-500">7-Day Cases</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.case_count_7d || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Prev 7-Day Cases</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.case_count_previous_7d || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Prev 30-Day Cases</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.case_count_previous_30d || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Prev 90-Day Cases</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.case_count_previous_90d || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Growth (vs prev 7d)</p>
                  <p className="font-semibold text-slate-800">
                    {selectedStation.features?.growth_vs_previous_week 
                      ? `${(selectedStation.features.growth_vs_previous_week * 100).toFixed(1)}%` 
                      : '0%'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Growth (vs prev 30d)</p>
                  <p className="font-semibold text-slate-800">
                    {selectedStation.features?.growth_vs_previous_30d 
                      ? `${(selectedStation.features.growth_vs_previous_30d * 100).toFixed(1)}%` 
                      : '0%'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Property Cases</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.property_cases || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Crimes Against Women</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.women_cases || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Crimes Against Body</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.body_cases || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Economic Offences</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.economic_cases || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Cyber Crimes</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.cyber_cases || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">SLL Cases</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.sll_cases || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Night Case Ratio</p>
                  <p className="font-semibold text-slate-800">
                    {selectedStation.features?.night_case_ratio 
                      ? `${(selectedStation.features.night_case_ratio * 100).toFixed(1)}%` 
                      : '0%'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Unique Accused</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.unique_accused_count || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Repeat Offender Cases</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.repeat_offender_case_count || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Historical Mean (7d)</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.historical_mean_7d?.toFixed(2) || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Historical StdDev (7d)</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.historical_stddev_7d?.toFixed(2) || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Historical Z-Score</p>
                  <p className="font-semibold text-slate-800">{selectedStation.features?.historical_z_score?.toFixed(2) || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t bg-slate-50 flex gap-3">
              <button 
                onClick={() => handleRiskViewGIS(selectedStation)}
                className="flex-1 bg-ksp-navy text-white font-bold py-2 rounded shadow-sm hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 text-sm"
              >
                <MapPin size={16} /> VIEW ON GIS
              </button>
              <button 
                onClick={() => handleRiskViewCases(selectedStation)}
                className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-2 rounded shadow-sm hover:bg-slate-50 transition-colors flex justify-center items-center gap-2 text-sm"
              >
                <ExternalLink size={16} /> VIEW CASES
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
