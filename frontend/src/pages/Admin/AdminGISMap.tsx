import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { mockDb } from '../../utils/mockDb';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

maplibregl.setWorkerUrl(workerUrl);
import { Filter, Layers, Info } from 'lucide-react';
import { getMappedGeoJsonFeature, getBoundingBox, createCirclePolygon, getDistance } from '../../utils/geoUtils';
import { API_BASE_URL } from '../../config/api';
import karnatakaGeoJsonUrl from '../../assets/karnataka_districts.geojson?url';

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
  const [selectedHotspot, setSelectedHotspot] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  
  const stationsMarkersRef = useRef<{ [key: number]: maplibregl.Marker }>({});
  const stationPopupsRef = useRef<{ [key: number]: maplibregl.Popup }>({});
  
  const [geoJsonData, setGeoJsonData] = useState<any>(null);

  // 0. Base Valid Cases (Single Source of Truth for valid coordinates)
  const validBaseCases = useMemo(() => {
    return cases.filter(c => typeof c.latitude === 'number' && typeof c.longitude === 'number' && !isNaN(c.latitude) && !isNaN(c.longitude));
  }, [cases]);

  // 1. Base Filter (Ignores Viewport)
  const baseFilteredCases = useMemo(() => {
    return validBaseCases.filter(c => {
      const station = stations.find(s => s.UnitID === c.PoliceStationID);
      
      if (!station) return false;
      if (selectedDistrict !== 'ALL' && station.DistrictID !== selectedDistrict) return false;
      
      if (selectedStation !== 'ALL' && c.PoliceStationID !== selectedStation) return false;
      if (selectedCrimeHead !== 'ALL' && c.CrimeMajorHeadID !== selectedCrimeHead) return false;
      if (selectedStatus !== 'ALL') {
        const statusName = mockDb.getCaseStatuses().find(s => s.CaseStatusID === c.CaseStatusID)?.CaseStatusName;
        if (statusName !== selectedStatus) return false;
      }
      if (selectedGravity !== 'ALL' && c.GravityOffenceID !== selectedGravity) return false;
      
      if (dateFrom || dateTo) {
         const crimeDate = new Date(c.CrimeRegisteredDate);
         if (dateFrom && crimeDate < new Date(dateFrom)) return false;
         if (dateTo && crimeDate > new Date(dateTo)) return false;
      }
      
      return true;
    });
  }, [validBaseCases, selectedDistrict, selectedStation, selectedCrimeHead, selectedStatus, selectedGravity, dateFrom, dateTo, stations]);

  const [activeHotspots, setActiveHotspots] = useState<any[]>([]);
  const [isHotspotsLoading, setIsHotspotsLoading] = useState<boolean>(false);

  // Parent-Child Filter Cascades
  useEffect(() => {
    setSelectedStation('ALL');
    setSelectedHotspot('ALL');
  }, [selectedDistrict]);

  useEffect(() => {
    setSelectedHotspot('ALL');
  }, [selectedStation, selectedCrimeHead, selectedStatus, selectedGravity, dateFrom, dateTo]);

  // Dynamic Case Counts for Hotspots
  const hotspotCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeHotspots.forEach(h => {
      counts[h.clusterId] = baseFilteredCases.filter(c => {
        if (h.crimeMajorHeadID && c.CrimeMajorHeadID !== h.crimeMajorHeadID) return false;
        const distKm = getDistance(c.latitude, c.longitude, h.lat, h.lng);
        return distKm <= h.radiusKm;
      }).length;
    });
    return counts;
  }, [baseFilteredCases, activeHotspots]);

  // Only include hotspots with 4 or more cases for the Red Zone logic
  const validHotspots = useMemo(() => {
    return activeHotspots.filter(h => (hotspotCounts[h.clusterId] || 0) >= 4);
  }, [activeHotspots, hotspotCounts]);

  // Single Source of Truth for all GIS UI
  const finalFilteredCases = useMemo(() => {
    if (selectedHotspot === 'ALL') return baseFilteredCases;
    const h = validHotspots.find(h => h.clusterId === selectedHotspot);
    if (!h) return baseFilteredCases;
    return baseFilteredCases.filter(c => {
      if (h.crimeMajorHeadID && c.CrimeMajorHeadID !== h.crimeMajorHeadID) return false;
      const distKm = getDistance(c.latitude, c.longitude, h.lat, h.lng);
      return distKm <= h.radiusKm;
    });
  }, [baseFilteredCases, selectedHotspot, activeHotspots]);

  // Compute hotspots from backend
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchHotspots = async () => {
      setIsHotspotsLoading(true);
      setActiveHotspots([]); // Clear immediately when filters change
      try {
        const query = new URLSearchParams();
        if (selectedDistrict !== 'ALL') query.append('district', selectedDistrict.toString());
        if (selectedStation !== 'ALL') query.append('station', selectedStation.toString());
        if (selectedCrimeHead !== 'ALL') query.append('crimeHead', selectedCrimeHead.toString());
        if (selectedStatus !== 'ALL') query.append('status', selectedStatus.toString());
        if (selectedGravity !== 'ALL') query.append('gravity', selectedGravity.toString());
        if (dateFrom) query.append('dateFrom', dateFrom);
        if (dateTo) query.append('dateTo', dateTo);

        
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
             crimeMajorHeadID: h.crimeMajorHeadID,
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
  }, [selectedDistrict, selectedStation, selectedCrimeHead, selectedStatus, selectedGravity, dateFrom, dateTo]);

  // Handle Location State (Auto-navigate to Red Zone)
  useEffect(() => {
    if (location.state?.autoOpenHotspot && location.state?.prefillHotspotLocation) {
      setTimeout(() => {
        setSelectedHotspot(location.state.prefillHotspotLocation);
      }, 500);
    }
  }, [location.state]);

  useEffect(() => {
    console.log("[GIS] before geojson fetch");
    console.log("[GIS] geojson URL:", karnatakaGeoJsonUrl);
    fetch(karnatakaGeoJsonUrl)
      .then(res => {
         console.log("[GIS] geojson fetch status:", res.status);
         console.log("[GIS] geojson content-type:", res.headers.get("content-type"));
         return res.json();
      })
      .then(data => setGeoJsonData(data))
      .catch(err => console.error("Failed to load geojson", err));
  }, []);



  // Map Initialization
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8 as const,
          sources: {
            osm: {
              type: 'raster' as const,
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }
          },
          layers: [{
            id: 'osm-tiles',
            type: 'raster' as const,
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }]
        },
        center: [76.5, 15.0],
        zoom: 6,
        maxBounds: [[68.0, 6.0], [98.0, 36.0]],
        doubleClickZoom: false
      });
      mapRef.current = map;
      
      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.on('load', () => {
         const resizeObserver = new ResizeObserver(() => {
             if (mapRef.current) mapRef.current.resize();
         });
         if (mapContainerRef.current) resizeObserver.observe(mapContainerRef.current);
         map.addSource('karnataka-districts', {
             type: 'geojson',
             data: { type: 'FeatureCollection', features: [] },
             buffer: 512,
             tolerance: 0.5
         });
         
         map.addSource('hotspots', {
             type: 'geojson',
             data: { type: 'FeatureCollection', features: [] },
             buffer: 512,
             tolerance: 0.5
         });
         
         map.addSource('fir-cases', {
             type: 'geojson',
             data: { type: 'FeatureCollection', features: [] },
             cluster: true,
             clusterMaxZoom: 14,
             clusterRadius: 50,
             buffer: 512,
             tolerance: 0.5
         });

         let insertBeforeId: string | undefined;
         const layers = map.getStyle().layers;
         if (layers) {
             // Find the first layer that represents water, roads, or buildings
             // We want our district fills to sit BELOW the road network and waterways
             // but ABOVE the background and natural_earth raster.
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
             id: 'district-fill',
             type: 'fill',
             source: 'karnataka-districts',
             paint: {
                 'fill-color': '#0b2240',
                 'fill-opacity': [
                     'case', 
                     ['boolean', ['feature-state', 'selected'], false], 0.2, 
                     ['boolean', ['feature-state', 'hover'], false], 0.15, 
                     ['boolean', ['feature-state', 'hasSelection'], false], 0.05, 
                     0.1
                 ],
                 'fill-opacity-transition': { duration: 400 },
                 'fill-color-transition': { duration: 400 }
             }
         }, insertBeforeId);

         map.addLayer({
             id: 'district-line',
             type: 'line',
             source: 'karnataka-districts',
             layout: {
                 'line-join': 'round',
                 'line-cap': 'round'
             },
             paint: {
                 'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#d4af37', ['boolean', ['feature-state', 'hover'], false], '#d4af37', '#0b2240'],
                 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 1],
                 'line-opacity': [
                     'case', 
                     ['boolean', ['feature-state', 'selected'], false], 1, 
                     ['boolean', ['feature-state', 'hasSelection'], false], 0.3, 
                     0.8
                 ],
                 'line-opacity-transition': { duration: 400 },
                 'line-color-transition': { duration: 400 }
             }
         }, insertBeforeId);

         map.addLayer({
             id: 'hotspots-fill',
             type: 'fill',
             source: 'hotspots',
             paint: {
                 'fill-color': '#ef4444',
                 'fill-opacity': 0.2,
                 'fill-opacity-transition': { duration: 400 },
                 'fill-color-transition': { duration: 400 }
             }
         });
         
         map.addLayer({
             id: 'hotspots-line',
             type: 'line',
             source: 'hotspots',
             layout: {
                 'line-join': 'round',
                 'line-cap': 'round'
             },
             paint: {
                 'line-color': '#ef4444',
                 'line-width': 1,
                 'line-color-transition': { duration: 400 }
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
                     15,
                     10,
                     20,
                     50,
                     25
                 ],
                 'circle-stroke-width': 2,
                 'circle-stroke-color': '#ffffff',
                 'circle-color-transition': { duration: 400 },
                 'circle-radius-transition': { duration: 400 },
                 'circle-stroke-opacity-transition': { duration: 400 }
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
                 'circle-stroke-color': '#ffffff',
                 'circle-color-transition': { duration: 400 },
                 'circle-stroke-opacity-transition': { duration: 400 }
             }
         });

         // Hover logic
         let hoveredStateId: string | null = null;

         map.on('mousemove', 'district-fill', (e) => {
             if (e.features && e.features.length > 0) {
                 map.getCanvas().style.cursor = 'pointer';
                 const feature = e.features[0];
                 const id = feature.id as string;
                 
                 if (hoveredStateId !== null) {
                     map.setFeatureState({ source: 'karnataka-districts', id: hoveredStateId }, { hover: false });
                 }
                 hoveredStateId = id;
                 map.setFeatureState({ source: 'karnataka-districts', id: hoveredStateId }, { hover: true });
             }
         });

         map.on('mouseleave', 'district-fill', () => {
             map.getCanvas().style.cursor = '';
             if (hoveredStateId !== null) {
                 map.setFeatureState({ source: 'karnataka-districts', id: hoveredStateId }, { hover: false });
             }
             hoveredStateId = null;
         });

         map.on('click', 'district-fill', (e) => {
             if (e.features && e.features.length > 0) {
                 const properties = e.features[0].properties;
                 if (properties && properties._dbDistrictId) {
                     setSelectedDistrict(prev => {
                         if (prev !== properties._dbDistrictId) {
                             setSelectedStation('ALL');
                             return properties._dbDistrictId;
                         }
                         return prev;
                     });
                 }
             }
         });
         
         // Hotspots popup logic
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
             e.originalEvent.stopPropagation();
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
                       <b>Station:</b> ${properties.station}<br/>
                       <b>IO:</b> ${properties.ioName}<br/>
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

         // Global click for Outside-Karnataka clear logic
         map.on('click', (e) => {
             const districtFeatures = map.queryRenderedFeatures(e.point, { layers: ['district-fill'] });
             const clusterFeatures = map.queryRenderedFeatures(e.point, { layers: ['clusters', 'unclustered-point', 'hotspots-fill'] });
             
             // If we clicked on a cluster, point, or hotspot, don't reset district
             if (clusterFeatures.length > 0) return;
             
             // If we clicked on a district, select it
             if (districtFeatures.length > 0) {
                const feature = districtFeatures[0];
                const properties = feature.properties;
                const mappings: { [key: string]: string } = { 'bengaluruurban': 'bangalore' };
                const districtName = properties?._dbDistrictName || '';
                const matchedDistrict = districts.find(d => {
                    const normalized = d.DistrictName.toLowerCase().replace(/\s/g, '');
                    return normalized === districtName.toLowerCase().replace(/\s/g, '') || mappings[normalized] === districtName.toLowerCase().replace(/\s/g, '');
                });

                if (matchedDistrict) {
                    if (matchedDistrict.DistrictName.toLowerCase().includes('bengaluru') && matchedDistrict.DistrictName.toLowerCase().includes('urban')) {
                        console.log(`[GIS DEBUG] Bengaluru Urban click fired = true`);
                        console.log(`[GIS DEBUG] Bengaluru Urban feature = ${JSON.stringify(feature)}`);
                        console.log(`[GIS DEBUG] Bengaluru Urban properties = ${JSON.stringify(properties)}`);
                        console.log(`[GIS DEBUG] Bengaluru Urban geometry type = ${feature.geometry.type}`);
                        console.log(`[GIS DEBUG] Bengaluru Urban DistrictID = ${matchedDistrict.DistrictID}`);
                    }
                    setSelectedDistrict(matchedDistrict.DistrictID);
                    setSelectedStation('ALL');
                }
             } else {
                 // If we clicked on empty space (outside Karnataka district-fill), reset
                 setSelectedDistrict('ALL');
                 setSelectedStation('ALL');
                 
                 // Force the zoom out animation in case state was already ALL but user manually panned
                 map.flyTo({ center: [76.5, 15.0], zoom: 6, duration: 1000, essential: true });
             }
         });

         map.on('error', (e) => {
             console.error("MapLibre Error:", e);
         });

         setMapLoaded(true);
      });
    }

    return () => {
      // Clean up map instance on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Run only once

  // Update GeoJSON layer data
  useEffect(() => {
    if (!mapRef.current || !geoJsonData || !mapLoaded) return;
    const features = geoJsonData.features.map((feature: any, index: number) => {
        const dbDistrict = districts.find(d => getMappedGeoJsonFeature(d.DistrictName, { features: [feature] }) !== undefined);
        return {
            ...feature,
            id: index.toString(),
            properties: {
                ...feature.properties,
                _dbDistrictId: dbDistrict?.DistrictID,
                _dbDistrictName: dbDistrict?.DistrictName
            }
        };
    });

    const source = mapRef.current.getSource('karnataka-districts') as maplibregl.GeoJSONSource;
    if (source) {
        source.setData({ type: 'FeatureCollection', features });
    }
  }, [geoJsonData, districts, mapLoaded]);

  // Update District View / Pan Map based on Filters
  useEffect(() => {
    if (!mapRef.current || !geoJsonData || !mapLoaded) return;

    // Set selected states
    const features = geoJsonData.features;
    const hasSelection = selectedDistrict !== 'ALL';
    features.forEach((_: any, index: number) => {
        const isSelected = districts.find(d => getMappedGeoJsonFeature(d.DistrictName, { features: [features[index]] }) !== undefined)?.DistrictID === selectedDistrict;
        mapRef.current!.setFeatureState({ source: 'karnataka-districts', id: index.toString() }, { selected: isSelected, hasSelection: hasSelection });
    });

    let displayStations = stations;
    if (selectedDistrict !== 'ALL') {
        displayStations = displayStations.filter(s => s.DistrictID === selectedDistrict);
    }
    if (selectedStation !== 'ALL') {
        displayStations = displayStations.filter(s => s.UnitID === selectedStation);
    }

    if (selectedHotspot !== 'ALL') {
       const selectedH = validHotspots.find(h => h.clusterId === selectedHotspot);
       if (selectedH) {
           const radiusInDegrees = (selectedH.radiusKm / 111.32);
           const bbox = [
             [selectedH.lng - radiusInDegrees, selectedH.lat - radiusInDegrees],
             [selectedH.lng + radiusInDegrees, selectedH.lat + radiusInDegrees]
           ] as maplibregl.LngLatBoundsLike;
           mapRef.current.fitBounds(bbox, { padding: 100, duration: 1000 });
       }
    } else if (selectedStation !== 'ALL') {
       const station = stations.find(s => s.UnitID === selectedStation);
       if (station && typeof station.longitude === 'number' && typeof station.latitude === 'number') {
           mapRef.current.flyTo({ center: [station.longitude, station.latitude], zoom: 14, duration: 1000 });
       }
    } else if (selectedDistrict !== 'ALL') {
       // Camera animation for District selection
       const districtObj = districts.find(d => d.DistrictID === selectedDistrict);
       if (districtObj) {
           const f = features.find((f: any) => getMappedGeoJsonFeature(districtObj.DistrictName, { features: [f] }) !== undefined);
           if (f) {
               const bbox = getBoundingBox(f);
               
               if (districtObj.DistrictName.toLowerCase().includes('bengaluru') && districtObj.DistrictName.toLowerCase().includes('urban')) {
                   console.log(`[GIS DEBUG] Bengaluru Urban dropdown selected = true`);
                   console.log(`[GIS DEBUG] Bengaluru Urban bounds = ${JSON.stringify(bbox)}`);
                   console.log(`[GIS DEBUG] Bengaluru Urban camera animation = true`);
               }

               if (bbox) {
                   mapRef.current.fitBounds(bbox, { padding: 80, duration: 1000 });
               }
           }
       }
    } else if (selectedDistrict === 'ALL' && selectedHotspot === 'ALL') {
       // Animate zoom out to view entire Karnataka when "ALL" is selected
       mapRef.current.flyTo({
           center: [76.5, 15.0],
           zoom: 6,
           duration: 1000,
           essential: true
       });
    }
  }, [selectedDistrict, selectedStation, stations, selectedHotspot, geoJsonData, districts, activeHotspots]);

  // Main Render Logic
  useEffect(() => {
    if (!mapRef.current) return;
    let displayStations: any[] = [];
    
    // Show Stations
    if (selectedHotspot !== 'ALL') {
      const psIds = new Set(finalFilteredCases.map(c => c.PoliceStationID));
      displayStations = stations.filter(s => psIds.has(s.UnitID));
    } else if (selectedDistrict !== 'ALL') {
      displayStations = stations.filter(s => s.DistrictID === selectedDistrict);
      if (selectedStation !== 'ALL') {
        displayStations = displayStations.filter(s => s.UnitID === selectedStation);
      }
    } else if (selectedStation !== 'ALL') {
      displayStations = stations.filter(s => s.UnitID === selectedStation);
    }
    
    const currentStationIds = new Set(displayStations.map(s => s.UnitID));

    // Remove markers that are no longer in displayStations
    Object.keys(stationsMarkersRef.current).forEach(id => {
       const unitId = Number(id);
       if (!currentStationIds.has(unitId)) {
           stationsMarkersRef.current[unitId].remove();
           delete stationsMarkersRef.current[unitId];
           if (stationPopupsRef.current[unitId]) {
               stationPopupsRef.current[unitId].remove();
               delete stationPopupsRef.current[unitId];
           }
       }
    });

    if (displayStations.length > 0) {
      displayStations.forEach(s => {
        if (s.latitude && s.longitude && !isNaN(s.latitude) && !isNaN(s.longitude)) {
          // If marker already exists, do nothing
          if (stationsMarkersRef.current[s.UnitID]) return;

          const el = document.createElement('div');
          el.className = 'custom-station-pin transition-all duration-300';
          el.innerHTML = `<div style="background-color: #facc15; width: 16px; height: 16px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #0b2240; box-shadow: 2px 2px 4px rgba(0,0,0,0.4);"></div>`;
          
          const fullPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 25 })
              .setLngLat([s.longitude, s.latitude])
              .setHTML(`<div style="font-family: sans-serif; font-size: 11px; padding: 2px;"><b>${s.UnitName}</b><br/>Police Station</div>`);

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([s.longitude, s.latitude])
            .addTo(mapRef.current!);
            
          el.addEventListener('mouseenter', () => fullPopup.addTo(mapRef.current!));
          el.addEventListener('mouseleave', () => fullPopup.remove());
            
          stationsMarkersRef.current[s.UnitID] = marker;
          stationPopupsRef.current[s.UnitID] = fullPopup;
        }
      });
    }

    // Draw Hotspots
    const hotspotFeatures: any[] = [];
    
    let customAIHotspotFound = false;
    validHotspots.forEach(h => {
      if (selectedHotspot !== 'ALL' && selectedHotspot !== h.clusterId) return;
      customAIHotspotFound = true;
      // Cap radius to 10km to prevent giant screen-covering blobs from data outliers
      const safeRadiusKm = Math.min(10, h.radiusKm);
      const poly = createCirclePolygon([h.lng, h.lat], safeRadiusKm * 1000);
      poly.properties = {
          popupHtml: `<div style="font-family: sans-serif; font-size: 11px;">
            <b>🚨 ${h.riskLevel} HOTSPOT</b><br/>
            Risk Score: ${h.riskScore} / 100<br/>
            ${hotspotCounts[h.clusterId] || 0} incidents<br/>
            Primary Crime: ${h.crimeName}<br/>
            Trend: ${h.trend === 'INCREASING' ? '↑' : (h.trend === 'DECREASING' ? '↓' : '→')} ${h.growthRate}%<br/>
            7-Day Outlook: ${h.forecast7DayLevel}<br/>
            Spatial Radius: ${h.radiusKm} km
          </div>`
      };
      hotspotFeatures.push(poly);
    });

    if (selectedHotspot !== 'ALL' && !customAIHotspotFound) {
      // Hotspot missing from active list (perhaps filters changed). Do not render fallback circle.
    }

    // Construct GeoJSON Features for FIRs from single source of truth
    const firFeatures = finalFilteredCases.map(c => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
        properties: {
          id: c.CaseMasterID,
          crimeNo: c.CrimeNo,
          majorHeadName: crimeHeads.find(ch => ch.CrimeHeadID === c.CrimeMajorHeadID)?.CrimeGroupName || 'Penal Code',
          station: stations.find(s => s.UnitID === c.PoliceStationID)?.UnitName || 'Unknown PS',
          ioName: mockDb.getEmployees().find(e => e.EmployeeID === c.PolicePersonID)?.FirstName || 'N/A',
          statusName: mockDb.getCaseStatuses().find(s => s.CaseStatusID === c.CaseStatusID)?.CaseStatusName || 'N/A',
          briefFacts: c.BriefFacts.substring(0, 80) + '...'
        }
      }));
    
    const firSource = mapRef.current.getSource('fir-cases') as maplibregl.GeoJSONSource;
    if (firSource) {
        firSource.setData({ type: 'FeatureCollection', features: firFeatures });
    }
    
    // Update Hotspots Source
    const source = mapRef.current.getSource('hotspots') as maplibregl.GeoJSONSource;
    if (source) {
        source.setData({ type: 'FeatureCollection', features: hotspotFeatures });
    }

    // [GIS DEBUG] Output exactly as requested by user
    if (selectedHotspot !== 'ALL') {
       const selectedH = validHotspots.find(h => h.clusterId === selectedHotspot);
       if (selectedH) {
           console.log(`[GIS DEBUG] dropdown hotspot count = ${hotspotCounts[selectedH.clusterId] || 0}`);
           console.log(`[GIS DEBUG] rendered finalFilteredCases count = ${finalFilteredCases.length}`);
           console.log(`[GIS DEBUG] dropdown case IDs = [${finalFilteredCases.map(c => c.CaseMasterID).join(', ')}]`);
           console.log(`[GIS DEBUG] rendered case IDs = [${firFeatures.map(f => f.properties.id).join(', ')}]`);
       }
    }

  }, [finalFilteredCases, activeHotspots, selectedHotspot, stations, selectedDistrict, selectedStation, crimeHeads, mapLoaded]);

  // Handle Resize
  useEffect(() => {
     const handleResize = () => {
         if (mapRef.current) mapRef.current.resize();
     };
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="space-y-6 select-none font-sans flex flex-col h-full">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight">KSP Spatial GIS Mapping</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Geographic mapping and incident hotspot clusters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
        
        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4 lg:col-span-1 h-fit">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 mb-2">
            <Filter size={14} className="text-ksp-gold-dark" /> GIS Layers & Filters
          </h3>

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
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
            >
              <option value="ALL">All Statuses</option>
              {mockDb.getCaseStatuses().map(s => <option key={s.CaseStatusID} value={s.CaseStatusName}>{s.CaseStatusName}</option>)}
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

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Date Range</label>
            <div className="flex gap-2">
               <input 
                  type="date" 
                  value={dateFrom} 
                  onChange={e => setDateFrom(e.target.value)} 
                  className="w-1/2 p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy text-[11px]" 
               />
               <input 
                  type="date" 
                  value={dateTo} 
                  onChange={e => setDateTo(e.target.value)} 
                  className="w-1/2 p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy text-[11px]" 
               />
            </div>
          </div>

          <div className={validHotspots.length === 0 ? 'opacity-50' : ''}>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Active Red Zones</label>
            <select 
              value={selectedHotspot}
              onChange={(e) => setSelectedHotspot(e.target.value)}
              disabled={validHotspots.length === 0}
              className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy disabled:cursor-not-allowed"
            >
              <option value="ALL">All Active Hotspots ({validHotspots.length})</option>
              {validHotspots.map((h, i) => (
                  <option key={i} value={h.clusterId}>
                      {h.crimeName} ({hotspotCounts[h.clusterId] || 0} Cases)
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
            
            {isHotspotsLoading && (
              <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-xs flex items-center gap-2 font-bold animate-pulse">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Recalculating Intelligence...
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 bg-slate-200 rounded-xl overflow-hidden shadow-inner border min-h-[500px] relative flex flex-col">
          <div className="flex items-center justify-between p-2 bg-slate-50 border-b text-[10px] text-slate-400 font-semibold select-none z-10 relative">
            <div className="flex items-center gap-1.5">
              <Info size={14} className="text-ksp-gold-dark" /> <span className="text-gray-500 font-medium">Mapped cases matching filter: {finalFilteredCases.length}</span>
            </div>
          </div>
          <div ref={mapContainerRef} className="flex-grow w-full h-full focus:outline-none outline-none" style={{ outline: 'none' }} />
        </div>

      </div>

    </div>
  );
};

