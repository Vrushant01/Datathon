import { authFetch } from '../../utils/authFetch';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ShieldAlert, MapPin, Repeat, Share2, FileText, ChevronRight, CheckCircle2, XCircle, Search, Bot, AlertTriangle, AlertCircle } from 'lucide-react';
import { getAIDashboard } from '../../services/aiService';
import { API_BASE_URL } from '../../config/api';
import ReactMarkdown from 'react-markdown';

export interface IntelligenceAlert {
  id: string;
  type: 'ANOMALY' | 'RISK';
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  districtId?: number;
  stationId?: number;
  locationName: string;
  crimeHeadId?: number;
  crimeType?: string;
  dateFrom?: string;
  dateTo?: string;
  currentValue?: number;
  baselineValue?: number;
  score?: number;
  explanation: string;
}

export const IntelligenceCenter: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<IntelligenceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAlert, setSelectedAlert] = useState<IntelligenceAlert | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const [aiData, riskRes] = await Promise.all([
          getAIDashboard(),
          authFetch(`${API_BASE_URL}/api/station-risk/batch-predict`).catch(() => null)
        ]);

        const newAlerts: IntelligenceAlert[] = [];

        // Map Anomalies
        if (aiData?.alerts) {
          const temporal = aiData.alerts.filter((a: any) =>
            typeof a.id === 'string' && a.id.startsWith('ALT-TEMP-')
          );
          
          temporal.forEach((a: any) => {
            const severityMap: any = {
              'Critical': 'CRITICAL',
              'High': 'HIGH',
              'Moderate': 'MODERATE',
              'Low': 'LOW'
            };
            
            newAlerts.push({
              id: a.id,
              type: 'ANOMALY',
              severity: severityMap[a.severity] || 'MODERATE',
              districtId: a.district ? Number(a.district) : undefined,
              locationName: a.locationName || 'Unknown Region',
              crimeHeadId: a.crimeHeadId,
              crimeType: a.crimeType,
              dateFrom: a.windowStart,
              dateTo: a.windowEnd,
              currentValue: a.currentCount,
              baselineValue: a.baselineMean,
              score: a.riskScore,
              explanation: a.title + (a.description ? ' - ' + a.description : '')
            });
          });
        }

        // Map Risks
        if (riskRes && riskRes.ok) {
          const riskData = await riskRes.json();
          if (riskData.success && Array.isArray(riskData.data)) {
            riskData.data.forEach((r: any) => {
              if (r.riskScore >= 70) {
                newAlerts.push({
                  id: `RISK-${r.stationId}`,
                  type: 'RISK',
                  severity: r.riskScore >= 85 ? 'CRITICAL' : 'HIGH',
                  districtId: r.districtId,
                  stationId: r.stationId,
                  locationName: r.stationName || 'Unknown Station',
                  score: r.riskScore,
                  explanation: r.explanation || `High station workload/risk detected (${r.riskScore.toFixed(1)}/100).`
                });
              }
            });
          }
        }

        // Sort by severity
        newAlerts.sort((a, b) => {
          const s = { 'CRITICAL': 0, 'HIGH': 1, 'MODERATE': 2, 'LOW': 3 };
          return s[a.severity] - s[b.severity] || (b.score || 0) - (a.score || 0);
        });

        setAlerts(newAlerts);
      } catch (err: any) {
        setError(err.message || 'Failed to load intelligence alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  return (
    <div className="flex h-full min-h-[85vh] gap-6 select-none relative">
      {/* ALERTS LIST SIDEBAR */}
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-gradient-to-r from-slate-900 to-ksp-navy text-white flex justify-between items-center">
          <div>
            <h2 className="font-extrabold text-sm uppercase tracking-widest flex items-center gap-2">
              <Brain size={16} className="text-ksp-gold" />
              Intelligence Center
            </h2>
            <p className="text-[10px] text-slate-300 font-medium mt-1">Cross-system Signals & Alerts</p>
          </div>
          <div className="flex gap-1">
            <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {alerts.filter(a => a.severity === 'CRITICAL').length} CRITICAL
            </span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50">
          {loading && <div className="text-center p-8 text-slate-400 text-xs font-bold">Loading Intelligence Feed...</div>}
          {error && <div className="text-center p-8 text-red-500 text-xs font-bold">{error}</div>}
          {!loading && !error && alerts.length === 0 && (
            <div className="text-center p-8 text-slate-400 text-xs font-bold">No active intelligence alerts.</div>
          )}
          {!loading && alerts.map(alert => (
            <div 
              key={alert.id}
              onClick={() => setSelectedAlert(alert)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedAlert?.id === alert.id 
                  ? 'bg-blue-50 border-blue-200 shadow-inner' 
                  : 'bg-white hover:bg-slate-50 hover:border-slate-300 border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
                  alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                  alert.severity === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {alert.severity} • {alert.type}
                </span>
                {alert.score !== undefined && (
                  <span className="text-xs font-extrabold text-slate-500">
                    {alert.type === 'ANOMALY' ? `Z: ${alert.score.toFixed(1)}` : `Score: ${alert.score.toFixed(0)}`}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-800 leading-snug mb-1">{alert.locationName}</h4>
              <p className="text-xs text-slate-600 line-clamp-2">{alert.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* INVESTIGATION PANEL */}
      <div className="w-2/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
        {selectedAlert ? (
          <InvestigationPanel alert={selectedAlert} onNavigate={navigate} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <ShieldAlert size={48} className="mb-4 opacity-20" />
            <h3 className="text-lg font-bold">Investigation Panel</h3>
            <p className="text-sm">Select an intelligence alert to begin correlation.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const InvestigationPanel: React.FC<{ alert: IntelligenceAlert, onNavigate: ReturnType<typeof useNavigate> }> = ({ alert, onNavigate }) => {
  const [affectedCases, setAffectedCases] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [offenders, setOffenders] = useState<any[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    const fetchContext = async () => {
      setLoadingContext(true);
      setAiSummary(null);
      try {
        const query = new URLSearchParams();
        query.append('type', alert.type);
        if (alert.districtId) query.append('districtId', alert.districtId.toString());
        if (alert.stationId) query.append('stationId', alert.stationId.toString());
        if (alert.crimeHeadId) query.append('crimeHeadId', alert.crimeHeadId.toString());
        if (alert.dateFrom) query.append('dateFrom', alert.dateFrom);
        if (alert.dateTo) query.append('dateTo', alert.dateTo);

        const res = await authFetch(`${API_BASE_URL}/api/ai/intelligence-context?${query.toString()}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (res.ok) {
           const data = await res.json();
           if (data.success) {
             setAffectedCases(data.affectedCases || []);
             setHotspots(data.hotspots || []);
             setOffenders(data.offenders || []);
           }
        }
      } catch (err) {
        console.error("Context fetch error:", err);
      } finally {
        setLoadingContext(false);
      }
    };

    fetchContext();
  }, [alert.id]);

  const generateSummary = async () => {
    setLoadingSummary(true);
    setAiSummary(null);
    try {
      // ONLY send identifiers. Backend will independently reconstruct the facts securely.
      const alertDetails = {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        districtId: alert.districtId,
        stationId: alert.stationId,
        crimeHeadId: alert.crimeHeadId,
        dateFrom: alert.dateFrom,
        dateTo: alert.dateTo,
        locationName: alert.locationName,
        explanation: alert.explanation,
        score: alert.score
      };

      const res = await authFetch(`${API_BASE_URL}/api/chatbot/investigation-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ alertDetails })
      });

      if (!res.ok) throw new Error("Failed to generate summary");
      const data = await res.json();
      setAiSummary(data.answer);
    } catch (err: any) {
      setAiSummary("AI summary unavailable. Database findings are still available.");
    } finally {
      setLoadingSummary(false);
    }
  };

  // Deterministic Recommendation Logic
  const getRecommendations = () => {
    const recs: string[] = [];
    if (alert.type === 'ANOMALY' && hotspots.length > 0) {
      recs.push("Review affected FIRs within the identified GIS hotspot.");
    }
    if (alert.type === 'ANOMALY' && offenders.length > 0) {
      recs.push("Review cases involving the identified repeat offender(s) active during this anomaly window.");
    }
    if (alert.type === 'RISK' && affectedCases.filter(c => c.CaseStatusID !== 2).length > 20) {
      recs.push("Review current station workload and pending investigations. A high volume of unsolved cases correlates with the risk score.");
    }
    if (affectedCases.length > 1 && offenders.length > 0) {
      recs.push("Analyze common persons and entities across the affected cases using the Criminal Network tool.");
    }
    
    if (recs.length === 0) {
      recs.push("Proceed with standard case-by-case review of affected FIRs.");
    }
    return recs;
  };

  if (loadingContext) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ksp-navy mb-4"></div>
        <p className="text-sm font-bold">Correlating database records...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Panel Header */}
      <div className="px-6 py-5 border-b bg-slate-50 flex justify-between items-start">
        <div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
            alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
            alert.severity === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'
          }`}>
            {alert.type} • {alert.severity}
          </span>
          <h2 className="text-xl font-extrabold text-slate-800 mt-2">{alert.locationName}</h2>
          <p className="text-sm font-medium text-slate-600 mt-1">{alert.explanation}</p>
        </div>
        <button 
          onClick={generateSummary}
          disabled={loadingSummary}
          className="flex items-center gap-2 bg-ksp-navy hover:bg-ksp-navy-light text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition disabled:opacity-50"
        >
          {loadingSummary ? <div className="animate-spin h-4 w-4 border-2 border-white/50 border-b-white rounded-full"></div> : <Bot size={16} />}
          AI Investigation Summary
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        
        {/* AI SUMMARY BOX */}
        {(aiSummary || loadingSummary) && (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-5 rounded-xl shadow-sm">
            <h3 className="text-sm font-extrabold text-indigo-900 mb-3 flex items-center gap-2">
              <Bot size={18} className="text-indigo-600" /> AI Investigation Summary
            </h3>
            {loadingSummary ? (
              <p className="text-sm text-indigo-700 animate-pulse font-medium">Analyzing verified structural context...</p>
            ) : (
              <div className="prose prose-sm prose-indigo max-w-none text-slate-700">
                <ReactMarkdown>{aiSummary!}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* DETERMINISTIC RECOMMENDATIONS */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" /> Deterministic Recommendations
          </h3>
          <ul className="space-y-3">
            {getRecommendations().map((rec, idx) => (
              <li key={idx} className="flex gap-3 text-sm font-medium text-slate-700 bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                <CheckCircle2 size={16} className="text-amber-500 shrink-0 mt-0.5" />
                {rec}
              </li>
            ))}
          </ul>
        </div>

        {/* DATABASE CORRELATIONS GRID */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* AFFECTED FIRS */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col">
            <div className="flex items-center gap-2 text-ksp-navy mb-3">
              <FileText size={16} />
              <h3 className="text-xs font-extrabold uppercase tracking-widest">Affected FIRs</h3>
            </div>
            {affectedCases.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium p-4 text-center bg-slate-50 rounded-lg">No matching cases found.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {affectedCases.map(c => (
                  <div key={c.CaseMasterID} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 group">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{c.CaseNo || `FIR-${c.CaseMasterID}`}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{c.CrimeRegisteredDate}</div>
                    </div>
                    <button 
                      onClick={() => onNavigate(`/officer-portal/case/${c.CaseMasterID}`)}
                      className="text-blue-600 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-blue-50 rounded"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HOTSPOTS */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col">
            <div className="flex items-center gap-2 text-ksp-navy mb-3">
              <MapPin size={16} />
              <h3 className="text-xs font-extrabold uppercase tracking-widest">GIS Hotspot</h3>
            </div>
            {hotspots.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium p-4 text-center bg-slate-50 rounded-lg">No matching hotspot available.</p>
            ) : (
              <div className="space-y-3">
                {hotspots.map((h, i) => (
                  <div key={i} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="text-xs font-bold text-red-800 mb-1">Red Zone Cluster Identified</div>
                    <div className="text-[10px] text-red-600 font-medium">Incident Count: {h.incidentCount}</div>
                    <button 
                      onClick={() => onNavigate('/admin-portal/gis')}
                      className="mt-2 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded transition w-full"
                    >
                      View on Map
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* REPEATED OFFENDERS */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col col-span-2">
            <div className="flex items-center gap-2 text-ksp-navy mb-3">
              <Repeat size={16} />
              <h3 className="text-xs font-extrabold uppercase tracking-widest">Repeated Offenders Connected</h3>
            </div>
            {offenders.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium p-4 text-center bg-slate-50 rounded-lg">No related repeat-offender records found.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {offenders.map(o => (
                  <div key={o.PersonID} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center group">
                    <div>
                      <div className="text-sm font-bold text-slate-800">{o.AccusedName}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{o.TotalCases} Total Cases Active</div>
                    </div>
                    <button 
                      onClick={() => onNavigate(`/admin-portal/network?personId=${encodeURIComponent(o.PersonID)}`)}
                      className="text-xs font-bold text-ksp-navy bg-white hover:bg-slate-100 border px-2 py-1 rounded transition opacity-0 group-hover:opacity-100 flex items-center gap-1"
                      title="View Criminal Network"
                    >
                      <Share2 size={12} /> Network
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
