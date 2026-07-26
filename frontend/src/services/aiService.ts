const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:5000' : 'https://datathon-qs4x.onrender.com';
const API_BASE = `${API_BASE_URL}/api/ai`;

export const getAIDashboard = async () => {
  try {
    const res = await fetch(`${API_BASE}/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch AI dashboard');
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const downloadAIReport = () => {
  window.open(`${API_BASE}/report/pdf`, '_blank');
};
