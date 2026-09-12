import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiTruck, FiAlertCircle, FiMessageSquare, FiArrowRight, FiNavigation, FiActivity, FiUser, FiMapPin } from 'react-icons/fi';
import TransportMap from '../../../components/transport/TransportMap';
import { socketService } from '../../../services/socket';
import { dispatchesApi } from '../../../api/dispatches';

export default function FounderTransportWidget({ summary }) {
  const activeDispatches = summary?.transport?.total || 0;
  const inTransit = summary?.transport?.inTransit || 0;
  const overdue = summary?.transport?.issueRaised || 0;
  const pendingPod = summary?.transport?.pending || 0;

  const [trips, setTrips] = useState([]);
  const [activeDriversMap, setActiveDriversMap] = useState({});

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await dispatchesApi.getDispatches();
        const fetched = res.data?.dispatches || res.dispatches || (Array.isArray(res.data) ? res.data : []);
        setTrips(fetched);

        const initialActiveMap = {};
        fetched.forEach(t => {
          if (t.driverName && t.driverName !== '—') {
            const key = t.driverId || t.driverName;
            initialActiveMap[key] = {
              driverId: key,
              driverName: t.driverName,
              vehicleNo: t.vehicleNo || t.vehicleNumber || 'Carrier Truck',
              lat: t.originLat || (t.destination === 'Patna' ? 25.5941 : 28.6139),
              long: t.originLng || (t.destination === 'Patna' ? 85.1376 : 77.2090),
              isOnline: t.status === 'IN_TRANSIT' || t.status === 'LOADING',
              time: 'Active'
            };
          }
        });
        setActiveDriversMap(prev => ({ ...initialActiveMap, ...prev }));
      } catch (err) {
        console.error('Error fetching trips for founder transport widget:', err);
      }
    };

    fetchTrips();
  }, []);

  // Real-Time Driver Geolocation & Socket Updates Listener
  useEffect(() => {
    const handleDriverGpsEvent = (e) => {
      if (e.detail && (e.detail.driverId || e.detail.driverName)) {
        const key = e.detail.driverId || e.detail.driverName;
        setActiveDriversMap(prev => ({
          ...prev,
          [key]: {
            driverId: key,
            driverName: e.detail.driverName || 'Driver',
            vehicleNo: e.detail.vehicleNo || 'Carrier Truck',
            lat: e.detail.lat || 28.6139,
            long: e.detail.long || 77.2090,
            isOnline: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        }));
      }
    };

    window.addEventListener('ito_driver_gps_update_event', handleDriverGpsEvent);

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('driver_location_update', (data) => {
        if (data && (data.driverId || data.driverName)) {
          const key = data.driverId || data.driverName;
          setActiveDriversMap(prev => ({
            ...prev,
            [key]: {
              driverId: key,
              driverName: data.driverName || 'Driver',
              vehicleNo: data.vehicleNo || 'Truck',
              lat: data.lat || 28.6139,
              long: data.long || 77.2090,
              isOnline: true,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          }));
        }
      });
    }

    return () => {
      window.removeEventListener('ito_driver_gps_update_event', handleDriverGpsEvent);
      if (socket) {
        socket.off('driver_location_update');
      }
    };
  }, []);

  const activeDriversList = Object.values(activeDriversMap);

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="border rounded-sm overflow-hidden flex flex-col font-mono text-xs text-left"
      style={{ 
        background: 'var(--crm-bg-raised)', 
        borderColor: 'var(--crm-line)',
        boxShadow: 'var(--crm-shadow)' 
      }}
    >
      {/* Header */}
      <div 
        className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}
      >
        <div className="flex items-center gap-2">
          <FiTruck size={16} className="text-[#c9a84c]" />
          <h3 className="text-xs uppercase font-bold tracking-widest text-[var(--crm-heading)]">
            Transport Operations & Live Driver GPS Telemetry
          </h3>
        </div>
        <Link
          to="/crm/transport/manager?tab=DASHBOARD"
          className="px-3 py-1.5 bg-[#0a192f] hover:bg-[#122b50] border border-[#c9a84c] text-[#c9a84c] hover:text-white rounded text-[9px] uppercase font-bold tracking-wider transition flex items-center gap-1.5 cursor-pointer"
        >
          Go to Transport Operations <FiArrowRight size={11} />
        </Link>
      </div>

      {/* KPI Grid Mini */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 border rounded bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
          <span className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block">Active Trips</span>
          <span className="text-xl font-light text-[var(--crm-heading)] mt-0.5 block">{activeDispatches}</span>
        </div>
        <div className="p-3 border rounded bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
          <span className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block">In Transit</span>
          <span className="text-xl font-light text-sky-400 mt-0.5 block">{inTransit}</span>
        </div>
        <div className="p-3 border rounded bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
          <span className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block">Pending POD</span>
          <span className="text-xl font-light text-amber-400 mt-0.5 block">{pendingPod}</span>
        </div>
        <div className="p-3 border rounded bg-rose-950/20" style={{ borderColor: 'rgba(220, 38, 38, 0.4)' }}>
          <span className="text-[8px] uppercase tracking-wider text-rose-400 font-bold block">Overdue Alerts</span>
          <span className="text-xl font-light text-rose-400 mt-0.5 block">{overdue}</span>
        </div>
      </div>

      {/* Live Driver GPS Telemetry Radar Map Section */}
      <div className="mx-4 mb-4 border rounded-sm overflow-hidden" style={{ borderColor: 'var(--crm-line)' }}>
        <div className="p-3 border-b bg-[#0d1117] flex items-center justify-between" style={{ borderColor: 'var(--crm-line)' }}>
          <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5 font-serif tracking-wider">
            <FiNavigation className="animate-pulse" size={13} /> Live Drivers Radar Map (Real-Time Driver GPS Tracking)
          </span>
          <span className="text-[8px] text-emerald-400 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" /> Live Driver Telemetry ({activeDriversList.length} Online)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <TransportMap 
              trips={trips} 
              activeDrivers={activeDriversList}
              height="360px"
            />
          </div>

          <div className="p-3 border-t lg:border-t-0 lg:border-l space-y-2.5 bg-[#090b0e] overflow-y-auto max-h-[360px]" style={{ borderColor: 'var(--crm-line)' }}>
            <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-800 pb-1 flex items-center justify-between">
              <span>Active Drivers ({activeDriversList.length})</span>
              <FiActivity className="text-emerald-400" />
            </div>

            {activeDriversList.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-slate-500 italic">
                No active driver logged in via mobile app yet. Listening for GPS updates...
              </div>
            ) : (
              activeDriversList.map((drv, dIdx) => (
                <div key={drv.driverId || dIdx} className="p-2 rounded border bg-slate-900/80 border-slate-800 space-y-1 transition hover:border-[#c9a84c]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-[10px] flex items-center gap-1">
                      <FiUser className="text-[#c9a84c]" size={11} /> {drv.driverName}
                    </span>
                    <span className="px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[8px] font-bold uppercase rounded">
                      ● ONLINE
                    </span>
                  </div>
                  <div className="text-[9px] text-sky-400 font-mono font-bold">
                    Truck: {drv.vehicleNo || 'Carrier Truck'}
                  </div>
                  <div className="text-[9px] text-slate-400 flex items-center gap-1">
                    <FiMapPin size={9} className="text-amber-400" /> GPS: {Number(drv.lat || 0).toFixed(4)}, {Number(drv.long || 0).toFixed(4)}
                  </div>
                  <div className="text-[8px] text-slate-500 text-right">
                    Updated: {drv.time || 'Just now'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
