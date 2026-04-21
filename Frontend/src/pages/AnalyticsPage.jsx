import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import Header from '../components/layout/Header.jsx';
import Sidebar from '../components/layout/Sidebar.jsx';
import { useDetectionStatus } from '../hooks/useDetectionStatus.js';
import { useLocalFires } from '../hooks/useLocalFires.js';
import { useSatFires } from '../hooks/useSatFires.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const CHART_DEFAULTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#a0aec0', padding: 12 } } },
};

function demoLocal(n) {
  return Array.from({ length: n }, () => ({
    lat: 20 + Math.random() * 10, lon: 75 + Math.random() * 10,
    confidence: 0.5 + Math.random() * 0.5,
    time: new Date(Date.now() - Math.random() * 86400000).toISOString(),
  }));
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { connected, data } = useDetectionStatus();
  const localFiresRaw = useLocalFires();
  const { fires: satFires } = useSatFires();

  const local = localFiresRaw.length > 0 ? localFiresRaw : demoLocal(20);
  const sat = satFires;

  const avgConf = local.length
    ? (local.reduce((s, f) => s + (f.confidence || 0), 0) / local.length * 100).toFixed(1)
    : 0;

  /* ── Chart data ── */
  const trendData = (() => {
    // Priority 1: Real-time high-resolution AI confidence from Backend history (Live Scrolling)
    if (connected && data?.history?.length > 0) {
      return {
        labels: data.history.map(h => h.time),
        datasets: [{
          label: 'Live AI Confidence %',
          data: data.history.map(h => h.confidence * 100),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.15)',
          tension: 0.25, // Fluid curves for telemetry
          fill: true,
          pointRadius: 0,
          borderWidth: 2
        }]
      };
    }

    // Priority 2: Fallback to historical pattern if backend is disconnected (Hourly Detections)
    const b = {};
    local.forEach(f => {
      if (f.time) {
        const h = new Date(f.time).getHours();
        b[h] = (b[h] || 0) + 1;
      }
    });

    // Sort chronologically
    const sortedHours = Object.keys(b).sort((x, y) => parseInt(x) - parseInt(y));

    return {
      labels: sortedHours.map(h => `${h}:00`),
      datasets: [{
        label: 'Confirmed AI Detections',
        data: sortedHours.map(h => b[h]),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.15)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };
  })();

  const confData = (() => {
    const lo = local.filter(f => f.confidence < 0.5).length;
    const md = local.filter(f => f.confidence >= 0.5 && f.confidence < 0.8).length;
    const hi = local.filter(f => f.confidence >= 0.8).length;
    return {
      labels: ['Low <50%', 'Medium 50-80%', 'High >80%'],
      datasets: [{
        data: [lo, md, hi],
        backgroundColor: ['#f59e0b', '#c27a3d', '#ef4444'],
        borderColor: '#18181b',
        borderWidth: 2
      }]
    };
  })();

  const hourlyData = (() => {
    const d = new Array(24).fill(0);
    local.forEach(f => { if (f.time) d[new Date(f.time).getHours()]++; });
    return {
      labels: Array.from({ length: 24 }, (_, i) => i + ':00'),
      datasets: [{
        label: 'Fires/hr',
        data: d,
        backgroundColor: 'rgba(194,122,61,0.55)',
        borderColor: '#c27a3d',
        borderWidth: 1
      }]
    };
  })();

  /* ── Regional Intelligence Helper ── */
  const getRegionName = (lat, lon) => {
    if (lat > 30 && lat < 50 && lon < -110) return "California Range, USA";
    if (lat > 50 && lon < -90) return "Alberta Forest, Canada";
    if (lat < 0 && lat > -20 && lon < -40) return "Amazon Basin, Brazil";
    if (lat > 10 && lat < 30 && lon > 60 && lon < 90) return "Central Highlands, India";
    if (lat < -10 && lon > 110) return "New South Wales, AU";
    if (lat > 50 && lon > 60) return "Siberian Taiga, Russia";
    if (lat > 35 && lat < 45 && lon > -10 && lon < 5) return "Iberian Peninsula, EU";
    if (lat < 5 && lat > -10 && lon > 10 && lon < 30) return "Congo Basin, Africa";
    return `${lat >= 0 ? 'N' : 'S'}-${lon >= 0 ? 'E' : 'W'} Quadrant`;
  };

  const clusterData = (() => {
    const r = {};
    sat.slice(0, 50).forEach(f => {
      const k = getRegionName(f.lat, f.lon);
      r[k] = (r[k] || 0) + 1.5;
    });
    local.forEach(f => {
      const k = getRegionName(f.lat, f.lon);
      r[k] = (r[k] || 0) + 3;
    });

    const sorted = Object.entries(r).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return {
      labels: sorted.map(([k]) => k),
      datasets: [{
        label: 'Threat Intensity',
        data: sorted.map(([, v]) => v.toFixed(1)),
        backgroundColor: sorted.map(([, v]) => v > 60 ? '#ef4444' : v > 20 ? '#c27a3d' : '#f59e0b'),
        borderColor: '#18181b',
        borderWidth: 1
      }]
    };
  })();

  const topLocs = (() => {
    const m = {};
    local.length > 0 ? local : demoLocal(10).forEach(f => {
      const name = getRegionName(f.lat, f.lon);
      if (!m[name]) m[name] = { name, count: 0, area: 0 };
      m[name].count += 1;
      m[name].area += (f.confidence || 0.5) * 5; // Proxy for local area
    });
    return Object.values(m).sort((a, b) => b.area - a.area).slice(0, 5);
  })();

  // Hybrid Severity Index: (Confidence * Intensity Factor)
  const baseIntensity = sat.length ? (sat.reduce((s, f) => s + (f.intensity || 300), 0) / sat.length) : 320;
  const severityScore = (avgConf > 10)
    ? Math.min(100, (parseFloat(avgConf) * 0.7) + (baseIntensity / 500 * 30))
    : (baseIntensity / 500 * 20); // Mostly satellite driven if no drone data

  const avgInt = severityScore.toFixed(1);

  const scaleOpts = {
    ticks: {
      color: '#71717a',
      callback: (value) => `${value}%`
    },
    grid: { color: 'rgba(255,255,255,0.05)' }
  };

  const exportCSV = () => {
    if (local.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = ["Detection Time", "Latitude", "Longitude", "Confidence %"];
    const rows = local.map(f => [
      f.time ? new Date(f.time).toLocaleString() : "Unknown",
      f.lat || 0,
      f.lon || 0,
      ((f.confidence || 0) * 100).toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Fire_Incident_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#09090b' }}>
      <Header connected={connected} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-auto p-8 animate-fade-in" style={{ background: '#09090b' }}>
          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-heading text-2xl font-semibold" style={{ color: '#c27a3d' }}>📊 Analytics Command</h2>
            <div className="flex gap-4">
              <button
                onClick={exportCSV}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: '#c27a3d', color: '#18181b' }}>
                📥 Export CSV Report
              </button>
              <button onClick={() => navigate('/')}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', color: '#ef4444' }}>
                ⬅ Return to Dashboard
              </button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-5 gap-5 mb-8">
            {[
              { label: 'Local Fires', value: local.length, color: '#c27a3d' },
              { label: 'Satellite Fires', value: sat.length, color: '#f59e0b' },
              { label: 'Avg Confidence', value: avgConf + '%', color: '#22c55e' },
              { label: 'Total Fires', value: local.length + sat.length, color: '#ef4444' },
              { label: 'System', value: local.length ? 'LIVE' : 'DEMO', color: '#8b5cf6' },
            ].map(s => (
              <div key={s.label} className="glass-card p-5">
                <div className="text-xs mb-2" style={{ color: '#71717a' }}>{s.label}</div>
                <div className="text-3xl font-bold font-heading" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Row 1: Trend + Confidence */}
          <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <ChartCard title={connected ? "🔴 Live Drone AI Array (Time vs Confidence)" : "📈 Session Detection Trend"} color={connected ? "#ef4444" : "#c27a3d"}>
              <Line
                data={trendData}
                options={{
                  ...CHART_DEFAULTS,
                  scales: {
                    x: { ...scaleOpts, ticks: { ...scaleOpts.ticks, autoSkip: true, maxTicksLimit: 15 } },
                    y: { ...scaleOpts, min: 0, max: 100 }
                  },
                  animation: connected ? false : CHART_DEFAULTS.animation,
                  elements: {
                    line: { tension: 0.25 },
                    point: { radius: connected ? 0 : 4, hitRadius: 10 }
                  }
                }}
              />
            </ChartCard>
            <ChartCard title="🎯 Confidence Distribution" color="#f59e0b">
              <Doughnut data={confData} options={CHART_DEFAULTS} />
            </ChartCard>
          </div>

          {/* Row 2: Hourly + Clusters */}
          <div className="grid grid-cols-2 gap-5 mb-5">
            <ChartCard title="⏰ Hourly Activity" color="#c27a3d" height={200}>
              <Bar data={hourlyData} options={{ ...CHART_DEFAULTS, plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } }, scales: { x: { ...scaleOpts, ticks: { ...scaleOpts.ticks, maxRotation: 0 } }, y: { ...scaleOpts, beginAtZero: true } } }} />
            </ChartCard>
            <ChartCard title="🔥 Top Fire Clusters" color="#ef4444" height={200}>
              <Bar data={clusterData} options={{ ...CHART_DEFAULTS, indexAxis: 'y', plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } }, scales: { x: scaleOpts, y: scaleOpts } }} />
            </ChartCard>
          </div>

          {/* Row 3: Recent + Locations + Intensity */}
          <div className="grid grid-cols-3 gap-5">
            {/* Recent detections */}
            <div className="glass-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#22c55e' }}>🔥 Recent Detections</p>
              <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
                {local.length === 0
                  ? <p className="text-center opacity-50 text-sm py-5">No detections yet</p>
                  : [...local].reverse().slice(0, 15).map((f, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#c27a3d' }}>Fire #{local.length - i}</div>
                        <div className="text-[11px]" style={{ color: '#71717a' }}>📍 {(f.lat || 0).toFixed(4)}, {(f.lon || 0).toFixed(4)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold" style={{ color: '#22c55e' }}>{((f.confidence || 0) * 100).toFixed(1)}%</div>
                        <div className="text-[11px]" style={{ color: '#71717a' }}>{new Date(f.time).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Top locations */}
            <div className="glass-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#8b5cf6' }}>📍 Top Locations (By Area)</p>
              {topLocs.length === 0
                ? <p className="text-center opacity-50 text-sm py-5">No data</p>
                : topLocs.map((d, i) => (
                  <div key={i} className="flex justify-between py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <span className="text-sm font-medium" style={{ color: '#c27a3d' }}>{i + 1}. {d.name}</span>
                    <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{d.area.toFixed(1)} km²</span>
                  </div>
                ))
              }
            </div>

            {/* Intensity metrics */}
            <div className="glass-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#f59e0b' }}>⚡ Intensity Metrics</p>
              <div className="flex flex-col gap-5">
                <Gauge label="Local Detection Confidence" value={avgConf} max={100} color="linear-gradient(90deg,#22c55e,#c27a3d)" displayVal={`${avgConf}%`} />
                <Gauge label="Hybrid Severity Index" value={avgInt} max={100} color="linear-gradient(90deg,#f59e0b,#ef4444)" displayVal={`${avgInt}/100`} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ChartCard({ title, color, height = 250, children }) {
  return (
    <div className="glass-card p-5">
      <p className="text-sm font-semibold mb-4" style={{ color }}>{title}</p>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function Gauge({ label, value, color, displayVal }) {
  return (
    <div>
      <div className="flex justify-between mb-2 text-sm">
        <span style={{ color: '#71717a' }}>{label}</span>
        <span className="font-semibold" style={{ color: '#22c55e' }}>{displayVal}</span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', height: 10 }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}
