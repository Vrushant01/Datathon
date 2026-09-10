import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { syncData } from '../data/mockDb';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Public Pages
import { Home } from './pages/PublicPortal/Home';
import { OfficerLogin } from './pages/PublicPortal/OfficerLogin';
import { AdminLogin } from './pages/PublicPortal/AdminLogin';
import { AnalyticsLogin } from './pages/PublicPortal/AnalyticsLogin';

// Analytics Pages
import { AnalyticsLayout } from './pages/Analytics/AnalyticsLayout';
import { AnalyticsDashboard } from './pages/Analytics/AnalyticsDashboard';
import { AnalyticsOfficers } from './pages/Analytics/AnalyticsOfficers';
import { AnalyticsGISMap } from './pages/Analytics/AnalyticsGISMap';
import { AnalyticsFIRs } from './pages/Analytics/AnalyticsFIRs';

// Admin Pages
import { AdminLayout } from './pages/Admin/AdminLayout';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { OfficerManagement } from './pages/Admin/OfficerManagement';
import { StationManagement } from './pages/Admin/StationManagement';
import { FIRManagement } from './pages/Admin/FIRManagement';
import { AdminAnalytics } from './pages/Admin/AdminAnalytics';
import { AdminGISMap } from './pages/Admin/AdminGISMap';
import { AuditLogs } from './pages/Admin/AuditLogs';
import { StationRisk } from './pages/Admin/StationRisk';
import { RepeatedOffenders } from './pages/Admin/RepeatedOffenders';
import { AIAssistant } from './pages/Admin/AIAssistant';
import { IntelligenceCenter } from './pages/Admin/IntelligenceCenter';

// Officer Pages
import { OfficerLayout } from './pages/Officer/OfficerLayout';
import { OfficerDashboard } from './pages/Officer/OfficerDashboard';
import { CaseDetail } from './pages/Officer/CaseDetail';

// Shared Pages
import { Notifications } from './pages/Notifications';
import { CriminalNetwork } from './pages/CriminalNetwork';

import './App.css';

const App: React.FC = () => {
  const [syncKey, setSyncKey] = React.useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    // Initial data sync (only if authenticated)
    const token = localStorage.getItem('token');
    if (token) {
      syncData().then(() => {
        setDataLoaded(true);
        setSyncKey(k => k + 1);
      });
    } else {
      setDataLoaded(true);
    }

    // Always clear the googtrans cookie on mount so the app starts in English.
    // This prevents a previous Kannada session from bleeding into a fresh login.
    const hostname = window.location.hostname;
    const cookieReset = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = cookieReset;
    document.cookie = cookieReset + ' domain=' + hostname + ';';
    document.cookie = cookieReset + ' domain=.' + hostname + ';';

    // Google Translate UI suppression — targeted + debounced so it never blocks React rendering
    function suppressAllGoogleTranslateUI() {
      const HIDE_SELECTORS = [
        '.goog-te-banner-frame',
        '.goog-tooltip',
        '.goog-te-balloon-frame',
        '.goog-te-spinner-pos',
        '.goog-te-spinner',
        '.VIpgJd-ZVi9od-aZ2wEe-wOHMyf',
        '#goog-gt-tt',
        'iframe.skiptranslate',
        'div.skiptranslate',
      ];

      let timer: ReturnType<typeof setTimeout> | null = null;
      const enforce = () => {
        // Debounce: coalesce rapid-fire mutations into a single run
        if (timer) return;
        timer = setTimeout(() => {
          timer = null;
          HIDE_SELECTORS.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
              (el as HTMLElement).style.setProperty('display', 'none', 'important');
              (el as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
              (el as HTMLElement).style.setProperty('height', '0', 'important');
              (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
            });
          });
          // Fix Google's body top-offset injection
          if (document.body.style.top && document.body.style.top !== '0px') {
            document.body.style.setProperty('top', '0px', 'important');
            document.body.style.setProperty('position', 'static', 'important');
          }
        }, 50);
      };

      enforce();

      // Only watch body's DIRECT children (Google injects banner/iframe there)
      // and body's own style attribute (for the top: Npx offset hack)
      // NOT subtree — avoids firing on every React DOM update
      const bodyObserver = new MutationObserver(enforce);
      bodyObserver.observe(document.body, {
        childList: true,          // catch Google injecting iframe/div into body
        attributes: true,         // catch Google setting body.style.top
        attributeFilter: ['style'],
        subtree: false,           // CRITICAL: do NOT watch all descendants
      });

      // Separately watch <html> class changes (translated-ltr / translated-rtl)
      const htmlObserver = new MutationObserver(enforce);
      htmlObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'style'],
        subtree: false,
      });
    }

    suppressAllGoogleTranslateUI();

    return () => {
      // Cleanup if necessary
    };
  }, []);

  return (
    <AuthProvider key={syncKey}>
      <Router>
        <div className="flex flex-col min-h-screen bg-slate-50">
          <Routes>
              {/* Public Portal Routes */}
              <Route path="/" element={
                <div className="flex-1 flex flex-col">
                  <Navbar />
                  <div className="flex-grow"><Home /></div>
                  <Footer />
                </div>
              } />
              <Route path="/login" element={
                <div className="flex-1 flex flex-col">
                  <Navbar />
                  <div className="flex-grow"><OfficerLogin /></div>
                  <Footer />
                </div>
              } />
              <Route path="/analytics-login" element={
                <div className="flex-1 flex flex-col">
                  <Navbar />
                  <div className="flex-grow"><AnalyticsLogin /></div>
                  <Footer />
                </div>
              } />
              <Route path="/admin" element={
                <div className="flex-1 flex flex-col">
                  <Navbar />
                  <div className="flex-grow"><AdminLogin /></div>
                  <Footer />
                </div>
              } />

              {/* Admin Portal Guarded Routes */}
              <Route path="/admin-portal" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="intelligence" element={<IntelligenceCenter />} />
                <Route path="officers" element={<OfficerManagement />} />
                <Route path="stations" element={<StationManagement />} />
                <Route path="firs" element={<FIRManagement />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="gis" element={<AdminGISMap />} />
                <Route path="network" element={<CriminalNetwork />} />
                <Route path="station-risk" element={<StationRisk />} />
                <Route path="repeated-offenders" element={<RepeatedOffenders />} />
                <Route path="assistant" element={<AIAssistant />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="audit" element={<AuditLogs />} />
              </Route>

              {/* Officer Portal Guarded Routes */}
              <Route path="/officer-portal" element={<OfficerLayout />}>
                <Route index element={<OfficerDashboard />} />
                <Route path="case/:id" element={<CaseDetail />} />
                <Route path="network" element={<CriminalNetwork />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>

              {/* Analytics Portal Guarded Routes */}
              <Route path="/analytics-portal" element={<AnalyticsLayout />}>
                <Route index element={<AnalyticsDashboard />} />
                <Route path="officers" element={<AnalyticsOfficers />} />
                <Route path="map" element={<AnalyticsGISMap />} />
                <Route path="firs" element={<AnalyticsFIRs />} />
                <Route path="network" element={<CriminalNetwork />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
