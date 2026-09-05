import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCheckCircle, FiClock, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { dispatchesApi } from '../../api/dispatches';
import { useAuth } from '../../hooks/useAuth';
import { socketService } from '../../services/socket';

export default function DriverCalculator({ defaultDriverName = '', defaultVehicleNo = '', theme = 'crm' }) {
  const { user } = useAuth();
  const [driverName, setDriverName] = useState(defaultDriverName || '');
  const [vehicleNumber, setVehicleNumber] = useState(defaultVehicleNo || '');
  const [numberOfTrips, setNumberOfTrips] = useState(1);
  const [km, setKm] = useState('');
  const [rate, setRate] = useState('');
  const [calcDate, setCalcDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [submittedHistory, setSubmittedHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (defaultDriverName && !driverName) setDriverName(defaultDriverName);
    if (defaultVehicleNo && !vehicleNumber) setVehicleNumber(defaultVehicleNo);

    fetchCalculationsFromMongo();

    const handleIncomingSocketWorkUpdate = (data) => {
      if (data && (data.stage === 'Calculation' || data.type === 'Calculation' || (data.update || '').includes('Fare Calculation'))) {
        fetchCalculationsFromMongo();
      }
    };

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('driver_work_update', handleIncomingSocketWorkUpdate);
    }

    window.addEventListener('ito_driver_calc_submitted_event', fetchCalculationsFromMongo);
    return () => {
      window.removeEventListener('ito_driver_calc_submitted_event', fetchCalculationsFromMongo);
      if (socket) socket.off('driver_work_update', handleIncomingSocketWorkUpdate);
    };
  }, [defaultDriverName, defaultVehicleNo]);

  // Safe Date + Time Formatter Helper (guarantees no NaN / Undefined crashes)
  const formatSafeDateDisplay = (dateVal, timeVal) => {
    try {
      let datePart = '';
      if (dateVal) {
        const dObj = new Date(dateVal);
        if (!isNaN(dObj.getTime())) {
          datePart = dObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } else {
          datePart = String(dateVal);
        }
      }
      if (!datePart) {
        datePart = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      const timePart = timeVal ? String(timeVal) : '';
      return timePart ? `${datePart} • ${timePart}` : datePart;
    } catch (e) {
      return 'Today';
    }
  };

  const fetchCalculationsFromMongo = async () => {
    try {
      const res = await dispatchesApi.getWorkUpdates();
      const rawUpdates = res?.data?.workUpdates || res?.workUpdates || res?.data?.updates || res?.updates || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      
      if (Array.isArray(rawUpdates)) {
        const calcRecords = rawUpdates
          .filter(u => u && (u.updateType === 'Calculation' || u.type === 'Calculation' || u.stage === 'Calculation' || (u.notes || u.update || '').includes('Fare Calculation')))
          .map(u => {
            const meta = u.metadata || {};
            const str = u.notes || u.update || '';
            
            let kmVal = meta.km;
            let rateVal = meta.rate;
            let tripsVal = meta.numberOfTrips || 1;
            let totalVal = meta.totalRupees;

            // Regex parsing fallback from string notes
            if (!kmVal) {
              const mKm = str.match(/(\d+)\s*KM/i);
              if (mKm) kmVal = Number(mKm[1]);
            }
            if (!rateVal) {
              const mRate = str.match(/\*\s*₹(\d+)/i) || str.match(/₹(\d+)/i);
              if (mRate) rateVal = Number(mRate[1]);
            }
            if (!tripsVal || tripsVal === 1) {
              const mTrips = str.match(/\((\d+)\s*Trips\)/i);
              if (mTrips) tripsVal = Number(mTrips[1]);
            }
            if (!totalVal) {
              const mTotal = str.match(/=\s*₹([\d,]+)/i) || str.match(/₹([\d,]+)/i);
              if (mTotal) totalVal = Number(mTotal[1].replace(/,/g, ''));
            }

            const rawDate = meta.calculationDate || meta.calcDate || u.createdAt || u.date;
            let formattedTime = u.time || '12:00 PM';
            let formattedDate = '';

            if (rawDate) {
              const parsedD = new Date(rawDate);
              if (!isNaN(parsedD.getTime())) {
                formattedTime = parsedD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                formattedDate = parsedD.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
              } else if (typeof rawDate === 'string') {
                formattedDate = rawDate;
              }
            }

            if (!formattedDate) {
              formattedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            }

            return {
              id: u._id || u.id || Date.now(),
              driverName: u.driverName || u.driver || meta.driverName || 'Driver',
              vehicleNumber: u.vehicleNo || u.vehicle || meta.vehicleNumber || 'Unassigned',
              numberOfTrips: tripsVal || 1,
              km: kmVal || 0,
              rate: rateVal || 0,
              totalRupees: totalVal || 0,
              timestamp: formattedTime,
              dateStr: formattedDate
            };
          });

        setSubmittedHistory(calcRecords);
      }
    } catch (err) {
      console.error('[DriverCalculator] Error loading calculations from MongoDB:', err);
    }
  };

  const numTrips = Math.max(1, Number(numberOfTrips) || 1);
  const numKm = Math.max(0, Number(km) || 0);
  const numRate = Math.max(0, Number(rate) || 0);

  const totalRupees = Math.round(numKm * numRate * numTrips);

  const handleSubmitCalculation = async () => {
    if (!driverName.trim()) return toast.error('Please enter Driver Name');
    if (!km || numKm <= 0) return toast.error('Please enter valid KM (Distance)');
    if (!rate || numRate <= 0) return toast.error('Please enter valid Rate (₹/KM)');

    setLoading(true);

    let displayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    try {
      if (calcDate) {
        const dObj = new Date(calcDate);
        if (!isNaN(dObj.getTime())) {
          displayDate = dObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
    } catch (e) {}

    const calcObj = {
      id: Date.now(),
      driverName: driverName.trim(),
      vehicleNumber: (vehicleNumber || 'Unassigned').trim().toUpperCase(),
      numberOfTrips: numTrips,
      km: numKm,
      rate: numRate,
      totalRupees,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateStr: displayDate,
      calcDate: calcDate
    };

    // Optimistically prepend to UI state
    setSubmittedHistory(prev => [calcObj, ...prev]);

    try {
      await dispatchesApi.createWorkUpdate({
        driverId: String(user?._id || user?.employeeId || ''),
        driverName: calcObj.driverName,
        vehicleNo: calcObj.vehicleNumber,
        updateType: 'Calculation',
        notes: `📊 Fare Calculation (${displayDate}): ${numKm} KM * ₹${numRate} (${numTrips} Trips) = ₹${totalRupees.toLocaleString('en-IN')}`,
        location: 'Fare Calculator',
        metadata: {
          type: 'CALCULATION',
          driverName: calcObj.driverName,
          vehicleNumber: calcObj.vehicleNumber,
          numberOfTrips: numTrips,
          km: numKm,
          rate: numRate,
          totalRupees,
          calculationDate: calcDate
        }
      });

      // 2. Real-Time Socket Broadcast to Transport Manager
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('driver_work_update', {
          id: calcObj.id,
          driver: calcObj.driverName,
          vehicle: calcObj.vehicleNumber,
          stage: 'Calculation',
          update: `📊 Fare Calculation Submitted (${displayDate}): ${numKm} KM * ₹${numRate} (${numTrips} Trips) = ₹${totalRupees.toLocaleString('en-IN')}`,
          location: 'Fare Calculator',
          time: calcObj.timestamp
        });
      }

      window.dispatchEvent(new CustomEvent('ito_driver_calc_submitted_event', { detail: calcObj }));
      
      await fetchCalculationsFromMongo();

      toast.success(`✅ Calculation ₹${totalRupees.toLocaleString('en-IN')} Saved!`);
    } catch (err) {
      console.error('[DriverCalculator] save error:', err);
      toast.error('Failed to save calculation ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-[var(--crm-line)] rounded-sm p-4 font-mono space-y-4 bg-[var(--crm-bg-raised)] shadow-sm text-left">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
        <h3 className="text-xs uppercase font-bold tracking-wider text-[var(--crm-heading)] flex items-center gap-2">
          <FiDollarSign className="text-teal-400" size={16} /> Calculator for Driver
        </h3>
      </div>

      {/* Form Fields Grid matching sketch */}
      <div className="space-y-4 text-xs font-mono">
        {/* ROW 1: DriverName, Vehical Number, Number of Trip, Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1">
              DriverName
            </label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Driver Name"
              className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-xs text-[var(--crm-heading)] font-mono rounded-sm outline-none focus:border-teal-500/60"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1">
              Vehical Number
            </label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="Vehicle Number"
              className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-xs text-[var(--crm-heading)] font-mono rounded-sm outline-none focus:border-teal-500/60 uppercase"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1">
              Number of Trip
            </label>
            <input
              type="number"
              min="1"
              value={numberOfTrips}
              onChange={(e) => setNumberOfTrips(e.target.value)}
              placeholder="1"
              className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-xs text-[var(--crm-heading)] font-mono rounded-sm outline-none focus:border-teal-500/60"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1">
              Date
            </label>
            <input
              type="date"
              value={calcDate}
              onChange={(e) => setCalcDate(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-xs text-[var(--crm-heading)] font-mono rounded-sm outline-none focus:border-teal-500/60 cursor-pointer"
            />
          </div>
        </div>

        {/* ROW 2: KM * rate = Total Rupess */}
        <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-sm space-y-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            {/* KM Input */}
            <div className="flex-1 min-w-[90px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1">
                KM
              </label>
              <input
                type="number"
                min="0"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder="KM"
                className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-xs text-amber-400 font-bold font-mono rounded-sm outline-none focus:border-amber-500"
              />
            </div>

            {/* Multiply Symbol */}
            <div className="self-end pb-2 text-base font-bold text-amber-400">
              *
            </div>

            {/* Rate Input */}
            <div className="flex-1 min-w-[90px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1">
                rate
              </label>
              <input
                type="number"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="rate"
                className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-xs text-amber-400 font-bold font-mono rounded-sm outline-none focus:border-amber-500"
              />
            </div>

            {/* Equals Symbol */}
            <div className="self-end pb-2 text-base font-bold text-emerald-400">
              =
            </div>

            {/* Total Rupees Output */}
            <div className="flex-1 min-w-[130px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1">
                Total Rupess
              </label>
              <div className="w-full px-3 py-2 bg-emerald-950/50 border border-emerald-800 text-emerald-400 font-extrabold text-sm font-mono rounded-sm flex items-center justify-between">
                <span>₹{(Number(totalRupees) || 0).toLocaleString('en-IN')}</span>
                {numTrips > 1 && (
                  <span className="text-[9px] text-emerald-300/80 font-normal">
                    ({numTrips} Trips)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-1 border-t border-[var(--crm-line)]">
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmitCalculation}
              className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded-sm shadow transition cursor-pointer flex items-center gap-1.5"
            >
              <FiCheckCircle size={14} /> {loading ? 'Saving to MongoDB...' : 'Submit Fare Calculation'}
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--crm-line)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] flex items-center gap-1">
              <FiFileText size={12} className="text-teal-400" /> Submitted Calculations Log ({submittedHistory.length})
            </span>
          </div>

          {submittedHistory.length === 0 ? (
            <div className="p-3 border border-dashed border-[var(--crm-line)] rounded-sm text-center text-[var(--crm-ink-faint)] text-[11px]">
              No fare calculations recorded. Fill KM & Rate above and click Submit.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
              {submittedHistory.map((item) => (
                <div key={item.id} className="p-2 border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] rounded-sm text-[11px] flex items-center justify-between font-mono hover:border-emerald-500/40 transition">
                  <div>
                    <strong className="text-[var(--crm-heading)]">{item.driverName || 'Driver'}</strong>
                    <span className="text-[var(--crm-ink-faint)] ml-1">({item.vehicleNumber || 'Unassigned'})</span>
                    <div className="text-[10px] text-[var(--crm-ink-soft)]">
                      {item.km > 0 ? `${item.km} KM * ₹${item.rate}` : 'Fare Calculation'} {item.numberOfTrips > 1 && `(${item.numberOfTrips} Trips)`}
                    </div>
                  </div>
                  <div className="text-right">
                    <strong className="text-emerald-400 text-xs block">₹{(Number(item.totalRupees) || 0).toLocaleString('en-IN')}</strong>
                    <span className="text-[9px] text-[var(--crm-ink-faint)] block font-mono">
                      📅 {formatSafeDateDisplay(item.dateStr, item.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
