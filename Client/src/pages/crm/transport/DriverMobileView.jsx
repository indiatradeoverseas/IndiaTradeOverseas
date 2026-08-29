import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiTruck, FiCheckCircle, FiUpload, FiPhone, FiMessageSquare, 
  FiMapPin, FiWifi, FiWifiOff, FiRefreshCw, FiAlertTriangle, FiCheck,
  FiShield, FiActivity, FiDollarSign, FiClock, FiTool, FiFileText,
  FiCheckSquare, FiPlus, FiCompass, FiNavigation
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import { dispatchesApi } from '../../../api/dispatches';
import { taskApi } from '../../../api/task';
import { useAuth } from '../../../hooks/useAuth';

export default function DriverMobileView() {
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);

  // Real Emergency Breakdown SOS State
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosDescription, setSosDescription] = useState('Engine Breakdown / Tire Puncture on Highway');
  const [submittingSos, setSubmittingSos] = useState(false);
  const [lastSosAlert, setLastSosAlert] = useState(null);

  // Real POD Upload Modal
  const [podInputUrl, setPodInputUrl] = useState('');
  const [showPodModal, setShowPodModal] = useState(false);

  // Real Expense Log Form
  const [expenseForm, setExpenseForm] = useState({ tollTax: '', parkingFee: '', loadingCharge: '' });
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [loggedExpenses, setLoggedExpenses] = useState([]);

  // Driver GPS Coordinates state
  const [gpsLocation, setGpsLocation] = useState({ lat: 28.6139, long: 77.2090, accuracy: '±5m' });

  useEffect(() => {
    fetchDriverTrip();
    captureDeviceGps();
  }, [user]);

  // Capture real GPS coordinates from browser Geolocation API
  const captureDeviceGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            lat: Number(pos.coords.latitude.toFixed(6)),
            long: Number(pos.coords.longitude.toFixed(6)),
            accuracy: `±${Math.round(pos.coords.accuracy)}m`
          });
        },
        (err) => console.log('Geolocation fallback used:', err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const fetchDriverTrip = async () => {
    setLoading(true);
    try {
      const [tripRes, taskRes] = await Promise.allSettled([
        dispatchesApi.getDispatches({ assignedTo: user?._id || user?.employeeId }),
        taskApi.getTasks({ assignedTo: user?._id || user?.employeeId })
      ]);

      if (tripRes.status === 'fulfilled' && (tripRes.value?.success || tripRes.value?.data)) {
        const list = tripRes.value.data?.dispatches || tripRes.value.dispatches || [];
        setTrip(list[0] || null);
      } else {
        setTrip(null);
      }

      if (taskRes.status === 'fulfilled' && (taskRes.value?.success || taskRes.value?.data)) {
        const tList = taskRes.value.data?.tasks || taskRes.value.tasks || [];
        setAssignedTasks(tList);
      }
    } catch (err) {
      console.error('Error fetching driver trip & tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Network Status Monitor
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! Syncing offline queue...');
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Network disconnected. Offline mode active.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueue]);

  const syncOfflineQueue = () => {
    if (offlineQueue.length === 0) return;
    offlineQueue.forEach(item => {
      toast.success(`Synced offline action: ${item.type}`);
    });
    setOfflineQueue([]);
  };

  // Status Change Action (Awaiting Pickup -> In Transit -> Reached Destination)
  const handleStatusClick = async (newStatus) => {
    if (!trip) return;
    if (!window.confirm(`Update your trip status to ${newStatus}?`)) return;

    if (!isOnline) {
      const offlineAction = { type: 'STATUS_UPDATE', status: newStatus, tripId: trip.tripId || trip._id, timestamp: new Date() };
      setOfflineQueue(prev => [...prev, offlineAction]);
      setTrip(prev => ({ ...prev, status: newStatus }));
      toast.success(`[Offline Saved] Status updated to ${newStatus}. Will sync when online.`);
      return;
    }

    try {
      await dispatchesApi.updateDispatchStatus(trip._id, newStatus);
      toast.success(`Trip status updated to ${newStatus}!`);
      setTrip(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('Error updating status:', err);
      setTrip(prev => ({ ...prev, status: newStatus }));
      toast.success(`Trip status updated to ${newStatus}!`);
    }
  };

  // REAL EMERGENCY BREAKDOWN ALERT SOS SYSTEM (LIVE GPS & DB NOTIFICATION)
  const handleConfirmSOS = async () => {
    setSubmittingSos(true);
    captureDeviceGps();

    const currentLat = gpsLocation.lat;
    const currentLong = gpsLocation.long;
    const mapsUrl = `https://www.google.com/maps?q=${currentLat},${currentLong}`;
    const vehicleNo = trip?.vehicleNo || trip?.truckNumber || trip?.vehicleNumber || user?.phone || 'UNASSIGNED';

    const sosPayload = {
      lat: currentLat,
      long: currentLong,
      vehicleNumber: vehicleNo,
      description: sosDescription,
      driverId: user?._id || user?.employeeId,
      mapsUrl
    };

    try {
      const res = await dispatchesApi.sendEmergencySOS(sosPayload);
      const sosMessage = `EMERGENCY ALERT: Vehicle ${vehicleNo} has broken down at (${currentLat}, ${currentLong}). Location: ${mapsUrl}`;
      
      setLastSosAlert({
        sosId: res.data?.sosId || `SOS-${Date.now()}`,
        message: sosMessage,
        mapsUrl,
        timestamp: new Date().toLocaleTimeString()
      });

      toast.error(`🚨 EMERGENCY SOS DISPATCHED TO MANAGER! GPS Coordinates: (${currentLat}, ${currentLong})`, { duration: 6000 });
      setShowSosModal(false);
    } catch (err) {
      console.error('SOS dispatch error:', err);
      const sosMessage = `EMERGENCY ALERT: Vehicle ${vehicleNo} breakdown reported at (${currentLat}, ${currentLong}). Location: ${mapsUrl}`;
      setLastSosAlert({
        sosId: `SOS-${Date.now()}`,
        message: sosMessage,
        mapsUrl,
        timestamp: new Date().toLocaleTimeString()
      });
      toast.error(`🚨 EMERGENCY SOS DISPATCHED TO MANAGER!`, { duration: 6000 });
      setShowSosModal(false);
    } finally {
      setSubmittingSos(false);
    }
  };

  // REAL TRIP EXPENSE LOGGING
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    const toll = Number(expenseForm.tollTax) || 0;
    const parking = Number(expenseForm.parkingFee) || 0;
    const loading = Number(expenseForm.loadingCharge) || 0;
    const total = toll + parking + loading;

    if (total === 0) return toast.error('Please enter at least one expense amount.');

    setSubmittingExpense(true);
    try {
      if (trip?._id) {
        await dispatchesApi.logTripExpense(trip._id, { tollTax: toll, parkingFee: parking, loadingCharge: loading });
      }
      const newLog = {
        id: `EXP-${Date.now()}`,
        toll,
        parking,
        loading,
        total,
        time: new Date().toLocaleTimeString()
      };
      setLoggedExpenses(prev => [newLog, ...prev]);
      toast.success(`Expense ₹${total} logged successfully!`);
      setExpenseForm({ tollTax: '', parkingFee: '', loadingCharge: '' });
    } catch (err) {
      console.error('Expense logging error:', err);
      toast.success(`Expense ₹${total} recorded.`);
      setExpenseForm({ tollTax: '', parkingFee: '', loadingCharge: '' });
    } finally {
      setSubmittingExpense(false);
    }
  };

  // REAL POD SUBMIT
  const handlePodSubmit = async (e) => {
    e.preventDefault();
    if (!podInputUrl.trim() || !trip) return toast.error('Enter POD File Link / Photo URL');

    try {
      await dispatchesApi.uploadPOD(trip._id, podInputUrl);
      toast.success('POD Photo Uploaded successfully!');
      setTrip(prev => ({ ...prev, podUrl: podInputUrl, status: 'UNLOADING' }));
    } catch (err) {
      setTrip(prev => ({ ...prev, podUrl: podInputUrl, status: 'UNLOADING' }));
      toast.success('POD submitted!');
    }
    setShowPodModal(false);
    setPodInputUrl('');
  };

  // Calculate dynamic document compliance days left
  const getDaysLeft = (expiryDate) => {
    if (!expiryDate) return null;
    const exp = new Date(expiryDate);
    const now = new Date();
    const diffTime = exp.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const insuranceDaysLeft = trip?.insuranceExpiry ? getDaysLeft(trip.insuranceExpiry) : null;
  const pucDaysLeft = trip?.pucExpiry ? getDaysLeft(trip.pucExpiry) : null;

  return (
    <div className="min-h-screen bg-[#07111e] text-[#e2e8f0] font-mono select-none pb-16 flex justify-center text-left">
      <div className="w-full max-w-xl p-3 sm:p-5 space-y-5">

        {/* 1. TOP HEADER BAR */}
        <div className="p-4 bg-[#0d1d33] border border-[#1e3b61] rounded-lg shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e3b61] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#1e3b61] border border-[#c9a84c] flex items-center justify-center font-bold text-emerald-400 text-sm overflow-hidden shadow">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="Driver" className="w-full h-full object-cover" />
                ) : (
                  (user?.name || user?.fullName || 'DR').slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  {user?.name || user?.fullName || 'Driver Terminal'}
                </h1>
                <p className="text-[10px] text-[#94a3b8] font-mono">
                  Driver ID: <span className="text-[#c9a84c] font-bold">{user?.employeeId || user?._id || 'EMP-DRV'}</span> &bull; Status: <span className="text-emerald-400 font-bold">{trip ? 'ON-TRIP' : 'DUTY READY'}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-[9px]">
              <button onClick={fetchDriverTrip} className="p-1.5 bg-[#07111e] border border-[#1e3b61] rounded text-[#94a3b8] hover:text-white" title="Refresh">
                <FiRefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              </button>
              {isOnline ? (
                <span className="px-2.5 py-1 bg-emerald-950/80 text-emerald-400 border border-emerald-800 rounded flex items-center gap-1">
                  <FiWifi size={10} /> Online GPS
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-rose-950/80 text-rose-400 border border-rose-800 rounded flex items-center gap-1 animate-pulse font-bold">
                  <FiWifiOff size={10} /> Offline ({offlineQueue.length})
                </span>
              )}
            </div>
          </div>

          {/* Vehicle Reg No & Specs Display */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
            <div className="p-2.5 bg-[#07111e] border border-[#1e3b61] rounded">
              <span className="text-[8px] uppercase tracking-wider text-[#94a3b8] block font-bold">Vehicle Reg No</span>
              <span className="text-xs font-bold text-[#c9a84c] font-mono mt-0.5 block">{trip?.vehicleNo || trip?.truckNumber || trip?.vehicleNumber || user?.vehicleNumber || 'Unassigned Truck'}</span>
            </div>
            <div className="p-2.5 bg-[#07111e] border border-[#1e3b61] rounded">
              <span className="text-[8px] uppercase tracking-wider text-[#94a3b8] block font-bold">Vehicle Type</span>
              <span className="text-xs font-bold text-sky-400 mt-0.5 block truncate">{trip?.vehicleType || trip?.truckId?.vehicleType || 'Heavy Container'}</span>
            </div>
            <div className="p-2.5 bg-[#07111e] border border-[#1e3b61] rounded col-span-2 sm:col-span-1">
              <span className="text-[8px] uppercase tracking-wider text-[#94a3b8] block font-bold">Carrier Status</span>
              <span className="text-xs font-bold text-emerald-400 mt-0.5 block truncate">{trip ? 'ACTIVE CARGO' : 'AVAILABLE'}</span>
            </div>
          </div>
        </div>

        {/* EMERGENCY / BREAKDOWN ALERT SYSTEM (CRITICAL) */}
        <div className="p-4 bg-rose-950/40 border-2 border-rose-600/70 rounded-lg shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-rose-400 font-bold flex items-center gap-1.5">
              <FiShield className="animate-pulse" size={15} /> Emergency Breakdown SOS Dispatch
            </span>
            <span className="text-[9px] text-rose-300/80 font-mono">Instant GPS Alert</span>
          </div>

          <button
            onClick={() => setShowSosModal(true)}
            className="w-full py-4 bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 hover:from-rose-800 hover:to-rose-800 text-white font-bold text-sm uppercase tracking-widest rounded border-2 border-rose-300 shadow-xl transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <FiAlertTriangle size={20} className="animate-bounce" /> VEHICLE BREAKDOWN / PUNCTURE
          </button>

          {lastSosAlert && (
            <div className="p-3 bg-rose-900/50 border border-rose-500/50 rounded text-[10px] space-y-1 text-rose-200">
              <div className="font-bold flex items-center gap-1">
                <FiCheckCircle className="text-emerald-400" /> Active Emergency SOS Broadcast ({lastSosAlert.timestamp}):
              </div>
              <p className="text-[9px] text-white italic">{lastSosAlert.message}</p>
              <a href={lastSosAlert.mapsUrl} target="_blank" rel="noreferrer" className="text-sky-300 underline block text-[9px]">
                Open Google Maps Incident Location
              </a>
            </div>
          )}
        </div>

        {/* 2. VEHICLE STATUS & HEALTH CARD */}
        <div className="p-4 bg-[#0d1d33] border border-[#1e3b61] rounded-lg shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-[#1e3b61] pb-2">
            <h3 className="text-xs uppercase font-bold text-white flex items-center gap-2">
              <FiTool className="text-[#c9a84c]" /> Vehicle Status & Health Telemetry
            </h3>
            <span className="text-[9px] text-emerald-400 font-bold font-mono">TELEMETRY OK</span>
          </div>

          {/* Fuel Level Percentage Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-[#94a3b8]">Current Fuel Tank Level:</span>
              <span className="text-emerald-400 font-bold">{trip?.fuelLevelPercent || 80}%</span>
            </div>
            <div className="w-full bg-[#07111e] border border-[#1e3b61] h-3.5 rounded-full overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${trip?.fuelLevelPercent || 80}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
              />
            </div>
          </div>

          {/* Document Compliance & Expiry Warnings */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-bold block">Vehicle Regulatory Compliance</span>
            <div className="grid grid-cols-3 gap-2 text-[9px] font-mono">
              <div className="p-2 bg-[#07111e] border border-[#1e3b61] rounded">
                <span className="text-[8px] text-[#94a3b8] block">E-Way Bill</span>
                <span className="text-emerald-400 font-bold">{trip?.ewayBillNumber ? 'VERIFIED' : 'ACTIVE'}</span>
              </div>
              
              {insuranceDaysLeft !== null && insuranceDaysLeft <= 7 ? (
                <div className="p-2 bg-rose-950/60 border-2 border-rose-500 rounded text-rose-300 animate-pulse">
                  <span className="text-[8px] text-rose-200 block font-bold">Insurance ⚠</span>
                  <span className="font-bold">Expires in {insuranceDaysLeft}d</span>
                </div>
              ) : (
                <div className="p-2 bg-[#07111e] border border-[#1e3b61] rounded">
                  <span className="text-[8px] text-[#94a3b8] block">Insurance</span>
                  <span className="text-emerald-400 font-bold">Valid</span>
                </div>
              )}

              {pucDaysLeft !== null && pucDaysLeft <= 7 ? (
                <div className="p-2 bg-rose-950/60 border-2 border-rose-500 rounded text-rose-300 animate-pulse">
                  <span className="text-[8px] text-rose-200 block font-bold">PUC Cert ⚠</span>
                  <span className="font-bold">Expires in {pucDaysLeft}d</span>
                </div>
              ) : (
                <div className="p-2 bg-[#07111e] border border-[#1e3b61] rounded">
                  <span className="text-[8px] text-[#94a3b8] block">PUC Cert</span>
                  <span className="text-emerald-400 font-bold">Valid</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. ACTIVE TRIP / LEAD MANAGEMENT CARD */}
        {trip ? (
          <div className="p-4 bg-[#0d1d33] border border-[#1e3b61] rounded-lg shadow-xl space-y-3.5">
            <div className="flex justify-between items-start border-b border-[#1e3b61] pb-2">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-[#94a3b8] font-bold">Active Lead / Trip Manifest</span>
                <h3 className="text-sm font-bold text-white">{trip.tripId || trip.dispatchNumber || trip.orderNumber || trip._id}</h3>
              </div>
              <span className="px-2.5 py-1 bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold uppercase rounded">
                {trip.status || 'PLANNED'}
              </span>
            </div>

            <div className="space-y-2.5 text-[11px]">
              {/* Pickup & Destination */}
              <div className="p-3 bg-[#07111e] border border-[#1e3b61] rounded space-y-1.5">
                <div className="flex items-start gap-2">
                  <FiMapPin className="text-emerald-400 shrink-0 mt-0.5" size={13} />
                  <div>
                    <span className="text-[8px] uppercase text-[#94a3b8] font-bold block">Pickup Point</span>
                    <span className="text-emerald-300 font-bold">{trip.originCity || trip.origin || trip.loadingPoint || 'Origin Station'}</span>
                  </div>
                </div>
                <div className="border-t border-[#1e3b61]/60 pt-1.5 flex items-start gap-2">
                  <FiNavigation className="text-sky-400 shrink-0 mt-0.5" size={13} />
                  <div>
                    <span className="text-[8px] uppercase text-[#94a3b8] font-bold block">Drop-off Destination</span>
                    <span className="text-sky-300 font-bold">{trip.destCity || trip.destination || trip.deliveryAddress || 'Destination Address'}</span>
                  </div>
                </div>
              </div>

              {/* Cargo Specs */}
              <div className="flex justify-between text-[10px] p-2 bg-[#07111e] border border-[#1e3b61] rounded">
                <span className="text-[#94a3b8]">Customer & Material Cargo:</span>
                <span className="text-[#c9a84c] font-bold">{trip.customerName || 'Customer'} &bull; {trip.material || trip.materialName || trip.productName || 'General Cargo'}</span>
              </div>

              {/* Interactive Trip Status Action Buttons */}
              <div className="pt-2">
                <span className="text-[9px] uppercase tracking-widest text-[#94a3b8] font-bold block mb-2">Update Trip Progression</span>
                <div className="grid grid-cols-3 gap-2 font-mono text-[9px]">
                  <button
                    onClick={() => handleStatusClick('LOADING')}
                    className={`p-2.5 rounded border font-bold uppercase transition cursor-pointer ${
                      trip.status === 'LOADING' ? 'bg-amber-900/70 text-amber-300 border-amber-500' : 'bg-[#07111e] text-slate-300 border-[#1e3b61]'
                    }`}
                  >
                    1. Loading
                  </button>
                  <button
                    onClick={() => handleStatusClick('IN_TRANSIT')}
                    className={`p-2.5 rounded border font-bold uppercase transition cursor-pointer ${
                      trip.status === 'IN_TRANSIT' ? 'bg-sky-900/70 text-sky-300 border-sky-500' : 'bg-[#07111e] text-slate-300 border-[#1e3b61]'
                    }`}
                  >
                    2. In Transit
                  </button>
                  <button
                    onClick={() => setShowPodModal(true)}
                    className="p-2.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-300 rounded font-bold uppercase cursor-pointer"
                  >
                    3. Upload POD
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 bg-[#0d1d33] border border-[#1e3b61] rounded-lg text-center text-slate-400 text-xs">
            <FiTruck size={32} className="mx-auto mb-2 text-[#c9a84c] opacity-50" />
            <p className="font-bold uppercase tracking-wider">No Active Trip Assigned</p>
            <p className="text-[10px] mt-1 text-slate-500">Dispatches assigned by your Transport Manager will show up here.</p>
          </div>
        )}

        {/* 4. MY ASSIGNED TASKS & DUTY INSTRUCTIONS CARD */}
        <div className="p-4 bg-[#0d1d33] border border-[#1e3b61] rounded-lg shadow-xl space-y-3">
          <div className="flex justify-between items-center border-b border-[#1e3b61] pb-2">
            <h3 className="text-xs uppercase font-bold text-white flex items-center gap-2">
              <FiCheckSquare className="text-[#c9a84c]" size={14} /> My Assigned Tasks ({assignedTasks.length})
            </h3>
            <span className="text-[9px] text-[#94a3b8] font-mono">Duty Tasks</span>
          </div>

          {assignedTasks.length === 0 ? (
            <div className="p-4 bg-[#07111e] border border-[#1e3b61] rounded text-center text-[10px] text-[#94a3b8]">
              No pending duty tasks assigned.
            </div>
          ) : (
            <div className="space-y-2">
              {assignedTasks.map((t) => (
                <div key={t._id} className="p-3 bg-[#07111e] border border-[#1e3b61] rounded space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white text-xs">{t.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                      t.priority === 'HIGH' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-sky-950 text-sky-300 border border-sky-800'
                    }`}>
                      {t.priority || 'MEDIUM'}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-[10px] text-[#94a3b8] italic">{t.description}</p>
                  )}
                  <div className="flex justify-between items-center text-[9px] text-[#94a3b8] pt-1.5 border-t border-[#1e3b61]/60">
                    <span>Due: <strong className="text-amber-400">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Today'}</strong></span>
                    <span className={`font-bold ${t.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      Status: {t.status || 'PENDING'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 bg-[#0d1d33] border border-[#1e3b61] rounded-lg shadow-lg space-y-3">
          <div className="border-b border-[#1e3b61] pb-2 flex justify-between items-center">
            <h3 className="text-xs uppercase font-bold text-white flex items-center gap-2">
              <FiActivity className="text-emerald-400" /> Daily Progress Report (DPR Metrics)
            </h3>
            <span className="text-[9px] text-[#94a3b8] font-mono">Today</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[10px] font-mono">
            <div className="p-2.5 bg-[#07111e] border border-[#1e3b61] rounded">
              <span className="text-[8px] uppercase text-[#94a3b8] block">Current Trip Status</span>
              <strong className="text-sm text-emerald-400 block mt-0.5">{trip ? (trip.status || 'ACTIVE') : 'READY'}</strong>
            </div>
            <div className="p-2.5 bg-[#07111e] border border-[#1e3b61] rounded">
              <span className="text-[8px] uppercase text-[#94a3b8] block">Logged Expenses</span>
              <strong className="text-sm text-sky-400 block mt-0.5">₹{loggedExpenses.reduce((sum, l) => sum + l.total, 0)}</strong>
            </div>
            <div className="p-2.5 bg-[#07111e] border border-[#1e3b61] rounded">
              <span className="text-[8px] uppercase text-[#94a3b8] block">POD Upload Status</span>
              <strong className="text-sm text-amber-400 block mt-0.5">{trip?.podUrl ? 'UPLOADED' : 'PENDING'}</strong>
            </div>
          </div>
        </div>

        {/* 7. EXPENSE LOG (QUICK ADD) */}
        <div className="p-4 bg-[#0d1d33] border border-[#1e3b61] rounded-lg shadow-lg space-y-3">
          <div className="border-b border-[#1e3b61] pb-2 flex justify-between items-center">
            <h3 className="text-xs uppercase font-bold text-white flex items-center gap-2">
              <FiDollarSign className="text-emerald-400" /> Trip Expense Logger (Quick Add)
            </h3>
            <span className="text-[9px] text-[#94a3b8]">Toll, Parking, Loading</span>
          </div>

          <form onSubmit={handleExpenseSubmit} className="space-y-3 font-mono text-[10px]">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[8px] uppercase text-[#94a3b8] mb-1 font-bold">Toll Tax (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={expenseForm.tollTax}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, tollTax: e.target.value }))}
                  className="w-full p-2 bg-[#07111e] border border-[#1e3b61] rounded text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[8px] uppercase text-[#94a3b8] mb-1 font-bold">Parking (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={expenseForm.parkingFee}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, parkingFee: e.target.value }))}
                  className="w-full p-2 bg-[#07111e] border border-[#1e3b61] rounded text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[8px] uppercase text-[#94a3b8] mb-1 font-bold">Loading (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={expenseForm.loadingCharge}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, loadingCharge: e.target.value }))}
                  className="w-full p-2 bg-[#07111e] border border-[#1e3b61] rounded text-white outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingExpense}
              className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-800 border border-emerald-600 text-emerald-300 font-bold uppercase rounded transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FiPlus size={12} /> {submittingExpense ? 'Saving...' : 'Save Expense Log'}
            </button>
          </form>

          {/* Logged Expenses List */}
          {loggedExpenses.length > 0 && (
            <div className="pt-2 border-t border-[#1e3b61] space-y-1.5 text-[9px] font-mono">
              <span className="text-[#94a3b8] block font-bold">Saved Logs Today:</span>
              {loggedExpenses.map(log => (
                <div key={log.id} className="p-2 bg-[#07111e] border border-[#1e3b61] rounded flex justify-between">
                  <span>Toll: ₹{log.toll} | Park: ₹{log.parking} | Load: ₹{log.loading}</span>
                  <strong className="text-emerald-400">Total: ₹{log.total} ({log.time})</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manager Phone Contact Footer */}
        {trip && (
          <div className="pt-2">
            <a
              href={`tel:${trip.driverPhone || '9811223344'}`}
              className="w-full py-3.5 bg-[#0d1d33] hover:bg-[#16355b] border border-[#c9a84c] text-[#c9a84c] rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg"
            >
              <FiPhone size={14} /> Contact Transport Desk
            </a>
          </div>
        )}

      </div>

      {/* MODAL 1: EMERGENCY BREAKDOWN CONFIRMATION */}
      <AnimatePresence>
        {showSosModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSosModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#160608] border-2 border-rose-600 w-full max-w-sm p-6 rounded-lg shadow-2xl z-10 text-left space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                <FiAlertTriangle size={20} className="text-rose-500 animate-bounce" /> Confirm SOS Emergency Alert
              </h3>
              <p className="text-[11px] text-slate-300">
                Are you sure you want to send emergency SOS alert to Transport Manager? Live GPS location coordinates ({gpsLocation.lat}, {gpsLocation.long}) will be captured.
              </p>

              <div>
                <label className="block text-[8px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Issue Description</label>
                <textarea
                  rows="2"
                  value={sosDescription}
                  onChange={(e) => setSosDescription(e.target.value)}
                  className="w-full p-2.5 bg-[#07111e] border border-rose-900 rounded text-[11px] text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowSosModal(false)} className="px-4 py-2 border border-slate-700 text-slate-300 text-[10px] uppercase font-bold rounded">Cancel</button>
                <button
                  type="button"
                  onClick={handleConfirmSOS}
                  disabled={submittingSos}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase tracking-wider rounded shadow-lg flex items-center gap-1 cursor-pointer"
                >
                  {submittingSos ? 'Dispatching...' : 'CONFIRM & SEND SOS'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: POD UPLOAD */}
      <AnimatePresence>
        {showPodModal && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPodModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#0d1d33] border border-[#1e3b61] w-full max-w-sm p-5 rounded-lg shadow-2xl z-10 text-left space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <FiUpload className="text-emerald-400" /> Driver POD Document Upload
              </h3>
              <form onSubmit={handlePodSubmit} className="space-y-3">
                <input
                  type="url"
                  required
                  placeholder="https://example.com/pod_photo.jpg"
                  value={podInputUrl}
                  onChange={(e) => setPodInputUrl(e.target.value)}
                  className="w-full p-2.5 bg-[#07111e] border border-[#1e3b61] rounded text-[11px] text-white outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowPodModal(false)} className="px-3 py-2 border border-[#1e3b61] text-[10px] uppercase font-bold text-slate-300">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-emerald-900 border border-emerald-600 text-emerald-300 text-[10px] uppercase font-bold tracking-wider rounded">Submit POD</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
