import { API_BASE_URL } from '../config/api';

const API_BASE = `${API_BASE_URL}/api/ai`;

// Cached dashboard data to avoid redundant calls
let _cachedDashboard: any = null;
let _cacheTs = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

/**
 * Fetch the real AI dashboard from the backend, with a 3-minute in-memory cache.
 * Falls back to null on error.
 */
export const getAIDashboard = async (): Promise<any | null> => {
  try {
    const now = Date.now();
    if (_cachedDashboard && now - _cacheTs < CACHE_TTL) {
      return _cachedDashboard;
    }
    const res = await fetch(`${API_BASE}/dashboard`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _cachedDashboard = data;
    _cacheTs = now;
    return data;
  } catch (error) {
    console.error('[aiService] getAIDashboard error:', error);
    return null;
  }
};

export const downloadAIReport = () => {
  window.open(`${API_BASE}/report/pdf`, '_blank');
};
