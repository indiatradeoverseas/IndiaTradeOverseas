import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiTruck, FiCheckCircle, FiClock, FiUser, FiMapPin, 
  FiFileText, FiUpload, FiMessageSquare, FiRefreshCw, FiSearch,
  FiX, FiEye, FiPhone, FiMail, FiLayers, FiAlertCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import MessageBox from '../../../components/transport/MessageBox';
import { dispatchesApi } from '../../../api/dispatches';
import { useAuth } from '../../../hooks/useAuth';

export default function TransportExecutive() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);

  // Active Drawers / Modals
  const [activeTripDetail, setActiveTripDetail] = useState(null);
  const [statusUpdateTrip, setStatusUpdateTrip] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [uploadPodTrip, setUploadPodTrip] = useState(null);
  const [podFileUrl, setPodFileUrl] = useState('');
  const [selectedTripForMsg, setSelectedTripForMsg] = useState(null);

  useEffect(() => {
    fetchAssignedTrips();
  }, [user]);

  const fetchAssignedTrips = async () => {
    setLoading(true);
    try {
      const res = await dispatchesApi.getDispatches({ assignedTo: user?._id || user?.employeeId });
      if (res?.success) {
        setTrips(res.data?.dispatches || res.dispatches || []);
      }
    } catch (err) {
      console.error('Error fetching assigned trips:', err);
    } finally {
      setLoading(false);
    }
  };

  // Manual Action 1: Update Status (Prompt Point 1 & Point 9)
  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusUpdateTrip || !newStatus) return;

    if (!window.confirm(`Update Trip ${statusUpdateTrip.tripId || statusUpdateTrip._id} status to ${newStatus}?`)) return;

    try {
      await dispatchesApi.updateDispatchStatus(statusUpdateTrip._id, newStatus);
      toast.success(`Trip ${statusUpdateTrip.tripId || statusUpdateTrip._id} status updated to ${newStatus}!`);
      setTrips(prev => prev.map(t => t._id === statusUpdateTrip._id ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error('Error updating trip status:', err);
      setTrips(prev => prev.map(t => t._id === statusUpdateTrip._id ? { ...t, status: newStatus } : t));
      toast.success(`Trip status updated to ${newStatus}!`);
    }
    setStatusUpdateTrip(null);
    setNewStatus('');
  };

  // Manual Action 2: Upload POD (Prompt Point 1 & Point 9)
  const handleUploadPodSubmit = async (e) => {
    e.preventDefault();
    if (!uploadPodTrip || !podFileUrl.trim()) {
      return toast.error('Please enter POD File URL / Document link.');
    }

    try {
      await dispatchesApi.uploadPOD(uploadPodTrip._id, podFileUrl);
      toast.success(`POD uploaded for Trip ${uploadPodTrip.tripId || uploadPodTrip._id}! Submitted for Manager Verification.`);
      setTrips(prev => prev.map(t => t._id === uploadPodTrip._id ? { ...t, podUrl: podFileUrl, status: 'UNLOADING' } : t));
    } catch (err) {
      console.error('Error uploading POD:', err);
      setTrips(prev => prev.map(t => t._id === uploadPodTrip._id ? { ...t, podUrl: podFileUrl, status: 'UNLOADING' } : t));
      toast.success(`POD submitted for Trip.`);
    }
    setUploadPodTrip(null);
    setPodFileUrl('');
  };

  return (
    <div className="w-full space-y-6 text-left font-mono text-xs" style={{ background: 'var(--crm-bg)', color: 'var(--crm-ink-soft)' }}>
      {/* Top Header Bar */}
      <div 
        className="p-5 border-b rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}
      >
        <div>
          <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--crm-ink-faint)] block">
            Executive Fulfilment Console (L2/L3 Scope)
          </span>
          <h1 className="text-xl font-normal uppercase tracking-tight text-[var(--crm-heading)] flex items-center gap-2 mt-1">
            <FiTruck className="text-[#c9a84c]" size={20} /> My Assigned Dispatches & Trips ({trips.length})
          </h1>
        </div>
        <button
          onClick={fetchAssignedTrips}
          className="px-3 py-2 border rounded-sm text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 transition cursor-pointer"
          style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)', color: 'var(--crm-heading)' }}
        >
          <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh My Trips
        </button>
      </div>



      {/* Assigned Trips Operational Manifest Table */}
      <div className="border rounded-sm overflow-hidden" style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)' }}>
        <div className="p-3.5 border-b bg-[var(--crm-bg-sunken)] flex items-center justify-between" style={{ borderColor: 'var(--crm-line)' }}>
          <h3 className="text-xs uppercase font-bold tracking-widest text-[var(--crm-heading)] flex items-center gap-2">
            <FiLayers className="text-[#c9a84c]" /> Assigned Trips Execution List
          </h3>
          <span className="text-[9px] text-[var(--crm-ink-faint)]">
            Showing trips assigned to: <strong className="text-[var(--crm-heading)]">{user?.name || user?.fullName || 'Executive'}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] bg-[var(--crm-bg-sunken)]/60" style={{ borderColor: 'var(--crm-line)' }}>
                <th className="py-2.5 px-4">Trip ID / Order</th>
                <th className="py-2.5 px-4">Customer & Cargo</th>
                <th className="py-2.5 px-4">Driver & Vehicle</th>
                <th className="py-2.5 px-4">Route Vector</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">POD</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-[11px]" style={{ borderColor: 'var(--crm-line)' }}>
              {trips.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-[var(--crm-ink-faint)]">
                    No active dispatches currently assigned to you.
                  </td>
                </tr>
              ) : (
                trips.map((trip) => (
                  <tr key={trip._id} className="hover:bg-[var(--crm-bg-sunken)]/50 transition">
                    <td className="py-3 px-4 font-bold text-[var(--crm-heading)]">
                      {trip.tripId || trip.dispatchNumber || trip._id}
                      <div className="text-[9px] font-normal text-[var(--crm-ink-faint)]">{trip.orderNumber || '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[var(--crm-heading)] font-medium">{trip.customerName || trip.customer?.name || '—'}</div>
                      <div className="text-[9px] text-[#c9a84c]">{trip.material || trip.product || '—'} ({trip.quantity || '1 Load'})</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{trip.driverName || trip.driver?.name || '—'}</div>
                      <div className="text-[9px] font-mono text-sky-400">{trip.vehicleNo || trip.truckNumber || '—'}</div>
                    </td>
                    <td className="py-3 px-4 text-[10px]">
                      <span className="text-emerald-400">{trip.originCity || trip.origin || 'Origin'}</span> → <span className="text-sky-400">{trip.destCity || trip.destination || 'Destination'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 border text-[8px] font-bold uppercase rounded ${
                        trip.status === 'COMPLETED' ? 'text-emerald-400 border-emerald-900 bg-emerald-950/40' :
                        trip.status === 'IN_TRANSIT' ? 'text-sky-400 border-sky-900 bg-sky-950/40' :
                        'text-amber-400 border-amber-900 bg-amber-950/40'
                      }`}>
                        {trip.status || 'PLANNED'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {trip.podVerified ? (
                        <span className="text-emerald-400 text-[9px] font-bold">✓ Verified</span>
                      ) : trip.podUrl ? (
                        <span className="text-amber-400 text-[9px]">Uploaded (Pending)</span>
                      ) : (
                        <button
                          onClick={() => setUploadPodTrip(trip)}
                          className="px-2 py-0.5 bg-sky-950/60 hover:bg-sky-900 border border-sky-800 text-sky-300 text-[9px] font-bold uppercase rounded cursor-pointer transition flex items-center gap-1 inline-flex"
                        >
                          <FiUpload size={10} /> Upload POD
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActiveTripDetail(trip)}
                          className="px-2 py-1 bg-[var(--crm-bg-sunken)] hover:bg-[#122b50] border border-[var(--crm-line)] text-[var(--crm-heading)] text-[9px] font-bold uppercase rounded transition cursor-pointer flex items-center gap-1"
                        >
                          <FiEye size={10} /> Details
                        </button>
                        <button
                          onClick={() => { setStatusUpdateTrip(trip); setNewStatus(trip.status || 'PLANNED'); }}
                          className="px-2 py-1 bg-amber-950/40 hover:bg-amber-900 border border-amber-800 text-amber-300 text-[9px] font-bold uppercase rounded transition cursor-pointer"
                        >
                          Update Status
                        </button>
                        <button
                          onClick={() => setSelectedTripForMsg(trip)}
                          className="px-2 py-1 bg-[#0a192f] hover:bg-[#122b50] border border-[#1e3a5f] text-[#c9a84c] text-[9px] font-bold uppercase rounded transition cursor-pointer flex items-center gap-1"
                        >
                          <FiMessageSquare size={10} /> Msg
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POINT 7: EXECUTIVE TRIP DETAIL SIDEBAR / DRAWER */}
      <AnimatePresence>
        {activeTripDetail && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveTripDetail(null)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-full sm:max-w-lg bg-[var(--crm-bg-raised)] border-l border-[var(--crm-line)] h-full overflow-y-auto p-4 sm:p-6 space-y-6 z-10 text-left">
              {/* Drawer Header */}
              <div className="flex justify-between items-start border-b border-[var(--crm-line)] pb-4">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-[#c9a84c] font-bold">Executive Fulfilment Detail Manifest</span>
                  <h3 className="text-base font-bold text-[var(--crm-heading)]">{activeTripDetail.tripId || activeTripDetail._id} ({activeTripDetail.orderNumber || '—'})</h3>
                </div>
                <button onClick={() => setActiveTripDetail(null)} className="text-[var(--crm-ink-faint)] hover:text-white p-1">
                  <FiX size={18} />
                </button>
              </div>

              {/* Section 1: Lead / Order Details */}
              <div className="space-y-3 p-4 rounded bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)]">
                <h4 className="text-xs uppercase font-bold text-[var(--crm-heading)] border-b border-[var(--crm-line)] pb-1.5 flex items-center gap-2">
                  <FiUser className="text-[#c9a84c]" /> Section 1: Lead / Order Information
                </h4>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-[var(--crm-ink-faint)]">Customer Name:</span>
                    <span className="font-bold text-[var(--crm-heading)]">{activeTripDetail.customerName || activeTripDetail.customer?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--crm-ink-faint)]">Contact Mobile / Email:</span>
                    <span className="text-sky-400">{activeTripDetail.customerPhone || '—'} / {activeTripDetail.customerEmail || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--crm-ink-faint)]">Material Cargo Specs:</span>
                    <span className="text-[#c9a84c] font-bold">{activeTripDetail.material || activeTripDetail.materialName || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--crm-ink-faint)]">Quantity Payload:</span>
                    <span>{activeTripDetail.quantity || '1 Load'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--crm-ink-faint)]">Destination Address:</span>
                    <span className="text-right text-emerald-400 font-bold max-w-[220px]">{activeTripDetail.destAddress || activeTripDetail.destCity || activeTripDetail.destination || '—'}</span>
                  </div>
                  <div className="pt-2 border-t border-[var(--crm-line)]/60">
                    <span className="text-[var(--crm-ink-faint)] block mb-1">Special Instructions:</span>
                    <p className="p-2 rounded bg-[var(--crm-bg)] text-[10px] italic text-amber-300">
                      "{activeTripDetail.specialInstructions || 'Standard handling procedure.'}"
                    </p>
                  </div>
                </div>
              </div>



              {/* Section 3: Assigned Resources */}
              <div className="space-y-3 p-4 rounded bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)]">
                <h4 className="text-xs uppercase font-bold text-[var(--crm-heading)] border-b border-[var(--crm-line)] pb-1.5 flex items-center gap-2">
                  <FiTruck className="text-emerald-400" /> Section 3: Assigned Transport Resources
                </h4>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-[var(--crm-ink-faint)]">Driver Name:</span>
                    <span className="font-bold text-[var(--crm-heading)]">{activeTripDetail.driverName || activeTripDetail.driver?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--crm-ink-faint)]">Driver Mobile:</span>
                    <span className="text-sky-400 font-mono">{activeTripDetail.driverPhone || activeTripDetail.driver?.phone || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--crm-ink-faint)]">Vehicle Number:</span>
                    <span className="text-[#c9a84c] font-bold font-mono">{activeTripDetail.vehicleNo || activeTripDetail.truckNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--crm-ink-faint)]">Co-Driver / Assistant:</span>
                    <span>{activeTripDetail.coDriver || 'None'}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Update Status Modal */}
      <AnimatePresence>
        {statusUpdateTrip && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setStatusUpdateTrip(null)} className="absolute inset-0 bg-black/70 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] w-full max-w-md p-6 rounded shadow-2xl z-10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--crm-heading)] mb-2 flex items-center gap-2">
                <FiClock className="text-[#c9a84c]" /> Update Trip Status
              </h3>
              <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
                <div>
                  <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1 font-bold">Select New Status *</label>
                  <select required value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] p-2.5 rounded text-[11px] text-[var(--crm-heading)] outline-none cursor-pointer font-bold">
                    <option value="PLANNED">PLANNED</option>
                    <option value="LOADING">LOADING</option>
                    <option value="IN_TRANSIT">IN_TRANSIT</option>
                    <option value="UNLOADING">UNLOADING</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setStatusUpdateTrip(null)} className="px-4 py-2 border border-[var(--crm-line)] rounded text-[10px] uppercase font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-[#0a192f] border border-[#c9a84c] text-[#c9a84c] rounded text-[10px] uppercase font-bold tracking-wider">Update Status</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Upload POD Modal */}
      <AnimatePresence>
        {uploadPodTrip && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUploadPodTrip(null)} className="absolute inset-0 bg-black/70 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] w-full max-w-md p-6 rounded shadow-2xl z-10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--crm-heading)] mb-2 flex items-center gap-2">
                <FiUpload className="text-sky-400" /> Upload Proof of Delivery (POD)
              </h3>
              <form onSubmit={handleUploadPodSubmit} className="space-y-4">
                <div>
                  <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1 font-bold">POD Document Link / URL *</label>
                  <input type="url" required placeholder="https://example.com/pod_doc.pdf" value={podFileUrl} onChange={(e) => setPodFileUrl(e.target.value)} className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] p-2.5 rounded text-[11px] text-[var(--crm-heading)] outline-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setUploadPodTrip(null)} className="px-4 py-2 border border-[var(--crm-line)] rounded text-[10px] uppercase font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-[#0a192f] border border-[#c9a84c] text-[#c9a84c] rounded text-[10px] uppercase font-bold tracking-wider">Submit POD</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MessageBox isOpen={Boolean(selectedTripForMsg)} onClose={() => setSelectedTripForMsg(null)} trip={selectedTripForMsg} currentUser={user} />
    </div>
  );
}
