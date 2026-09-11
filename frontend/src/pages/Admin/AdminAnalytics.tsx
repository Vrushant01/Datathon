import React from 'react';
import { mockDb } from '../../../data/mockDb';
import { useLanguage } from '../../context/LanguageContext';
import { authFetch } from '../../utils/authFetch';
import { API_BASE_URL } from '../../config/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Line
} from 'recharts';
import { 
  BarChart3, PieChart as PieIcon, LineChart as LineIcon, Activity,
  Brain, TrendingUp, Search, FileText, CheckCircle, Clock
} from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  const { t } = useLanguage();
  const [selectedDistrict, setSelectedDistrict] = React.useState<number | 'ALL'>('ALL');
  const [selectedStation, setSelectedStation] = React.useState<number | 'ALL'>('ALL');

  const [socioEconomicData, setSocioEconomicData] = React.useState<any[]>([]);
  const [correlation, setCorrelation] = React.useState<any>({ urbanization: null, literacy: null });
  const [loadingGraph1, setLoadingGraph1] = React.useState<boolean>(false);

  React.useEffect(() => {
    setLoadingGraph1(true);
    authFetch(`${API_BASE_URL}/api/analytics/socio-economic?district=${selectedDistrict}&station=${selectedStation}`)
      .then(res => res.json())
      .then(data => {
         setSocioEconomicData(data.data || []);
         setCorrelation(data.correlation || { urbanization: null, literacy: null });
         setLoadingGraph1(false);
      })
      .catch(e => {
         console.error(e);
         setLoadingGraph1(false);
      });
  }, [selectedDistrict, selectedStation]);

  const cases = mockDb.getCases();
  const districts = mockDb.getDistricts();
  const stations = mockDb.getUnits().filter(u => u.TypeID === 1);
  const crimeHeads = mockDb.getCrimeHeads();
  const complainants = mockDb.getComplainants();
  const victims = mockDb.getVictims();
  const accused = mockDb.getAccused();
  const officers = mockDb.getEmployees();

  const displayStations = React.useMemo(() => {
    if (selectedDistrict === 'ALL') return [];
    return stations.filter(s => s.DistrictID === selectedDistrict);
  }, [selectedDistrict, stations]);

  const filteredCases = React.useMemo(() => {
    return cases.filter(c => {
      if (selectedDistrict !== 'ALL') {
        const station = stations.find(s => s.UnitID === c.PoliceStationID);
        if (station?.DistrictID !== selectedDistrict) return false;
      }
      if (selectedStation !== 'ALL' && c.PoliceStationID !== selectedStation) {
        return false;
      }
      return true;
    });
  }, [cases, selectedDistrict, selectedStation, stations]);

  // Summary Stats
  const totalCases = filteredCases.length;
  const solvedCases = filteredCases.filter(c => c.CaseStatusID === 2 || c.CaseStatusID === 3 || c.CaseStatusID === 4).length;
  const activeCases = totalCases - solvedCases;
  const solvedRate = totalCases > 0 ? ((solvedCases / totalCases) * 100).toFixed(1) : '0.0';

  // 1. Crime by District (Filtered)
  const chart1Data = React.useMemo(() => {
    if (selectedDistrict === 'ALL') {
      return districts.map(d => {
        const districtStations = stations.filter(s => s.DistrictID === d.DistrictID);
        const caseCount = filteredCases.filter(c => districtStations.some(s => s.UnitID === c.PoliceStationID)).length;
        return { name: String(d.DistrictName || '').replace(' City', '').replace(' Rural', ''), Cases: caseCount };
      }).filter(item => item.Cases > 0).sort((a, b) => b.Cases - a.Cases).slice(0, 10);
    } else if (selectedStation === 'ALL') {
      const districtStations = stations.filter(s => s.DistrictID === selectedDistrict);
      return districtStations.map(s => {
        const caseCount = filteredCases.filter(c => c.PoliceStationID === s.UnitID).length;
        return { name: String(s.UnitName || '').replace(' PS', ''), Cases: caseCount };
      }).filter(item => item.Cases > 0).sort((a, b) => b.Cases - a.Cases).slice(0, 10);
    } else {
      const s = stations.find(s => s.UnitID === selectedStation);
      return s ? [{ name: String(s.UnitName || '').replace(' PS', ''), Cases: totalCases }] : [];
    }
  }, [selectedDistrict, selectedStation, districts, stations, filteredCases, totalCases]);

  // 2. Crime Categories
  const categoryData = crimeHeads.map(ch => {
    const caseCount = filteredCases.filter(c => c.CrimeMajorHeadID === ch.CrimeHeadID).length;
    return { name: String(ch.CrimeGroupName || '').split(' ').slice(-2).join(' '), Cases: caseCount };
  }).filter(c => c.Cases > 0).sort((a,b) => b.Cases - a.Cases).slice(0, 8); // Top 8

  // 3. Victim Age Demographics
  const victimAgeData = [
    { name: 'Under 18', Count: victims.filter(v => v.AgeYear < 18 && filteredCases.some(c => c.CaseMasterID === v.CaseMasterID)).length },
    { name: '18 - 30', Count: victims.filter(v => v.AgeYear >= 18 && v.AgeYear <= 30 && filteredCases.some(c => c.CaseMasterID === v.CaseMasterID)).length },
    { name: '31 - 50', Count: victims.filter(v => v.AgeYear > 30 && v.AgeYear <= 50 && filteredCases.some(c => c.CaseMasterID === v.CaseMasterID)).length },
    { name: 'Over 50', Count: victims.filter(v => v.AgeYear > 50 && filteredCases.some(c => c.CaseMasterID === v.CaseMasterID)).length }
  ].filter(v => v.Count > 0);

  // 4. Accused Age Demographics
  const accusedAgeData = [
    { name: 'Under 18', Count: accused.filter(a => a.AgeYear < 18 && filteredCases.some(c => c.CaseMasterID === a.CaseMasterID)).length },
    { name: '18 - 30', Count: accused.filter(a => a.AgeYear >= 18 && a.AgeYear <= 30 && filteredCases.some(c => c.CaseMasterID === a.CaseMasterID)).length },
    { name: '31 - 50', Count: accused.filter(a => a.AgeYear > 30 && a.AgeYear <= 50 && filteredCases.some(c => c.CaseMasterID === a.CaseMasterID)).length },
    { name: 'Over 50', Count: accused.filter(a => a.AgeYear > 50 && filteredCases.some(c => c.CaseMasterID === a.CaseMasterID)).length }
  ].filter(a => a.Count > 0);

  // 5. Officer Case Load
  const officerData = officers.map(o => {
    const assignedCount = filteredCases.filter(c => c.PolicePersonID === o.EmployeeID).length;
    const solvedCount = filteredCases.filter(c => c.PolicePersonID === o.EmployeeID && (c.CaseStatusID === 2 || c.CaseStatusID === 3)).length;
    return { 
      uid: o.KGID || String(o.EmployeeID),
      kgid: o.KGID || 'N/A',
      fullName: String(o.FirstName || ''),
      name: String(o.FirstName || '').split(' ')[0], 
      Assigned: assignedCount, 
      Solved: solvedCount 
    };
  }).filter(o => o.Assigned > 0).sort((a,b) => b.Assigned - a.Assigned).slice(0, 10);

  // 6. Socio-Economic Correlation Data (Now fetched from backend API)

  // 7. Risk Typology Forecast (Q3/Q4 2026 projection)
  const predictiveRiskData = React.useMemo(() => {
    const base = Math.max(10, totalCases / 15);
    return [
      { month: 'May 2026', Cyber: Math.round(base * 0.2), Property: Math.round(base * 0.4), Body: Math.round(base * 0.3) },
      { month: 'Jun 2026', Cyber: Math.round(base * 0.25), Property: Math.round(base * 0.45), Body: Math.round(base * 0.35) },
      { month: 'Jul 2026', Cyber: Math.round(base * 0.3), Property: Math.round(base * 0.5), Body: Math.round(base * 0.38) },
      { month: 'Aug 2026 (F)', Cyber: Math.round(base * 0.4), Property: Math.round(base * 0.55), Body: Math.round(base * 0.42) },
      { month: 'Sep 2026 (F)', Cyber: Math.round(base * 0.55), Property: Math.round(base * 0.65), Body: Math.round(base * 0.45) },
      { month: 'Oct 2026 (F)', Cyber: Math.round(base * 0.7), Property: Math.round(base * 0.75), Body: Math.round(base * 0.5) }
    ];
  }, [totalCases]);



  const COLORS = ['#0B2240', '#D4AF37', '#00529B', '#EF4444', '#10B981', '#8B5CF6'];

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight">{t('analytics.title')}</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{t('analytics.subtitle')}</p>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 text-sm font-bold text-slate-700 flex items-center gap-2">
          <Activity size={18} className="text-ksp-blue" /> Analytics Filters
        </div>
        
        <select 
          value={selectedDistrict}
          onChange={(e) => {
            setSelectedDistrict(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
            setSelectedStation('ALL');
          }}
          className="w-full md:w-64 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:border-slate-300 transition"
        >
          <option value="ALL">{t('officers.all_districts')} (Statewide)</option>
          {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
        </select>

        <select 
          value={selectedStation}
          onChange={(e) => setSelectedStation(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
          disabled={selectedDistrict === 'ALL'}
          className="w-full md:w-64 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:border-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="ALL">{t('officers.all_stations')}</option>
          {displayStations.map(s => <option key={s.UnitID} value={s.UnitID}>{s.UnitName}</option>)}
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-ksp-blue flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><FileText size={12}/> {t('dashboard.total_firs')}</span>
          <span className="text-2xl font-black text-ksp-navy mt-1">{totalCases}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-emerald-500 flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><CheckCircle size={12}/> {t('dashboard.solved_cases')}</span>
          <span className="text-2xl font-black text-emerald-600 mt-1">{solvedCases} <span className="text-xs text-slate-400 font-semibold">({solvedRate}%)</span></span>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-amber-500 flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Clock size={12}/> {t('dashboard.pending_cases')}</span>
          <span className="text-2xl font-black text-amber-600 mt-1">{activeCases}</span>
        </div>
      </div>

      {/* Grid: Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Crime by District */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b pb-2">
            <BarChart3 size={14} className="text-ksp-blue" /> {selectedDistrict === 'ALL' ? 'Top 10 Districts by Crime Volume' : (selectedStation === 'ALL' ? 'Top 10 Stations by Crime Volume' : 'Station Crime Volume')}
          </h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart1Data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Cases" fill="#0B2240" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Crime Categories */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b pb-2">
            <PieIcon size={14} className="text-ksp-gold-dark" /> Crime Category Breakdown
          </h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="Cases" fill="#D4AF37" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Victim Age demographics */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b pb-2">
            <Activity size={14} className="text-emerald-600" /> Victim Age Demographics
          </h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={victimAgeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="Count"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {victimAgeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Accused Age demographics */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b pb-2">
            <Activity size={14} className="text-red-500" /> Accused Age Demographics
          </h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={accusedAgeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="Count"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {accusedAgeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Socio-Economic Correlation composed chart (Matches Screenshot 3) */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={14} className="text-ksp-blue" /> Socio-Economic Crime Correlation
            </h3>
            {correlation.urbanization !== null && (
               <div className="flex gap-4 text-xs font-semibold text-slate-500">
                 <span>Pearson (Urban): <span className={correlation.urbanization > 0 ? 'text-red-500' : 'text-green-500'}>{correlation.urbanization}</span></span>
                 <span>Pearson (Lit): <span className={correlation.literacy > 0 ? 'text-red-500' : 'text-green-500'}>{correlation.literacy}</span></span>
               </div>
            )}
          </div>
          <div className="h-64 w-full text-xs">
            {loadingGraph1 ? (
              <div className="flex items-center justify-center h-full text-slate-400">Loading correlation data...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={socioEconomicData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" label={{ value: 'Crime Rate (per 100k)', angle: -90, position: 'insideLeft', offset: 10 }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Percentage (%)', angle: 90, position: 'insideRight', offset: 10 }} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border shadow-md rounded text-xs leading-5">
                            <div className="font-bold border-b pb-1 mb-1">{data.name} {selectedStation !== 'ALL' ? '(District Level)' : ''}</div>
                            <div>Population: {data.Population?.toLocaleString()}</div>
                            <div>FIR Count: {data.FIRCount}</div>
                            <div className="font-semibold mt-1" style={{ color: '#00529B' }}>Crime Rate: {data.CrimeRate} / 100k</div>
                            <div className="font-semibold" style={{ color: '#F97316' }}>Urbanization: {data.Urbanization}%</div>
                            <div className="font-semibold" style={{ color: '#10B981' }}>Literacy: {data.LiteracyRate}%</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="CrimeRate" name="Crime Rate (per 100k)" fill="#00529B" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="Urbanization" name="Urbanization %" stroke="#F97316" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="LiteracyRate" name="Literacy %" stroke="#10B981" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 text-[10px] text-slate-400 italic flex flex-col sm:flex-row justify-between gap-1">
            <span>Socio-economic indicators: Census of India 2011. Crime data: available FIR records (2026).</span>
            <span className="font-medium text-slate-500">Note: Correlation does not imply causation.</span>
          </div>
        </div>

        {/* Chart 6: Risk Forecasting area chart (Matches Screenshot 2) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-extrabold text-ksp-navy mb-4 flex items-center gap-2">
            <Brain size={14} className="text-purple-600" /> Risk Typology Forecast
          </h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={predictiveRiskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="Cyber" name="Cyber Risk (Proj)" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.15} />
                <Area type="monotone" dataKey="Property" name="Property Crime (Proj)" stroke="#F97316" fill="#F97316" fillOpacity={0.1} />
                <Area type="monotone" dataKey="Body" name="Body Offences (Proj)" stroke="#EF4444" fill="#EF4444" fillOpacity={0.05} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 7: Officer Caseload Performance */}
        <div className="bg-white p-5 rounded-xl border shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b pb-2">
            <LineIcon size={14} className="text-ksp-navy-light" /> Investigating Officers Caseload Performance
          </h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={officerData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="uid" tickFormatter={(value, index) => officerData[index]?.name || value} />
                <YAxis allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-slate-200 shadow-md rounded-md text-xs leading-5 text-slate-800">
                          <div>{data.fullName}</div>
                          <div>KGID: {data.kgid}</div>
                          <div>Assigned Cases: {data.Assigned}</div>
                          <div>Solved / Closed Cases: {data.Solved}</div>
                        </div>
                      );
                    }
                    return null;
                  }} 
                />
                <Legend />
                <Bar dataKey="Assigned" fill="#00529B" name="Assigned Cases" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Solved" fill="#10B981" name="Solved / Closed Cases" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>


    </div>
  );
};
