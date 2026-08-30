import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { mockDb, UnitRow } from '../../utils/mockDb';
import { 
  Building, Plus, Search, MapPin, X
} from 'lucide-react';

export const StationManagement: React.FC = () => {
  const location = useLocation();
  const [stations, setStations] = useState<UnitRow[]>(mockDb.getUnits().filter(u => u.TypeID === 1));
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
        const lowerName = location.state.prefillStation.toLowerCase();
        const station = mockDb.getUnits().find(u => lowerName.includes(u.UnitName.toLowerCase()) || u.UnitName.toLowerCase().includes(lowerName));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationName) {
      showNotification('error', 'Station Name is required.');
      return;
    }

    const newUnit = mockDb.createUnit({
      UnitName: stationName,
      DistrictID: districtId,
      latitude: latitude === '' ? undefined : Number(latitude),
      longitude: longitude === '' ? undefined : Number(longitude),
      TypeID: 1 // Police Station
    });

    if (newUnit) {
      showNotification('success', 'Police Station created successfully.');
      setStations(mockDb.getUnits().filter(u => u.TypeID === 1));
      setModalOpen(false);
    }
  };

  const filteredStations = stations.filter(st => {
    if (filterDistrict !== 'ALL' && st.DistrictID !== filterDistrict) return false;
    
    const term = searchQuery.toLowerCase();
    const distName = districts.find(d => d.DistrictID === st.DistrictID)?.DistrictName.toLowerCase() || '';
    return (
      st.UnitName.toLowerCase().includes(term) ||
      distName.includes(term)
    );
  });

  return (
    <div className="space-y-6 select-none">
      
      {/* Header section */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight">Police Stations Directory</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Manage state police stations and geographic locations</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-ksp-navy hover:bg-ksp-navy-light text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow border border-ksp-gold/25"
        >
          <Plus size={16} /> Add Station
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
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col xl:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <span className="absolute left-3 top-3 text-slate-400">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Search by Station Name or District..."
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
          <option value="ALL">All Districts</option>
          {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-4">Station ID</th>
              <th className="p-4">Station Name</th>
              <th className="p-4">District</th>
              <th className="p-4">Coordinates (Lat, Lng)</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="font-semibold text-slate-600">
            {filteredStations.length > 0 ? (
              filteredStations.slice(0, 50).map(st => (
                <tr key={st.UnitID} className="border-b last:border-0 hover:bg-slate-50 transition">
                  <td className="p-4">{st.UnitID}</td>
                  <td className="p-4 flex items-center gap-2">
                    <Building size={14} className="text-ksp-navy" />
                    <span className="text-slate-800">{st.UnitName}</span>
                  </td>
                  <td className="p-4">
                    {districts.find(d => d.DistrictID === st.DistrictID)?.DistrictName}
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
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No stations found matching your criteria.
                </td>
              </tr>
            )}
            {filteredStations.length > 50 && (
              <tr>
                <td colSpan={5} className="text-center p-4 text-slate-500 font-semibold bg-slate-50 border-t">
                  Showing top 50 results out of {filteredStations.length}. Please use the search bar to refine.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
