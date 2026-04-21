import { useState, useEffect, useRef, useCallback } from 'react';
import { DASHBOARD_STATS_API, DASHBOARD_STATS_INTERVAL } from '../constants/api.js';

const DEFAULT_STATS = {
  activeFireRegions: 0,
  hotspotRegions: 0,
  avgConfidence: 0,
  riskLevel: 'LOW',
  emergencyMode: false,
};

export function useDashboardStats() {
  const [stats, setStats]           = useState(DEFAULT_STATS);
  const [connected, setConnected]   = useState(false);
  const mountedRef                  = useRef(true);

  const fetchStats = useCallback(async () => {
    try {
      const res  = await fetch(DASHBOARD_STATS_API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (mountedRef.current) {
        setConnected(true);
        setStats(json);
      }
    } catch {
      if (mountedRef.current) setConnected(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchStats();
    const id = setInterval(fetchStats, DASHBOARD_STATS_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchStats]);

  return { stats, connected };
}
