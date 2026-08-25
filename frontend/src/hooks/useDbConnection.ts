import { useState, useEffect } from 'react';
import { dbConnectionStatus, dbDataLoaded, subscribeToDbStatus } from '../utils/mockDb';

export const useDbConnection = () => {
  const [state, setState] = useState({
    status: dbConnectionStatus,
    dataLoaded: dbDataLoaded
  });

  useEffect(() => {
    setState({
      status: dbConnectionStatus,
      dataLoaded: dbDataLoaded
    });
    
    const unsubscribe = subscribeToDbStatus((newStatus) => {
      // Because dbDataLoaded is exported and updated before subscribeToDbStatus is called in setDbStatus,
      // it is safe to read its fresh value here.
      setState({
        status: newStatus,
        dataLoaded: dbDataLoaded
      });
    });
    
    return () => unsubscribe();
  }, []);

  return state;
};
