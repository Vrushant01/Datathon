import { useState, useEffect } from 'react';
import { 
  dbConnectionStatus, 
  dbDataLoaded, 
  subscribeToDbStatus,
  getSyncReport,
  subscribeToSyncReport,
  retrySync,
  SyncReport
} from '../../data/mockDb';

export const useDbConnection = () => {
  const [state, setState] = useState({
    status: dbConnectionStatus,
    dataLoaded: dbDataLoaded
  });
  const [syncReport, setSyncReport] = useState<SyncReport>(getSyncReport());

  useEffect(() => {
    setState({
      status: dbConnectionStatus,
      dataLoaded: dbDataLoaded
    });
    setSyncReport(getSyncReport());
    
    const unsubscribeStatus = subscribeToDbStatus((newStatus) => {
      setState({
        status: newStatus,
        dataLoaded: dbDataLoaded
      });
    });

    const unsubscribeSync = subscribeToSyncReport((report) => {
      setSyncReport(report);
    });
    
    return () => {
      unsubscribeStatus();
      unsubscribeSync();
    };
  }, []);

  return {
    ...state,
    syncReport,
    retrySync
  };
};
