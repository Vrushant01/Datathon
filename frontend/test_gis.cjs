const fs = require('fs');
const https = require('https');

async function test() {
  const districtId = 1012; // Bellary/Ballari usually? Let's fetch districts to be sure.
  
  const casesRes = await fetch('https://backend-50044295489.development.catalystappsail.in/api/cases');
  const allCases = await casesRes.json();
  
  const distRes = await fetch('https://backend-50044295489.development.catalystappsail.in/api/districts');
  const allDistricts = await distRes.json();
  const ballari = allDistricts.find(d => d.DistrictName.includes('Ballari') || d.DistrictName.includes('Bellary'));
  
  const stationsRes = await fetch('https://backend-50044295489.development.catalystappsail.in/api/units');
  const allStations = await stationsRes.json();
  const ballariStations = new Set(allStations.filter(s => s.DistrictID === ballari.DistrictID).map(s => s.UnitID));
  
  const baseFilteredCases = allCases.filter(c => ballariStations.has(c.PoliceStationID));
  
  const hotRes = await fetch('https://backend-50044295489.development.catalystappsail.in/api/hotspots?district=' + ballari.DistrictID);
  const hotData = await hotRes.json();
  
  const activeHotspots = hotData.hotspots.map(h => ({
     clusterId: h.clusterId,
     lat: h.center.lat,
     lng: h.center.lng,
     count: h.incidentCount,
     crimeMajorHeadID: h.crimeMajorHeadId,
     crimeName: Object.keys(h.crimeCategories || {}).sort((a,b) => (h.crimeCategories[b] - h.crimeCategories[a]))[0] || 'Multiple Crimes',
     radiusKm: h.radiusKm
  }));
  
  const sllHotspot = activeHotspots.find(h => h.crimeName.includes('Special and Local Laws') || h.crimeName.includes('SLL'));
  
  if (!sllHotspot) {
      console.log('SLL Hotspot not found');
      return;
  }
  
  function getDistance(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
  }
  
  const hotspotCountCases = baseFilteredCases.filter(c => {
      if (sllHotspot.crimeMajorHeadID && c.CrimeMajorHeadID !== sllHotspot.crimeMajorHeadID) return false;
      const distKm = getDistance(c.latitude, c.longitude, sllHotspot.lat, sllHotspot.lng);
      return distKm <= sllHotspot.radiusKm;
  });
  
  const mapRenderedCases = hotspotCountCases.filter(c => 
      typeof c.latitude === 'number' && typeof c.longitude === 'number' && !isNaN(c.latitude) && !isNaN(c.longitude)
  );
  
  console.log(`[GIS DEBUG] dropdown hotspot count = ${hotspotCountCases.length}`);
  console.log(`[GIS DEBUG] rendered finalFilteredCases count = ${mapRenderedCases.length}`);
  console.log(`[GIS DEBUG] dropdown case IDs =`, hotspotCountCases.map(c => c.CaseMasterID));
  console.log(`[GIS DEBUG] rendered case IDs =`, mapRenderedCases.map(c => c.CaseMasterID));
  
  const missingCases = hotspotCountCases.filter(c => !mapRenderedCases.map(m=>m.CaseMasterID).includes(c.CaseMasterID));
  console.log(`[GIS DEBUG] Missing Cases Full Objects:`, JSON.stringify(missingCases, null, 2));
}

test().catch(console.error);
