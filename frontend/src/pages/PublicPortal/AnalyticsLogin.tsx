import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BarChart3, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { TransparentLogo } from '../../components/TransparentLogo';

export const AnalyticsLogin: React.FC = () => {
  const { login, role, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated && role === 'Analytics') {
      navigate('/analytics-portal');
    }
  }, [isAuthenticated, role, navigate]);

  const [stationId, setStationId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!stationId || !password) {
      setError('Please fill in all credentials.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await login(stationId.trim(), password, 'analytics');
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/analytics-portal');
        }, 800);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('Connection to security gateway failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center py-12 px-4 bg-slate-100 select-none">
      <div className="bg-white p-8 rounded-2xl border shadow-xl w-full max-w-md relative overflow-hidden">
        {/* Gold Top Banner bar */}
        <div className="absolute top-0 left-0 w-full h-2.5 bg-ksp-gold"></div>

        <div className="text-center mb-6">
          <TransparentLogo 
            src="/ksp-logo-new.png" 
            alt="KSP Logo" 
            className="w-16 h-16 mx-auto mb-3 object-contain"
          />
          <h2 className="text-2xl font-extrabold text-ksp-navy tracking-tight font-heading uppercase">
            Analytics Portal
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
            Station Analytics Department Login
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-6 flex gap-2 items-center border border-red-200">
            <Lock size={16} />
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-emerald-50 text-emerald-700 p-6 rounded-xl text-center border border-emerald-200 flex flex-col items-center justify-center space-y-3">
            <ShieldCheck size={32} className="text-emerald-500" />
            <div>
              <p className="font-bold text-lg">Access Granted</p>
              <p className="text-xs mt-1">Redirecting to secure analytics dashboard...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">
                Station Analytics ID or Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <BarChart3 size={18} />
                </span>
                <input
                  type="text"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-ksp-blue transition focus:bg-white focus:ring-2 focus:ring-ksp-blue/20"
                  placeholder="e.g. 2001 or Koramangala"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">
                Secure Passcode
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-ksp-blue transition focus:bg-white focus:ring-2 focus:ring-ksp-blue/20"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs tracking-wider uppercase transition-all duration-300 shadow-md flex items-center justify-center gap-1.5 border border-slate-700"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                'Authenticate'
              )}
            </button>
          </form>
        )}
      </div>
      
      <div className="fixed bottom-6 text-center w-full px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest z-0 pointer-events-none">
        KSP Analytics Intranet &copy; 2026
      </div>
    </div>
  );
};
