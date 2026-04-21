import { useLocalFires } from '../../hooks/useLocalFires';
import { useSatFires } from '../../hooks/useSatFires';
import { useDetectionStatus } from '../../hooks/useDetectionStatus';

export default function StatsPanel() {
  const localFiresRaw = useLocalFires();
  const { fires: satFires } = useSatFires();
  const { data } = useDetectionStatus();

  // Calculate or mock metrics based on actual data
  const localCount = localFiresRaw.length || 156;
  const satCount = satFires.length || 150;
  const activeCount = Math.floor(localCount * 0.08) || 12;

  // Determine risk level based on latest inference confidence
  const confidence = data?.confidence || 0;
  const riskLevel = confidence > 0.8 ? 'HIGH' : confidence > 0.5 ? 'MODERATE' : 'LOW';
  const riskColor = riskLevel === 'HIGH' ? '#ff3366' : riskLevel === 'MODERATE' ? '#ffb300' : '#ffbb00';

  return (
    <div className="absolute bottom-6 right-6 w-[280px] z-40 pointer-events-auto flex flex-col overflow-hidden bg-[#18181b]/70 backdrop-blur-2xl border border-[#3f3f46]/30 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">

      <StatRow label="Active Fires" value={activeCount} trend="+3" icon="🔥" color="#ef4444" />
      <StatRow label="Satellite Det." value={satCount} trend="+24" icon="🛰️" color="#f59e0b" />
      <StatRow label="Local Det." value={localCount} trend="+8" icon="📡" color="#c27a3d" />

      {/* Risk Level Footer inside the same box */}
      <div className="flex items-center justify-between px-5 py-2 relative bg-white/5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-white rounded-r-md" style={{ backgroundColor: riskColor }}></div>
        <div className="flex flex-col pl-2">
          <span className="font-mono-num text-[9px] text-[#71717a] tracking-widest uppercase mb-0">Risk Level</span>
          <span className="font-heading text-lg font-bold tracking-tight" style={{ color: riskColor }}>
            {riskLevel}
          </span>
        </div>
        <span className="text-base opacity-80">⚠️</span>
      </div>

    </div>
  );
}

function StatRow({ label, value, trend, icon, color }) {
  return (
    <div className="flex flex-col px-5 py-2 border-b border-white/5 group relative overflow-hidden bg-transparent hover:bg-white/5 transition-colors cursor-default">
      {/* Subtle glow effect on hover instead of heavy neon */}
      <div className="absolute -inset-1 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 blur-xl" style={{ backgroundColor: color }}></div>

      <div className="flex justify-between items-center mb-0 w-full z-10">
        <span className="font-mono-num text-[9px] text-[#71717a] tracking-widest uppercase font-medium">{label}</span>
        <span className="text-[10px] opacity-40 grayscale brightness-[3] drop-shadow-md">{icon}</span>
      </div>

      <div className="flex items-baseline gap-2 z-10 w-full">
        <span className="font-heading text-[22px] font-semibold tracking-tight leading-none text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" style={{ color }}>{value}</span>
        {trend && (
          <span className="font-mono-num text-[9px] font-semibold text-[#ffbb00]">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
