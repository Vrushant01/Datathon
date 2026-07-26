const API_BASE = 'http://localhost:5000/api/ai';

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
