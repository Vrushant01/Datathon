import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { mockDb, UnitRow } from '../../../data/mockDb';
import { useMockDb } from '../../hooks/useMockDb';
import { authFetch } from '../../utils/authFetch';
import { API_BASE_URL } from '../../config/api';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Building, Plus, Search, MapPin, X
} from 'lucide-react';

export const StationManagement: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const dbVersion = useMockDb();
  
  const [serverStations, setServerStations] = useState<any[]>([]);
  const [totalStations, setTotalStations] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDistrict, setFilterDistrict] = useState<number | 'ALL'>('ALL');
  
  const districts = mockDb.getDistricts();


  // Create modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form states
  const [stationName, setStationName] = useState('');
  const [districtId, setDistrictId] = useState(1001);
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');

  // Notify Modal State
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyStationId, setNotifyStationId] = useState<number>(1001);
  const [notifyProblem, setNotifyProblem] = useState('');
  const [notifyInstructions, setNotifyInstructions] = useState('');

  // Auto-open form from AI Intelligence Center
  useEffect(() => {
    if (location.state?.autoOpenNotify) {
      setNotifyModalOpen(true);
      if (location.state?.prefillProblem) {
        setNotifyProblem(location.state.prefillProblem);
      }
      if (location.state?.prefillStation) {
        const lowerName = String(location.state.prefillStation || '').toLowerCase();
        const station = mockDb.getUnits().find(u => lowerName.includes(String(u.UnitName || '').toLowerCase()) || String(u.UnitName || '').toLowerCase().includes(lowerName));
        if (station) {
          setNotifyStationId(station.UnitID);
        }
      }
    }
  }, [location.state]);

  // Prevent background scrolling when any modal is open
  useEffect(() => {
    if (modalOpen || notifyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen, notifyModalOpen]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenAdd = () => {
    setStationName('');
    setDistrictId(1001);
    setLatitude('');
    setLongitude('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationName) {
      showNotification('error', 'Station Name is required.');
      return;
    }

    try {
      const res = await authFetch(`${API_BASE_URL}/api/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          UnitName: stationName,
          DistrictID: districtId,
          latitude: latitude === '' ? undefined : Number(latitude),
          longitude: longitude === '' ? undefined : Number(longitude),
          TypeID: 1, // Police Station
          Active: true
        })
      });

      if (res.ok) {
        showNotification('success', 'Police Station created successfully.');
        setModalOpen(false);
      }
    } catch (e: any) {
      showNotification('error', `Failed to create station: ${e.message}`);
    }
  };

  const fetchStations = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '30',
        type: '1' // Police Stations
      });
      if (searchQuery) params.append('search', searchQuery);
      if (filterDistrict !== 'ALL') params.append('district', filterDistrict.toString());
      
      const res = await authFetch(`${API_BASE_URL}/api/units?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setServerStations(data.data || []);
        setTotalStations(data.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch paginated stations", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, [page, searchQuery, filterDistrict, dbVersion]);

  return (
    <div className="space-y-4 select-none h-full flex flex-col min-h-0">
      
      {/* Header section */}
      <div className="flex justify-between items-center border-b pb-4 shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight">{t('stations.title')}</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{t('stations.subtitle')}</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-ksp-navy hover:bg-ksp-navy-light text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow border border-ksp-gold/25"
        >
          <Plus size={16} /> {t('stations.add_station')}
        </button>
      </div>

      {notification && typeof document !== 'undefined' && createPortal(
        <div className={`fixed top-4 right-4 z-[9999] p-4 rounded-lg text-xs font-bold shadow-lg border ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {notification.text}
        </div>,
        document.body
      )}

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col xl:flex-row gap-4 items-center shrink-0">
        <div className="flex-1 w-full relative">
          <span className="absolute left-3 top-3 text-slate-400">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder={t('stations.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-slate-300 transition"
          />
        </div>
        
        <select 
          value={filterDistrict}
          onChange={(e) => setFilterDistrict(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
          className="w-full xl:w-48 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:border-slate-300 transition"
        >
          <option value="ALL">{t('stations.all_districts')}</option>
          {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap relative">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-4">Station ID</th>
              <th className="p-4">Station Name</th>
              <th className="p-4">District</th>
              <th className="p-4">Coordinates (Lat, Lng)</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-ksp-gold border-t-transparent animate-spin"></div>
                    Loading stations...
                  </div>
                </td>
              </tr>
            ) : serverStations.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                  No active police stations found matching filters.
                </td>
              </tr>
            ) : serverStations.map((st: any) => {
              const districtName = st.districtName;
              
              return (
                <tr key={st.UnitID} className="hover:bg-slate-50 transition group">
                  <td className="p-4">{st.UnitID}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Building size={14} className="text-ksp-navy" />
                      <span className="text-slate-800">{st.UnitName}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {districtName || districts.find(d => d.DistrictID === st.DistrictID)?.DistrictName}
                  </td>
                  <td className="p-4">
                    {st.latitude && st.longitude ? (
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin size={12} className="text-ksp-gold" />
                        {st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Not Mapped</span>
                    )}
                  </td>
                  <td className="p-4">
                    {st.Active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-50 text-slate-700 border border-slate-200">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm !mt-0">
          <div className="bg-white rounded-xl shadow-2xl border max-w-md w-full overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-ksp-navy"></div>
            <div className="px-6 py-4 border-b flex justify-between items-center bg-white mt-1.5">
              <h3 className="text-sm font-extrabold text-ksp-navy uppercase">
                Add Police Station
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Station Name</label>
                <input 
                  type="text" 
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-slate-300 transition focus:ring-1 focus:ring-ksp-navy"
                  placeholder="e.g. Koramangala PS"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">District</label>
                <select 
                  value={districtId}
                  onChange={(e) => setDistrictId(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-slate-300 transition focus:ring-1 focus:ring-ksp-navy"
                >
                  {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Latitude</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-slate-300 transition focus:ring-1 focus:ring-ksp-navy"
                    placeholder="e.g. 12.9352"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Longitude</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-slate-300 transition focus:ring-1 focus:ring-ksp-navy"
                    placeholder="e.g. 77.6244"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-ksp-navy hover:bg-ksp-navy-light text-white font-bold px-4 py-2 rounded-lg text-xs shadow border border-ksp-gold/25"
                >
                  Add Station
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notify Police Station Modal */}
      {notifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 !mt-0">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-ksp-navy p-4 flex justify-between items-center text-white">
              <h2 className="font-bold flex items-center gap-2"><Building size={18} className="text-ksp-gold" /> Notify Police Station</h2>
              <button onClick={() => setNotifyModalOpen(false)} className="text-slate-300 hover:text-white transition"><X size={20} /></button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const stationName = stations.find(s => s.UnitID === notifyStationId)?.UnitName || 'Station';
              mockDb.createNotification(
                'AI Intelligence Order', 
                `[Target: ${stationName}]\nReason: ${notifyProblem}\nInstructions: ${notifyInstructions}`
              );
              showNotification('success', 'Notification dispatched to station.');
              setNotifyModalOpen(false);
              setNotifyProblem('');
              setNotifyInstructions('');
            }} className="p-6 space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Target Police Station</label>
                <select 
                  value={notifyStationId}
                  onChange={(e) => setNotifyStationId(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-slate-300 focus:ring-1 focus:ring-ksp-navy"
                >
                  {stations.map(st => <option key={st.UnitID} value={st.UnitID}>{st.UnitName}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Identified Problem / Reason</label>
                <textarea 
                  value={notifyProblem}
                  onChange={(e) => setNotifyProblem(e.target.value)}
                  rows={3}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-slate-300 focus:ring-1 focus:ring-ksp-navy"
                  placeholder="System detected..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Custom Instructions for SHO</label>
                <textarea 
                  value={notifyInstructions}
                  onChange={(e) => setNotifyInstructions(e.target.value)}
                  rows={4}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-slate-300 focus:ring-1 focus:ring-ksp-navy"
                  placeholder="Please increase night patrol around..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setNotifyModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-ksp-navy hover:bg-ksp-navy-light text-white font-bold px-4 py-2 rounded-lg text-xs shadow border border-ksp-gold/25 flex items-center gap-2"
                >
                  Dispatch Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
