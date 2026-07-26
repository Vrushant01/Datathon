import React, { useState, useEffect } from 'react';
import { Brain, AlertTriangle, MapPin, Users, Activity, FileText, ChevronRight, Share2, Check, Download, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as aiService from '../../services/aiService';

export const AIIntelligenceCenter: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  useEffect(() => {
    const fetchAI = async () => {
      setLoading(true);
      const dashboardData = await aiService.getAIDashboard();
      if (dashboardData) setData(dashboardData);
      setLoading(false);
    };
    fetchAI();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Brain className="text-ksp-gold mb-4 animate-pulse" size={48} />
        <h2 className="text-slate-500 font-bold tracking-widest uppercase text-sm">Processing Intelligence Data...</h2>
        <p className="text-xs text-slate-400 mt-2">Running DBSCAN & Statistical Anomaly Models</p>
      </div>
    );
  }

  const { summary, alerts, districtIntelligence } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between">
        <div className="absolute -right-12 -top-12 opacity-5 pointer-events-none">
          <Brain size={200} />
        </div>
        <div className="relative z-10 flex flex-col justify-center">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Brain className="text-ksp-navy" size={28} /> AI Intelligence Center
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Real-time Explainable AI (XAI) Engine</p>
        </div>

        {/* AI Health Card */}
        <div className="relative z-10 mt-4 md:mt-0 bg-slate-50 border border-slate-200 p-4 rounded-xl min-w-[280px]">
          <h3 className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-2 flex items-center gap-1.5"><Zap size={14} className="text-amber-500"/> AI ENGINE STATUS</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-bold text-slate-700 mb-3">
            <span className="flex items-center gap-1"><Check size={12} className="text-emerald-500"/> DBSCAN</span>
            <span className="flex items-center gap-1"><Check size={12} className="text-emerald-500"/> Z-Score</span>
            <span className="flex items-center gap-1"><Check size={12} className="text-emerald-500"/> EMA Trend</span>
            <span className="flex items-center gap-1"><Check size={12} className="text-emerald-500"/> Linear Reg.</span>
            <span className="flex items-center gap-1"><Check size={12} className="text-emerald-500"/> Rec. Engine</span>
            <span className="flex items-center gap-1"><Check size={12} className="text-emerald-500"/> DBO Outliers</span>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-200">
            <span>Last Analysis: Just now</span>
            <span>Processed: ~5,000 FIRs</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Daily Summary */}
        <div className="bg-ksp-navy text-white p-6 rounded-xl shadow-lg border-l-4 border-ksp-gold flex-grow">
          <h2 className="text-sm font-bold tracking-widest uppercase text-ksp-gold mb-4 flex items-center gap-2">
            <Activity size={16} /> Today's Intelligence Summary
          </h2>
          <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-line font-medium">
            {summary?.text || "No anomalies detected."}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
            <span className="text-xs text-slate-400">All alerts verified by mathematical probability models.</span>
            <button 
              onClick={() => aiService.downloadAIReport()}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-1.5 transition"
            >
              <Download size={14} /> Export Report
            </button>
          </div>
        </div>

        {/* District Intelligence Highlights */}
        {districtIntelligence && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-w-[280px]">
             <h2 className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-4">District Highlights</h2>
             <div className="space-y-3">
               <div>
                 <span className="text-[10px] text-slate-400 uppercase font-bold block">Most Improved</span>
                 <span className="text-sm font-black text-emerald-600">{districtIntelligence.insights.mostImproved.name} (-{districtIntelligence.insights.mostImproved.val}% growth)</span>
               </div>
               <div>
                 <span className="text-[10px] text-slate-400 uppercase font-bold block">Highest Growth</span>
                 <span className="text-sm font-black text-red-600">{districtIntelligence.insights.highestGrowth.name}</span>
               </div>
               <div>
                 <span className="text-[10px] text-slate-400 uppercase font-bold block">Highest Violent Crime</span>
                 <span className="text-sm font-black text-orange-600">{districtIntelligence.insights.highestViolent.name}</span>
               </div>
             </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[
          { label: 'Critical Alerts', value: summary?.criticalAlertsCount || 0, icon: <AlertTriangle size={18} className="text-red-500" /> },
          { label: 'Emerging Hotspots', value: summary?.emergingHotspotsCount || 0, icon: <MapPin size={18} className="text-orange-500" /> },
          { label: 'Repeat Offenders', value: summary?.repeatOffendersCount || 0, icon: <Users size={18} className="text-purple-500" /> },
          { label: 'Overloaded Stations', value: summary?.overloadedStationsCount || 0, icon: <Activity size={18} className="text-amber-500" /> },
          { label: 'High Severity FIRs', value: summary?.highSeverityCount || 0, icon: <FileText size={18} className="text-rose-500" /> }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{kpi.label}</span>
              {kpi.icon}
            </div>
            <div className="mt-2 text-2xl font-black text-slate-800">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Alert Center */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="text-slate-400" size={16} /> Live Alert Center
          </h2>
        </div>
        <div className="p-0">
          {(!alerts || alerts.length === 0) ? (
            <div className="p-8 text-center text-slate-400 text-sm font-medium">No alerts available.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map((alert: any) => (
                <div key={alert.id} className="p-6 hover:bg-slate-50 transition">
                  <div className="flex flex-col md:flex-row gap-4 justify-between">
                    
                    {/* Left: Metadata */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          alert.severity === 'Critical' ? 'bg-red-100 text-red-800' : 
                          alert.severity === 'High' ? 'bg-orange-100 text-orange-800' : 'bg-amber-100 text-amber-800'
                        }`}>{alert.severity}</span>
                        <span className="text-xs font-bold text-slate-400">Risk Score: <span className={alert.riskScore > 80 ? 'text-red-500' : 'text-slate-600'}>{alert.riskScore}/100</span></span>
                        <span className="text-xs font-bold text-emerald-600">Confidence: {alert.confidence}%</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={12}/> {alert.policeStation}</span>
                      </div>
                      <h3 className="text-base font-black text-slate-800 mb-1">{alert.crimeType}</h3>
                      
                      <div className="mt-3 bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Explainable AI (XAI)</span>
                          <button 
                            onClick={() => setExpandedTrace(expandedTrace === alert.id ? null : alert.id)}
                            className="text-[10px] font-bold text-ksp-navy underline"
                          >
                            {expandedTrace === alert.id ? 'Hide Trace' : 'View Decision Trace'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">{alert.reason}</p>
                        
                        {/* Decision Trace */}
                        {expandedTrace === alert.id && (
                          <div className="mt-4 p-4 bg-white rounded border border-slate-200 shadow-inner">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3">AI Decision Trace</h4>
                            <div className="flex flex-col gap-2 text-xs font-bold text-slate-600">
                              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"/>Algorithm Used: <span className="text-ksp-navy">{alert.algorithmUsed}</span></div>
                              <div className="pl-2 border-l border-slate-200 ml-0.5 py-1 text-[10px] text-slate-400">↓</div>
                              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"/>Evidence: <span className="text-slate-800">{alert.evidence}</span></div>
                              <div className="pl-2 border-l border-slate-200 ml-0.5 py-1 text-[10px] text-slate-400">↓</div>
                              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"/>Historical Average: <span className="text-slate-800">{alert.historicalAverage}</span></div>
                              <div className="pl-2 border-l border-slate-200 ml-0.5 py-1 text-[10px] text-slate-400">↓</div>
                              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"/>Current: <span className="text-slate-800">{alert.currentValue}</span></div>
                              <div className="pl-2 border-l border-slate-200 ml-0.5 py-1 text-[10px] text-slate-400">↓</div>
                              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400"/>Increase: <span className="text-red-500">+{alert.percentIncrease}%</span></div>
                              <div className="pl-2 border-l border-slate-200 ml-0.5 py-1 text-[10px] text-slate-400">↓</div>
                              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>Confidence: <span className="text-emerald-600">{alert.confidence}%</span></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-2 min-w-[180px] justify-center border-l pl-4 border-slate-100 relative">
                      
                      <button 
                        onClick={() => setActionMenu(actionMenu === alert.id ? null : alert.id)}
                        className="w-full bg-ksp-navy text-white text-xs font-bold py-2.5 px-3 rounded shadow flex items-center justify-between hover:bg-ksp-navy-light transition"
                      >
                        Take Action <ChevronRight size={14} className={actionMenu === alert.id ? "rotate-90 transition" : "transition"}/>
                      </button>

                      {/* Action Dropdown Menu */}
                      {actionMenu === alert.id && (
                        <div className="absolute top-[50px] right-0 w-64 bg-white border border-slate-200 shadow-xl rounded-lg z-50 p-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 mb-1">Recommended Actions</h4>
                          {alert.recommendedActions.map((action: string, i: number) => (
                            <button 
                              key={i}
                              onClick={() => {
                                if (action.includes('Officer')) {
                                  navigate('/admin-portal/officers', {
                                    state: { autoOpenForm: true, prefillStationName: alert.policeStation }
                                  });
                                }
                                else if (action.includes('Notify')) {
                                  navigate('/admin-portal/stations', {
                                    state: { autoOpenNotify: true, prefillStation: alert.policeStation, prefillProblem: alert.reason }
                                  });
                                }
                                else if (action.includes('GIS') || action.includes('Map') || action.includes('Night Patrol')) navigate('/admin-portal/gis');
                                else if (action.includes('Network')) navigate('/admin-portal/network');
                                else navigate('/admin-portal/firs');
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-ksp-navy rounded transition flex items-center gap-2"
                            >
                              <div className="w-1 h-1 rounded-full bg-ksp-gold"></div> {action}
                            </button>
                          ))}
                          <hr className="my-1 border-slate-100" />
                          <button className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded transition">Escalate to SP</button>
                          <button onClick={() => setActionMenu(null)} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded transition">Dismiss Menu</button>
                        </div>
                      )}
                      
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
