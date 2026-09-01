import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, Bell, User, MapPin } from 'lucide-react';
import { mockDb, dbConnectionError } from '../utils/mockDb';
import { useDbConnection } from '../hooks/useDbConnection';
import { TransparentLogo } from './TransparentLogo';

export const Navbar: React.FC = () => {
  const { user, role, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { status: dbConnectionStatus } = useDbConnection();
  const [lang, setLang] = React.useState('en');

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (combo) {
      combo.value = newLang;
      combo.dispatchEvent(new Event('change'));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getUnreadNotifications = () => {
    const targetId = role === 'Analytics' ? user?.unitId : user?.employeeId;
    const notifs = mockDb.getNotifications(targetId);
    return notifs.filter(n => !n.read).length;
  };

  // Font size adjuster action
  const adjustFontSize = (action: 'up' | 'down' | 'reset') => {
    const root = document.documentElement;
    const currentSize = parseFloat(window.getComputedStyle(root).fontSize) || 16;
    if (action === 'up') {
      root.style.fontSize = `${Math.min(currentSize + 1, 20)}px`;
    } else if (action === 'down') {
      root.style.fontSize = `${Math.max(currentSize - 1, 12)}px`;
    } else {
      root.style.fontSize = ''; // reset to default
    }
  };

  const showDbDetails = () => {
    alert(`Database Connection:
Status: ${dbConnectionStatus.toUpperCase()}
Gateway: Zoho Catalyst CloudScale
Data Source: Live CloudScale Database`);
  };

  const isAuthOrLanding = 
    location.pathname === '/' || 
    location.pathname === '/login' || 
    location.pathname === '/admin';

  // Determine portal brand names
  const isAdminPath = location.pathname.startsWith('/admin-portal');
  const isOfficerPath = location.pathname.startsWith('/officer-portal');

  const [mobileProfileOpen, setMobileProfileOpen] = React.useState(false);

  return (
    <header className="w-full bg-ksp-navy text-white shadow-md border-b-4 border-ksp-gold select-none relative z-50">
      {/* Top Banner - Official Government Branding (Hidden on mobile) */}
      {!isAuthOrLanding && (
        <div className="hidden md:flex bg-ksp-navy-dark text-xs px-4 py-1.5 justify-between items-center border-b border-white/10 text-slate-300 font-medium select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              GOVERNMENT OF KARNATAKA • ಕರ್ನಾಟಕ ಸರ್ಕಾರ
            </span>
            <span className="hidden lg:inline">|</span>
            <span className="hidden lg:inline">OFFICIAL GIS & CRIME ANALYTICS PORTAL</span>
          </div>
          <div className="flex gap-3 items-center">
            <span 
              onClick={showDbDetails}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider cursor-pointer transition select-none ${
                dbConnectionStatus === 'connected'
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/60'
                  : dbConnectionStatus === 'error'
                  ? 'bg-red-950/60 text-red-400 border-red-500/30'
                  : dbConnectionStatus === 'connecting'
                  ? 'bg-blue-950/60 text-blue-400 border-blue-500/30'
                  : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
              }`} 
              title={dbConnectionStatus === 'error' ? dbConnectionError || 'Unknown Connection Error' : 'Click to inspect database gateway status'}
            >
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                dbConnectionStatus === 'connected'
                  ? 'bg-emerald-500'
                  : dbConnectionStatus === 'error'
                  ? 'bg-red-500'
                  : dbConnectionStatus === 'connecting'
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
              }`}></span>
              {dbConnectionStatus === 'connected'
                ? 'Live DB'
                : dbConnectionStatus === 'error'
                ? 'DB Offline'
                : dbConnectionStatus === 'connecting'
                ? 'Connecting...'
                : 'Offline Mode'}
            </span>
            <span>|</span>
            <span onClick={() => adjustFontSize('up')} className="hover:text-white hover:scale-105 cursor-pointer transition font-bold" title="Increase text size">A+</span>
            <span onClick={() => adjustFontSize('reset')} className="hover:text-white hover:scale-105 cursor-pointer transition font-bold" title="Reset text size">A</span>
            <span onClick={() => adjustFontSize('down')} className="hover:text-white hover:scale-105 cursor-pointer transition font-bold" title="Decrease text size">A-</span>
            <span>|</span>
            <span 
              onClick={() => handleLangChange('en')} 
              className={`notranslate cursor-pointer transition text-[10px] ${lang === 'en' ? 'text-ksp-gold font-extrabold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              ENGLISH
            </span>
            <span 
              onClick={() => handleLangChange('kn')} 
              className={`notranslate cursor-pointer transition text-[10px] ${lang === 'kn' ? 'text-ksp-gold font-extrabold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              ಕನ್ನಡ
            </span>
          </div>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="container mx-auto px-3 sm:px-4 py-2.5 flex justify-between items-center">
        <Link 
          to={
            isAuthenticated && user
              ? user.role === 'Admin'
                ? '/admin-portal'
                : user.role === 'Analytics'
                  ? '/analytics-portal'
                  : '/officer-portal'
              : '/'
          } 
          className="flex items-center gap-2 sm:gap-3 group shrink-0"
        >
          <TransparentLogo 
            src="/ksp-logo-new.png" 
            alt="KSP Logo" 
            className="h-10 w-10 sm:h-12 sm:w-12 object-contain group-hover:scale-105 transition shrink-0"
          />
          <div className="leading-tight shrink min-w-0">
            <h1 className="text-[clamp(14px,3.5vw,20px)] font-bold tracking-tight text-white m-0 truncate">
              KARNATAKA STATE POLICE
            </h1>
            <p className="text-[clamp(9px,2vw,14px)] font-semibold text-ksp-gold m-0 truncate">
              ಕಾನೂನು ಮತ್ತು ಸುವ್ಯವಸ್ಥೆ • Law & Order
            </p>
          </div>
        </Link>

        {/* Portal indicators & Navigation */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notification Badge */}
              <div className="relative cursor-pointer p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition" onClick={() => {
                if (role === 'Admin') navigate('/admin-portal/notifications');
                else if (role === 'Analytics') navigate('/analytics-portal/notifications');
                else navigate('/officer-portal/notifications');
              }}>
                <Bell size={20} className="text-slate-200" />
                {getUnreadNotifications() > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white rounded-full text-[10px] w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold border-2 border-ksp-navy">
                    {getUnreadNotifications()}
                  </span>
                )}
              </div>

              {/* User Profile Badge (Desktop) */}
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-bold flex items-center gap-1.5 justify-end">
                  <Shield size={14} className="text-ksp-gold" />
                  {user.firstName}
                </span>
                <span className="text-xs text-slate-300">
                  {user.role === 'Admin' ? 'Administrator' : `${user.kgid || 'Officer'} • ${user.stationName || 'KSP'}`}
                </span>
              </div>

              <div className="h-8 w-[1px] bg-white/20 hidden md:block"></div>

              {/* Logout button (Desktop) */}
              <button 
                onClick={handleLogout}
                className="hidden md:flex bg-red-700/60 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold items-center gap-1.5 border border-red-500/25 transition shadow-sm"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>

              {/* Mobile Profile Menu Toggle */}
              <button 
                className="md:hidden p-1.5 rounded-full hover:bg-white/10 text-slate-200 transition"
                onClick={() => setMobileProfileOpen(!mobileProfileOpen)}
              >
                <User size={22} />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile Profile Dropdown Menu */}
      {mobileProfileOpen && isAuthenticated && user && (
        <div className="md:hidden absolute top-full right-0 w-full bg-ksp-navy-dark border-b border-ksp-gold/20 shadow-xl pb-4 pt-2 px-4 flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <div className="w-10 h-10 rounded-full bg-ksp-gold/20 flex items-center justify-center border border-ksp-gold/50">
              <Shield size={20} className="text-ksp-gold" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-400">{user.role === 'Admin' ? 'Level 1 Administrator' : `${user.kgid || 'Officer'}`}</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-300">Database Status</span>
            <span 
              onClick={showDbDetails}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                dbConnectionStatus === 'connected' ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' : 'bg-red-950 text-red-400 border-red-500/30'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dbConnectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              {dbConnectionStatus === 'connected' ? 'Connected' : 'Offline'}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <span className="text-xs font-semibold text-slate-300">Language</span>
            <div className="flex gap-2">
              <button onClick={() => handleLangChange('en')} className={`text-xs px-2 py-1 rounded ${lang === 'en' ? 'bg-ksp-gold/20 text-ksp-gold' : 'text-slate-400'}`}>EN</button>
              <button onClick={() => handleLangChange('kn')} className={`text-xs px-2 py-1 rounded ${lang === 'kn' ? 'bg-ksp-gold/20 text-ksp-gold' : 'text-slate-400'}`}>KN</button>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full bg-red-700/80 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </header>
  );
};
