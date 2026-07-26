import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { mockDb } from '../../utils/mockDb';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Filter, Layers, Info, Loader2 } from 'lucide-react';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow
});
L.Marker.prototype.options.icon = DefaultIcon;

export const AdminGISMap: React.FC = () => {
  const location = useLocation();
  const cases = mockDb.getCases();
  const districts = mockDb.getDistricts();
  const stations = mockDb.getUnits().filter(u => u.TypeID === 1);
  const crimeHeads = mockDb.getCrimeHeads();
  const gravityOffences = mockDb.getGravityOffences();

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState<number | 'ALL'>('ALL');
  const [selectedStation, setSelectedStation] = useState<number | 'ALL'>('ALL');
  const [selectedCrimeHead, setSelectedCrimeHead] = useState<number | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string | 'ALL'>('ALL');
  const [selectedGravity, setSelectedGravity] = useState<number | 'ALL'>('ALL');
  const [showFIRs, setShowFIRs] = useState<boolean>(false);
  const [selectedHotspot, setSelectedHotspot] = useState<string>('ALL');



  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  // Layers
  const casesGroupRef = useRef<L.LayerGroup | null>(null);
  const stationsGroupRef = useRef<L.LayerGroup | null>(null);
  const districtCountsGroupRef = useRef<L.LayerGroup | null>(null);
  const hotspotsGroupRef = useRef<L.LayerGroup | null>(null);
  const boundsBoxRef = useRef<L.Rectangle | null>(null);



  // 1. Base Filter (Ignores Viewport)
  const baseFilteredCases = useMemo(() => {
    if (selectedDistrict === 'ALL') return []; // Existing logic: no FIRs if ALL

    return cases.filter(c => {
      const station = stations.find(s => s.UnitID === c.PoliceStationID);
      if (!station || station.DistrictID !== selectedDistrict) return false;
      
      if (selectedStation !== 'ALL' && c.PoliceStationID !== selectedStation) return false;
      if (selectedCrimeHead !== 'ALL' && c.CrimeMajorHeadID !== selectedCrimeHead) return false;
      if (selectedStatus !== 'ALL') {
        const statusName = mockDb.getCaseStatuses().find(s => s.CaseStatusID === c.CaseStatusID)?.CaseStatusName;
        if (statusName !== selectedStatus) return false;
      }
      if (selectedGravity !== 'ALL' && c.GravityOffenceID !== selectedGravity) return false;
      return true;
    });
  }, [cases, selectedDistrict, selectedStation, selectedCrimeHead, selectedStatus, selectedGravity, stations]);



  // Compute hotspots across BASE cases so they don't pop in/out when panning near them
  const activeHotspots = useMemo(() => {
    if (!showFIRs) return [];
    
    const hotspots: {lat: number, lng: number, count: number, crimeName: string, crimeMajorHeadID: number}[] = [];
    const HOTSPOT_RADIUS_METERS = 2000;
    const DENSITY_THRESHOLD = 5;

    baseFilteredCases.forEach(c => {
      if (typeof c.latitude === 'number' && typeof c.longitude === 'number' && !isNaN(c.latitude) && !isNaN(c.longitude)) {
        const currentLatLng = L.latLng(c.latitude, c.longitude);
        let nearbyCount = 0;
        
        baseFilteredCases.forEach(otherC => {
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
  }, [baseFilteredCases, showFIRs, crimeHeads]);

  // Handle Location State (Auto-navigate to Red Zone)
  useEffect(() => {
    if (location.state?.autoOpenHotspot && location.state?.prefillHotspotLocation && mapRef.current) {
      setShowFIRs(true);
      // Let activeHotspots compute on next render, but we can instantly pan
      const [lat, lng] = location.state.prefillHotspotLocation.split(',').map(Number);
      
      // Delay selecting the hotspot until activeHotspots has evaluated
      setTimeout(() => {
        setSelectedHotspot(location.state.prefillHotspotLocation);
        mapRef.current?.flyTo([lat, lng], 14, { duration: 1.5 });
      }, 500);
    }
  }, [location.state, mapRef]);

  // Map Initialization
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const karnatakaBounds = L.latLngBounds(
        L.latLng(11.0, 73.5),
        L.latLng(19.0, 79.0)
      );

      // 5. PERFORMANCE: preferCanvas
      mapRef.current = L.map(mapContainerRef.current, {
        maxBounds: karnatakaBounds,
        maxBoundsViscosity: 1.0,
        minZoom: 6,
        preferCanvas: true 
      }).setView([12.935242, 77.624478], 12);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Layer Groups
      casesGroupRef.current = L.layerGroup();

      stationsGroupRef.current = L.layerGroup();
      districtCountsGroupRef.current = L.layerGroup();
      hotspotsGroupRef.current = L.layerGroup();

      mapRef.current.addLayer(casesGroupRef.current);
      mapRef.current.addLayer(stationsGroupRef.current);
      mapRef.current.addLayer(districtCountsGroupRef.current);
      mapRef.current.addLayer(hotspotsGroupRef.current);
    }
  }, []);

  // Update District View / Pan Map based on Filters
  useEffect(() => {
    if (!mapRef.current) return;

    let displayStations = stations;
    if (selectedDistrict !== 'ALL') {
        displayStations = displayStations.filter(s => s.DistrictID === selectedDistrict);
    }
    if (selectedStation !== 'ALL') {
        displayStations = displayStations.filter(s => s.UnitID === selectedStation);
    }

    // Bounding Box
    if (boundsBoxRef.current) {
        boundsBoxRef.current.remove();
        boundsBoxRef.current = null;
    }

    if (selectedDistrict !== 'ALL' && displayStations.length > 0) {
       let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
       displayStations.forEach(s => {
          if (s.latitude && s.longitude && !isNaN(s.latitude) && !isNaN(s.longitude)) {
             minLat = Math.min(minLat, s.latitude);
             maxLat = Math.max(maxLat, s.latitude);
             minLng = Math.min(minLng, s.longitude);
             maxLng = Math.max(maxLng, s.longitude);
          }
       });
       
       if (minLat !== 90) {
           if (displayStations.length === 1) {
               mapRef.current.flyTo([minLat, minLng], 14, { duration: 1.5 });
           } else {
               const bounds = L.latLngBounds(L.latLng(minLat, minLng), L.latLng(maxLat, maxLng));
               const paddedBounds = bounds.pad(0.1);
               mapRef.current.flyToBounds(paddedBounds, { duration: 1.5 });
               boundsBoxRef.current = L.rectangle(paddedBounds, {
                   color: '#d4af37', weight: 3, fillOpacity: 0.05, dashArray: '10, 10'
               }).addTo(mapRef.current);
           }
       }
    } else if (selectedDistrict === 'ALL') {
        mapRef.current.flyTo([15.3173, 75.7139], 7, { duration: 1.5 });
    }
  }, [selectedDistrict, selectedStation, stations]);

  // Main Render Logic
  useEffect(() => {
    if (!casesGroupRef.current || !stationsGroupRef.current || !districtCountsGroupRef.current || !hotspotsGroupRef.current) return;

    // Clear all layers cleanly
    casesGroupRef.current.clearLayers();
    stationsGroupRef.current.clearLayers();
    districtCountsGroupRef.current.clearLayers();
    hotspotsGroupRef.current.clearLayers();

    // -----------------------------------------
    // Show Stations (Only if a specific district is selected)
    // -----------------------------------------
    if (selectedDistrict !== 'ALL') {
      let displayStations = stations.filter(s => s.DistrictID === selectedDistrict);
      if (selectedStation !== 'ALL') {
          displayStations = displayStations.filter(s => s.UnitID === selectedStation);
      }
      
      displayStations.forEach(s => {
        if (s.latitude && s.longitude && !isNaN(s.latitude) && !isNaN(s.longitude)) {
          const stationIcon = L.divIcon({
            className: 'custom-station-pin',
            html: `<div style="background-color: #facc15; width: 16px; height: 16px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #0b2240; box-shadow: 2px 2px 4px rgba(0,0,0,0.4);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 16]
          });
          L.marker([s.latitude, s.longitude], { icon: stationIcon })
           .addTo(stationsGroupRef.current!)
           .bindPopup(`<div style="font-family: sans-serif; font-size: 11px;"><b>${s.UnitName}</b><br/>Police Station</div>`);
        }
      });
    }

    // -----------------------------------------
    // Hotspots & FIRs
    // -----------------------------------------
    if (showFIRs) {
      // Draw Hotspots
      activeHotspots.forEach(h => {
        if (selectedHotspot !== 'ALL' && selectedHotspot !== `${h.lat},${h.lng}`) return;
        L.circle([h.lat, h.lng], {
          radius: 2000,
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.2,
          weight: 1
        }).addTo(hotspotsGroupRef.current!)
          .bindPopup(`<div style="font-family: sans-serif; font-size: 11px;"><b>🚨 Red Zone Alert</b><br/>${h.count} cases of ${h.crimeName}</div>`);
      });

      // Draw Markers
      const markersToAdd: L.Marker[] = [];
      baseFilteredCases.forEach(c => {
        if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number' || isNaN(c.latitude) || isNaN(c.longitude)) return;
        // Red zone distance check
        if (selectedHotspot !== 'ALL') {
          const [hLat, hLng] = selectedHotspot.split(',').map(Number);
          const selectedH = activeHotspots.find(h => h.lat === hLat && h.lng === hLng);
          if (selectedH) {
            if (c.CrimeMajorHeadID !== selectedH.crimeMajorHeadID) return;
            const dist = L.latLng(c.latitude, c.longitude).distanceTo(L.latLng(hLat, hLng));
            if (dist > 2000) return;
          }
        }

        const station = stations.find(s => s.UnitID === c.PoliceStationID)?.UnitName || 'Unknown PS';
        const statusName = mockDb.getCaseStatuses().find(s => s.CaseStatusID === c.CaseStatusID)?.CaseStatusName;
        const ioName = mockDb.getEmployees().find(e => e.EmployeeID === c.PolicePersonID)?.FirstName;
        const majorHeadName = crimeHeads.find(ch => ch.CrimeHeadID === c.CrimeMajorHeadID)?.CrimeGroupName || 'Penal Code';

        const marker = L.marker([c.latitude, c.longitude])
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 11px; padding: 2px;">
              <strong style="color: #0b2240; border-bottom: 1px solid #ddd; display:block; padding-bottom:3px; margin-bottom:3px;">FIR No: ${c.CrimeNo}</strong>
              <b>Category:</b> ${majorHeadName}<br/>
              <b>Station:</b> ${station}<br/>
              <b>IO:</b> ${ioName}<br/>
              <b>Status:</b> ${statusName}<br/>
              <p style="margin: 4px 0 0 0; color: #555; font-style: italic;">"${c.BriefFacts.substring(0, 80)}..."</p>
            </div>
          `);
        markersToAdd.push(marker);
      });
      
      // Batch add
      markersToAdd.forEach(m => m.addTo(casesGroupRef.current!));
    }
  }, [baseFilteredCases, showFIRs, activeHotspots, selectedHotspot, stations, selectedDistrict, crimeHeads]);

  return (
    <div className="space-y-6 select-none font-sans">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight">KSP Spatial GIS Mapping</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Geographic mapping and incident hotspot clusters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4 lg:col-span-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 mb-2">
            <Filter size={14} className="text-ksp-gold-dark" /> GIS Layers & Filters
          </h3>

          <div className={`flex items-center justify-between bg-slate-50 p-2.5 rounded border ${selectedDistrict === 'ALL' ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wide flex flex-col">
              Show FIR Pinpoints
              {selectedDistrict === 'ALL' && <span className="text-[9px] text-red-500 normal-case">(Select District First)</span>}
            </span>
            <input 
              type="checkbox" 
              checked={showFIRs && selectedDistrict !== 'ALL'} 
              disabled={selectedDistrict === 'ALL'}
              onChange={(e) => setShowFIRs(e.target.checked)}
              className="w-4 h-4 text-ksp-navy border-slate-300 rounded focus:ring-ksp-navy disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">District</label>
            <select 
              value={selectedDistrict}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDistrict(val === 'ALL' ? 'ALL' : Number(val));
                setSelectedStation('ALL'); 
              }}
              className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
            >
              <option value="ALL">All Districts</option>
              {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Police Station</label>
            <select 
              value={selectedStation}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedStation(val === 'ALL' ? 'ALL' : Number(val));
              }}
              disabled={selectedDistrict === 'ALL'}
              className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy disabled:opacity-50"
            >
              <option value="ALL">All Stations</option>
              {selectedDistrict !== 'ALL' && stations
                .filter(s => s.DistrictID === selectedDistrict)
                .map(s => <option key={s.UnitID} value={s.UnitID}>{s.UnitName}</option>)
              }
            </select>
          </div>

          <div className={!showFIRs ? 'opacity-50' : ''}>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Crime Type</label>
            <select 
              value={selectedCrimeHead}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCrimeHead(val === 'ALL' ? 'ALL' : Number(val));
              }}
              disabled={!showFIRs}
              className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy disabled:cursor-not-allowed"
            >
              <option value="ALL">All Crimes</option>
              {crimeHeads.map(ch => <option key={ch.CrimeHeadID} value={ch.CrimeHeadID}>{ch.CrimeGroupName}</option>)}
            </select>
          </div>

          <div className={!showFIRs ? 'opacity-50' : ''}>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Case Status</label>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              disabled={!showFIRs}
              className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy disabled:cursor-not-allowed"
            >
              <option value="ALL">All Statuses</option>
              {mockDb.getCaseStatuses().map(s => <option key={s.CaseStatusID} value={s.CaseStatusName}>{s.CaseStatusName}</option>)}
            </select>
          </div>

          <div className={!showFIRs ? 'opacity-50' : ''}>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Gravity</label>
            <select 
              value={selectedGravity}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedGravity(val === 'ALL' ? 'ALL' : Number(val));
              }}
              disabled={!showFIRs}
              className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy disabled:cursor-not-allowed"
            >
              <option value="ALL">All Gravities</option>
              {gravityOffences.map(g => <option key={g.GravityOffenceID} value={g.GravityOffenceID}>{g.LookupValue}</option>)}
            </select>
          </div>

          <div className={!showFIRs || activeHotspots.length === 0 ? 'opacity-50' : ''}>
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
              disabled={!showFIRs || activeHotspots.length === 0}
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

          <div className="border-t pt-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1"><Layers size={12} /> Map Legend</h4>
            <div className="space-y-1.5 text-[10px] text-slate-600 font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>Active Incident Clusters (1-9)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Active Incident Clusters (10-49)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span>Active Incident Clusters (50+)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d4af37] border border-[#0b2240]"></span>
                <span>Police Stations</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500"></span>
                <span>AI Detected Heinous Hotspot Zones</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-2 rounded-xl border shadow-sm lg:col-span-3 min-h-[500px] relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-2 bg-slate-50 border-b text-[10px] text-slate-400 font-semibold select-none">
            <div className="flex items-center gap-1.5">
              <Info size={14} className="text-ksp-gold-dark" /> Mapped cases matching filter: {baseFilteredCases.length} of {cases.length}
            </div>

          </div>

          <div ref={mapContainerRef} className="flex-grow rounded-lg overflow-hidden h-[450px] z-0"></div>
        </div>

      </div>

    </div>
  );
};
