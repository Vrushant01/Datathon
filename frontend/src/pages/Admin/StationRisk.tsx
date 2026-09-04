import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../../utils/authFetch';
import { Activity, ShieldAlert, MapPin, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

interface StationRiskResult {
  stationId: number;
  stationName: string;
  districtId: number;
  riskScore: number;
  riskLevel: string;
  features: any;
  riskDrivers?: string[];
  explanation?: string;
}

export const StationRisk: React.FC = () => {
  const navigate = useNavigate();

  const [stationRisks, setStationRisks] = useState<StationRiskResult[]>([]);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);
  const riskFetchedRef = useRef(false);

  const fetchStationRisks = async () => {
    setRiskError(null);
    setRiskLoading(true);
    const url = `${API_BASE_URL}/api/station-risk/batch-predict`;
    
    try {
      const response = await authFetch(url);
      const rawText = await response.text();
      let body;
      try {
        body = JSON.parse(rawText);
      } catch (e) {
        setRiskError('NETWORK');
        return;
      }
      
      const predictions =
          Array.isArray(body)
            ? body
            : Array.isArray(body.predictions)
              ? body.predictions
              : Array.isArray(body.data)
                ? body.data
                : [];
                
      if (body && body.success === false) {
        setRiskError('API');
      } else {
        const sorted = [...predictions].sort((a: any, b: any) => (b.riskScore || 0) - (a.riskScore || 0));
        setStationRisks(sorted);
      }
    } catch (e) {
      setRiskError('NETWORK');
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
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-extrabold text-ksp-navy mb-6">Station Risk Prediction</h1>
      
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="px-5 py-4 border-b bg-slate-50 flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg border border-blue-200">
            <Activity size={16} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-ksp-navy tracking-widest uppercase m-0">
              XGBoost Predictive Model
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Assessing police station crime risk based on multi-variate historical data
            </p>
          </div>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {riskLoading ? (
            <div className="text-sm text-slate-500 font-medium py-8 text-center animate-pulse">Loading station risk predictions...</div>
          ) : riskError === 'API' ? (
            <div className="text-sm text-red-500 font-medium py-8 text-center flex flex-col items-center gap-3">
              Station risk prediction temporarily unavailable.
              <button 
                onClick={() => fetchStationRisks()}
                className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : riskError === 'NETWORK' ? (
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
            <div className="text-sm text-slate-500 font-medium py-8 text-center">No police stations available for prediction.</div>
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
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRiskViewGIS(station); }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" 
                        title="View on GIS"
                      >
                        <MapPin size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRiskViewCases(station); }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="View Cases"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

              {selectedStation.riskDrivers && selectedStation.riskDrivers.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2">Risk Drivers / Indicators</h4>
                  <ul className="space-y-2">
                    {selectedStation.riskDrivers.map((driver, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{driver}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <h4 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2">Raw XGBoost Input Features</h4>
              
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
