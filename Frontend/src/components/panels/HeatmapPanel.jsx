import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

// Critical fix: Leaflet is loaded by the Vite bundler, so global L is undefined when CDN scripts run.
// We must expose L to the window, then inject the heatmap script so it can bind properly.
window.L = L;
if (typeof document !== 'undefined' && !document.getElementById('leaflet-heat-script')) {
  const script = document.createElement('script');
  script.id = 'leaflet-heat-script';
  script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
  document.head.appendChild(script);
}

export default function HeatmapPanel({ detectionData, satFires }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const thermalBaseRef = useRef(null);
  const satBaseRef = useRef(null);
  const heatLayerRef = useRef(null);
  const detMarkerRef = useRef(null);
  const hasZommedRef = useRef(false);

  const [mode, setMode] = useState('thermal'); // 'thermal' | '3d'

  /* ── Init Leaflet map ── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Use dark base always initially
    const map = L.map(containerRef.current, {
      center: [37.774, -122.419], // Defaulting closer to mockup coords
      zoom: 6,
      zoomControl: false, // We will handle custom controls if needed, or hide them
      preferCanvas: true  // dramatically improves performance
    });

    // Dark matter base map
    const thermalBase = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, attribution: '© CARTO' }
    ).addTo(map);

    // World Imagery (Satellite) for 3D normal view
    const satBase = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: 'Esri' }
    );

    mapRef.current = map;
    thermalBaseRef.current = thermalBase;
    satBaseRef.current = satBase;
    window.firmsMapGlobal = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  /* ── Native Leaflet Heatmap Layer (No freezing sync!) ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old heat layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    if (!satFires || satFires.length === 0) return;

    // Wait for leaflet.heat to load from script CDN if necessary
    const initHeat = () => {
      if (window.L && window.L.heatLayer) {
        // Map data to [lat, lon, intensity] array
        // We normalize intensity a bit. 300K - 800K is common range.
        const heatData = satFires.map(fire => [
          fire.lat,
          fire.lon,
          (fire.intensity || 400) / 400 // relative scale for heat
        ]);

        const heat = window.L.heatLayer(heatData, {
          radius: 65,  // Greatly increased to make huge blobs
          blur: 45,    // Super soft edges to blend colors
          maxZoom: 9,
          max: 15.0,   // Increased so the points stack and create a smooth gradient instead of solid red
          // Colors matching the image the user uploaded
          gradient: {
            0.1: 'blue',
            0.3: 'cyan',
            0.5: 'lime',
            0.7: 'yellow',
            0.9: '#ff5722',
            1.0: 'red'
          }
        });

        // Add layer to map but only display it if we are in 'thermal' mode
        if (mode === 'thermal') {
          heat.addTo(map);
        }
        heatLayerRef.current = heat;
      } else {
        setTimeout(initHeat, 100); // retry
      }
    };

    initHeat();
  }, [satFires, mode]); // run when mode changes to re-add layer safely

  /* ── Live detection marker ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !detectionData?.fire_detected || !detectionData?.location) return;
    if (detMarkerRef.current) map.removeLayer(detMarkerRef.current);
    const { lat, lon } = detectionData.location;

    const confString = Math.round((detectionData.confidence || 0) * 100);

    // Pulsing custom icon along with a beautifully styled floating cyberpunk label box
    const pulsingIcon = L.divIcon({
      html: `
        <div class="relative flex items-center">
          <div class="w-5 h-5 rounded-full bg-[#ff3366] shadow-[0_0_30px_rgba(255,51,102,1.0)] animate-pulse-red flex items-center justify-center border-2 border-white z-50">
             <div class="w-2 h-2 bg-white rounded-full"></div>
          </div>
          
          <div class="absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#0b1120]/90 backdrop-blur-xl border border-[#ff3366]/60 rounded-lg px-4 py-2 shadow-[0_10px_30px_rgba(255,51,102,0.3)] pointer-events-none">
             <div class="font-heading font-extrabold text-[#ff3366] text-[13px] uppercase tracking-widest mb-0.5 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#ff3366] animate-pulse"></span>
                Active Fire Confirmed
             </div>
             <div class="font-mono-num font-semibold text-[#e2e8f0] text-[11px] uppercase tracking-wider pl-4">
                Confidence: <span class="text-[#22c55e] ml-1">${confString}%</span>
             </div>
          </div>
        </div>
      `,
      className: '',
      iconSize: L.point(20, 20),
      iconAnchor: [10, 10]
    });

    detMarkerRef.current = L.marker([lat, lon], { icon: pulsingIcon }).addTo(map);

    // If this is a new fire incident, fly the camera to 17km+ altitude (zoom level 9)
    if (!hasZommedRef.current) {
      map.flyTo([lat, lon], 9, { animate: true, duration: 2.5, easeLinearity: 0.25 });
      hasZommedRef.current = true;
    }
  }, [detectionData]);

  // Reset zoom lock when detection stops
  useEffect(() => {
    if (!detectionData?.fire_detected) {
      hasZommedRef.current = false;
    }
  }, [detectionData?.fire_detected]);

  const toggleMode = () => {
    const map = mapRef.current;
    if (!map) return;
    if (mode === 'thermal') {
      map.removeLayer(thermalBaseRef.current);
      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);
      map.addLayer(satBaseRef.current);
      setMode('3d');
    } else {
      map.removeLayer(satBaseRef.current);
      map.addLayer(thermalBaseRef.current);
      if (heatLayerRef.current) map.addLayer(heatLayerRef.current);
      setMode('thermal');
    }
  };

  return (
    <div className="absolute inset-0 z-0 bg-[#0b1120] overflow-hidden pointer-events-auto" style={{ perspective: '1200px' }}>

      {/* Dynamic Map Container with pseudo-3D perspective transform */}
      <div
        className="absolute inset-0 transition-transform duration-1000 ease-in-out origin-center"
        style={{
          transform: mode === '3d' ? 'rotateX(55deg) scale(1.6) translateY(-10%)' : 'rotateX(0deg) scale(1) translateY(0)',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Background Grid Pattern Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-1000"
          style={{
            backgroundImage: 'linear-gradient(#00d9ff 1px, transparent 1px), linear-gradient(90deg, #00d9ff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            opacity: mode === 'thermal' ? 0.03 : 0
          }}
        ></div>

        {/* strictly Native Leaflet map base without dual-looping layers */}
        <div ref={containerRef} className="absolute inset-0 !bg-[#0b1120]" style={{ zIndex: 1 }} />
      </div>

      {/* Floating Mode Toggle Control */}
      <div className="absolute top-[124px] left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-1 p-1 bg-[#0a0f1a]/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
        <button
          onClick={() => mode !== 'thermal' && toggleMode()}
          className={`px-5 py-2 text-[10px] font-bold tracking-[0.15em] rounded-lg transition-all duration-300 flex items-center gap-2 ${mode === 'thermal'
            ? 'bg-[#ff3333]/15 text-[#ff3333] border border-[#ff3333]/40 shadow-[0_0_15px_rgba(255,51,51,0.2)]'
            : 'text-[#64748b] hover:text-[#e2e8f0] hover:bg-white/5'
            }`}>
          <span className={mode === 'thermal' ? 'animate-pulse' : ''}>🌡️</span>
          THERMAL
        </button>

        <div className="w-[1px] h-4 bg-white/10 mx-1"></div>

        <button
          onClick={() => mode !== '3d' && toggleMode()}
          className={`px-5 py-2 text-[10px] font-bold tracking-[0.15em] rounded-lg transition-all duration-300 flex items-center gap-2 ${mode === '3d'
            ? 'bg-[#ff7700]/15 text-[#ff7700] border border-[#ff7700]/40 shadow-[0_0_15px_rgba(255,119,0,0.2)]'
            : 'text-[#64748b] hover:text-[#e2e8f0] hover:bg-white/5'
            }`}>
          <span style={{ transform: mode === '3d' ? 'rotateX(20deg) scale(1.1)' : 'none', transition: 'transform 0.3s' }}>🗺️</span>
          3D NORMAL
        </button>
      </div>

    </div>
  );
}
