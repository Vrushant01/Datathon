import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Users, FileText, BarChart3, MapPin, 
  History, Menu, X, ShieldAlert, Share2, Building, Brain, Bot, Repeat, MoreHorizontal, Crosshair
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Security route guard check
  if (role !== 'Admin') {
    return (
      <div className="flex-grow flex items-center justify-center p-8 bg-slate-100 min-h-screen select-none">
        <div className="bg-white p-8 rounded-xl border border-red-200 shadow-lg text-center max-w-md">
          <ShieldAlert className="text-red-500 mx-auto mb-4" size={48} />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Access Denied</h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            This workspace requires Administrator security clearance. Your session details have been flagged.
          </p>
          <button 
            onClick={() => { logout(); navigate('/admin'); }}
            className="bg-ksp-navy text-white px-5 py-2.5 rounded-lg text-xs font-bold transition hover:bg-ksp-navy-light"
          >
            Authenticate as Admin
          </button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { label: 'Dashboard', path: '/admin-portal', icon: <LayoutDashboard size={18} />, primary: true },
    { label: 'Intell Center', path: '/admin-portal/intelligence', icon: <Crosshair size={18} />, primary: true },
    { label: 'Stations', path: '/admin-portal/stations', icon: <Building size={18} />, primary: false },
    { label: 'FIRs & Cases', path: '/admin-portal/firs', icon: <FileText size={18} />, primary: true },
    { label: 'Analytics', path: '/admin-portal/analytics', icon: <BarChart3 size={18} />, primary: true },
    { label: 'Officers', path: '/admin-portal/officers', icon: <Users size={18} />, primary: false },
    { label: 'GIS Maps', path: '/admin-portal/gis', icon: <MapPin size={18} />, primary: false },
    { label: 'Criminal Network', path: '/admin-portal/network', icon: <Share2 size={18} />, primary: false },
    { label: 'AI Anomaly', path: '/admin-portal/anomaly-detection', icon: <Brain size={18} />, primary: false },
    { label: 'Repeated Offenders', path: '/admin-portal/repeated-offenders', icon: <Repeat size={18} />, primary: false },
    { label: 'AI Assistant', path: '/admin-portal/assistant', icon: <Bot size={18} />, primary: false },
    { label: 'Audit Logs', path: '/admin-portal/audit', icon: <History size={18} />, primary: false }
  ];

  const primaryItems = menuItems.filter(i => i.primary);
  const moreItems = menuItems.filter(i => !i.primary);

  const activeClass = "bg-ksp-gold text-ksp-navy font-bold shadow-md scale-[1.02]";
  const inactiveClass = "text-slate-300 hover:bg-white/5 hover:text-white";

  // Prevent scrolling when More menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  // Determine page title for compact mobile header
  const currentPageLabel = menuItems.find(i => location.pathname === i.path)?.label || 'System Console';

  return (
    <div className="flex-grow flex flex-col xl:flex-row min-h-full bg-slate-50 relative select-none">
      
      {/* Tablet/Mobile Header - App Style */}
      <div className="xl:hidden w-full bg-ksp-navy text-white px-4 py-3 flex items-center shadow sticky top-0 z-40 border-b border-ksp-gold/20">
        <div className="flex flex-col">
          <span className="font-extrabold text-[10px] uppercase tracking-wide text-ksp-gold">KSP Console</span>
          <span className="font-semibold text-sm">{currentPageLabel}</span>
        </div>
      </div>

      {/* Desktop Sidebar Navigation (Hidden on < xl) */}
      <aside className={`
        hidden xl:flex w-64 bg-ksp-navy text-white flex-col border-r border-ksp-gold/25 shadow-xl shrink-0 z-40 transition-all duration-300 sticky top-0 h-screen overflow-y-auto
      `}>
        {/* Console title branding */}
        <div className="p-6 border-b border-white/5 select-none">
          <span className="text-[10px] uppercase text-ksp-gold font-bold tracking-widest block mb-1">State Administration</span>
          <span className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
            KSP System Console
          </span>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="p-4 flex-grow space-y-1.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
               <Link 
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive ? activeClass : inactiveClass
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer info in sidebar */}
        <div className="p-4 border-t border-white/5 text-[10px] text-slate-400 select-none">
          <p className="m-0 font-bold uppercase tracking-wider text-slate-500">Security Clearance</p>
          <p className="m-0 mt-0.5 text-slate-300 font-medium">Level 1 Administrator</p>
        </div>
      </aside>

      {/* Main Content Area */}
      {/* 
        We add pb-20 on xl:pb-0 so content isn't covered by the bottom nav. 
        Exceptions are network and assistant which need full height, they will handle their own inner spacing.
      */}
      <main className={`flex-grow flex flex-col max-w-full ${
        (location.pathname.includes('/network') || location.pathname.includes('/assistant')) 
          ? 'p-0 pb-0' 
          : 'px-4 pt-4 pb-24 xl:p-8'
      }`}>
        <div className={(location.pathname.includes('/network') || location.pathname.includes('/assistant')) ? 'flex-grow flex flex-col w-full h-full' : 'container mx-auto'}>
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation Bar (Hidden on >= xl) */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] z-50 px-2 pb-[env(safe-area-inset-bottom)]">
        <nav className="flex items-center justify-around h-16">
          {primaryItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.label} 
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                  isActive ? 'text-ksp-gold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className={`${isActive ? 'bg-ksp-navy rounded-full p-1.5 shadow-sm' : ''}`}>
                  {React.cloneElement(item.icon, { size: 20, className: isActive ? 'text-white' : '' })}
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? 'text-ksp-navy' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              mobileMenuOpen ? 'text-ksp-gold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`${mobileMenuOpen ? 'bg-ksp-navy rounded-full p-1.5 shadow-sm' : ''}`}>
              <MoreHorizontal size={20} className={mobileMenuOpen ? 'text-white' : ''} />
            </div>
            <span className={`text-[10px] font-semibold ${mobileMenuOpen ? 'text-ksp-navy' : ''}`}>
              More
            </span>
          </button>
        </nav>
      </div>

      {/* More Menu Bottom Sheet */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="xl:hidden fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Sheet */}
          <div className="xl:hidden fixed bottom-16 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-40 transform transition-transform border-t border-slate-100 max-h-[70vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            <div className="p-4 pt-6">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Additional Modules</h3>
              <div className="grid grid-cols-1 gap-2">
                {moreItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors ${
                        isActive 
                          ? 'bg-ksp-navy text-white shadow-sm' 
                          : 'text-slate-700 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      {React.cloneElement(item.icon, { size: 20, className: isActive ? 'text-ksp-gold' : 'text-slate-500' })}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

