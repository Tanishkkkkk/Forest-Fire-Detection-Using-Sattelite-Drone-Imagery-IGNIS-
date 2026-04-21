import { useDetectionStatus } from '../../hooks/useDetectionStatus.js';

export default function FlightWeatherPanel() {
  const { data } = useDetectionStatus();
  
  // Extract real-time weather and FWI from backend status
  const weather = data?.weather || { temp: 24, humidity: 32, wind_speed: 10, description: "Clear" };
  const fwi = data?.fwi || { score: 10, level: "Low" };

  return (
    <div className="w-full flex flex-col gap-2 pointer-events-auto shrink-0 z-40">

      {/* Top 2 Cards: Flight Altitude & Coverage Area */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#18181b]/95 border border-[#c27a3d]/20 rounded-xl p-2.5 flex flex-col items-center justify-center backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
          <span className="text-[#a1a1aa] text-[10px] mb-0.5 whitespace-nowrap uppercase tracking-wider font-semibold">Altitude</span>
          <span className="text-white text-lg font-bold mb-0.5">12m</span>
          <span className="text-[#71717a] text-[8px] tracking-wide whitespace-nowrap">Status: Stable</span>
        </div>
        <div className="bg-[#18181b]/95 border border-[#c27a3d]/20 rounded-xl p-2.5 flex flex-col items-center justify-center backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
          <span className="text-[#a1a1aa] text-[10px] mb-0.5 whitespace-nowrap uppercase tracking-wider font-semibold">Wind</span>
          <span className="text-white text-lg font-bold mb-0.5">{weather.wind_speed}km/h</span>
          <span className="text-[#71717a] text-[8px] tracking-wide whitespace-nowrap">Dir: variable</span>
        </div>
      </div>

      {/* Weather Block */}
      <div className="bg-[#18181b]/95 border border-[#c27a3d]/20 rounded-xl p-3 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.6)] flex flex-col gap-2">

        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm drop-shadow-md">🌤️</span>
          <span className="text-[#e2e8f0] text-xs font-medium tracking-wide">Weather Data</span>
        </div>

        <div className="grid grid-cols-2 gap-2">

          <WeatherCard icon="🌦️" label="Conditions" value={weather.description} />
          <WeatherCard icon="🌡️" label="Temp." value={`${weather.temp}°c`} />
          <WeatherCard icon="💧" label="Humidity" value={`${weather.humidity}%`} />
          
          {/* Replaced Storm with FWI per user request */}
          <WeatherCard 
            icon="🔥" 
            label="Fire Index" 
            value={`${fwi.score}`} 
            subText={fwi.level}
            highlight={fwi.level === "High" || fwi.level === "Extreme"}
          />

        </div>
      </div>
    </div>
  );
}

function WeatherCard({ icon, label, value, subText, highlight }) {
  return (
    <div className={`bg-[#27272a]/60 border ${highlight ? 'border-[#ff4400]/40' : 'border-white/5'} rounded-lg p-2.5 flex flex-col items-start gap-1 transition-colors hover:bg-[#27272a]/80`}>
      <div className="flex items-center gap-1.5 w-full">
        <div className="w-5 h-5 rounded-full bg-[#18181b] flex items-center justify-center text-[9px] shrink-0 shadow-inner border border-[#3f3f46]/30">
          {icon}
        </div>
        <span className="text-[#a1a1aa] text-[9px] font-medium tracking-wide truncate">{label}</span>
      </div>
      <div className="flex flex-col">
        <span className={`text-sm font-bold tracking-tight mt-1 ${highlight ? 'text-[#ff7700]' : 'text-[#e2e8f0]'}`}>
          {value}
        </span>
        {subText && (
          <span className={`text-[8px] font-semibold uppercase tracking-widest ${highlight ? 'text-[#ff4400]' : 'text-[#71717a]'}`}>
            {subText}
          </span>
        )}
      </div>
    </div>
  );
}
