import { useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useLocalFires } from '../../hooks/useLocalFires';
import { useDetectionStatus } from '../../hooks/useDetectionStatus';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function AnalyticsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const local = useLocalFires();
  const { connected, data } = useDetectionStatus();

  /* ── 1. Fire Trend Data (Now High Resolution) ── */
  const trendData = (() => {
    // If backend is connected, use real-time history de-queued every second
    if (connected && data?.history?.length > 0) {
      return {
        labels: data.history.map(h => h.time),
        datasets: [{
          label: 'Live Confidence',
          data: data.history.map(h => h.confidence * 10), // Scale to 0-10 for small chart height
          borderColor: '#ff3366',
          backgroundColor: 'rgba(255, 51, 102, 0.15)',
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointRadius: 0,
        }]
      };
    }

    // Fallback: Static 24h mockup if backend is offline
    return {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'],
      datasets: [{
        data: [3, 2, 5, 8, 6, 9, 9],
        borderColor: '#ff3366',
        backgroundColor: 'rgba(255, 51, 102, 0.15)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
      }]
    };
  })();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: connected ? false : { duration: 1000 },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#71717a', font: { size: 8, family: 'monospace' }, maxTicksLimit: 7 } },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: {
          display: true,
          color: '#71717a',
          font: { size: 7, family: 'monospace' },
          callback: (value) => (value <= 10 && value % 5 === 0) ? (value * 10) + '%' : ''
        },
        min: 0,
        max: 10
      }
    }
  };

  /* ── 2. Regional Intelligence Helper ── */
  const getRegionName = (lat, lon) => {
    // Broad reverse-geocoding lookup for hackathon centers
    if (lat > 30 && lat < 50 && lon < -110) return "California Range, USA";
    if (lat > 50 && lon < -90) return "Alberta Forest, Canada";
    if (lat < 0 && lat > -20 && lon < -40) return "Amazon Basin, Brazil";
    if (lat > 10 && lat < 30 && lon > 60 && lon < 90) return "Central Highlands, India";
    if (lat < -10 && lon > 110) return "New South Wales, AU";
    if (lat > 50 && lon > 60) return "Siberian Taiga, Russia";
    if (lat > 35 && lat < 45 && lon > -10 && lon < 5) return "Iberian Peninsula, EU";
    if (lat < 5 && lat > -10 && lon > 10 && lon < 30) return "Congo Basin, Africa";

    // Generic fallback based on hemisphere
    const ns = lat >= 0 ? 'North' : 'South';
    const ew = lon >= 0 ? 'East' : 'West';
    return `${ns}-${ew} Quadrant`;
  };

  /* ── 3. Top Active Hotspot Clusters (Regional Fusion) ── */
  const topClusters = (() => {
    const counts = {};

    // Aggregate Satellite Data (NASA)
    const satFires = data?.fire_detected ? [] : local; // placeholder if needed
    // Using simple approach: combine all known fire sources
    const allSources = [...local];
    if (window.firmsDataGlobal) allSources.push(...window.firmsDataGlobal);

    allSources.forEach(f => {
      const name = getRegionName(f.lat, f.lon);
      if (!counts[name]) counts[name] = { name, count: 0, area: 0, lat: f.lat, lon: f.lon };
      counts[name].count += 1;
      counts[name].area += (f.intensity || 400) / 100; // Simulated sq km proxy
    });

    return Object.values(counts)
      .sort((a, b) => b.area - a.area)
      .slice(0, 5);
  })();

  const handleRegionClick = (lat, lon) => {
    if (window.firmsMapGlobal) {
      // Fly to region at 40km altitude (zoom ~11)
      window.firmsMapGlobal.flyTo([lat, lon], 11, { animate: true, duration: 2 });
    }
  };

  /* ── 4. Confidence Distribution (Dynamic) ── */
  const dist = (() => {
    if (!connected || local.length === 0) {
      return [
        { label: 'High >80%', val: 4, color: '#ef4444' },
        { label: 'Mid 60-80%', val: 3, color: '#f59e0b' },
        { label: 'Low <60%', val: 2, color: '#c27a3d' },
        { label: 'Resting', val: 1, color: '#71717a' }
      ];
    }
    const hi = local.filter(f => f.confidence >= 0.8).length;
    const md = local.filter(f => f.confidence >= 0.5 && f.confidence < 0.8).length;
    const lo = local.filter(f => f.confidence < 0.5).length;
    return [
      { label: 'High Alert', val: hi, color: '#ef4444' },
      { label: 'Moderate', val: md, color: '#f59e0b' },
      { label: 'Detected', val: lo, color: '#c27a3d' },
      { label: 'Active', val: 1, color: '#71717a' }
    ];
  })();

  return (
    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-40 pointer-events-auto ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-40px)]'}`}>

      <div className="flex flex-col w-[720px]">
        {/* Toggle Tab */}
        <div className="flex">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-[#18181b]/95 border border-b-0 border-[#c27a3d]/20 rounded-t-lg text-white hover:bg-[#27272a] transition-colors shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
            <span className="text-[#c27a3d]">|ıl</span>
            <span className="font-mono-num text-[11px] font-bold tracking-[0.1em] uppercase">Analytics</span>
            <span className={`text-[10px] text-[#71717a] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
        </div>

        {/* Panel Content */}
        <div className="glass-panel flex p-6 gap-6 h-[220px] rounded-tl-none border-[#c27a3d]/20 shadow-[0_15px_50px_rgba(0,0,0,0.8)]">

          {/* Section 1: Trend */}
          <div className="flex-1 flex flex-col min-w-0">
            <h3 className="font-mono-num text-[10px] text-[#71717a] tracking-widest uppercase mb-4">Fire Trend (Live)</h3>
            <div className="flex-1 relative">
              <Line data={trendData} options={chartOptions} />
            </div>
          </div>

          {/* Section 2: Top Clusters */}
          <div className="w-[200px] flex flex-col shrink-0">
            <h3 className="font-mono-num text-[10px] text-[#71717a] tracking-widest uppercase mb-4">Top Fire Regions</h3>
            <ul className="flex flex-col gap-3">
              {topClusters.length > 0 ? topClusters.map((c, i) => (
                <li
                  key={i}
                  onClick={() => handleRegionClick(c.lat, c.lon)}
                  className="flex items-center justify-between gap-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors group">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-1 h-1 rounded-full bg-[#ef4444] shrink-0 group-hover:scale-150 transition-transform"></span>
                    <span className="text-[10px] font-bold text-[#e2e8f0] tracking-tight truncate">{c.name}</span>
                  </div>
                  <span className="font-mono-num text-[9px] text-[#c27a3d] font-bold whitespace-nowrap">{c.area.toFixed(1)} km²</span>
                </li>
              )) : (
                <li className="text-[10px] text-[#71717a] text-center py-4">Scanning World Data...</li>
              )}
            </ul>
          </div>

          {/* Section 3: Confidence Dist */}
          <div className="w-[200px] flex flex-col shrink-0">
            <h3 className="font-mono-num text-[10px] text-[#71717a] tracking-widest uppercase mb-4">Confidence Dist.</h3>
            <div className="flex flex-col gap-3 flex-1 justify-center relative -top-2">
              {dist.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="font-mono-num text-[10px] font-bold text-white w-2">{4 - i}</span>
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="font-mono-num text-[9px] text-[#71717a]">{d.label}</span>
                    <div className="h-1 bg-[#27272a] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min((d.val / 5) * 100, 100)}%`, backgroundColor: d.color }}></div>
                    </div>
                  </div>
                  <span className="font-mono-num text-[10px] text-white w-2 text-right">{d.val}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
