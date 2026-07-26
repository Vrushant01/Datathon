import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, LogOut, Menu, X, BarChart3, Users, MapPin, FileText, Network, Brain
} from 'lucide-react';

export const AnalyticsLayout: React.FC = () => {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Security route guard check
  if (role !== 'Analytics') {
    return (
      <div className="flex-grow flex items-center justify-center bg-slate-100 flex-col gap-4">
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
    { label: 'Network Analysis', path: '/analytics-portal/network', icon: <Network size={18} /> },
  ];

  const activeClass = "bg-ksp-blue-light/10 text-white font-bold shadow-md scale-[1.02] border-l-4 border-ksp-gold";
  const inactiveClass = "text-slate-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent";

  return (
    <div className="flex-grow flex flex-col md:flex-row min-h-full bg-slate-50 relative select-none">
      
      {/* Mobile Header Menu Toggle */}
      <div className="md:hidden bg-ksp-navy text-white p-4 flex justify-between items-center z-20 shadow-md">
        <div className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <BarChart3 size={18} className="text-ksp-gold" /> Analytics Portal
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 transition-transform duration-300 ease-in-out
        w-64 bg-ksp-navy text-white flex flex-col fixed md:relative z-10 h-[calc(100vh-64px)] overflow-y-auto border-r border-slate-700 shadow-2xl
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
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-r-lg transition-all duration-200 text-sm ${
                  isActive ? activeClass : inactiveClass
                }`}
              >
                {item.icon}
                {item.label}
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
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col w-full md:w-[calc(100%-256px)] overflow-y-auto bg-slate-50 relative h-[calc(100vh-64px)]">
        <main className="flex-grow p-4 md:p-8">
          <Outlet />
        </main>
      </div>

    </div>
  );
};
