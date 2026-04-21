import { useState, useEffect } from 'react';
import { LOCAL_FIRES_API, LOCAL_FIRES_INTERVAL } from '../constants/api.js';

export function useLocalFires() {
  const [fires, setFires] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(LOCAL_FIRES_API);
        const data = await res.json();
        setFires(Array.isArray(data) ? data : []);
      } catch {
        // backend offline — retain last known list
      }
    };
    load();
    const id = setInterval(load, LOCAL_FIRES_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return fires;
}
