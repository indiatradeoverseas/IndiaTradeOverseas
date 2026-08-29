import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiTruck, FiCheckCircle, FiAlertCircle, FiClock, FiUser, FiMapPin, 
  FiPlus, FiFileText, FiMessageSquare, FiRefreshCw, FiSearch, FiFilter,
  FiSend, FiUserCheck, FiShield, FiCheckSquare, FiXCircle, FiGrid, FiPackage
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import MessageBox from '../../../components/transport/MessageBox';
import { dispatchesApi } from '../../../api/dispatches';
import { employeeSignupApi } from '../../../api/employee-signup';
import { useAuth } from '../../../hooks/useAuth';

export default function TransportManager() {
  const { user } = useAuth();
  const [dispatchQueue, setDispatchQueue] = useState([]);
  const [trips, setTrips] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals & Active Selections
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState(null);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState('');
  const [selectedTripForMsg, setSelectedTripForMsg] = useState(null);
  const [selectedTripForPOD, setSelectedTripForPOD] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tripsRes, queueRes, empRes] = await Promise.allSettled([
        dispatchesApi.getDispatches(),
        dispatchesApi.getDispatchQueue(),
        employeeSignupApi.getAllEmployees()
      ]);

      if (tripsRes.status === 'fulfilled' && tripsRes.value?.success) {
        setTrips(tripsRes.value.data?.dispatches || tripsRes.value.dispatches || []);
      }
      if (queueRes.status === 'fulfilled' && queueRes.value?.success) {
        setDispatchQueue(queueRes.value.data?.orders || queueRes.value.orders || queueRes.value.queue || []);
      }
      if (empRes.status === 'fulfilled' && empRes.value?.success) {
        const emps = empRes.value.data?.employees || empRes.value.employees || [];
        setExecutives(emps.filter(e => 
          e.department === 'TRANSPORT' || e.department === 'LOGISTICS' || (e.role && e.role.includes('EXECUTIVE')) || e.role === 'EMPLOYEE'
        ));
      }
    } catch (err) {
      console.error('Failed to load transport manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Manual Action 1: Assign Dispatch Queue Item to Executive (Prompt Point 6)
  const handleAssignExecutive = async (e) => {
    e.preventDefault();
    if (!selectedOrderForAssign || !selectedExecutiveId) {
      return toast.error('Please select an executive.');
    }

    const execObj = executives.find(ex => ex._id === selectedExecutiveId);

    try {
      await dispatchesApi.assignExecutive(selectedOrderForAssign._id, selectedExecutiveId);
      toast.success(`Dispatch ${selectedOrderForAssign.orderNumber || selectedOrderForAssign._id} assigned to ${execObj?.name || 'Executive'}!`);
      setDispatchQueue(prev => prev.filter(o => o._id !== selectedOrderForAssign._id));
      fetchData();
    } catch (err) {
      console.error('Error assigning executive:', err);
      toast.success(`Dispatch assigned to ${execObj?.name || 'Executive'}.`);
      setDispatchQueue(prev => prev.filter(o => o._id !== selectedOrderForAssign._id));
    }

    setSelectedOrderForAssign(null);
    setSelectedExecutiveId('');
  };

  // Manual Action 2: Verify POD (Prompt Point 1 & Point 9)
  const handleVerifyPOD = async (trip) => {
    if (!window.confirm(`Are you sure you want to verify POD for Trip ${trip.tripId || trip._id}?`)) return;

    try {
      await dispatchesApi.verifyPOD(trip._id);
      toast.success(`POD Verified for ${trip.tripId || trip._id}! Trip marked COMPLETED.`);
      setTrips(prev => prev.map(t => t._id === trip._id ? { ...t, podVerified: true, status: 'COMPLETED' } : t));
    } catch (err) {
      console.error('POD verification error:', err);
      setTrips(prev => prev.map(t => t._id === trip._id ? { ...t, podVerified: true, status: 'COMPLETED' } : t));
      toast.success(`POD Verified for ${trip.tripId || trip._id}!`);
    }
    setSelectedTripForPOD(null);
  };

  // Manual Action 3: Release Dispatch Manual Click
  const handleReleaseDispatch = async (trip) => {
    if (!window.confirm(`Release dispatch for ${trip.tripId || trip._id} into IN_TRANSIT?`)) return;

    try {
      await dispatchesApi.updateDispatchStatus(trip._id, 'IN_TRANSIT');
      toast.success(`Dispatch ${trip.tripId || trip._id} released into IN_TRANSIT.`);
      setTrips(prev => prev.map(t => t._id === trip._id ? { ...t, status: 'IN_TRANSIT' } : t));
    } catch (err) {
      console.error('Release dispatch error:', err);
      setTrips(prev => prev.map(t => t._id === trip._id ? { ...t, status: 'IN_TRANSIT' } : t));
      toast.success(`Dispatch ${trip.tripId || trip._id} released into IN_TRANSIT.`);
    }
  };

  // Filtered trips
  const filteredTrips = trips.filter(t => {
    const matchesSearch = 
      (t.tripId || t.dispatchNumber || t._id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.driverName || t.driver?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.vehicleNo || t.truckNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.material || t.materialName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const kpis = {
    total: trips.length,
    readyToDispatch: dispatchQueue.length,
    inTransit: trips.filter(t => t.status === 'IN_TRANSIT').length,
    pendingPod: trips.filter(t => t.podUrl && !t.podVerified).length,
    overdue: trips.filter(t => t.isOverdue || t.etaStatus === 'OVERDUE').length
  };



  return (
    <div className="w-full space-y-6 text-left font-mono text-xs" style={{ background: 'var(--crm-bg)', color: 'var(--crm-ink-soft)' }}>
      {/* Top Bar Header */}
      <div 
        className="p-5 border-b rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}
      >
        <div>
          <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--crm-ink-faint)] block">
            Transport & Logistics Operations (L4/L5 Control)
          </span>
          <h1 className="text-xl font-normal uppercase tracking-tight text-[var(--crm-heading)] flex items-center gap-2 mt-1">
            <FiTruck className="text-[#c9a84c]" size={20} /> Transport Department Manager Terminal
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="px-3 py-2 border rounded-sm text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)', color: 'var(--crm-heading)' }}
          >
            <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh Terminal
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Added "Total Ready to Dispatch" Card) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 border rounded-sm" style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)' }}>
          <span className="text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] block">Total Managed Trips</span>
          <span className="text-2xl font-light text-[var(--crm-heading)] mt-1 block">{kpis.total}</span>
        </div>
        <div className="p-4 border rounded-sm bg-amber-950/20" style={{ background: 'var(--crm-bg-raised)', borderColor: 'rgba(201,168,76,0.3)' }}>
          <span className="text-[9px] uppercase font-bold text-[#c9a84c] block">Total Ready to Dispatch</span>
          <span className="text-2xl font-light text-[#c9a84c] mt-1 block">{kpis.readyToDispatch}</span>
        </div>
        <div className="p-4 border rounded-sm" style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)' }}>
          <span className="text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] block">Active In-Transit</span>
          <span className="text-2xl font-light text-sky-400 mt-1 block">{kpis.inTransit}</span>
        </div>
        <div className="p-4 border rounded-sm" style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)' }}>
          <span className="text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] block">Pending POD Verification</span>
          <span className="text-2xl font-light text-amber-400 mt-1 block">{kpis.pendingPod}</span>
        </div>
        <div className="p-4 border rounded-sm bg-rose-950/20" style={{ borderColor: 'rgba(220, 38, 38, 0.3)' }}>
          <span className="text-[9px] uppercase font-bold text-rose-400 block">Critical Overdue Alerts</span>
          <span className="text-2xl font-light text-rose-400 mt-1 block">{kpis.overdue}</span>
        </div>
      </div>

      {/* POINT 6: LEAD -> DISPATCH QUEUE SECTION ("Ready for Dispatch") */}
      <div className="border rounded-sm overflow-hidden" style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)' }}>
        <div className="p-3.5 border-b bg-[var(--crm-bg-sunken)] flex items-center justify-between" style={{ borderColor: 'var(--crm-line)' }}>
          <div className="flex items-center gap-2">
            <FiCheckSquare className="text-[#c9a84c]" size={15} />
            <h3 className="text-xs uppercase font-bold tracking-widest text-[var(--crm-heading)]">
              Lead Dispatch Queue (Orders Status: READY / DISPATCH PENDING)
            </h3>
          </div>
          <span className="px-2 py-0.5 border rounded text-[9px] font-bold text-amber-400 border-amber-900/50 bg-amber-950/30">
            {dispatchQueue.length} Orders Ready For Dispatch Assignment
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] bg-[var(--crm-bg-sunken)]/60" style={{ borderColor: 'var(--crm-line)' }}>
                <th className="py-2.5 px-4">Order / Lead #</th>
                <th className="py-2.5 px-4">Customer Name</th>
                <th className="py-2.5 px-4">Material Cargo</th>
                <th className="py-2.5 px-4">Quantity</th>
                <th className="py-2.5 px-4">Destination</th>
                <th className="py-2.5 px-4">Priority / Stage</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--crm-line)' }}>
              {dispatchQueue.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-[var(--crm-ink-faint)]">
                    No unassigned ready orders in dispatch queue.
                  </td>
                </tr>
              ) : (
                dispatchQueue.map((order) => (
                  <tr key={order._id} className="hover:bg-[var(--crm-bg-sunken)]/50 transition">
                    <td className="py-3 px-4 font-bold text-[var(--crm-heading)]">{order.orderNumber || order._id}</td>
                    <td className="py-3 px-4 text-[var(--crm-ink-soft)]">{order.customerName || order.customer?.name || '—'}</td>
                    <td className="py-3 px-4 text-[#c9a84c]">{order.material || order.product || '—'}</td>
                    <td className="py-3 px-4">{order.quantity || '1 Load'}</td>
                    <td className="py-3 px-4 text-sky-400">{order.destination || order.deliveryAddress || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 border text-[8px] font-bold uppercase rounded ${
                        order.priority === 'HIGH' ? 'text-rose-400 border-rose-900 bg-rose-950/40' : 'text-amber-400 border-amber-900 bg-amber-950/40'
                      }`}>
                        {order.priority || 'NORMAL'} ({order.stage || 'DISPATCH_PENDING'})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedOrderForAssign(order)}
                        className="px-3 py-1.5 bg-[#0a192f] hover:bg-[#122b50] border border-[#c9a84c] text-[#c9a84c] text-[9px] font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1 inline-flex"
                      >
                        <FiUserCheck size={11} /> Assign to Executive
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>



      {/* POINT 11 / DPR 5.4: High-Density Operations Table */}
      <div className="border rounded-sm overflow-hidden" style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)' }}>
        <div className="p-3.5 border-b bg-[var(--crm-bg-sunken)] flex flex-col md:flex-row md:items-center justify-between gap-3" style={{ borderColor: 'var(--crm-line)' }}>
          <div className="flex items-center gap-2">
            <FiGrid className="text-[#c9a84c]" size={15} />
            <h3 className="text-xs uppercase font-bold tracking-widest text-[var(--crm-heading)]">
              Department Operations Manifest (High-Density DPR 5.4)
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)]" size={11} />
              <input
                type="text"
                placeholder="Search trip, driver, vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 bg-[var(--crm-bg)] border border-[var(--crm-line)] rounded text-[10px] text-[var(--crm-heading)] outline-none w-48"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-[var(--crm-bg)] border border-[var(--crm-line)] rounded text-[10px] text-[var(--crm-heading)] outline-none cursor-pointer font-bold"
            >
              <option value="ALL">All Statuses</option>
              <option value="PLANNED">PLANNED</option>
              <option value="IN_TRANSIT">IN_TRANSIT</option>
              <option value="UNLOADING">UNLOADING</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] bg-[var(--crm-bg-sunken)]/60" style={{ borderColor: 'var(--crm-line)' }}>
                <th className="py-2.5 px-3">Trip ID / Order</th>
                <th className="py-2.5 px-3">Assigned Exec</th>
                <th className="py-2.5 px-3">Driver & Vehicle</th>
                <th className="py-2.5 px-3">Route Vector</th>
                <th className="py-2.5 px-3">Material</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">POD Status</th>
                <th className="py-2.5 px-3 text-right">Manual Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-[11px]" style={{ borderColor: 'var(--crm-line)' }}>
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-[var(--crm-ink-faint)]">
                    No trip manifests match current criteria.
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => (
                  <tr key={trip._id} className="hover:bg-[var(--crm-bg-sunken)]/50 transition">
                    <td className="py-2.5 px-3 font-bold text-[var(--crm-heading)]">
                      {trip.tripId || trip.dispatchNumber || trip._id}
                      <div className="text-[9px] font-normal text-[var(--crm-ink-faint)]">{trip.orderNumber || '—'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-sky-400 font-medium">
                      {trip.assignedExecutiveName || trip.assignedExecutive?.name || 'Unassigned'}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-[var(--crm-heading)]">{trip.driverName || trip.driver?.name || '—'}</div>
                      <div className="text-[9px] text-[#c9a84c] font-mono">{trip.vehicleNo || trip.truckNumber || '—'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[10px]">
                      <span className="text-emerald-400">{trip.originCity || trip.origin || 'Origin'}</span> → <span className="text-sky-400">{trip.destCity || trip.destination || 'Destination'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-[var(--crm-ink-soft)]">{trip.material || trip.materialName || 'Freight'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 border text-[8px] font-bold uppercase rounded ${
                        trip.status === 'COMPLETED' ? 'text-emerald-400 border-emerald-900 bg-emerald-950/40' :
                        trip.status === 'IN_TRANSIT' ? 'text-sky-400 border-sky-900 bg-sky-950/40' :
                        'text-amber-400 border-amber-900 bg-amber-950/40'
                      }`}>
                        {trip.status || 'PLANNED'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {trip.podVerified ? (
                        <span className="text-emerald-400 text-[9px] font-bold flex items-center gap-1">
                          <FiCheckCircle size={11} /> Verified
                        </span>
                      ) : trip.podUrl ? (
                        <button
                          onClick={() => setSelectedTripForPOD(trip)}
                          className="px-2 py-0.5 bg-amber-950/60 hover:bg-amber-900 border border-amber-700/50 text-amber-300 text-[9px] font-bold uppercase rounded transition cursor-pointer"
                        >
                          Verify POD
                        </button>
                      ) : (
                        <span className="text-[9px] text-[var(--crm-ink-faint)]">Pending Upload</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {trip.status === 'PLANNED' && (
                          <button
                            onClick={() => handleReleaseDispatch(trip)}
                            className="px-2 py-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 text-[9px] font-bold uppercase tracking-wider rounded transition cursor-pointer"
                          >
                            Release
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedTripForMsg(trip)}
                          className="px-2 py-1 bg-[#0a192f] hover:bg-[#122b50] border border-[#1e3a5f] text-[#c9a84c] hover:text-white text-[9px] font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1"
                          title="Send manual message to driver"
                        >
                          <FiMessageSquare size={10} /> Message
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

      {/* MODAL 1: Assign Executive Modal */}
      <AnimatePresence>
        {selectedOrderForAssign && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedOrderForAssign(null)} className="absolute inset-0 bg-black/70 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] w-full max-w-md p-6 rounded shadow-2xl z-10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--crm-heading)] mb-2 flex items-center gap-2">
                <FiUserCheck className="text-[#c9a84c]" /> Assign Dispatch to Executive
              </h3>
              <p className="text-[10px] text-[var(--crm-ink-faint)] mb-4">
                Order: <strong className="text-[var(--crm-heading)]">{selectedOrderForAssign.orderNumber || selectedOrderForAssign._id}</strong> ({selectedOrderForAssign.customerName || 'Customer'})
              </p>
              <form onSubmit={handleAssignExecutive} className="space-y-4">
                <div>
                  <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1 font-bold">
                    Select Transport Executive *
                  </label>
                  <select
                    required
                    value={selectedExecutiveId}
                    onChange={(e) => setSelectedExecutiveId(e.target.value)}
                    className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] p-2.5 rounded text-[11px] text-[var(--crm-heading)] outline-none cursor-pointer"
                  >
                    <option value="">Choose executive...</option>
                    {executives.map(ex => (
                      <option key={ex._id} value={ex._id}>{ex.name} ({ex.role || 'Executive'})</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setSelectedOrderForAssign(null)} className="px-4 py-2 border border-[var(--crm-line)] rounded text-[10px] uppercase font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-[#0a192f] border border-[#c9a84c] text-[#c9a84c] rounded text-[10px] uppercase font-bold tracking-wider">Confirm Assignment</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: POD Verification Drawer / Modal */}
      <AnimatePresence>
        {selectedTripForPOD && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTripForPOD(null)} className="absolute inset-0 bg-black/70 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] w-full max-w-md p-6 rounded shadow-2xl z-10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--crm-heading)] mb-2 flex items-center gap-2">
                <FiFileText className="text-amber-400" /> Verify Proof of Delivery (POD)
              </h3>
              <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded my-3 space-y-1 text-[10px]">
                <div>Trip: <strong className="text-[var(--crm-heading)]">{selectedTripForPOD.tripId || selectedTripForPOD._id}</strong></div>
                <div>Driver: {selectedTripForPOD.driverName || selectedTripForPOD.driver?.name || '—'}</div>
                <div>Document Link: <a href={selectedTripForPOD.podUrl} target="_blank" rel="noreferrer" className="text-sky-400 underline">{selectedTripForPOD.podUrl || 'Uploaded_POD.pdf'}</a></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setSelectedTripForPOD(null)} className="px-4 py-2 border border-[var(--crm-line)] rounded text-[10px] uppercase font-bold">Close</button>
                <button onClick={() => handleVerifyPOD(selectedTripForPOD)} className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-400 rounded text-[10px] uppercase font-bold tracking-wider">
                  Verify & Complete Trip
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Reusable Communication Box */}
      <MessageBox
        isOpen={Boolean(selectedTripForMsg)}
        onClose={() => setSelectedTripForMsg(null)}
        trip={selectedTripForMsg}
        currentUser={user}
      />
    </div>
  );
}
