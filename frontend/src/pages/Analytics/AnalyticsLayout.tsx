import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Users, MapPin, FileText, Network, BarChart3
} from 'lucide-react';

export const AnalyticsLayout: React.FC = () => {
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Security route guard check
  if (role !== 'Analytics') {
    return (
      <div className="flex-grow flex items-center justify-center bg-slate-100 flex-col gap-4 min-h-screen">
        <div className="text-red-500 font-bold text-lg">UNAUTHORIZED ACCESS</div>
        <p className="text-sm text-slate-500">You must be logged in as an Analytics Officer to view this portal.</p>
        <button 
          onClick={() => navigate('/analytics-login')}
          className="bg-ksp-blue text-white px-6 py-2 rounded font-bold"
        >
          Return to Login
        </button>
      </div>
    );
  }

  const menuItems = [
    { label: 'Dashboard', path: '/analytics-portal', icon: <LayoutDashboard size={18} /> },
    { label: 'Officers', path: '/analytics-portal/officers', icon: <Users size={18} /> },
    { label: 'Station GIS', path: '/analytics-portal/map', icon: <MapPin size={18} /> },
    { label: 'Station FIRs', path: '/analytics-portal/firs', icon: <FileText size={18} /> },
    { label: 'Network', path: '/analytics-portal/network', icon: <Network size={18} /> },
  ];

  const activeClass = "bg-ksp-blue-light/10 text-white font-bold shadow-md scale-[1.02] border-l-4 border-ksp-gold";
  const inactiveClass = "text-slate-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent";

  const currentPageLabel = menuItems.find(i => location.pathname === i.path || (i.path !== '/analytics-portal' && location.pathname.startsWith(i.path)))?.label || 'Analytics';

  return (
    <div className="flex-grow flex flex-col xl:flex-row min-h-full bg-slate-50 relative select-none">
      
      {/* Tablet/Mobile Header - App Style */}
      <div className="xl:hidden w-full bg-ksp-navy text-white px-4 py-3 flex items-center justify-between shadow sticky top-0 z-40 border-b border-ksp-gold/20">
        <div className="flex flex-col">
          <span className="font-extrabold text-[10px] uppercase tracking-wide text-ksp-gold flex items-center gap-1.5"><BarChart3 size={12}/> Analytics Portal</span>
          <span className="font-semibold text-sm">{currentPageLabel === 'Network' ? 'Network Analysis' : currentPageLabel}</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-ksp-gold/15 text-ksp-gold border border-ksp-gold/30 flex items-center justify-center font-bold text-xs uppercase">
          {user?.stationName?.charAt(0) || 'A'}
        </div>
      </div>

      {/* Desktop Sidebar Navigation (Hidden on < xl) */}
      <aside className={`
        hidden xl:flex w-64 bg-ksp-navy text-white flex-col border-r border-slate-700 shadow-2xl shrink-0 z-40 transition-all duration-300 sticky top-0 h-screen overflow-y-auto
      `}>
        <div className="p-6 border-b border-slate-700/50">
          <div className="text-xs font-bold text-ksp-gold uppercase tracking-widest mb-1 flex items-center gap-2">
            <BarChart3 size={14} /> Analytics
          </div>
          <div className="text-xl font-black tracking-tight leading-tight uppercase">
            {user?.stationName}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-1">
            {user?.districtName}
          </div>
        </div>

        <nav className="flex-grow p-4 space-y-1.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/analytics-portal' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 p-3 rounded-r-lg transition-all duration-200 text-sm ${
                  isActive ? activeClass : inactiveClass
                }`}
              >
                {item.icon}
                {item.label === 'Network' ? 'Network Analysis' : item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700">
            <div className="text-xs font-bold text-slate-300">Auth User:</div>
            <div className="text-sm font-semibold truncate text-ksp-gold">{user?.email}</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-grow flex flex-col max-w-full ${
        location.pathname.includes('/network') || location.pathname.includes('/map')
          ? 'p-0 pb-0' 
          : 'px-4 pt-4 pb-24 xl:p-8'
      }`}>
        <div className={location.pathname.includes('/network') || location.pathname.includes('/map') ? 'flex-grow flex flex-col w-full h-full' : 'container mx-auto'}>
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation Bar (Hidden on >= xl) */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] z-50 px-2 pb-[env(safe-area-inset-bottom)]">
        <nav className="flex items-center justify-around h-16">
          {menuItems.map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/analytics-portal' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.label}
                to={item.path}
                className="flex flex-col items-center justify-center flex-1 h-full py-1 gap-1"
              >
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-ksp-navy text-white shadow-md shadow-ksp-navy/20 scale-110' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}>
                  {React.cloneElement(item.icon, { size: 18, className: isActive ? 'text-ksp-gold' : '' })}
                </div>
                <span className={`text-[10px] font-semibold text-center leading-none ${isActive ? 'text-ksp-navy' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

    </div>
  );
};
