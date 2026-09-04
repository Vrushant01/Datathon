import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { syncData } from './utils/mockDb';
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
    // Initial data sync
    syncData().then(() => {
      setDataLoaded(true);
      setSyncKey(k => k + 1);
    });

    return () => {
      // Cleanup if necessary
    };
  }, []);

  return (
    <AuthProvider key={syncKey}>
      <Router>
        <div className="flex flex-col min-h-screen bg-slate-50">
          <Navbar />
          
          <div className="flex-grow flex flex-col">
            <Routes>
              {/* Public Portal Routes */}
              <Route path="/" element={
                <div className="flex-grow flex flex-col">
                  <div className="flex-grow"><Home /></div>
                  <Footer />
                </div>
              } />
              <Route path="/login" element={
                <div className="flex-grow flex flex-col">
                  <div className="flex-grow"><OfficerLogin /></div>
                  <Footer />
                </div>
              } />
              <Route path="/analytics-login" element={
                <div className="flex-grow flex flex-col">
                  <div className="flex-grow"><AnalyticsLogin /></div>
                  <Footer />
                </div>
              } />
              <Route path="/admin" element={
                <div className="flex-grow flex flex-col">
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
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
