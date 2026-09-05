import React, { useState, useEffect } from 'react';
import { FiNavigation, FiTruck, FiMapPin, FiActivity, FiCrosshair, FiShield, FiUser } from 'react-icons/fi';

// Known Indian Cities Coordinates Lookup
const CITY_COORDS = {
  'Nagpur': { lat: 21.1458, long: 79.0882 },
  'Pune': { lat: 18.5204, long: 73.8567 },
  'Mumbai': { lat: 19.0760, long: 72.8777 },
  'Raipur': { lat: 21.2514, long: 81.6296 },
  'Bhilai': { lat: 21.1938, long: 81.3509 },
  'Lucknow': { lat: 26.8467, long: 80.9462 },
  'Delhi': { lat: 28.6139, long: 77.2090 },
  'Delhi NCR': { lat: 28.6139, long: 77.2090 },
  'Kolkata': { lat: 22.5726, long: 88.3639 },
  'Chennai': { lat: 13.0827, long: 80.2707 },
  'Bangalore': { lat: 12.9716, long: 77.5946 },
  'Patna': { lat: 25.5941, long: 85.1376 },
  'Ranchi': { lat: 23.3441, long: 85.3096 },
  'Guwahati': { lat: 26.1445, long: 91.7362 }
};

export default function TransportMap({
  trips = [],
  activeDrivers = [],
  height = '440px',
  activeTripId = null,
  onSelectTrip,
  gpsLocation = null
}) {
  // Default coordinates (Lucknow/Delhi Corridor)
  const defaultLat = 26.8467;
  const defaultLong = 80.9462;

  const [mapCenter, setMapCenter] = useState({ lat: defaultLat, long: defaultLong });
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(12);

  // Sync map center whenever activeDrivers or gpsLocation prop changes
  useEffect(() => {
    if (gpsLocation && gpsLocation.lat && gpsLocation.long) {
      setMapCenter({ lat: Number(gpsLocation.lat), long: Number(gpsLocation.long) });
    } else if (activeDrivers.length > 0) {
      const firstDrv = activeDrivers[0];
      const drvLat = Number(firstDrv.lat || firstDrv.latitude || defaultLat);
      const drvLong = Number(firstDrv.long || firstDrv.longitude || defaultLong);
      setMapCenter({ lat: drvLat, long: drvLong });
      setSelectedDriver(firstDrv);
    }
  }, [gpsLocation, activeDrivers]);

  // Recenter handler
  const handleRecenter = () => {
    if (gpsLocation && gpsLocation.lat && gpsLocation.long) {
      setMapCenter({ lat: Number(gpsLocation.lat), long: Number(gpsLocation.long) });
    } else if (activeDrivers.length > 0) {
      const firstDrv = activeDrivers[0];
      const drvLat = Number(firstDrv.lat || firstDrv.latitude || defaultLat);
      const drvLong = Number(firstDrv.long || firstDrv.longitude || defaultLong);
      setMapCenter({ lat: drvLat, long: drvLong });
      setSelectedDriver(firstDrv);
    } else if (trips.length > 0) {
      const firstTrip = trips[0];
      const city = firstTrip.originCity || firstTrip.origin || 'Delhi';
      const coords = CITY_COORDS[city] || CITY_COORDS['Delhi'];
      setMapCenter(coords);
    } else {
      setMapCenter({ lat: defaultLat, long: defaultLong });
    }
  };

  const handleSelectDriver = (drv) => {
    setSelectedDriver(drv);
    const lat = Number(drv.lat || drv.latitude || defaultLat);
    const long = Number(drv.long || drv.longitude || defaultLong);
    setMapCenter({ lat, long });
  };

  const activeDriverName = selectedDriver?.driverName || selectedDriver?.fullName || selectedDriver?.name || (activeDrivers[0]?.driverName || 'Driver Unit');
  const activeVehicleNo = selectedDriver?.vehicleNo || selectedDriver?.vehicleNumber || (activeDrivers[0]?.vehicleNo || 'Carrier');

  return (
    <div
      className="relative rounded-sm border overflow-hidden flex flex-col font-mono text-xs select-none w-full"
      style={{
        height,
        background: '#090c10',
        borderColor: 'var(--crm-line)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}
    >
      {/* Header Bar */}
      <div className="px-4 py-2.5 bg-[#0d1117] border-b border-[#21262d] flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <FiNavigation className="text-sky-400 animate-pulse" size={15} />
          <h3 className="text-xs uppercase font-serif font-bold tracking-wider text-[#f0f6fc]">
            GOOGLE MAP LIVE TELEMETRY
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRecenter}
            className="px-3 py-1 bg-sky-950/70 hover:bg-sky-900 text-sky-300 border border-sky-700/60 rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer transition flex items-center gap-1.5 shadow-sm"
          >
            <FiCrosshair size={13} className="text-sky-400" /> Recenter GPS
          </button>
        </div>
      </div>

      {/* Main Google Maps Viewport */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#0d1117]">
        <iframe
          title="Google Map Live Radar"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          src={`https://maps.google.com/maps?q=${mapCenter.lat},${mapCenter.long}&z=${zoomLevel}&output=embed`}
          loading="lazy"
          allowFullScreen
        />

        {/* Live Status Floating Badge (Top Left Overlay) */}
        <div className="absolute top-3 left-3 border p-3 rounded bg-[#0d1117]/90 backdrop-blur-md border-[#30363d] shadow-2xl text-[10px] space-y-1 z-10 max-w-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[9px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            ● LIVE GPS TELEMETRY LOCKED
          </div>
          <div className="text-[#c9d1d9] font-bold font-mono">
            {activeDriverName} <span className="text-sky-400">({activeVehicleNo})</span>
          </div>
          <div className="text-[#8b949e] font-mono text-[9px]">
            GPS Pos: {mapCenter.lat.toFixed(4)}° N, {mapCenter.long.toFixed(4)}° E
          </div>
        </div>

        {/* Driver Quick Selector Pills (Top Right Overlay) */}
        {activeDrivers.length > 0 && (
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10 max-h-[160px] overflow-y-auto custom-scrollbar">
            {activeDrivers.slice(0, 4).map((drv, idx) => {
              const isSelected = selectedDriver?._id === drv._id || selectedDriver?.driverId === drv.driverId || idx === 0;
              return (
                <button
                  key={drv._id || drv.driverId || idx}
                  onClick={() => handleSelectDriver(drv)}
                  className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border shadow transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600'
                      : 'bg-[#161b22]/90 text-[#c9d1d9] border-[#30363d] hover:bg-[#21262d]'
                  }`}
                >
                  <FiTruck size={10} className={isSelected ? 'text-emerald-400' : 'text-slate-400'} />
                  <span>{drv.driverName || drv.fullName || 'Driver'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Manifest & Active Route Status Bar */}
      <div className="px-3.5 py-2 bg-[#0d1117] border-t border-[#21262d] flex flex-wrap gap-2 items-center justify-between text-[9px] z-10 shrink-0">
        <div className="flex items-center gap-2 text-[#8b949e] font-bold uppercase tracking-wider">
          <FiActivity className="text-emerald-400" size={12} />
          <span>Active Radar: {activeDrivers.length} Online Drivers • {trips.length} Dispatches</span>
        </div>

        <div className="flex items-center gap-2">
          {trips.slice(0, 2).map((t, idx) => (
            <span key={t._id || idx} className="px-2 py-0.5 bg-[#161b22] border border-[#30363d] text-[#c9d1d9] rounded flex items-center gap-1 font-mono text-[9px]">
              <FiMapPin size={9} className="text-sky-400" />
              {t.originCity || t.origin || 'Origin'} &rarr; {t.destCity || t.destination || 'Destination'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
