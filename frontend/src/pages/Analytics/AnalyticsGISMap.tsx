import React, { useState, useEffect, useRef } from 'react';
import { mockDb } from '../../utils/mockDb';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { useAuth } from '../../context/AuthContext';
import { MapPin, Filter } from 'lucide-react';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow
});
L.Marker.prototype.options.icon = DefaultIcon;

export const AnalyticsGISMap: React.FC = () => {
  const { user } = useAuth();
  const unitId = user?.unitId;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]);

  const crimeHeads = mockDb.getCrimeHeads();
  const gravityOffences = mockDb.getGravityOffences();
  const statuses = mockDb.getCaseStatuses();

  // Filters
  const [selectedCrimeHead, setSelectedCrimeHead] = useState<number | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<number | 'ALL'>('ALL');
  const [selectedGravity, setSelectedGravity] = useState<number | 'ALL'>('ALL');
  const [selectedHotspot, setSelectedHotspot] = useState<string>('ALL');

  useEffect(() => {
    if (!unitId) return;

    if (mapContainerRef.current && !mapRef.current) {
      // Karnataka state approximate bounds
      const karnatakaBounds = L.latLngBounds(
        L.latLng(11.0, 73.5),
        L.latLng(19.0, 79.0)
      );

      mapRef.current = L.map(mapContainerRef.current, {
        maxBounds: karnatakaBounds,
        maxBoundsViscosity: 1.0,
        minZoom: 6,
      }).setView([12.9716, 77.5946], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }
  }, [unitId]);

  const filteredCases = React.useMemo(() => {
    return mockDb.getCases().filter(c => {
      if (c.PoliceStationID !== unitId) return false;
      if (selectedCrimeHead !== 'ALL' && c.CrimeMajorHeadID !== selectedCrimeHead) return false;
      if (selectedStatus !== 'ALL' && c.CaseStatusID !== selectedStatus) return false;
      if (selectedGravity !== 'ALL' && c.GravityOffenceID !== selectedGravity) return false;
      return true;
    });
  }, [unitId, selectedCrimeHead, selectedStatus, selectedGravity]);

  const activeHotspots = React.useMemo(() => {
    const hotspots: {lat: number, lng: number, count: number, crimeName: string, crimeMajorHeadID: number}[] = [];
    const HOTSPOT_RADIUS_METERS = 2000;
    const DENSITY_THRESHOLD = 3;

    filteredCases.forEach(c => {
      if (typeof c.latitude === 'number' && typeof c.longitude === 'number' && !isNaN(c.latitude) && !isNaN(c.longitude)) {
        const currentLatLng = L.latLng(c.latitude, c.longitude);
        let nearbyCount = 0;
        
        filteredCases.forEach(otherC => {
          if (typeof otherC.latitude === 'number' && typeof otherC.longitude === 'number' && !isNaN(otherC.latitude) && !isNaN(otherC.longitude)) {
            if (otherC.CrimeMajorHeadID === c.CrimeMajorHeadID) {
              if (currentLatLng.distanceTo(L.latLng(otherC.latitude, otherC.longitude)) <= HOTSPOT_RADIUS_METERS) {
                nearbyCount++;
              }
            }
          }
        });

        if (nearbyCount >= DENSITY_THRESHOLD) {
          const alreadyDrawn = hotspots.some(h => 
            L.latLng(h.lat, h.lng).distanceTo(currentLatLng) < (HOTSPOT_RADIUS_METERS * 0.8)
          );
          if (!alreadyDrawn) {
            const crimeName = crimeHeads.find(ch => ch.CrimeHeadID === c.CrimeMajorHeadID)?.CrimeGroupName || 'Unknown Crime';
            hotspots.push({lat: c.latitude, lng: c.longitude, count: nearbyCount, crimeName, crimeMajorHeadID: c.CrimeMajorHeadID});
          }
        }
      }
    });
    return hotspots;
  }, [filteredCases, crimeHeads]);

  useEffect(() => {
    if (!unitId || !mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const stations = mockDb.getUnits().filter(u => u.TypeID === 1);
    const station = stations.find(u => u.UnitID === unitId);
    let centerLat = station?.latitude || 12.9716;
    let centerLng = station?.longitude || 77.5946;

    // Draw Station Marker
    if (station && station.latitude && station.longitude) {
      const stMarker = L.marker([station.latitude, station.longitude])
      .addTo(mapRef.current!)
      .bindPopup(`<div style="font-family: sans-serif; font-size: 11px;"><b>${station.UnitName}</b><br/>Command Center</div>`);
      markersRef.current.push(stMarker);
    }

    activeHotspots.forEach(h => {
      if (selectedHotspot !== 'ALL' && selectedHotspot !== `${h.lat},${h.lng}`) return;

      const hotspot = L.circle([h.lat, h.lng], {
        radius: 2000,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.2,
        weight: 1
      }).addTo(mapRef.current!)
        .bindPopup(`<div style="font-family: sans-serif; font-size: 11px;"><b>🚨 Red Zone Alert</b><br/>${h.count} cases of ${h.crimeName}</div>`);
      markersRef.current.push(hotspot);
    });

    filteredCases.forEach(c => {
      if (typeof c.latitude === 'number' && typeof c.longitude === 'number' && !isNaN(c.latitude) && !isNaN(c.longitude)) {
        if (selectedHotspot !== 'ALL') {
          const [hLat, hLng] = selectedHotspot.split(',').map(Number);
          const selectedH = activeHotspots.find(h => h.lat === hLat && h.lng === hLng);
          if (selectedH) {
            if (c.CrimeMajorHeadID !== selectedH.crimeMajorHeadID) return;
            const dist = L.latLng(c.latitude, c.longitude).distanceTo(L.latLng(hLat, hLng));
            if (dist > 2000) return;
          }
        }

        // Case Marker
        const marker = L.marker([c.latitude, c.longitude])
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 11px; max-width: 150px;">
            <b>FIR: ${c.CrimeNo}</b><br/>
            <span style="color: #64748b;">${c.BriefFacts.substring(0, 50)}...</span>
          </div>
        `);
        markersRef.current.push(marker);
      }
    });

    mapRef.current.setView([centerLat, centerLng], 12);
  }, [unitId, filteredCases, activeHotspots, selectedHotspot]);

  if (!unitId) return <div className="p-8 text-center text-red-500">No Station Assigned to this Profile</div>;

  return (
    <div className="h-full flex flex-col space-y-4">
      <div>
        <h2 className="text-xl font-extrabold text-ksp-navy tracking-tight uppercase flex items-center gap-2">
          <MapPin size={24} className="text-ksp-gold" />
          Station GIS Map
        </h2>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
          Real-time incident mapping for {user?.stationName}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
        
        {/* Filter Card */}
        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4 lg:col-span-1 h-fit">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 mb-2">
            <Filter size={14} className="text-ksp-gold-dark" /> Station GIS Filters
          </h3>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Crime Type</label>
            <select 
              value={selectedCrimeHead}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCrimeHead(val === 'ALL' ? 'ALL' : Number(val));
              }}
              className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
            >
              <option value="ALL">All Crimes</option>
              {crimeHeads.map(ch => <option key={ch.CrimeHeadID} value={ch.CrimeHeadID}>{ch.CrimeGroupName}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Case Status</label>
            <select 
              value={selectedStatus}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedStatus(val === 'ALL' ? 'ALL' : Number(val));
              }}
              className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
            >
              <option value="ALL">All Statuses</option>
              {statuses.map(s => <option key={s.CaseStatusID} value={s.CaseStatusID}>{s.CaseStatusName}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Gravity</label>
            <select 
              value={selectedGravity}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedGravity(val === 'ALL' ? 'ALL' : Number(val));
              }}
              className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
            >
              <option value="ALL">All Gravities</option>
              {gravityOffences.map(g => <option key={g.GravityOffenceID} value={g.GravityOffenceID}>{g.LookupValue}</option>)}
            </select>
          </div>

          <div className={activeHotspots.length === 0 ? 'opacity-50' : ''}>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Active Red Zones</label>
            <select 
              value={selectedHotspot}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedHotspot(val);
                if (val !== 'ALL' && mapRef.current) {
                  const [lat, lng] = val.split(',').map(Number);
                  mapRef.current.flyTo([lat, lng], 14, { duration: 1.5 });
                }
              }}
              disabled={activeHotspots.length === 0}
              className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy disabled:cursor-not-allowed"
            >
              <option value="ALL">All Active Hotspots ({activeHotspots.length})</option>
              {activeHotspots.map((h, i) => (
                <option key={i} value={`${h.lat},${h.lng}`}>
                  {h.crimeName} ({h.count} Cases)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Map Container */}
        <div className="lg:col-span-3 bg-slate-300 rounded-xl overflow-hidden border shadow-sm relative min-h-[500px]">
          <div ref={mapContainerRef} className="absolute inset-0 z-0" />
          

        </div>

      </div>
    </div>
  );
};
