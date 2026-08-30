import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Users, FileText, BarChart3, MapPin, 
  Bell, History, Settings, Menu, X, ShieldAlert, Share2, Building, Brain, Bot, Repeat
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, role, logout } = useAuth();
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
    { label: 'Dashboard', path: '/admin-portal', icon: <LayoutDashboard size={18} /> },
    { label: 'Officers', path: '/admin-portal/officers', icon: <Users size={18} /> },
    { label: 'Stations', path: '/admin-portal/stations', icon: <Building size={18} /> },
    { label: 'FIRs & Cases', path: '/admin-portal/firs', icon: <FileText size={18} /> },
    { label: 'Analytics', path: '/admin-portal/analytics', icon: <BarChart3 size={18} /> },
    { label: 'GIS Maps', path: '/admin-portal/gis', icon: <MapPin size={18} /> },
    { label: 'Criminal Network', path: '/admin-portal/network', icon: <Share2 size={18} /> },
    { label: 'AI Anomaly Detection', path: '/admin-portal/anomaly-detection', icon: <Brain size={18} /> },
    { label: 'Repeated Offenders', path: '/admin-portal/repeated-offenders', icon: <Repeat size={18} /> },
    { label: 'AI Assistant', path: '/admin-portal/assistant', icon: <Bot size={18} /> },
    { label: 'Audit Logs', path: '/admin-portal/audit', icon: <History size={18} /> }
  ];

  const activeClass = "bg-ksp-gold text-ksp-navy font-bold shadow-md scale-[1.02]";
  const inactiveClass = "text-slate-300 hover:bg-white/5 hover:text-white";

  return (
    <div className="flex-grow flex flex-col md:flex-row min-h-full bg-slate-50 relative select-none">
      
      {/* Mobile Sidebar Header */}
      <div className="md:hidden w-full bg-ksp-navy text-white px-4 py-3 flex justify-between items-center border-b border-ksp-gold/20 shadow">
        <span className="font-extrabold text-sm tracking-wide text-ksp-gold">ADMIN CONSOLE</span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1 rounded bg-white/10 text-white">
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        w-full md:w-64 bg-ksp-navy text-white flex flex-col border-r border-ksp-gold/25 shadow-xl shrink-0 z-40 transition-all duration-300 md:sticky md:top-0 md:h-screen md:overflow-y-auto
        ${mobileMenuOpen ? 'block' : 'hidden md:flex'}
      `}>
        {/* Console title branding */}
        <div className="p-6 border-b border-white/5 hidden md:block select-none">
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
                onClick={() => setMobileMenuOpen(false)}
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
      <main className={`flex-grow flex flex-col max-w-full ${(location.pathname.includes('/network') || location.pathname.includes('/assistant')) ? 'p-0' : 'p-4 md:p-8'}`}>
        <div className={(location.pathname.includes('/network') || location.pathname.includes('/assistant')) ? 'flex-grow flex flex-col w-full h-full' : 'container mx-auto'}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
