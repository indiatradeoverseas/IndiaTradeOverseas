import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiNavigation, FiTruck, FiMapPin, FiUser, FiActivity } from 'react-icons/fi';

// Custom Leaflet Icons
const markerAIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="background:#0f172a; border:2px solid #38bdf8; color:#38bdf8; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:11px; box-shadow:0 0 10px rgba(56,189,248,0.5);">A</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

const markerBIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="background:#0f172a; border:2px solid #c9a84c; color:#c9a84c; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:11px; box-shadow:0 0 10px rgba(201,168,76,0.5);">B</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

// Live Driver Pulsing Truck Icon
const createDriverIcon = (isOnline = true, name = 'Driver') => {
  const color = isOnline ? '#22c55e' : '#38bdf8';
  return L.divIcon({
    className: 'custom-driver-pin',
    html: `
      <div style="position:relative; display:flex; align-items:center; justify-content:center;">
        <div style="position:absolute; width:36px; height:36px; border-radius:50%; background:${color}33; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="background:#090d16; border:2px solid ${color}; color:${color}; padding:4px 8px; border-radius:20px; font-weight:bold; font-size:10px; display:flex; align-items:center; gap:4px; box-shadow:0 0 12px ${color}88; white-space:nowrap; z-index:10;">
          <span style="width:8px; height:8px; border-radius:50%; background:${color}; display:inline-block;"></span>
          <span>🚚 ${name}</span>
        </div>
      </div>
    `,
    iconSize: [120, 36],
    iconAnchor: [60, 18]
  });
};

const STATUS_COLORS = {
  ON_TIME: '#16a34a',
  APPROACHING_ETA: '#eab308',
  OVERDUE: '#dc2626'
};

// Known Indian Cities Coordinates Lookup
const CITY_COORDS = {
  'Nagpur': [21.1458, 79.0882],
  'Pune': [18.5204, 73.8567],
  'Mumbai': [19.0760, 72.8777],
  'Raipur': [21.2514, 81.6296],
  'Bhilai': [21.1938, 81.3509],
  'Bellary': [15.1394, 76.9214],
  'Hyderabad': [17.3850, 78.4867],
  'Gulbarga': [17.3297, 76.8343],
  'Delhi': [28.6139, 77.2090],
  'Delhi NCR': [28.6139, 77.2090],
  'Kolkata': [22.5726, 88.3639],
  'Chennai': [13.0827, 80.2707],
  'Bangalore': [12.9716, 77.5946],
  'Patna': [25.5941, 85.1376],
  'Ranchi': [23.3441, 85.3096],
  'Guwahati': [26.1445, 91.7362]
};

export default function TransportMap({ 
  trips = [], 
  activeDrivers = [],
  height = '420px', 
  activeTripId = null, 
  onSelectTrip 
}) {
  const [selectedTrip, setSelectedTrip] = useState(null);

  // Filter valid trips
  const validTrips = trips.filter(t => t && (t.status === 'PLANNED' || t.status === 'LOADING' || t.status === 'IN_TRANSIT' || t.status === 'UNLOADING' || t.status === 'DISPATCHED' || t.status === 'COMPLETED'));

  const getCoords = (trip, type) => {
    if (type === 'origin') {
      if (trip.originLat && trip.originLng) return [trip.originLat, trip.originLng];
      const city = trip.originCity || trip.origin || 'Nagpur';
      return CITY_COORDS[city] || CITY_COORDS['Delhi'];
    } else {
      if (trip.destLat && trip.destLng) return [trip.destLat, trip.destLng];
      const city = trip.destCity || trip.destination || 'Pune';
      return CITY_COORDS[city] || CITY_COORDS['Patna'];
    }
  };

  const getTripColor = (trip) => {
    if (trip.isOverdue || trip.status === 'OVERDUE' || trip.etaStatus === 'OVERDUE') return STATUS_COLORS.OVERDUE;
    if (trip.etaStatus === 'APPROACHING_ETA' || trip.isApproaching) return STATUS_COLORS.APPROACHING_ETA;
    return STATUS_COLORS.ON_TIME;
  };

  // Center on India by default or driver location
  const centerLat = activeDrivers.length > 0 && activeDrivers[0].lat ? activeDrivers[0].lat : 22.5937;
  const centerLng = activeDrivers.length > 0 && activeDrivers[0].long ? activeDrivers[0].long : 78.9629;
  const defaultCenter = [centerLat, centerLng];
  const defaultZoom = activeDrivers.length > 0 ? 6 : 5;

  return (
    <div 
      className="relative rounded-sm border overflow-hidden flex flex-col font-mono text-xs select-none"
      style={{ 
        height, 
        background: '#0a192f', 
        borderColor: 'var(--crm-line)',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)' 
      }}
    >
      {/* Header Bar */}
      <div className="px-4 py-2.5 bg-[#0e223b] border-b border-[#1e3a5f] flex items-center justify-between z-[1000]">
        <div className="flex items-center gap-2">
          <FiNavigation className="text-[#c9a84c] animate-pulse" size={14} />
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#e2e8f0]">
            Live Drivers Radar & Route Vector ({activeDrivers.length} Online Drivers • {validTrips.length} Active Trips)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[9px] uppercase font-bold tracking-wider">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" /> Driver Logged In
          </span>
          <span className="flex items-center gap-1 text-sky-400">
            <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> Active Route
          </span>
        </div>
      </div>

      {/* OpenStreetMap Tile Canvas */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#071322] z-0">
        <MapContainer 
          center={defaultCenter} 
          zoom={defaultZoom} 
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Render Active Logged-In Drivers Live Markers */}
          {activeDrivers.map((drv, dIdx) => {
            const drvLat = Number(drv.lat) || 28.6139;
            const drvLong = Number(drv.long) || 77.2090;
            const drvName = drv.driverName || drv.name || 'Driver';
            const drvIcon = createDriverIcon(drv.isOnline !== false, drvName);

            return (
              <Marker key={`driver-marker-${drv.driverId || drv._id || dIdx}`} position={[drvLat, drvLong]} icon={drvIcon}>
                <Popup className="custom-leaflet-popup">
                  <div className="p-2 font-mono text-[11px] text-slate-900 leading-tight space-y-1">
                    <div className="font-bold border-b pb-1 text-emerald-700 flex items-center gap-1">
                      <FiTruck /> Driver Live Radar
                    </div>
                    <div><strong>Driver:</strong> {drvName}</div>
                    <div><strong>Truck #:</strong> <span className="font-mono text-blue-700 font-bold">{drv.vehicleNo || drv.assignedVehicleNo || 'Carrier'}</span></div>
                    <div><strong>Coordinates:</strong> {drvLat.toFixed(4)}, {drvLong.toFixed(4)}</div>
                    <div><strong>Status:</strong> <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">● ONLINE / LOGGED IN</span></div>
                    <div><strong>Last Update:</strong> {drv.time || new Date().toLocaleTimeString()}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Render Active Trips Vectors */}
          {validTrips.map((trip, idx) => {
            const origin = getCoords(trip, 'origin');
            const dest = getCoords(trip, 'dest');
            const strokeColor = getTripColor(trip);

            return (
              <React.Fragment key={trip._id || idx}>
                {/* Route Vector Line */}
                <Polyline 
                  positions={[origin, dest]} 
                  pathOptions={{ 
                    color: strokeColor, 
                    weight: 3, 
                    dashArray: trip.status === 'IN_TRANSIT' ? '6, 6' : null 
                  }} 
                />

                {/* Marker A: Origin Pin */}
                <Marker position={origin} icon={markerAIcon}>
                  <Popup className="custom-leaflet-popup">
                    <div className="p-1 font-mono text-[10px] text-slate-800">
                      <strong>Origin (A):</strong> {trip.originCity || trip.origin || 'Origin'}<br/>
                      <strong>Trip:</strong> {trip.tripId || trip.dispatchNumber || trip._id}
                    </div>
                  </Popup>
                </Marker>

                {/* Marker B: Destination Pin */}
                <Marker position={dest} icon={markerBIcon}>
                  <Popup className="custom-leaflet-popup">
                    <div className="p-1 font-mono text-[10px] text-slate-800">
                      <strong>Destination (B):</strong> {trip.destCity || trip.destination || 'Destination'}<br/>
                      <strong>Driver:</strong> {trip.driverName || trip.driver?.name || 'Unassigned'}<br/>
                      <strong>Vehicle:</strong> {trip.vehicleNo || trip.truckNumber || 'N/A'}<br/>
                      <strong>Cargo:</strong> {trip.material || trip.productName || 'Freight'}<br/>
                      <strong>Status:</strong> <span style={{ color: strokeColor, fontWeight: 'bold' }}>{trip.status}</span>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      {/* Footer Active Route Manifest Bar */}
      <div className="px-3 py-2 bg-[#0a182b] border-t border-[#1e3a5f] flex flex-wrap gap-2 items-center text-[9px] z-[1000]">
        <span className="text-[#94a3b8] font-bold uppercase tracking-wider flex items-center gap-1">
          <FiActivity className="text-emerald-400" /> Active Drivers & Routes:
        </span>
        {activeDrivers.length > 0 ? (
          activeDrivers.slice(0, 3).map((d, idx) => (
            <span key={`act-drv-${idx}`} className="px-2 py-1 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded font-bold flex items-center gap-1">
              🚚 {d.driverName || 'Driver'} ({d.vehicleNo || 'Truck'}) — LIVE GPS ({Number(d.lat || 0).toFixed(2)}, {Number(d.long || 0).toFixed(2)})
            </span>
          ))
        ) : null}
        {validTrips.slice(0, 3).map((t, idx) => (
          <span 
            key={t._id || idx}
            onClick={() => setSelectedTrip(t)}
            className="px-2 py-1 bg-[#132a48] hover:bg-[#1a3860] border border-[#1e3a5f] text-[#e2e8f0] rounded cursor-pointer transition flex items-center gap-1"
          >
            <FiMapPin size={10} className="text-[#38bdf8]" />
            Route: {t.originCity || t.origin || 'Origin'} → {t.destCity || t.destination || 'Destination'} ({t.driverName || t.driver?.name || 'Driver'})
          </span>
        ))}
      </div>
    </div>
  );
}
