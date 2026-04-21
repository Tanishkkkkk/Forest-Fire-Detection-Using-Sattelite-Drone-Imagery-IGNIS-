import { useState } from 'react';
import Header from '../components/layout/Header.jsx';
import HeatmapPanel from '../components/panels/HeatmapPanel.jsx';
import StatsPanel from '../components/panels/StatsPanel.jsx';
import LiveDetectionsPanel from '../components/panels/LiveDetectionsPanel.jsx';
import DroneFeedPanel from '../components/panels/DroneFeedPanel.jsx';
import AnalyticsDropdown from '../components/panels/AnalyticsDropdown.jsx';
import SatelliteOverlay from '../components/overlays/SatelliteOverlay.jsx';
import { useDetectionStatus } from '../hooks/useDetectionStatus.js';
import { useSatFires } from '../hooks/useSatFires.js';

import FlightWeatherPanel from '../components/panels/FlightWeatherPanel.jsx';
import EmergencyOverlay from '../components/overlays/EmergencyOverlay.jsx';
import { useEffect } from 'react';

export default function FireDetectionPage() {
  const { data, connected } = useDetectionStatus();
  const { fires: satFires } = useSatFires();
  const [showSatellite, setShowSatellite] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);

  // Handle automatic emergency mode activation/deactivation
  useEffect(() => {
    if (!connected) {
      setEmergencyMode(false);
      return;
    }

    // ACTIVATE: High confidence fire detected (> 80%)
    if (data?.confidence > 0.8) {
      setEmergencyMode(true);
    } 
    
    // DEACTIVATE: Low or no confidence (< 30%)
    // Using a lower threshold for deactivation (hysteresis) to prevent flickering
    if (data?.confidence < 0.3) {
      setEmergencyMode(false);
    }
  }, [data?.confidence, connected]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0c0908] text-[#e2e8f0] font-body selection:bg-[#ff7700]/30">

      {/* Background Layer: Full Screen Map */}
      <HeatmapPanel detectionData={data} satFires={satFires} />

      {/* Emergency Overlay (Highest Priority) */}
      <EmergencyOverlay active={emergencyMode} />

      {/* UI Overlay Layers */}
      <Header
        connected={connected}
        activeAlerts={8}
        emergencyMode={emergencyMode}
        onToggleEmergency={() => setEmergencyMode(!emergencyMode)}
      />

      {/* Left Side HUD Column */}
      <div className="absolute top-[88px] left-6 bottom-6 w-[280px] flex flex-col justify-end gap-6 z-40 pointer-events-none">
        <FlightWeatherPanel />
        <DroneFeedPanel />
      </div>

      {/* Right Side HUD Column */}
      <div className="absolute top-[88px] right-6 bottom-6 w-[280px] flex flex-col gap-6 z-40 pointer-events-none">
        <LiveDetectionsPanel />
        <StatsPanel />
      </div>

      <AnalyticsDropdown />

      {showSatellite && (
        <SatelliteOverlay satFires={satFires} onClose={() => setShowSatellite(false)} />
      )}
    </div>
  );
}
