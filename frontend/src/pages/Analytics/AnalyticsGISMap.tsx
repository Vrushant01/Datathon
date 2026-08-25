import React, { useState, useEffect, useRef } from 'react';
import { mockDb } from '../../utils/mockDb';
import { useAuth } from '../../context/AuthContext';
import { MapPin, Filter } from 'lucide-react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createCirclePolygon } from '../../utils/geoUtils';

export const AnalyticsGISMap: React.FC = () => {
  const { user } = useAuth();
  const unitId = user?.unitId;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const crimeHeads = mockDb.getCrimeHeads();
  const gravityOffences = mockDb.getGravityOffences();
  const statuses = mockDb.getCaseStatuses();

  // Filters
  const [selectedCrimeHead, setSelectedCrimeHead] = useState<number | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<number | 'ALL'>('ALL');
  const [selectedGravity, setSelectedGravity] = useState<number | 'ALL'>('ALL');
  const [selectedHotspot, setSelectedHotspot] = useState<string>('ALL');
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  const filteredCases = React.useMemo(() => {
    return mockDb.getCases().filter(c => {
      if (c.PoliceStationID !== unitId) return false;
      if (selectedCrimeHead !== 'ALL' && c.CrimeMajorHeadID !== selectedCrimeHead) return false;
      if (selectedStatus !== 'ALL' && c.CaseStatusID !== selectedStatus) return false;
      if (selectedGravity !== 'ALL' && c.GravityOffenceID !== selectedGravity) return false;
      return true;
    });
  }, [unitId, selectedCrimeHead, selectedStatus, selectedGravity]);

  const [activeHotspots, setActiveHotspots] = useState<any[]>([]);
  const [isHotspotsLoading, setIsHotspotsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!unitId) return;
    const controller = new AbortController();
    
    const fetchHotspots = async () => {
      setIsHotspotsLoading(true);
      try {
        const query = new URLSearchParams();
        query.append('station', unitId.toString());
        if (selectedCrimeHead !== 'ALL') query.append('crimeHead', selectedCrimeHead.toString());
        if (selectedStatus !== 'ALL') query.append('status', selectedStatus.toString());
        if (selectedGravity !== 'ALL') query.append('gravity', selectedGravity.toString());

        const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:5000' : 'https://datathon-qs4x.onrender.com';
        const res = await fetch(`${API_BASE_URL}/api/hotspots?${query.toString()}`, {
          signal: controller.signal
        });
        
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        
        if (data.success) {
          setActiveHotspots(data.hotspots.map((h: any) => ({
             clusterId: h.clusterId,
             lat: h.center.lat,
             lng: h.center.lng,
             count: h.incidentCount,
             crimeName: Object.keys(h.crimeCategories || {}).sort((a,b) => (h.crimeCategories[b] - h.crimeCategories[a]))[0] || 'Multiple Crimes',
             radiusKm: h.radiusKm,
             riskScore: h.riskScore,
             riskLevel: h.riskLevel,
             trend: h.trend,
             growthRate: h.growthRate,
             forecast7DayLevel: h.forecast7DayLevel
          })));
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Failed to fetch hotspots:", err);
        }
      } finally {
        setIsHotspotsLoading(false);
      }
    };

    fetchHotspots();
    return () => controller.abort();
  }, [unitId, selectedCrimeHead, selectedStatus, selectedGravity]);

  useEffect(() => {
    if (!unitId || !mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [77.5946, 12.9716],
      zoom: 12,
      maxBounds: [[68.0, 6.0], [98.0, 36.0]], // India bounds
      doubleClickZoom: false
    });
    
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
        const resizeObserver = new ResizeObserver(() => {
            if (mapRef.current) mapRef.current.resize();
        });
        if (mapContainerRef.current) resizeObserver.observe(mapContainerRef.current);
        map.addSource('hotspots', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        map.addSource('fir-cases', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
        });

        let insertBeforeId: string | undefined;
        const layers = map.getStyle().layers;
        if (layers) {
            for (const layer of layers) {
                if (
                    layer.id.includes('waterway') || 
                    layer.id.includes('water') || 
                    layer.id.includes('road') || 
                    layer.id.includes('tunnel') || 
                    layer.id.includes('bridge')
                ) {
                    insertBeforeId = layer.id;
                    break;
                }
            }
        }

        map.addLayer({
            id: 'hotspots-fill',
            type: 'fill',
            source: 'hotspots',
            paint: {
                'fill-color': '#ef4444',
                'fill-opacity': 0.2
            }
        });
        
        map.addLayer({
            id: 'hotspots-line',
            type: 'line',
            source: 'hotspots',
            paint: {
                'line-color': '#ef4444',
                'line-width': 1
            }
        });

        // Clustering Layers
        map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'fir-cases',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#2563eb', // Blue for 1-9
                    10,
                    '#f59e0b', // Amber for 10-49
                    50,
                    '#ef4444'  // Red for 50+
                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                     15, 10, 20, 50, 25
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });

        map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'fir-cases',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 12
            },
            paint: {
                'text-color': '#ffffff'
            }
        });

        map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'fir-cases',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': '#3b82f6',
                'circle-radius': 6,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });

        map.on('click', 'hotspots-fill', (e) => {
           if (e.features && e.features.length > 0) {
               const props = e.features[0].properties;
               new maplibregl.Popup()
                   .setLngLat(e.lngLat)
                   .setHTML(props?.popupHtml || '')
                   .addTo(map);
           }
        });
        
        // Clusters logic
        map.on('click', 'clusters', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
            if (!features.length) return;
            const clusterId = features[0].properties.cluster_id;
            const source = map.getSource('fir-cases') as maplibregl.GeoJSONSource;
            
            source.getClusterExpansionZoom(clusterId).then((zoom) => {
                map.easeTo({
                    center: (features[0].geometry as any).coordinates,
                    zoom: zoom
                });
            });
        });

        map.on('mouseenter', 'clusters', () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', 'clusters', () => map.getCanvas().style.cursor = '');

        const firPopup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 15,
            maxWidth: '250px'
        });

        map.on('mouseenter', 'unclustered-point', (e) => {
            map.getCanvas().style.cursor = 'pointer';
            if (!e.features || !e.features.length) return;
            const coordinates = (e.features[0].geometry as any).coordinates.slice();
            const properties = e.features[0].properties;

            firPopup.setLngLat(coordinates)
                .setHTML(`
                    <div style="font-family: sans-serif; font-size: 11px; padding: 2px;">
                      <strong style="color: #0b2240; border-bottom: 1px solid #ddd; display:block; padding-bottom:3px; margin-bottom:3px;">FIR No: ${properties.crimeNo}</strong>
                      <b>Category:</b> ${properties.majorHeadName}<br/>
                      <b>Status:</b> ${properties.statusName}<br/>
                      <p style="margin: 4px 0 0 0; color: #555; font-style: italic;">"${properties.briefFacts}"</p>
                    </div>
                `)
                .addTo(map);
        });

        map.on('mouseleave', 'unclustered-point', () => {
            map.getCanvas().style.cursor = '';
            firPopup.remove();
        });

        // Prevent click on FIR from opening the Hotspot popup
        map.on('click', 'unclustered-point', (e) => {
            e.originalEvent.stopPropagation();
        });
        
        // Prevent click on clusters from opening Hotspot popup
        map.on('click', 'clusters', (e) => {
            e.originalEvent.stopPropagation();
            const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
            map.easeTo({ center: (features[0].geometry as any).coordinates, zoom: map.getZoom() + 2 });
        });

        map.on('error', (e) => {
            console.error("MapLibre Error:", e);
        });

        setMapLoaded(true);
    });

    return () => {
       if (mapRef.current) {
           mapRef.current.remove();
           mapRef.current = null;
       }
    };
  }, [unitId]);

  useEffect(() => {
    if (!unitId || !mapRef.current || !mapLoaded) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const stations = mockDb.getUnits().filter(u => u.TypeID === 1);
    const station = stations.find(u => u.UnitID === unitId);
    let centerLat = station?.latitude || 12.9716;
    let centerLng = station?.longitude || 77.5946;

    // Draw Station Marker
    if (station && station.latitude && station.longitude) {
      const el = document.createElement('div');
      el.className = 'custom-station-pin';
      el.innerHTML = `<div style="background-color: #facc15; width: 20px; height: 20px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #0b2240; box-shadow: 2px 2px 4px rgba(0,0,0,0.4);"></div>`;
      
      const popup = new maplibregl.Popup({ offset: 25 })
        .setHTML(`<div style="font-family: sans-serif; font-size: 11px;"><b>${station.UnitName}</b><br/>Command Center</div>`);

      const stMarker = new maplibregl.Marker({ element: el })
          .setLngLat([station.longitude, station.latitude])
          .setPopup(popup)
          .addTo(mapRef.current);
      markersRef.current.push(stMarker);
    }

    const hotspotFeatures: any[] = [];
    activeHotspots.forEach(h => {
      if (selectedHotspot !== 'ALL' && selectedHotspot !== `${h.lat},${h.lng}`) return;

      const poly = createCirclePolygon([h.lng, h.lat], h.radiusKm * 1000);
      poly.properties = {
          popupHtml: `<div style="font-family: sans-serif; font-size: 11px;">
            <b>🚨 ${h.riskLevel} HOTSPOT</b><br/>
            Risk Score: ${h.riskScore} / 100<br/>
            ${h.count} incidents<br/>
            Primary Crime: ${h.crimeName}<br/>
            Trend: ${h.trend === 'INCREASING' ? '↑' : (h.trend === 'DECREASING' ? '↓' : '→')} ${h.growthRate}%<br/>
            7-Day Outlook: ${h.forecast7DayLevel}<br/>
            Spatial Radius: ${h.radiusKm} km
          </div>`
      };
      hotspotFeatures.push(poly);
    });
    
    const source = mapRef.current.getSource('hotspots') as maplibregl.GeoJSONSource;
    if (source) {
        source.setData({ type: 'FeatureCollection', features: hotspotFeatures });
    }

    const firFeatures: any[] = [];

    filteredCases.forEach(c => {
      if (typeof c.latitude === 'number' && typeof c.longitude === 'number' && !isNaN(c.latitude) && !isNaN(c.longitude)) {
        if (selectedHotspot !== 'ALL') {
          const [hLat, hLng] = selectedHotspot.split(',').map(Number);
          const selectedH = activeHotspots.find(h => h.lat === hLat && h.lng === hLng);
          const dist = Math.sqrt(Math.pow(c.latitude - hLat, 2) + Math.pow(c.longitude - hLng, 2)) * 111000;
          if (selectedH) {
            if (dist > (selectedH.radiusKm * 1000)) return;
          } else {
            if (dist > 2000) return;
          }
        }

        const statusName = mockDb.getCaseStatuses().find(s => s.CaseStatusID === c.CaseStatusID)?.CaseStatusName;
        const majorHeadName = crimeHeads.find(ch => ch.CrimeHeadID === c.CrimeMajorHeadID)?.CrimeGroupName || 'Penal Code';

        firFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
            properties: {
                crimeNo: c.CrimeNo,
                majorHeadName: majorHeadName,
                statusName: statusName,
                briefFacts: c.BriefFacts.substring(0, 80) + '...'
            }
        });
      }
    });

    const firSource = mapRef.current.getSource('fir-cases') as maplibregl.GeoJSONSource;
    if (firSource) {
        firSource.setData({ type: 'FeatureCollection', features: firFeatures });
    }

    if (selectedHotspot !== 'ALL') {
         const [hLat, hLng] = selectedHotspot.split(',').map(Number);
         mapRef.current.flyTo({ center: [hLng, hLat], zoom: 14, speed: 0.2, curve: 1 });
    } else {
         mapRef.current.flyTo({ center: [centerLng, centerLat], zoom: 12, duration: 2500 });
    }
  }, [unitId, filteredCases, activeHotspots, selectedHotspot, mapLoaded]);

  // Handle Resize
  useEffect(() => {
     const handleResize = () => {
         if (mapRef.current) mapRef.current.resize();
     };
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
  }, []);

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

          {isHotspotsLoading && (
            <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-xs flex items-center gap-2 font-bold animate-pulse">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Recalculating Intelligence...
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="lg:col-span-3 bg-slate-200 rounded-xl overflow-hidden shadow-inner border min-h-[500px] relative">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full focus:outline-none outline-none" style={{ outline: 'none' }} />
        </div>

      </div>
    </div>
  );
};
