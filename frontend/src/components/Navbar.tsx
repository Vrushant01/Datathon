import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Shield, LogOut, Bell, User, MapPin } from 'lucide-react';
import { mockDb, dbConnectionError } from '../../data/mockDb';
import { useDbConnection } from '../hooks/useDbConnection';
import { TransparentLogo } from './TransparentLogo';

export const Navbar: React.FC = () => {
  const { user, role, isAuthenticated, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { status: dbConnectionStatus } = useDbConnection();

  const handleLangChange = (newLang: 'en' | 'kn') => {
    setLanguage(newLang);
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    localStorage.removeItem('ksp_auth_user');
    sessionStorage.clear();
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

  const normPath = location.pathname.replace(/\/$/, '') || '/';
  const isAuthOrLanding = 
    normPath === '/' || 
    normPath === '/login' || 
    normPath === '/admin' ||
    normPath === '/admin-login' ||
    normPath === '/analytics-login';

  // Determine portal brand names
  const isAdminPath = location.pathname.startsWith('/admin-portal');
  const isOfficerPath = location.pathname.startsWith('/officer-portal');

  return (
    <header className="w-full bg-ksp-navy text-white shadow-md border-b-4 border-ksp-gold select-none">
      {/* Top Banner - Official Government Branding */}
      {!isAuthOrLanding && (
        <div className="bg-ksp-navy-dark px-2 sm:px-4 py-1.5 flex flex-wrap justify-between items-center border-b border-white/10 text-slate-300 font-medium select-none min-w-0 gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0 text-[9px] sm:text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              {t('banner.gov')}
            </span>
            <span className="text-white/30 hidden xs:inline">|</span>
            <span>{t('banner.portal_name')}</span>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center min-w-0 justify-end">
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
                ? t('banner.db_live')
                : dbConnectionStatus === 'error'
                ? t('banner.db_offline')
                : dbConnectionStatus === 'connecting'
                ? t('banner.db_connecting')
                : t('banner.db_offline_mode')}
            </span>
            <span>|</span>
            <span onClick={() => adjustFontSize('up')} className="hover:text-white hover:scale-105 cursor-pointer transition font-bold" title="Increase text size">A+</span>
            <span onClick={() => adjustFontSize('reset')} className="hover:text-white hover:scale-105 cursor-pointer transition font-bold" title="Reset text size">A</span>
            <span onClick={() => adjustFontSize('down')} className="hover:text-white hover:scale-105 cursor-pointer transition font-bold" title="Decrease text size">A-</span>
            <span>|</span>
            <span 
              id="lang-toggle-en"
              role="button"
              tabIndex={0}
              onClick={() => handleLangChange('en')} 
              className={`cursor-pointer transition text-[10px] tracking-wider ${language === 'en' ? 'text-ksp-gold font-extrabold underline underline-offset-2' : 'text-slate-400 hover:text-slate-200'}`}
            >
              ENGLISH
            </span>
            <span 
              id="lang-toggle-kn"
              role="button"
              tabIndex={0}
              onClick={() => handleLangChange('kn')} 
              className={`cursor-pointer transition text-[10px] tracking-wider ${language === 'kn' ? 'text-ksp-gold font-extrabold underline underline-offset-2' : 'text-slate-400 hover:text-slate-200'}`}
            >
              ಕನ್ನಡ
            </span>
          </div>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="w-full px-2 sm:px-4 py-2 sm:py-3 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
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
          className="flex items-center gap-2 sm:gap-3 group w-full sm:w-auto justify-center sm:justify-start"
        >
          <TransparentLogo 
            src="/ksp-logo-new.png" 
            alt="KSP Logo" 
            className="h-10 w-10 sm:h-12 sm:w-12 object-contain group-hover:scale-105 transition shrink-0"
          />
          <div className="leading-tight text-center sm:text-left min-w-0">
            <h1 className="text-sm sm:text-lg md:text-xl font-bold tracking-tight text-white m-0 truncate">
              {t('banner.dept_name')}
            </h1>
            <p className="text-[10px] sm:text-xs md:text-sm font-semibold text-ksp-gold m-0 truncate">
              {t('banner.dept_sub')}
            </p>
          </div>
        </Link>

        {/* Portal indicators & Navigation */}
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          {isAuthenticated && user ? (
            <>
              {/* Notification Badge */}
              <div className="relative cursor-pointer p-1.5 rounded-full hover:bg-white/10 transition shrink-0" onClick={() => {
                if (role === 'Admin') navigate('/admin-portal/notifications');
                else if (role === 'Analytics') navigate('/analytics-portal/notifications');
                else navigate('/officer-portal/notifications');
              }}>
                <Bell size={18} className="text-slate-200 sm:w-5 sm:h-5" />
                {getUnreadNotifications() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-[9px] sm:text-[10px] w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold border-2 border-ksp-navy">
                    {getUnreadNotifications()}
                  </span>
                )}
              </div>

              {/* User Profile Badge */}
              <div className="flex flex-col text-left sm:text-right min-w-0 flex-1 sm:flex-initial overflow-hidden">
                <span className="text-xs sm:text-sm font-bold flex items-center gap-1 sm:gap-1.5 justify-start sm:justify-end truncate">
                  <Shield size={12} className="text-ksp-gold shrink-0 sm:w-3.5 sm:h-3.5" />
                  <span className="truncate">{user.firstName}</span>
                </span>
                <span className="text-[9px] sm:text-xs text-slate-300 truncate">
                  {user.role === 'Admin' ? t('banner.admin') : `${user.kgid || t('banner.officer')} • ${user.stationName || 'KSP'}`}
                </span>
              </div>

              <div className="h-6 sm:h-8 w-[1px] bg-white/20 hidden xs:block"></div>

              {/* Logout button */}
              <button 
                onClick={handleLogout}
                className="bg-red-700/60 hover:bg-red-700 text-white px-2.5 py-1.5 sm:px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 border border-red-500/25 transition shadow-sm shrink-0"
              >
                <LogOut size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{t('banner.logout')}</span>
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
};
