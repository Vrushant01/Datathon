import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { mockDb } from '../../../data/mockDb';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { FileText, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { predictStationRisk } from '../../services/aiService';

export const AnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const unitId = user?.unitId;

  const [riskLoading, setRiskLoading] = React.useState(false);
  const [riskError, setRiskError] = React.useState<string | null>(null);
  const [riskPrediction, setRiskPrediction] = React.useState<any | null>(null);

  if (!unitId) return <div>No Station Assigned</div>;

  const allFirs = mockDb.getCases().filter(c => c.PoliceStationID === unitId);
  const officers = mockDb.getEmployees().filter(e => e.UnitID === unitId);
  const statuses = mockDb.getCaseStatuses();

  const runPrediction = async () => {
    setRiskLoading(true);
    setRiskError(null);
    try {
      const result = await predictStationRisk({ stationId: unitId });
      setRiskPrediction(result);
    } catch (err: any) {
      setRiskError(err.message || 'Failed to predict station risk.');
    } finally {
      setRiskLoading(false);
    }
  };

  // Stats
  const totalFirs = allFirs.length;
  const underInvestigation = allFirs.filter(c => c.CaseStatusID === 1).length; 
  const chargeSheeted = allFirs.filter(c => c.CaseStatusID === 2).length; 
  const totalOfficers = officers.length;

  // Chart Data: FIRs by Status
  const statusData = statuses.map(st => ({
    name: st.CaseStatusName,
    count: allFirs.filter(c => c.CaseStatusID === st.CaseStatusID).length
  })).filter(d => d.count > 0);

  const COLORS = ['#0B2240', '#D4AF37', '#64748b', '#ef4444', '#10b981'];



  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-ksp-navy tracking-tight uppercase">Station Analytics</h2>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">
          Performance and Resource Overview for {user?.stationName}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total FIRs</p>
              <h3 className="text-2xl font-black text-slate-800">{totalFirs}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-lg text-amber-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Under Investigation</p>
              <h3 className="text-2xl font-black text-slate-800">{underInvestigation}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Charge Sheeted</p>
              <h3 className="text-2xl font-black text-slate-800">{chargeSheeted}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-ksp-gold-light/30 p-3 rounded-lg text-ksp-navy">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Officers</p>
              <h3 className="text-2xl font-black text-slate-800">{totalOfficers}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6">FIR Distribution by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">AI Station Risk Prediction</h3>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Predictive risk for {user?.stationName} (Next 7 Days)
            </p>
          </div>
          
          {riskLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2 py-4">
              <div className="w-6 h-6 border-2 border-ksp-gold border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Querying QuickML XGBoost...</span>
            </div>
          ) : riskError ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-xs font-bold border border-red-100 h-full flex items-center justify-center">
              {riskError}
            </div>
          ) : riskPrediction ? (
            <div className={`p-6 rounded-xl border flex flex-col items-center justify-center h-full ${
              riskPrediction.risk === 1 
                ? 'bg-red-50 border-red-200' 
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <span className={`text-3xl font-black mb-2 ${
                riskPrediction.risk === 1 ? 'text-red-600' : 'text-emerald-600'
              }`}>
                {riskPrediction.riskLabel} Risk
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Likelihood Score: {(riskPrediction.likelihoodScore * 100).toFixed(1)}%
              </span>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <button 
                onClick={runPrediction}
                className="bg-ksp-navy hover:bg-ksp-navy-light text-white font-bold px-4 py-2 rounded-lg text-xs shadow w-full transition"
              >
                Run AI Risk Prediction
              </button>
            </div>
          )}
        </div>
      </div>


    </div>
  );
};
