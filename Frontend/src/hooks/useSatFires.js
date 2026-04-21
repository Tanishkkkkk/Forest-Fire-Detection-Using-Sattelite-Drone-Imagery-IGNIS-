import { useState, useEffect } from 'react';
import { FIRMS_API } from '../constants/api.js';

// Define specific fire hotspot centers (approx 2 per continent)
const HOTSPOT_CENTERS = [
  // North America
  { lat: 39.0, lon: -120.0 }, // California
  { lat: 55.0, lon: -110.0 }, // Canada
  // South America
  { lat: -8.0, lon: -60.0 },  // Amazon
  { lat: -15.0, lon: -50.0 }, // Brazil
  // Europe
  { lat: 40.0, lon: -4.0 },   // Spain
  { lat: 38.0, lon: 22.0 },   // Greece
  // Africa
  { lat: 0.0, lon: 20.0 },    // Central Africa
  { lat: -20.0, lon: 28.0 },  // Southern Africa
  // Asia
  { lat: 60.0, lon: 90.0 },   // Siberia
  { lat: 20.0, lon: 78.0 },   // India
  // Australia
  { lat: -33.0, lon: 150.0 }, // New South Wales
  { lat: -30.0, lon: 115.0 }, // Western Australia
];

function demoFires() {
  const fires = [];
  HOTSPOT_CENTERS.forEach(center => {
    // Randomize cluster size heavily so some clusters look huge and some small
    const clusterSize = 5 + Math.floor(Math.random() * 30);
    
    for (let i = 0; i < clusterSize; i++) {
      fires.push({
        lat: center.lat + (Math.random() - 0.5) * 1.5, // Much tighter spread so they overlap into dense blobs
        lon: center.lon + (Math.random() - 0.5) * 1.5,
        intensity: 500 + Math.random() * 500, // High intensity creates the red/orange core
      });
    }
  });
  return fires;
}


export function useSatFires() {
  const [fires, setFires]     = useState([]);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(FIRMS_API);
        const data = await res.json();
        const list = data.fires || [];
        setFires(list.length > 0 ? list : demoFires());
      } catch {
        setFires(demoFires());
      } finally {
        setLoaded(true);
      }
    };
    load();
    // Refresh every 5 minutes
    const id = setInterval(load, 300_000);
    return () => clearInterval(id);
  }, []);

  return { fires, loaded };
}
