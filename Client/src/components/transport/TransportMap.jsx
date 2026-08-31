import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiNavigation, FiTruck, FiMapPin } from 'react-icons/fi';

// Custom Leaflet Icons (Marker A, Marker B, Driver Truck Pin)
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

const STATUS_COLORS = {
  ON_TIME: '#16a34a',
  APPROACHING_ETA: '#eab308',
  OVERDUE: '#dc2626'
};

// Known Indian Cities Coordinates Lookup for automatic pin placement
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
  'Kolkata': [22.5726, 88.3639],
  'Chennai': [13.0827, 80.2707],
  'Bangalore': [12.9716, 77.5946]
};

export default function TransportMap({ trips = [], height = '400px', activeTripId = null, onSelectTrip }) {
  const [selectedTrip, setSelectedTrip] = useState(null);

  // Filter valid trips
  const validTrips = trips.filter(t => t && (t.status === 'PLANNED' || t.status === 'LOADING' || t.status === 'IN_TRANSIT' || t.status === 'UNLOADING' || t.status === 'DISPATCHED' || t.status === 'COMPLETED'));

  const getCoords = (trip, type) => {
    if (type === 'origin') {
      if (trip.originLat && trip.originLng) return [trip.originLat, trip.originLng];
      const city = trip.originCity || trip.origin || 'Nagpur';
      return CITY_COORDS[city] || CITY_COORDS['Nagpur'];
    } else {
      if (trip.destLat && trip.destLng) return [trip.destLat, trip.destLng];
      const city = trip.destCity || trip.destination || 'Pune';
      return CITY_COORDS[city] || CITY_COORDS['Pune'];
    }
  };

  const getTripColor = (trip) => {
    if (trip.isOverdue || trip.status === 'OVERDUE' || trip.etaStatus === 'OVERDUE') return STATUS_COLORS.OVERDUE;
    if (trip.etaStatus === 'APPROACHING_ETA' || trip.isApproaching) return STATUS_COLORS.APPROACHING_ETA;
    return STATUS_COLORS.ON_TIME;
  };

  // Center on India by default
  const defaultCenter = [20.5937, 78.9629];
  const defaultZoom = 5;

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
            OpenStreetMap Interactive Radar ({validTrips.length} Active Trips)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[9px] uppercase font-bold tracking-wider">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" /> On Time
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Approaching
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Overdue
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
          {/* CartoDB Dark Matter OpenStreetMap Tile Layer (100% Free, Zero API Key required) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

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
                      <strong>Trip:</strong> {trip.tripId || trip._id}
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

      {/* Fallback Text Placeholder (Requirement: Text placeholder "Route: [Origin] → [Destination]") */}
      <div className="px-3 py-2 bg-[#0a182b] border-t border-[#1e3a5f] flex flex-wrap gap-2 items-center text-[9px] z-[1000]">
        <span className="text-[#94a3b8] font-bold uppercase tracking-wider">Active Route Manifests:</span>
        {validTrips.slice(0, 4).map((t, idx) => (
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
