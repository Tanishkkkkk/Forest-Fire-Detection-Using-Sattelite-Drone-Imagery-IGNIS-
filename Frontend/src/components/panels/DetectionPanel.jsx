import { useClock } from '../../hooks/useClock.js';

export default function DetectionPanel({ data, aiPrediction }) {
  const { date } = useClock();

  const fireDetected = data?.fire_detected ?? true;
  const confidence = data?.confidence !== undefined ? (data.confidence * 100).toFixed(1) : 95;
  const sevLabel = !data ? 'CRITICAL'
    : !fireDetected ? 'NORMAL'
      : data.confidence > 0.9 ? 'CRITICAL'
        : data.confidence > 0.7 ? 'HIGH' : 'MODERATE';

  const sevColor = sevLabel === 'NORMAL' ? '#00ff88' : sevLabel === 'MODERATE' ? '#ffb300' : '#ff3366';
  const confColor = !data || data.confidence > 0.8 ? '#ff3366'
    : data.confidence > 0.5 ? '#ffb300' : '#00ff88';

  const lat = data?.location?.lat;
  const lon = data?.location?.lon;
  const locationStr = lat != null
    ? `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(5)}° ${lon >= 0 ? 'E' : 'W'}`
    : '34.052° N, 118.243° W';

  let timeStr = '—';
  if (data?.timestamp) {
    const t = new Date(data.timestamp * 1000);
    timeStr = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}:${String(t.getUTCSeconds()).padStart(2, '0')} UTC`;
  }

  return (
    <div className="glass-card flex flex-col flex-1 min-h-0">
      <div className="px-5 py-4" style={{ background: 'rgba(24,24,27,0.7)', borderBottom: '1px solid rgba(194,122,61,0.1)' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#c27a3d' }}>🎯 Detection Details</span>
      </div>

      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
        {/* Alert banner */}
        <div className={`animate-pulse-red flex items-center gap-3 p-3 rounded-md`}
          style={{ background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.3)' }}>
          <span className="animate-bounce-icon text-xl">🚨</span>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: '#ff3366' }}>
              {fireDetected ? 'Active Fire Detected' : 'System Monitoring'}
            </h3>
            <p className="text-[11px]" style={{ color: '#505668' }}>{date}</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Confidence" value={`${confidence}%`} color={confColor} />
          <StatCard label="Severity" value={sevLabel} color={sevColor} />
        </div>

        {/* Details */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#00d9ff' }}>Incident Information</p>
          <DetailRow label="Location" value={locationStr} />
          <DetailRow label="Time" value={timeStr} valueColor={fireDetected ? '#ff3366' : '#00ff88'} />

          {/* AI Prediction */}
          <div className="rounded p-3 flex flex-col gap-2" style={{ background: 'rgba(10,14,26,0.4)' }}>
            <span className="text-xs" style={{ color: '#505668' }}>🤖 AI Spread Prediction</span>
            <p className="text-[11px] leading-relaxed" style={{ color: aiPrediction?.includes('unavailable') ? '#ff3366' : '#a0aec0', whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto' }}>
              {aiPrediction}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="p-3 rounded-md text-center" style={{ background: 'rgba(10,14,26,0.6)', border: '1px solid #2d3548' }}>
      <div className="text-[10px] uppercase tracking-wider mb-1 font-medium" style={{ color: '#505668' }}>{label}</div>
      <div className="text-base font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value, valueColor = '#e0e6ed' }) {
  return (
    <div className="flex justify-between items-center px-3 py-2 rounded-sm" style={{ background: 'rgba(10,14,26,0.4)' }}>
      <span className="text-xs" style={{ color: '#505668' }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: valueColor }}>{value}</span>
    </div>
  );
}
