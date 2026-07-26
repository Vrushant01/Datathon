import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, User, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { TransparentLogo } from '../../components/TransparentLogo';

export const OfficerLogin: React.FC = () => {
  const { login, role, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated && role === 'Officer') {
      navigate('/officer-portal');
    }
  }, [isAuthenticated, role, navigate]);

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!employeeId || !password) {
      setError('Please fill in all credentials.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await login(employeeId.trim(), password, 'officer');
      if (res.success) {
        setSuccess(true);
        // artificial redirect timing
        setTimeout(() => {
          navigate('/officer-portal');
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
            className="h-16 mx-auto mb-3 object-contain"
          />
          <h2 className="text-xl font-extrabold text-ksp-navy tracking-tight uppercase">
            Police Officer Portal
          </h2>
          <p className="text-xs text-ksp-gold font-bold uppercase tracking-wider mt-1">
            ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್ • KSP LAW & ORDER
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5 italic">
            "ಸದಾ ತತ್ಪರ" (Always Alert)
          </span>
        </div>

        {/* Informative message box */}
        <div className="bg-slate-50 border border-slate-200 text-[12px] text-slate-600 p-3 rounded-lg mb-6 leading-relaxed select-text text-center">
          <div>🔒 <strong>Officer ID:</strong> 9001 &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Password:</strong> password</div>
          <div className="text-[10px] text-slate-400 mt-1 italic">Note: This is a demo for a single officer. You can view all others in the Admin Panel.</div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-lg mb-5 flex items-start gap-2">
            <ShieldAlert className="shrink-0 text-red-500 mt-0.5" size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3.5 rounded-lg mb-5 flex items-start gap-2">
            <ShieldCheck className="shrink-0 text-emerald-500 mt-0.5" size={16} />
            <span>Authorized. Redirecting to Case Management System...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5 uppercase tracking-wider">Employee ID / KGID</label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-slate-400 pointer-events-none">
                <User size={16} />
              </span>
              <input 
                type="text" 
                placeholder="e.g. 9002 or KGID901234"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={isLoading || success}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ksp-navy focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5 uppercase tracking-wider">Security Password</label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-slate-400 pointer-events-none">
                <Lock size={16} />
              </span>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || success}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ksp-navy focus:border-transparent transition"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || success}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-lg text-xs tracking-wider uppercase transition-all duration-300 shadow-md flex items-center justify-center gap-1.5 border border-slate-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin text-white" size={16} />
                Verifying Credentials...
              </>
            ) : (
              'Verify & Login'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[10px] text-slate-400 m-0">
            For technical assistance or suspension overrides, contact the KSP IT Division desk.
          </p>
        </div>
      </div>
    </div>
  );
};
