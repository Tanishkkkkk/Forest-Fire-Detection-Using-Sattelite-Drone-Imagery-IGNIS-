import { useEffect, useRef } from 'react';

export default function SatelliteOverlay({ onClose, satFires }) {
  const globeContainerRef = useRef(null);
  const deckRef           = useRef(null);
  const threeGlobeRef     = useRef(null);

  useEffect(() => {
    const { deck: deckLib, THREE, ThreeGlobe } = window;
    if (!deckLib || !globeContainerRef.current) return;

    /* ── deck.gl Globe view ── */
    deckRef.current = new deckLib.DeckGL({
      container: globeContainerRef.current,
      views: new deckLib._GlobeView({ id: 'globe', controller: true }),
      initialViewState: { longitude: 78, latitude: 22, zoom: 1 },
      layers: [
        new deckLib.TileLayer({
          id: 'earth',
          data: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          tileSize: 256,
          renderSubLayers: props => {
            const { west, south, east, north } = props.tile.bbox;
            return new deckLib.BitmapLayer(props, { data: null, image: props.data, bounds: [west, south, east, north] });
          },
        }),
        new deckLib.ScatterplotLayer({
          id: 'sat-fires',
          data: satFires || [],
          getPosition: d => [d.lon, d.lat],
          getRadius: d => (d.intensity || 400) * 80,
          getFillColor: [255, 51, 102, 200],
          radiusMinPixels: 3,
          stroked: true, getLineColor: [255,255,255,120],
        }),
      ],
    });

    /* ── Three.js mini globe ── */
    if (THREE && ThreeGlobe) {
      const miniEl = document.getElementById('sat-mini-globe');
      if (miniEl) {
        const scene    = new THREE.Scene();
        const camera   = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        camera.position.z = 250;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(150, 150);
        miniEl.appendChild(renderer.domElement);
        const globe = new ThreeGlobe()
          .globeImageUrl('https://unpkg.com/three-globe@2.24.0/example/img/earth-dark.jpg')
          .atmosphereColor('#c27a3d')
          .atmosphereAltitude(0.15);
        scene.add(globe);
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(5,3,5); scene.add(dl);
        threeGlobeRef.current = { globe, renderer, scene, camera };
        const animate = () => { requestAnimationFrame(animate); globe.rotation.y += 0.003; renderer.render(scene,camera); };
        animate();
      }
    }

    return () => {
      if (deckRef.current) { deckRef.current.finalize(); deckRef.current = null; }
      if (threeGlobeRef.current) { threeGlobeRef.current.renderer.dispose(); }
    };
  }, [satFires]);

  return (
    <div className="animate-fade-in fixed inset-0 z-[99999]" style={{ background: '#09090b' }}>
      {/* Full-screen globe */}
      <div ref={globeContainerRef} className="w-full h-full" />

      {/* Command UI */}
      <div className="absolute top-7 left-7 p-6 rounded-lg text-white animate-slide-right"
        style={{ background: 'rgba(24,24,27,0.95)', border: '1px solid #c27a3d', backdropFilter: 'blur(20px)', minWidth: 240 }}>
        <div className="text-[10px] font-bold" style={{ color:'#ff9800' }}>● LIVE FEED: SATELLITE</div>
        <h2 className="text-xl font-heading font-semibold mt-1">Ignis Satellite Link</h2>
        <p className="text-[11px] opacity-60 mt-0.5">Global Cluster Monitoring</p>
        <hr className="my-4 border-t" style={{ borderColor:'rgba(255,119,0,0.2)' }} />
        <p className="text-xs" style={{ color:'#8b7c74' }}>
          Thermal Events: <span style={{ color:'#ff3333', fontWeight:700 }}>{satFires?.length || 0}</span>
        </p>

        {/* Mini globe */}
        <div id="sat-mini-globe" className="mt-4 rounded-xl overflow-hidden"
          style={{ width: 150, height: 150, border: '2px solid #c27a3d', background: 'rgba(0,0,0,0.9)', boxShadow: '0 8px 32px rgba(194,122,61,0.2)' }} />

        <button onClick={onClose}
          className="mt-4 w-full py-3 text-sm font-bold rounded transition-all hover:bg-fire-red/20"
          style={{ background:'rgba(255,51,51,0.1)', color:'#ff3333', border:'1px solid #ff3333' }}>
          Terminate Link
        </button>
      </div>
    </div>
  );
}
