import { useState, useRef, useEffect } from 'react';
import { SOURCE_API, VIDEO_API } from '../../constants/api.js';
import { useDetectionStatus } from '../../hooks/useDetectionStatus';

export default function DroneFeedPanel() {
  const [source, setSource] = useState('video');
  const [toggling, setToggling] = useState(false);
  const [streamOk, setStreamOk] = useState(false);
  const { connected } = useDetectionStatus();
  const [videoSrc, setVideoSrc] = useState(VIDEO_API);
  
  const imgRef = useRef(null);

  // Automatically refresh the video stream source when the backend reconnects
  useEffect(() => {
    if (connected) {
      setVideoSrc(`${VIDEO_API}?t=${Date.now()}`);
    } else {
      setStreamOk(false);
    }
  }, [connected]);

  const setStreamSource = async (targetSource) => {
    if (toggling || source === targetSource) return;
    setToggling(true);

    // Optimistically update the UI to prevent getting stuck
    setSource(targetSource);

    try {
      await fetch(SOURCE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: targetSource }),
      });
      // Stream updates seamlessly on the backend MJPEG socket without forcing a reload client-side.
    } catch (e) {
      console.error('Failed to switch source:', e);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="w-full h-[280px] glass-panel z-40 flex flex-col overflow-hidden shrink-0 pointer-events-auto shadow-[0_15px_50px_rgba(0,0,0,0.8)] border-[#3f3f46]/30">
      
      {/* Video Content Layer */}
      <div className="flex-1 min-h-0 relative bg-black">
        {/* Stream Image */}
        <img ref={imgRef} src={videoSrc} alt="Drone Feed"
          className="w-full h-full object-cover"
          style={{ display: streamOk ? 'block' : 'none', filter: 'contrast(1.1) brightness(0.9) saturate(1.2)' }}
          onLoad={() => setStreamOk(true)}
          onError={() => setStreamOk(false)} />

        {/* Video Overlays */}
        <div className="absolute inset-x-0 top-0 p-3 flex justify-between items-start pointer-events-none">
          {/* LIVE Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#ef4444]/90 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-red"></div>
            <span className="font-mono-num text-[10px] font-bold text-white tracking-widest">
              {source === 'camera' ? 'WEBCAM' : 'DRONE'}
            </span>
          </div>

          {/* Signal / Battery */}
          <div className="flex items-center gap-2 text-[#71717a]">
            <span className="font-mono-num font-bold text-[12px]">📶</span>
            <span className="font-mono-num font-bold text-[10px] tracking-wider">98%</span>
          </div>
        </div>

        {/* Crosshair Center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-12 h-12 border border-[#71717a]/40 rounded-full flex items-center justify-center">
             <div className="w-8 h-px bg-[#71717a]/40"></div>
             <div className="h-8 w-px bg-[#71717a]/40 absolute"></div>
          </div>
        </div>

        {/* Bottom Stats Overlay */}
        <div className="absolute bottom-3 left-4 pointer-events-none">
          <span className="font-mono-num text-[11px] font-bold text-[#c27a3d] tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            DRONE-07 // ALT: 450m
          </span>
        </div>
        
        {/* Corner Brackets */}
        <div className="absolute right-3 bottom-3 text-[#71717a] opacity-50 cursor-pointer pointer-events-auto hover:text-white transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="h-[48px] bg-[#18181b] flex items-center justify-between px-4 border-t border-[#3f3f46]/30">
        <span className="font-mono-num text-[10px] text-[#71717a] font-bold tracking-[0.1em] uppercase">
          Source
        </span>
        
        <div className="flex bg-[#27272a] p-1 rounded-md border border-[#3f3f46]/30">
          <button 
            onClick={() => setStreamSource('video')} 
            disabled={toggling}
            className={`px-3 py-1 text-[10px] font-bold tracking-widest rounded transition-all ${source === 'video' ? 'bg-[#c27a3d]/20 text-[#c27a3d] border border-[#c27a3d]/40 shadow-[0_0_10px_rgba(194,122,61,0.2)]' : 'text-[#71717a] hover:text-[#e4e4e7]'}`}>
            📹 VIDEO
          </button>
          
          <button 
            onClick={() => setStreamSource('camera')} 
            disabled={toggling}
            className={`px-3 py-1 text-[10px] font-bold tracking-widest rounded transition-all ${source === 'camera' ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'text-[#71717a] hover:text-[#e4e4e7]'}`}>
            📷 CAMERA
          </button>
        </div>
      </div>

    </div>
  );
}
