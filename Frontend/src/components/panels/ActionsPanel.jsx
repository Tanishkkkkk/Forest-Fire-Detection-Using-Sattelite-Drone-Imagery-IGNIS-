export default function ActionsPanel() {
  const actions = [
    { icon: '🚁', label: 'Dispatch Fire Drones', variant: 'amber' },
    { icon: '📡', label: 'Alert Authorities', variant: 'purple' },
    { icon: '🚨', label: 'Evacuation Plan', variant: 'red' },
  ];

  const styles = {
    amber: { bg: 'rgba(194,122,61,0.08)', border: 'rgba(194,122,61,0.3)', color: '#c27a3d', hover: 'rgba(194,122,61,0.2)' },
    purple: { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.3)', color: '#8b5cf6', hover: 'rgba(139,92,246,0.2)' },
    red: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', hover: 'rgba(239,68,68,0.2)' },
  };

  return (
    <div className="glass-card flex flex-col">
      <div className="px-5 py-4" style={{ background: 'rgba(24,24,27,0.7)', borderBottom: '1px solid rgba(194,122,61,0.1)' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#c27a3d' }}>⚡ Actionable Insights</span>
      </div>
      <div className="p-5 flex flex-col gap-3">
        {actions.map(({ icon, label, variant }) => {
          const s = styles[variant];
          return (
            <button key={label}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-left transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
              onMouseEnter={e => e.currentTarget.style.background = s.hover}
              onMouseLeave={e => e.currentTarget.style.background = s.bg}>
              <span className="text-lg">{icon}</span>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
