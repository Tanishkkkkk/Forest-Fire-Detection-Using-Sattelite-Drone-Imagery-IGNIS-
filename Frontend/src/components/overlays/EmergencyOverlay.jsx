export default function EmergencyOverlay({ active }) {
  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none border-[12px] border-red-600/20 animate-emergency">
      {/* Top Banner */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-2 rounded-full font-mono-num text-[12px] font-bold tracking-[0.2em] shadow-[0_0_30px_rgba(255,0,0,0.5)] animate-pulse flex items-center gap-3">
        <span className="text-lg">⚠️</span>
        EMERGENCY PROTOCOL ACTIVE
        <span className="text-lg">⚠️</span>
      </div>

      {/* Side Glows */}
      <div className="absolute inset-0 bg-gradient-to-t from-red-600/10 via-transparent to-red-600/10 opacity-50"></div>
    </div>
  );
}
