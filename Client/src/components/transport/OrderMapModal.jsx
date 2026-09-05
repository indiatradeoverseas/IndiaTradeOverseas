import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, FiNavigation, FiMapPin, FiTruck, FiUser, 
  FiCheckCircle, FiShare2, FiExternalLink, FiCrosshair, FiClock, FiDollarSign 
} from 'react-icons/fi';

export default function OrderMapModal({ isOpen, onClose, order, onMarkDelivered }) {
  const [liveGps, setLiveGps] = useState({ lat: 28.6139, long: 77.2090 });
  const [fetchingGps, setFetchingGps] = useState(false);

  useEffect(() => {
    if (isOpen && 'geolocation' in navigator) {
      setFetchingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLiveGps({
            lat: Number(pos.coords.latitude.toFixed(6)),
            long: Number(pos.coords.longitude.toFixed(6))
          });
          setFetchingGps(false);
        },
        (err) => {
          console.log('GPS Fallback active:', err.message);
          setFetchingGps(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const orderId = order.dispatchNumber || order.orderNumber || order._id || 'ORD-ACTIVE';
  const customerName = order.customerName || order.companyName || 'Confirmed Client';
  const material = order.material || order.productCategory || order.productName || 'Cargo Material';
  const weight = order.weightTons || order.quantity || '20 MT';
  const origin = order.origin || order.originCity || 'Delhi ICD Freight Terminal';
  const destination = order.destination || order.destCity || order.city || order.country || 'Destination';
  const freightValue = Number(order.totalFreightAmount || order.freightAmount || order.estimatedValue || order.leadValue || order.freightRate) || 0;
  const status = order.status || order.dispatchStatus || order.stage || 'ORDER_CONFIRMED';
  
  const orderConfirmedBy = order.orderConfirmedBy || order.salesOwner || 'Sales Executive';
  const tripAssignedBy = order.assignedByManager || order.managerName || 'Transport Manager';
  const driverName = order.driverName || 'Assigned Driver';
  const vehicleNo = order.vehicleNo || order.assignedVehicleNo || order.truckNumber || 'Unassigned';

  // Construct Google Maps Live Navigation Link from Origin/Live to Destination
  const googleNavUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&z=11&output=embed`;

  const handleShareWhatsapp = () => {
    const text = `🚚 *LIVE ORDER ROUTE DETAILS*\n` +
      `📦 *Order ID:* ${orderId}\n` +
      `👤 *Client:* ${customerName}\n` +
      `🏗️ *Material:* ${material} (${weight})\n` +
      `📍 *Pickup:* ${origin}\n` +
      `🚩 *Delivery:* ${destination}\n` +
      `👤 *Confirmed By:* ${orderConfirmedBy}\n` +
      `🚛 *Assigned By:* ${tripAssignedBy}\n` +
      `🗺️ *Google Maps Route:* ${googleNavUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 bg-black/85 backdrop-blur-sm" 
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ scale: 0.93, opacity: 0, y: 10 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.93, opacity: 0, y: 10 }} 
          className="relative bg-[var(--crm-bg,#090d16)] border border-[var(--crm-line,#1e293b)] w-full max-w-3xl rounded-xl shadow-2xl z-10 text-left overflow-hidden flex flex-col font-mono max-h-[92vh]"
        >
          {/* Top Modal Header */}
          <div className="p-3.5 sm:p-4 bg-[var(--crm-bg-sunken,#0d1322)] border-b border-[var(--crm-line,#1e293b)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-950/60 border border-amber-900/40 rounded text-amber-400">
                <FiNavigation size={18} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--crm-heading,#f8fafc)] flex items-center gap-2">
                  Live Route & Order Navigation Map
                </h2>
                <span className="text-[10px] text-amber-400 font-bold block">ORDER / TRIP ID: {orderId}</span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-white bg-[var(--crm-bg)] border border-[var(--crm-line)] rounded-lg cursor-pointer transition"
            >
              <FiX size={18} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-4 custom-scrollbar text-xs">
            {/* ─────────────────────────────────────────────────────────────
                TOP LEADS & ORDER DETAILS CARD
               ───────────────────────────────────────────────────────────── */}
            <div className="p-4 bg-[var(--crm-bg-sunken,#0d1322)] border border-[var(--crm-line,#1e293b)] rounded-lg space-y-3">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Order / Trip ID: <strong className="text-amber-400">{orderId}</strong></span>
                  <h1 className="text-base sm:text-lg font-bold text-[var(--crm-heading,#f8fafc)]">{customerName}</h1>
                  <span className="text-amber-300 text-xs font-bold block">Material: {material} ({weight})</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-900/40 text-emerald-400 text-[10px] font-bold uppercase rounded font-mono">
                    {status}
                  </span>
                  <span className="text-amber-400 font-bold text-sm">Value: ₹{Number(freightValue).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Pickup & Delivery Location Box */}
              <div className="p-3 bg-[var(--crm-bg,#090d16)] border border-[var(--crm-line,#1e293b)] rounded space-y-1.5 font-mono text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <span className="text-sm">📍</span>
                  <span>Pickup: {origin}</span>
                </div>
                <div className="flex items-center gap-2 text-sky-400 font-bold">
                  <span className="text-sm">🚩</span>
                  <span>Delivery: {destination}</span>
                </div>
              </div>

              {/* Attribution Details: Order Confirmed By & Trip Assigned By */}
              <div className="pt-2 border-t border-[var(--crm-line,#1e293b)] flex flex-wrap justify-between items-center gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400">Order Confirmed By: </span>
                  <strong className="text-teal-400">{orderConfirmedBy}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Trip Assigned By: </span>
                  <strong className="text-sky-400">{tripAssignedBy}</strong>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation & Delivery Bar */}
            <div className="flex flex-wrap gap-2.5 items-center justify-between">
              <a
                href={googleNavUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-w-[180px] py-2.5 px-3.5 bg-gradient-to-r from-sky-700 to-blue-700 hover:from-sky-600 hover:to-blue-600 text-white font-bold rounded-lg text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 shadow cursor-pointer transition"
              >
                <FiExternalLink size={15} /> Open Live Google Maps
              </a>

              {onMarkDelivered && status !== 'DELIVERED' && (
                <button
                  type="button"
                  onClick={() => onMarkDelivered(order)}
                  className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 shadow cursor-pointer transition animate-pulse"
                >
                  <FiCheckCircle size={16} /> Mark Order Delivered
                </button>
              )}

              <button
                type="button"
                onClick={handleShareWhatsapp}
                className="py-2.5 px-3.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 font-bold rounded-lg text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <FiShare2 size={15} /> Share WhatsApp
              </button>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                BOTTOM GOOGLE MAP LIVE NAVIGATION & TELEMETRY
               ───────────────────────────────────────────────────────────── */}
            <div className="border border-[var(--crm-line,#1e293b)] rounded-lg overflow-hidden space-y-0">
              <div className="p-3 bg-[var(--crm-bg-sunken,#0d1322)] border-b border-[var(--crm-line,#1e293b)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiMapPin className="text-rose-400" size={14} />
                  <span className="text-xs uppercase font-bold text-[var(--crm-heading,#f8fafc)]">
                    Live GPS Radar: {origin} &rarr; {destination}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {fetchingGps ? 'Locating GPS...' : `Live Coordinates: ${liveGps.lat}, ${liveGps.long}`}
                </span>
              </div>

              {/* Map Canvas iframe */}
              <div className="relative w-full h-[320px] bg-slate-950">
                <iframe
                  title="Google Map Live Navigation"
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: 'invert(90%) hue-rotate(180%)' }}
                  src={mapEmbedUrl}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
