import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FileText, Bell, LayoutDashboard, Menu, X, ShieldAlert, Share2 
} from 'lucide-react';

export const OfficerLayout: React.FC = () => {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Security route guard check
  if (role !== 'Officer') {
    return (
      <div className="flex-grow flex items-center justify-center p-8 bg-slate-100 min-h-screen select-none">
        <div className="bg-white p-8 rounded-xl border border-red-200 shadow-lg text-center max-w-md">
          <ShieldAlert className="text-red-500 mx-auto mb-4" size={48} />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Access Denied</h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            This portal is restricted to active Investigating Officers (IO) and Station House Officers (SHO) of the Karnataka State Police.
          </p>
          <button 
            onClick={() => { logout(); navigate('/login'); }}
            className="bg-ksp-navy text-white px-5 py-2.5 rounded-lg text-xs font-bold transition hover:bg-ksp-navy-light"
          >
            Log in as Officer
          </button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { label: 'My Cases', path: '/officer-portal', icon: <LayoutDashboard size={18} /> },
    { label: 'Criminal Network', path: '/officer-portal/network', icon: <Share2 size={18} /> }
  ];

  const activeClass = "bg-ksp-gold text-ksp-navy font-bold shadow-md scale-[1.02]";
  const inactiveClass = "text-slate-300 hover:bg-white/5 hover:text-white";

  const currentPageLabel = menuItems.find(i => location.pathname === i.path)?.label || 'Console';

  return (
    <div className="flex-grow flex flex-col xl:flex-row min-h-full bg-slate-50 relative select-none">
      
      {/* Tablet/Mobile Header - App Style */}
      <div className="xl:hidden w-full bg-ksp-navy text-white px-4 py-3 flex items-center justify-between shadow sticky top-0 z-40 border-b border-ksp-gold/20">
        <div className="flex flex-col">
          <span className="font-extrabold text-[10px] uppercase tracking-wide text-ksp-gold">KSP Console</span>
          <span className="font-semibold text-sm">{currentPageLabel}</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-ksp-gold/15 text-ksp-gold border border-ksp-gold/30 flex items-center justify-center font-bold text-xs">
          {user?.firstName?.charAt(0)}
        </div>
      </div>

      {/* Desktop Sidebar Navigation (Hidden on < xl) */}
      <aside className={`
        hidden xl:flex w-64 bg-ksp-navy text-white flex-col border-r border-ksp-gold/25 shadow-xl shrink-0 z-40 transition-all duration-300 sticky top-0 h-screen overflow-y-auto
      `}>
        {/* Officer summary info */}
        <div className="p-6 border-b border-white/5 select-none text-center bg-ksp-navy-dark/40">
          <div className="w-12 h-12 rounded-full bg-ksp-gold/15 text-ksp-gold border border-ksp-gold/30 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
            {user?.firstName?.charAt(0)}
          </div>
          <span className="text-xs uppercase text-ksp-gold font-bold tracking-widest block mb-0.5">{user?.firstName}</span>
          <span className="text-[10px] text-slate-300 font-bold block">{user?.kgid}</span>
          <span className="text-[9px] text-slate-400 block mt-1.5 uppercase font-medium">{user?.stationName}</span>
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
        <div className="p-4 border-t border-white/5 text-[9px] text-slate-400 select-none text-center italic">
          "ಸದಾ ತತ್ಪರ" (Always Alert)
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-grow flex flex-col max-w-full ${
        location.pathname.includes('/network') 
          ? 'p-0 pb-0' 
          : 'px-4 pt-4 pb-24 xl:p-8'
      }`}>
        <div className={location.pathname.includes('/network') ? 'flex-grow flex flex-col w-full' : 'container mx-auto'}>
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation Bar (Hidden on >= xl) */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] z-50 px-2 pb-[env(safe-area-inset-bottom)]">
        <nav className="flex items-center justify-around h-16">
          {menuItems.map(item => {
            const isActive = location.pathname === item.path;
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
                <span className={`text-[10px] font-semibold ${isActive ? 'text-ksp-navy' : 'text-slate-400'}`}>
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
