import { useState, useEffect } from 'react';
import { useDetectionStatus } from '../../hooks/useDetectionStatus';

export default function LiveDetectionsPanel() {
  const { data, connected } = useDetectionStatus();
  const [liveList, setLiveList] = useState([]);

  // Stream live python backend detections into a local history array
  useEffect(() => {
    if (connected && data?.fire_detected && data.location) {
      setLiveList(prev => {
        const latest = prev[0];
        // Skip identical sequential frames to avoid list spam
        if (latest && latest.lat === data.location.lat && latest.conf === data.confidence) {
          return prev;
        }
        const newDet = {
          id: `F-${String(Math.floor(Math.random()*900)+100)}`, // randomize ID or increment
          lat: data.location.lat,
          lon: data.location.lon,
          conf: data.confidence,
          time: new Date().toISOString()
        };
        return [newDet, ...prev].slice(0, 15); // keep 15 most recent
      });
    } else if (!connected && liveList.length > 0) {
      setLiveList([]); // clear on disconnect
    }
  }, [data, connected]);

  const mockDetections = [
      { id: 'F-842', lat: 34.052, lon: -118.244, conf: 0.97, time: new Date(Date.now() - 12*60000).toISOString() },
      { id: 'F-231', lat: 36.778, lon: -119.418, conf: 0.92, time: new Date(Date.now() - 8*60000).toISOString() },
      { id: 'F-091', lat: 37.774, lon: -122.419, conf: 0.88, time: new Date(Date.now() - 15*60000).toISOString() },
  ];

  const sourceData = connected ? liveList : mockDetections;

  // Map data to display schema
  const displayList = sourceData.map((d) => {
    const timeOpts = { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const absoluteIST = new Intl.DateTimeFormat('en-GB', timeOpts).format(new Date(d.time));
    
    const confScore = d.conf || 0;

    return {
      id: d.id,
      lat: d.lat || 0,
      lon: d.lon || 0,
      conf: confScore,
      timeElapsed: `${absoluteIST} IST`,
      color: confScore > 0.85 ? '#ff3366' : confScore > 0.75 ? '#ff9800' : '#ff7700'
    };
  });

  return (
    <div className="absolute top-[68px] right-6 w-[280px] bottom-[260px] z-60 flex pointer-events-none">

      {/* List Container */}
      <div className="w-full flex flex-col overflow-hidden pointer-events-auto bg-[#18181b]/70 backdrop-blur-2xl border border-[#3f3f46]/30 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="px-5 py-4 border-b border-[#3f3f46]/30 flex justify-between items-center bg-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse-red"></div>
            <span className="font-mono-num text-[11px] font-bold text-[#e2e8f0] tracking-widest uppercase truncate">
              Live Detections
            </span>
          </div>
          <span className="font-mono-num text-[10px] text-[#c27a3d] font-bold mt-px">
            {connected ? liveList.length : 0} active
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pt-3 pb-8 custom-scrollbar min-h-0 flex flex-col gap-2">
          {displayList.map((item, i) => (
            <DetectionItem key={i} {...item} />
          ))}
        </div>
      </div>

    </div>
  );
}

function DetectionItem({ id, lat, lon, conf, timeElapsed, color }) {
  const confPercent = Math.round(conf * 100);

  return (
    <div className="group flex flex-col gap-2 px-4 py-4 rounded-xl border border-white/5 bg-[#27272a]/40 hover:bg-[#27272a]/60 transition-all cursor-pointer relative overflow-hidden shrink-0">
      <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ backgroundColor: color }}></div>

      <div className="flex justify-between items-center pl-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
          <span className="font-heading font-bold text-white text-[14px] tracking-wide leading-tight">{id}</span>
        </div>
        <span className="font-mono-num text-[11px] text-white/50 font-medium">{timeElapsed}</span>
      </div>

      <div className="flex justify-between items-center pl-4">
        <span className="font-mono-num text-[11px] text-white/40 leading-none">
          ⌖ {Math.abs(lat).toFixed(3)}°{lat >= 0 ? 'N' : 'S'} {Math.abs(lon).toFixed(3)}°{lon >= 0 ? 'E' : 'W'}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="font-heading font-bold text-[12px]" style={{ color }}>{confPercent}%</span>
          <span className="text-white/20 text-[10px]">&gt;</span>
        </div>
      </div>

    </div>
  );
}
