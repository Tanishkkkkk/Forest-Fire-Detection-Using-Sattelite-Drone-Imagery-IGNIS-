import { useClock } from '../../hooks/useClock.js';
import ignisLogo from '../images/ignis_logo_final.svg';

export default function Header({ connected, activeAlerts = 8, emergencyMode, onToggleEmergency }) {
  const { date, time } = useClock();

  return (
    <header className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-6 z-50 pointer-events-none"
      style={{
        background: 'linear-gradient(180deg, rgba(9,9,11,0.95) 0%, rgba(9,9,11,0) 100%)',
      }}>

      {/* Left: Logo Area */}
      <div className="flex items-center gap-3 ml-4 pointer-events-auto">
        <img src={ignisLogo} alt="Ignis Logo" className="h-12 w-auto object-contain" />
      </div>

      {/* Center: Status & Clock Styled as Pill Blocks with Grayish Fire UI */}
      <div className="flex items-center gap-4 pointer-events-auto">
        {/* Live Pill */}
        <div className="flex items-center gap-3 px-5 py-2 bg-[#18181b]/60 border border-[#c27a3d]/20 rounded-2xl backdrop-blur-md shadow-[0_0_15px_rgba(194,122,61,0.05)] transition-all hover:bg-[#18181b]/80 hover:border-[#c27a3d]/40 cursor-default">
          <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] animate-pulse shadow-[0_0_8px_#f59e0b]"></div>
          <span className="font-mono-num text-[12px] font-bold text-[#f59e0b] tracking-widest uppercase">Live</span>
        </div>

        {/* Link Pill */}
        <div className="flex items-center gap-3 px-5 py-2 bg-[#18181b]/60 border border-[#c27a3d]/20 rounded-2xl backdrop-blur-md shadow-[0_0_15px_rgba(194,122,61,0.05)] transition-all hover:bg-[#18181b]/80 hover:border-[#c27a3d]/40 cursor-default">
          <span className="text-[#c27a3d] text-sm font-bold">📶</span>
          <span className="font-mono-num text-[12px] font-bold text-[#c27a3d] tracking-widest uppercase">Sat-Link Active</span>
        </div>

        {/* Clock Pill */}
        <div className="flex items-center px-5 py-2 bg-[#18181b]/60 border border-white/5 rounded-2xl backdrop-blur-md shadow-lg transition-all hover:bg-[#18181b]/80 cursor-default">
          <span className="font-mono-num text-[12px] font-medium text-[#71717a] tracking-widest uppercase">
            {date} | {time}
          </span>
        </div>
      </div>

      {/* Right section: Action Buttons styled for Grayish Fire UI */}
      <div className="flex items-center gap-4 pointer-events-auto">

        <button className="flex items-center gap-2 px-5 py-2 rounded-full border border-[#ef4444]/30 bg-[#ef4444]/5 hover:bg-[#ef4444]/10 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.05)]">
          <div className="relative flex items-center justify-center w-4 h-4">
            <span className="absolute w-2 h-2 rounded-full bg-[#ef4444]"></span>
            <span className="absolute w-full h-full rounded-full border border-[#ef4444] animate-ping opacity-75"></span>
          </div>
          <span className="font-mono-num text-[11px] font-bold text-[#ef4444] tracking-widest uppercase">
            {activeAlerts} Alerts
          </span>
        </button>

        <button
          onClick={onToggleEmergency}
          className={`px-5 py-2 rounded-full border transition-all duration-300 ${emergencyMode
            ? 'border-fire-red bg-fire-red text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse'
            : 'border-[#3f3f46] bg-[#1c1c1f]/80 hover:bg-[#c27a3d]/10 text-[#71717a]'
            }`}>
          <span className={`font-mono-num text-[11px] font-bold tracking-widest uppercase ${emergencyMode ? 'text-white' : ''}`}>
            Emrg Mode
          </span>
        </button>

      </div>
    </header>
  );
}
