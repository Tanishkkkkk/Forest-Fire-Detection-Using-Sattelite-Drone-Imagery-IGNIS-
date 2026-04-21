import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { icon: '🔥', label: 'Fire Detection', path: '/' },
  { icon: '📊', label: 'Analytics', path: '/analytics' },
  { icon: '🛰️', label: 'Satellite Feed', path: null, action: 'satellite' },
  { icon: '🗺️', label: 'Map View', path: null, disabled: true },
  { icon: '⚙️', label: 'Settings', path: null, disabled: true },
];

const REPORT_ITEMS = [
  { icon: '📋', label: 'Incident Logs', disabled: true },
  { icon: '📈', label: 'Statistics', disabled: true },
];

export default function Sidebar({ onSatelliteOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (item) => {
    if (item.disabled) return;
    if (item.action === 'satellite') { onSatelliteOpen?.(); return; }
    if (item.path) navigate(item.path);
  };

  return (
    <aside className="w-[260px] flex flex-col overflow-y-auto relative"
      style={{ background: 'linear-gradient(180deg,#18181b 0%,#09090b 100%)', borderRight: '1px solid #27272a' }}>

      {/* Glowing right border line */}
      <div className="absolute right-0 top-0 w-px h-full pointer-events-none"
        style={{ background: 'linear-gradient(180deg,transparent,rgba(194,122,61,0.3) 50%,transparent)' }} />

      {/* Navigation */}
      <nav className="px-4 py-6">
        <p className="text-[10px] uppercase tracking-wider font-semibold pl-4 mb-3" style={{ color: '#71717a' }}>Navigation</p>
        {NAV_ITEMS.map((item) => {
          const active = item.path && location.pathname === item.path;
          return (
            <button key={item.label} onClick={() => handleClick(item)}
              disabled={item.disabled}
              className={`w-full flex items-center gap-3 px-4 py-3 my-0.5 rounded-lg text-sm font-medium text-left transition-all duration-200
                ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                ${active ? 'text-fire-orange' : 'text-[#e4e4e7]'}`}
              style={{
                background: active ? '#27272a' : 'transparent',
                borderLeft: active ? '3px solid #c27a3d' : '3px solid transparent',
                color: active ? '#c27a3d' : undefined,
              }}>
              <span className="text-lg w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Reports */}
      <nav className="px-4 pb-6">
        <p className="text-[10px] uppercase tracking-wider font-semibold pl-4 mb-3" style={{ color: '#505668' }}>Reports</p>
        {REPORT_ITEMS.map((item) => (
          <button key={item.label} disabled
            className="w-full flex items-center gap-3 px-4 py-3 my-0.5 rounded-lg text-sm font-medium opacity-40 cursor-not-allowed text-left"
            style={{ borderLeft: '3px solid transparent' }}>
            <span className="text-lg w-5 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
