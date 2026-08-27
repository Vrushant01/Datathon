export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const getMappedGeoJsonFeature = (districtName: string, geoJsonData: any) => {
    if (!geoJsonData || !districtName) return null;
    const name = districtName.toLowerCase().replace(/[^a-z]/g, '');
    const mappings: Record<string, string> = {
        'bengalurucity': 'bangalore',
        'bengaluruurban': 'bangalore',
        'bengalururural': 'bangalorerural',
        'mysuru': 'mysore',
        'mangaluru': 'dakshinakannada',
        'dakshinakannada': 'dakshinakannada',
        'belagavi': 'belgaum',
        'kalaburagi': 'gulbarga',
        'ballari': 'bellary',
        'vijayanagara': 'bellary',
        'vijayapura': 'bijapur',
        'shivamogga': 'shimoga',
        'tumakuru': 'tumkur',
        'chikkamagaluru': 'chikmagalur',
        'chamarajanagar': 'chamrajnagar',
        'chikkaballapur': 'chikkaballapura',
        'hubballidharwad': 'dharwad'
    };
    const targetName = mappings[name] || name;
    
    return geoJsonData.features.find((f: any) => {
        const p = f.properties.district || f.properties.NAME_2 || f.properties.ST_NM;
        if (!p) return false;
        const featureName = p.toLowerCase().replace(/[^a-z]/g, '');
        return featureName === targetName;
    });
};

export const getBoundingBox = (feature: any): [[number, number], [number, number]] | null => {
    if (!feature || !feature.geometry || !feature.geometry.coordinates) return null;
    let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
    
    const processCoord = (coord: number[]) => {
        const [lng, lat] = coord;
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
    };
    
    const type = feature.geometry.type;
    const coords = feature.geometry.coordinates;
    
    if (type === 'Polygon') {
        coords.forEach((ring: any) => ring.forEach(processCoord));
    } else if (type === 'MultiPolygon') {
        coords.forEach((poly: any) => poly.forEach((ring: any) => ring.forEach(processCoord)));
    } else {
        return null;
    }
    
    return [[minLng, minLat], [maxLng, maxLat]];
};

export const createCirclePolygon = (center: [number, number], radiusInMeters: number, points: number = 64) => {
    const coords = [];
    const km = radiusInMeters / 1000;
    const distanceX = km / (111.320 * Math.cos(center[1] * Math.PI / 180));
    const distanceY = km / 110.574;

    for (let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        const x = distanceX * Math.cos(theta);
        const y = distanceY * Math.sin(theta);
        coords.push([center[0] + x, center[1] + y]);
    }
    coords.push(coords[0]); // Close polygon
    
    return {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [coords]
        },
        properties: {}
    };
};
