import { useState, useEffect } from 'react';
import { subscribeDb } from '../../data/mockDb';

export const useMockDb = () => {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeDb(() => {
      setVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);

  return version;
};
