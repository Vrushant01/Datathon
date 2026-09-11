import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'kn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Top banner & branding
    'banner.gov': 'GOVERNMENT OF KARNATAKA • ಕರ್ನಾಟಕ ಸರ್ಕಾರ',
    'banner.portal_name': 'OFFICIAL GIS & CRIME ANALYTICS PORTAL',
    'banner.dept_name': 'KARNATAKA STATE POLICE',
    'banner.dept_sub': 'ಕಾನೂನು ಮತ್ತು ಸುವ್ಯವಸ್ಥೆ • Law & Order Department',
    'banner.db_live': 'Live DB',
    'banner.db_offline': 'DB Offline',
    'banner.db_connecting': 'Connecting...',
    'banner.db_offline_mode': 'Offline Mode',
    'banner.logout': 'Logout',
    'banner.admin': 'Administrator',
    'banner.officer': 'Officer',

    // Sidebar & Navigation
    'sidebar.state_admin': 'State Administration',
    'sidebar.console_title': 'KSP System Console',
    'sidebar.security_clearance': 'Security Clearance',
    'sidebar.level_1_admin': 'Level 1 Administrator',
    'sidebar.more_modules': 'More Modules',
    'nav.dashboard': 'Dashboard',
    'nav.stations': 'Stations',
    'nav.officers': 'Officers',
    'nav.firs': 'FIRs & Cases',
    'nav.analytics': 'Analytics',
    'nav.gis': 'GIS Maps',
    'nav.network': 'Criminal Network',
    'nav.intelligence': 'Intell Center',
    'nav.station_risk': 'Station Risk',
    'nav.repeated_offenders': 'Repeated Offenders',
    'nav.assistant': 'AI Assistant',
    'nav.audit': 'Audit Logs',
    'nav.more': 'More',

    // Dashboard
    'dashboard.title': 'KSP Operations Control',
    'dashboard.subtitle': 'Real-time Command Centre Dashboard',
    'dashboard.live_connected': 'Live Feed Connected',
    'dashboard.connecting': 'Connecting...',
    'dashboard.offline': 'Offline',
    'dashboard.retry': 'Retry Connection',
    'dashboard.db_offline_title': 'Database Connection Failed',
    'dashboard.db_offline_desc': 'The dashboard cannot fetch live statistics because the CloudScale database is unreachable. Please check your local backend server and ensure it is running on the correct port.',

    // Time Filters
    'time.24h': 'Last 24 Hours',
    'time.7d': 'Last 7 Days',
    'time.30d': 'Last 30 Days',
    'time.all': 'All Time',

    // Dashboard KPIs
    'dashboard.total_firs': 'Total FIRs',
    'dashboard.pending_cases': 'Pending Cases',
    'dashboard.solved_cases': 'Solved / Closed',
    'dashboard.active_officers': 'Active Officers',
    'dashboard.police_stations': 'Police Stations',

    // Dashboard Charts
    'charts.historical_trend': 'Historical Registration Trend',
    'charts.category_distribution': 'Crime Category Distribution',
    'charts.cases': 'Cases',
    'charts.no_category_data': 'No category data',

    // Station Management
    'stations.title': 'Police Stations Directory',
    'stations.subtitle': 'Manage jurisdictional units, geo-coordinates and active station commands',
    'stations.search_placeholder': 'Search station name or code...',
    'stations.all_districts': 'All Districts',
    'stations.add_station': 'Add New Station',
    'stations.total_listed': 'Stations Listed',
    'stations.active_stations': 'Active Units',

    // Officer Management
    'officers.title': 'Officer Roster & Hierarchy',
    'officers.subtitle': 'Manage personnel profiles, ranks, designations, and station postings',
    'officers.search_placeholder': 'Search by Name, KGID, Rank...',
    'officers.all_districts': 'All Districts',
    'officers.all_stations': 'All Stations',
    'officers.all_statuses': 'All Statuses',
    'officers.add_officer': 'Register New Officer',
    'officers.total_personnel': 'Total Personnel',
    'officers.active_roster': 'Active Duty',

    // FIR Management
    'firs.title': 'FIR & Investigation Registry',
    'firs.subtitle': 'Comprehensive record of First Information Reports across Karnataka stations',
    'firs.search_placeholder': 'Search FIR No, Complainant, Accused...',
    'firs.all_categories': 'All Crime Heads',
    'firs.total_cases': 'Total FIRs',
    'firs.investigating': 'Under Investigation',
    'firs.solved': 'Solved / Disposed',

    // Analytics
    'analytics.title': 'Crime Intelligence & Predictive Analytics',
    'analytics.subtitle': 'District-level trends, resolution efficacy and temporal crime patterns',
    'analytics.total_recorded': 'Total Crimes Recorded',
    'analytics.solve_rate': 'Detection / Solve Rate',
    'analytics.under_inv': 'Under Investigation',

    // Station Risk
    'risk.title': 'AI Station Vulnerability Index',
    'risk.subtitle': 'Real-time Threat & Resource Stress Modeling',
    'risk.high_risk': 'High Risk',
    'risk.medium_risk': 'Moderate Risk',
    'risk.low_risk': 'Low Risk',
    'risk.refresh_model': 'Recalculate AI Model',

    // Common
    'common.loading': 'Loading...',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.refresh': 'Refresh',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
  },
  kn: {
    // Top banner & branding
    'banner.gov': 'ಕರ್ನಾಟಕ ಸರ್ಕಾರ • GOVERNMENT OF KARNATAKA',
    'banner.portal_name': 'ಅಧಿಕೃತ ಜಿಐಎಸ್ ಮತ್ತು ಅಪರಾಧ ವಿಶ್ಲೇಷಣಾ ಪೋರ್ಟಲ್',
    'banner.dept_name': 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್',
    'banner.dept_sub': 'ಕಾನೂನು ಮತ್ತು ಸುವ್ಯವಸ್ಥೆ ಇಲಾಖೆ',
    'banner.db_live': 'ಲೈವ್ ಡೇಟಾಬೇಸ್',
    'banner.db_offline': 'ಆಫ್‌ಲೈನ್ ಡೇಟಾಬೇಸ್',
    'banner.db_connecting': 'ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ...',
    'banner.db_offline_mode': 'ಆಫ್‌ಲೈನ್ ಮೋಡ್',
    'banner.logout': 'ಲಾಗ್ ಔಟ್',
    'banner.admin': 'ಆಡಳಿತಾಧಿಕಾರಿ',
    'banner.officer': 'ಅಧಿಕಾರಿ',

    // Sidebar & Navigation
    'sidebar.state_admin': 'ರಾಜ್ಯ ಆಡಳಿತ',
    'sidebar.console_title': 'ಕೆಎಸ್‌ಪಿ ಸಿಸ್ಟಮ್ ಕನ್ಸೋಲ್',
    'sidebar.security_clearance': 'ಭದ್ರತಾ ಅನುಮತಿ',
    'sidebar.level_1_admin': 'ಹಂತ ೧ ಆಡಳಿತಾಧಿಕಾರಿ',
    'sidebar.more_modules': 'ಹೆಚ್ಚಿನ ಮಾಡ್ಯೂಲ್‌ಗಳು',
    'nav.dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'nav.stations': 'ಠಾಣೆಗಳು',
    'nav.officers': 'ಅಧಿಕಾರಿಗಳು',
    'nav.firs': 'FIRಗಳು ಮತ್ತು ಪ್ರಕರಣಗಳು',
    'nav.analytics': 'ವಿಶ್ಲೇಷಣೆ',
    'nav.gis': 'GIS ನಕ್ಷೆಗಳು',
    'nav.network': 'ಕ್ರಿಮಿನಲ್ ನೆಟ್‌ವರ್ಕ್',
    'nav.intelligence': 'ಇಂಟೆಲ್ ಕೇಂದ್ರ',
    'nav.station_risk': 'ಠಾಣೆ ಅಪಾಯ',
    'nav.repeated_offenders': 'ಮರು ಅಪರಾಧಿಗಳು',
    'nav.assistant': 'AI ಸಹಾಯಕ',
    'nav.audit': 'ಆಡಿಟ್ ದಾಖಲೆಗಳು',
    'nav.more': 'ಇನ್ನಷ್ಟು',

    // Dashboard
    'dashboard.title': 'ಕೆಎಸ್‌ಪಿ ಕಾರ್ಯಾಚರಣೆ ನಿಯಂತ್ರಣ',
    'dashboard.subtitle': 'ನೈಜ-ಸಮಯದ ಕಮಾಂಡ್ ಸೆಂಟರ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'dashboard.live_connected': 'ಲೈವ್ ಫೀಡ್ ಸಂಪರ್ಕಗೊಂಡಿದೆ',
    'dashboard.connecting': 'ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ...',
    'dashboard.offline': 'ಆಫ್‌ಲೈನ್',
    'dashboard.retry': 'ಮರುಪ್ರಯತ್ನಿಸಿ',
    'dashboard.db_offline_title': 'ಡೇಟಾಬೇಸ್ ಸಂಪರ್ಕ ವಿಫಲವಾಗಿದೆ',
    'dashboard.db_offline_desc': 'ಕ್ಲೌಡ್‌ಸ್ಕೇಲ್ ಡೇಟಾಬೇಸ್ ಸಂಪರ್ಕವಿಲ್ಲದ ಕಾರಣ ಲೈವ್ ಅಂಕಿಅಂಶಗಳನ್ನು ಪಡೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ.',

    // Time Filters
    'time.24h': 'ಕಳೆದ 24 ಗಂಟೆಗಳು',
    'time.7d': 'ಕಳೆದ 7 ದಿನಗಳು',
    'time.30d': 'ಕಳೆದ 30 ದಿನಗಳು',
    'time.all': 'ಸಾರ್ವಕಾಲಿಕ',

    // Dashboard KPIs (Pure Kannada labels - Numbers stay unchanged!)
    'dashboard.total_firs': 'ಒಟ್ಟು FIRಗಳು',
    'dashboard.pending_cases': 'ಬಾಕಿ ಪ್ರಕರಣಗಳು',
    'dashboard.solved_cases': 'ಪರಿಹರಿಸಲಾಗಿದೆ',
    'dashboard.active_officers': 'ಸಕ್ರಿಯ ಅಧಿಕಾರಿಗಳು',
    'dashboard.police_stations': 'ಪೊಲೀಸ್ ಠಾಣೆಗಳು',

    // Dashboard Charts
    'charts.historical_trend': 'ಐತಿಹಾಸಿಕ ನೋಂದಣಿ ಪ್ರವೃತ್ತಿ',
    'charts.category_distribution': 'ಅಪರಾಧ ವರ್ಗದ ವಿತರಣೆ',
    'charts.cases': 'ಪ್ರಕರಣಗಳು',
    'charts.no_category_data': 'ವರ್ಗ ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ',

    // Station Management
    'stations.title': 'ಪೊಲೀಸ್ ಠಾಣೆಗಳ ಡೈರೆಕ್ಟರಿ',
    'stations.subtitle': 'ವ್ಯಾಪ್ತಿಯ ಘಟಕಗಳು, ಜಿಯೋ-ಸ್ಥಳಗಳು ಮತ್ತು ಸಕ್ರಿಯ ಠಾಣೆ ಕಮಾಂಡ್‌ಗಳು',
    'stations.search_placeholder': 'ಠಾಣೆಯ ಹೆಸರು ಅಥವಾ ಕೋಡ್ ಹುಡುಕಿ...',
    'stations.all_districts': 'ಎಲ್ಲಾ ಜಿಲ್ಲೆಗಳು',
    'stations.add_station': 'ಹೊಸ ಠಾಣೆ ಸೇರಿಸಿ',
    'stations.total_listed': 'ಪಟ್ಟಿಯಲ್ಲಿರುವ ಠಾಣೆಗಳು',
    'stations.active_stations': 'ಸಕ್ರಿಯ ಘಟಕಗಳು',

    // Officer Management
    'officers.title': 'ಅಧಿಕಾರಿಗಳ ರೋಸ್ಟರ್ ಮತ್ತು ಶ್ರೇಣಿ',
    'officers.subtitle': 'ಸಿಬ್ಬಂದಿ ಪ್ರೊಫೈಲ್‌ಗಳು, ಹುದ್ದೆಗಳು ಮತ್ತು ಠಾಣೆ ನಿಯೋಜನೆಗಳು',
    'officers.search_placeholder': 'ಹೆಸರು, ಕೆಜಿಐಡಿ ಮೂಲಕ ಹುಡುಕಿ...',
    'officers.all_districts': 'ಎಲ್ಲಾ ಜಿಲ್ಲೆಗಳು',
    'officers.all_stations': 'ಎಲ್ಲಾ ಠಾಣೆಗಳು',
    'officers.all_statuses': 'ಎಲ್ಲಾ ಸ್ಥಿತಿಗಳು',
    'officers.add_officer': 'ಹೊಸ ಅಧಿಕಾರಿಯನ್ನು ನೋಂದಾಯಿಸಿ',
    'officers.total_personnel': 'ಒಟ್ಟು ಸಿಬ್ಬಂದಿ',
    'officers.active_roster': 'ಸಕ್ರಿಯ ಕರ್ತವ್ಯ',

    // FIR Management
    'firs.title': 'FIR ಮತ್ತು ತನಿಖಾ ನೋಂದಣಿ',
    'firs.subtitle': 'ಕರ್ನಾಟಕ ಠಾಣೆಗಳ ಪ್ರಥಮ ವರ್ತಮಾನ ವರದಿಗಳ ಸಮಗ್ರ ದಾಖಲೆ',
    'firs.search_placeholder': 'FIR ಸಂಖ್ಯೆ, ದೂರುದಾರ, ಆರೋಪಿ ಹುಡುಕಿ...',
    'firs.all_categories': 'ಎಲ್ಲಾ ಅಪರಾಧ ವಿಭಾಗಗಳು',
    'firs.total_cases': 'ಒಟ್ಟು FIRಗಳು',
    'firs.investigating': 'ತನಿಖೆಯಲ್ಲಿದೆ',
    'firs.solved': 'ಪರಿಹರಿಸಲಾಗಿದೆ',

    // Analytics
    'analytics.title': 'ಅಪರಾಧ ಗುಪ್ತಚರ ಮತ್ತು ಮುನ್ಸೂಚಕ ವಿಶ್ಲೇಷಣೆ',
    'analytics.subtitle': 'ಜಿಲ್ಲಾವಾರು ಪ್ರವೃತ್ತಿಗಳು ಮತ್ತು ಪ್ರಕರಣ ಪರಿಹಾರ ದರ',
    'analytics.total_recorded': 'ದಾಖಲಾದ ಒಟ್ಟು ಅಪರಾಧಗಳು',
    'analytics.solve_rate': 'ಪತ್ತೆ / ಪರಿಹಾರ ದರ',
    'analytics.under_inv': 'ತನಿಖೆಯಲ್ಲಿದೆ',

    // Station Risk
    'risk.title': 'AI ಠಾಣೆ ಸೂಕ್ಷ್ಮತೆ ಸೂಚ್ಯಂಕ',
    'risk.subtitle': 'ನೈಜ-ಸಮಯದ ಬೆದರಿಕೆ ಮತ್ತು ಸಂಪನ್ಮೂಲ ಮಾದರಿ',
    'risk.high_risk': 'ಹೆಚ್ಚಿನ ಅಪಾಯ',
    'risk.medium_risk': 'ಮಧ್ಯಮ ಅಪಾಯ',
    'risk.low_risk': 'ಕಡಿಮೆ ಅಪಾಯ',
    'risk.refresh_model': 'AI ಮಾದರಿಯನ್ನು ಮರುಲೆಕ್ಕಾಚಾರ ಮಾಡಿ',

    // Common
    'common.loading': 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    'common.active': 'ಸಕ್ರಿಯ',
    'common.inactive': 'ನಿಷ್ಕ್ರಿಯ',
    'common.refresh': 'ತಾಜಾಗೊಳಿಸಿ',
    'common.close': 'ಮುಚ್ಚಿ',
    'common.search': 'ಹುಡುಕಿ',
    'common.save': 'ಉಳಿಸಿ',
    'common.cancel': 'ರದ್ದುಮಾಡಿ',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('ksp_language');
    return saved === 'kn' ? 'kn' : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('ksp_language', lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, defaultText?: string): string => {
    const currentDict = translations[language];
    if (currentDict && currentDict[key]) {
      return currentDict[key];
    }
    // Fallback to English
    if (translations.en[key]) {
      return translations.en[key];
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
