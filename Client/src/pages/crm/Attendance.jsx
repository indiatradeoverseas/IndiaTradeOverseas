import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiClock, FiLogIn, FiLogOut, FiFilter, FiUsers, FiCheckCircle, FiAlertCircle, FiXCircle, FiTrash2, FiCoffee } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { attendanceApi } from '../../api/attendance';
import { useAuth } from '../../hooks/useAuth';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 18, mass: 1 } }
};

const DEPARTMENTS = ['STONE', 'COAL', 'TEA', 'RICE', 'TRANSPORT', 'ADMIN', 'IT', 'PROCUREMENT', 'ACCOUNTS', 'HR', 'SALES', 'CRM', 'FINANCE'];

const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentMonthBounds = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: formatLocalDate(start), endDate: formatLocalDate(now), department: '' };
};

const parseLocalDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const buildDisplayRows = (records, startDate, endDate) => {
  const hasExplicitRange = startDate && endDate;
  if (!hasExplicitRange && records.length === 0) return [];

  let rangeStart;
  let rangeEnd;
  if (hasExplicitRange) {
    rangeStart = parseLocalDate(startDate);
    rangeEnd = parseLocalDate(endDate);
  } else {
    const times = records.map((r) => new Date(r.date).getTime());
    rangeStart = new Date(Math.min(...times));
    rangeEnd = new Date(Math.max(...times));
  }
  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(0, 0, 0, 0);

  const recordsByDate = new Map();
  records.forEach((rec) => {
    recordsByDate.set(new Date(rec.date).toDateString(), rec);
  });

  const rows = [];
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    const key = cursor.toDateString();
    if (cursor.getDay() === 0) {
      rows.push({ isSunday: true, date: new Date(cursor) });
    } else if (recordsByDate.has(key)) {
      rows.push({ isSunday: false, record: recordsByDate.get(key), date: new Date(cursor) });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return rows.sort((a, b) => b.date - a.date);
};

const formatElapsed = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export default function Attendance() {
  const { user } = useAuth();
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [report, setReport] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [filters, setFilters] = useState(getCurrentMonthBounds);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [lunchLoading, setLunchLoading] = useState(false);
  const [lunchElapsed, setLunchElapsed] = useState(0);
  const [myHistory, setMyHistory] = useState([]);
  const [myHistoryLoading, setMyHistoryLoading] = useState(false);

  const isManagerTier = ['ADMIN', 'MANAGER', 'HR'].includes(user?.role);
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchToday();
    if (isManagerTier) fetchReport(getCurrentMonthBounds());
    else fetchMyHistory(getCurrentMonthBounds());
  }, []);

  useEffect(() => {
    if (!today?.lunchStartAt || today?.lunchEndAt) return;
    const startedAt = new Date(today.lunchStartAt).getTime();
    const tick = () => setLunchElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [today?.lunchStartAt, today?.lunchEndAt]);

  const fetchToday = async () => {
    try {
      const response = await attendanceApi.getMyToday();
      if (response.success) setToday(response.data.attendance);
    } catch (error) {
      console.error('Error fetching attendance status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async (params = {}) => {
    setReportLoading(true);
    try {
      const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
      const response = await attendanceApi.getReport(cleanParams);
      if (response.success) setReport(response.data.records || []);
    } catch (error) {
      console.error('Error fetching attendance report:', error);
    } finally {
      setReportLoading(false);
    }
  };

  const fetchMyHistory = async (params = {}) => {
    setMyHistoryLoading(true);
    try {
      const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
      const response = await attendanceApi.getMyHistory(cleanParams);
      if (response.success) setMyHistory(response.data.records || []);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setMyHistoryLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const response = await attendanceApi.checkIn();
      if (response.success) {
        toast.success('Checked in successfully');
        setToday(response.data.attendance);
        if (isManagerTier) fetchReport(filters);
        else fetchMyHistory(getCurrentMonthBounds());
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!window.confirm('Check out now? This ends your work day and cannot be undone.')) {
      return;
    }
    setActionLoading(true);
    try {
      const response = await attendanceApi.checkOut();
      if (response.success) {
        toast.success('Checked out successfully');
        setToday(response.data.attendance);
        if (isManagerTier) fetchReport(filters);
        else fetchMyHistory(getCurrentMonthBounds());
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check out');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLunchStart = async () => {
    setLunchLoading(true);
    try {
      const response = await attendanceApi.startLunch();
      if (response.success) {
        toast.success('Lunch break started');
        setToday(response.data.attendance);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start lunch break');
    } finally {
      setLunchLoading(false);
    }
  };

  const handleLunchEnd = async () => {
    setLunchLoading(true);
    try {
      const response = await attendanceApi.endLunch();
      if (response.success) {
        toast.success(`Lunch break ended — ${response.data.attendance.lunchDurationMinutes} min recorded`);
        setToday(response.data.attendance);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to end lunch break');
    } finally {
      setLunchLoading(false);
    }
  };

  const handleApplyFilter = () => {
    fetchReport(filters);
  };

  const handleCleanupOrphaned = async () => {
    if (!window.confirm('This will permanently delete every attendance record that has no check-in time (invalid/test data). Continue?')) {
      return;
    }
    setCleanupLoading(true);
    try {
      const response = await attendanceApi.cleanupOrphaned();
      if (response.success) {
        toast.success(response.message || 'Invalid records removed');
        fetchReport(filters);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to clean up records');
    } finally {
      setCleanupLoading(false);
    }
  };

  const summary = useMemo(() => {
    return report.reduce(
      (acc, rec) => {
        if (rec.status === 'PRESENT') acc.present += 1;
        else if (rec.status === 'LATE') acc.late += 1;
        else if (rec.status === 'HALF_DAY') acc.halfDay += 1;
        else if (rec.status === 'ABSENT') acc.absent += 1;
        return acc;
      },
      { present: 0, late: 0, halfDay: 0, absent: 0 }
    );
  }, [report]);

  const displayRows = useMemo(
    () => buildDisplayRows(report, filters.startDate, filters.endDate),
    [report, filters.startDate, filters.endDate]
  );

  const myHistoryRows = useMemo(
    () => buildDisplayRows(myHistory, '', ''),
    [myHistory]
  );

  const statusColor = (status) => {
    const colors = {
      PRESENT: 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20',
      LATE: 'bg-amber-950/20 text-amber-400 border-amber-500/20',
      HALF_DAY: 'bg-sky-950/20 text-sky-400 border-sky-500/20',
      ABSENT: 'bg-rose-950/20 text-rose-400 border-rose-500/20'
    };
    return colors[status] || 'bg-[#121D29] text-[#6D7886] border-[#C5CBD3]/10';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1116] flex items-center justify-center">
        <div className="w-12 h-[1px] bg-[#C5CBD3]/40 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen w-full bg-[#0E1116] text-[#C5CBD3] pb-12">

      <motion.div variants={blockVariants} className="w-full border-b border-[#C5CBD3]/10 py-6 px-4 md:px-8 flex flex-col md:flex-row md:items-end justify-between gap-3 bg-[#040A12]/40 backdrop-blur-sm">
        <div>
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#6D7886] font-bold block font-mono">MODULE 02 // EMPLOYEE ATTENDANCE</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F2F4F7] uppercase tracking-tight">Attendance</h1>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-[#6D7886] bg-[#0E1116] border border-[#C5CBD3]/10 px-3 py-1.5 uppercase tracking-wide rounded-sm self-start md:self-auto">
          <FiClock size={12} />
          <span>Official Shift &nbsp;09:00 AM &ndash; 06:00 PM</span>
        </div>
      </motion.div>

      <div className="w-full px-4 md:px-8 py-6 space-y-6">

        {/* Check-in / Check-out card */}
        <motion.div variants={blockVariants} className="border border-[#C5CBD3]/15 bg-[#121D29]/20 rounded-sm p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <p className="text-sm font-serif text-[#F2F4F7]">{user?.fullName}</p>
              <p className="text-[10px] uppercase tracking-widest text-[#6D7886] font-mono mt-0.5">{user?.department} &bull; {user?.role} &bull; {user?.employeeId}</p>

              <span className="text-[9px] uppercase tracking-widest text-[#6D7886] font-bold font-mono block mt-4 mb-2">Today's Status</span>
              {today?.checkInAt ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-block px-2.5 py-0.5 border text-[10px] font-bold tracking-wider uppercase rounded ${statusColor(today.status)}`}>
                    {today.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-[#C5CBD3] font-mono">In: {new Date(today.checkInAt).toLocaleTimeString()}</span>
                  {today.checkOutAt ? (
                    <>
                      <span className="text-xs text-[#C5CBD3] font-mono">Out: {new Date(today.checkOutAt).toLocaleTimeString()}</span>
                      <span className="text-xs text-emerald-400 font-mono">{today.workingHours}h worked</span>
                      {today.overtimeHours > 0 && (
                        <span className="text-xs text-sky-400 font-mono">+{today.overtimeHours}h overtime</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-[#6D7886] font-mono">Expected check-out: 06:00 PM</span>
                  )}
                  {today.lunchEndAt && (
                    <span className="text-xs text-amber-400 font-mono">Lunch: {today.lunchDurationMinutes}m</span>
                  )}
                  {today.lunchStartAt && !today.lunchEndAt && (
                    <span className="text-xs text-amber-400 font-mono animate-pulse">On lunch: {formatElapsed(lunchElapsed)}</span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#6D7886] font-light">You have not checked in today.</p>
              )}
            </div>

            <div className="flex gap-3">
              {!today?.checkInAt && (
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="flex items-center gap-2 bg-[#F2F4F7] text-[#040A12] hover:bg-[#C5CBD3] text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-sm transition-all disabled:opacity-50"
                >
                  <FiLogIn size={14} /> Check In
                </button>
              )}
              {today?.checkInAt && !today?.checkOutAt && (
                <>
                  {!today?.lunchStartAt && (
                    <button
                      onClick={handleLunchStart}
                      disabled={lunchLoading}
                      className="flex items-center gap-2 bg-transparent border border-amber-500/30 hover:bg-amber-950/20 text-amber-400 text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-sm transition-all disabled:opacity-50"
                    >
                      <FiCoffee size={14} /> Lunch Time
                    </button>
                  )}
                  {today?.lunchStartAt && !today?.lunchEndAt && (
                    <button
                      onClick={handleLunchEnd}
                      disabled={lunchLoading}
                      className="flex items-center gap-2 bg-amber-950/20 border border-amber-500/30 hover:bg-amber-900/30 text-amber-400 text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-sm transition-all disabled:opacity-50"
                    >
                      <FiCoffee size={14} /> Back to Work <span className="font-mono">{formatElapsed(lunchElapsed)}</span>
                    </button>
                  )}
                  {today?.lunchEndAt && (
                    <button
                      disabled
                      title={`Lunch taken: ${today.lunchDurationMinutes} min`}
                      className="flex items-center gap-2 bg-[#0E1116] border border-[#C5CBD3]/10 text-[#6D7886] text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-sm opacity-50 cursor-not-allowed"
                    >
                      <FiCoffee size={14} /> Lunch Taken ({today.lunchDurationMinutes}m)
                    </button>
                  )}
                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="flex items-center gap-2 bg-[#0E1116] border border-[#C5CBD3]/20 hover:bg-[#121D29] text-[#C5CBD3] text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-sm transition-all disabled:opacity-50"
                  >
                    <FiLogOut size={14} /> Check Out
                  </button>
                </>
              )}
              {today?.checkOutAt && (
                <span className="text-[10px] uppercase tracking-widest text-[#6D7886] font-mono self-center">Day complete</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Admin/Manager/HR Report */}
        {isManagerTier && (
          <>
            {/* Summary stat row */}
            <motion.div variants={blockVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Present', val: summary.present, icon: FiCheckCircle, color: 'text-emerald-400 bg-emerald-950/20' },
                { label: 'Late', val: summary.late, icon: FiAlertCircle, color: 'text-amber-400 bg-amber-950/20' },
                { label: 'Half Day', val: summary.halfDay, icon: FiClock, color: 'text-sky-400 bg-sky-950/20' },
                { label: 'Absent', val: summary.absent, icon: FiXCircle, color: 'text-rose-400 bg-rose-950/20' }
              ].map((card, idx) => (
                <div key={idx} className="bg-[#121D29]/30 border border-[#C5CBD3]/15 p-4 rounded-sm flex items-center justify-between shadow-lg">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-[#6D7886] font-bold font-mono">{card.label}</p>
                    <p className="text-xl font-serif font-light text-[#F2F4F7] mt-1">{card.val}</p>
                  </div>
                  <div className={`p-2 rounded-sm ${card.color}`}><card.icon size={14} /></div>
                </div>
              ))}
            </motion.div>

            <motion.div variants={blockVariants} className="p-4 bg-[#121D29]/20 border border-[#C5CBD3]/15 rounded-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="w-full md:w-52 flex items-center gap-2">
                <FiUsers className="text-[#6D7886] shrink-0" size={14} />
                <select
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E1116] border border-[#C5CBD3]/15 focus:border-[#F2F4F7]/40 rounded-sm outline-none text-xs cursor-pointer text-[#F2F4F7]"
                >
                  <option value="">All Departments</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex-1 w-full flex items-center gap-2">
                <FiFilter className="text-[#6D7886] shrink-0" size={14} />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E1116] border border-[#C5CBD3]/15 focus:border-[#F2F4F7]/40 rounded-sm outline-none text-xs text-[#F2F4F7]"
                />
              </div>
              <div className="flex-1 w-full">
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E1116] border border-[#C5CBD3]/15 focus:border-[#F2F4F7]/40 rounded-sm outline-none text-xs text-[#F2F4F7]"
                />
              </div>
              <button
                onClick={handleApplyFilter}
                className="bg-[#0E1116] border border-[#C5CBD3]/20 hover:bg-[#121D29] text-[#C5CBD3] text-[11px] uppercase tracking-widest font-semibold px-4 py-2.5 rounded-sm transition-all whitespace-nowrap"
              >
                Apply Filter
              </button>
              {isAdmin && (
                <button
                  onClick={handleCleanupOrphaned}
                  disabled={cleanupLoading}
                  title="Permanently delete attendance records with no check-in time (invalid/test data)"
                  className="flex items-center gap-1.5 bg-transparent border border-rose-500/20 hover:bg-rose-950/20 text-rose-400 text-[11px] uppercase tracking-widest font-semibold px-4 py-2.5 rounded-sm transition-all whitespace-nowrap disabled:opacity-50"
                >
                  <FiTrash2 size={12} /> {cleanupLoading ? 'Cleaning...' : 'Clean Up Invalid Records'}
                </button>
              )}
            </motion.div>

            <motion.div variants={blockVariants} className="border border-[#C5CBD3]/15 bg-[#121D29]/10 rounded-sm overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-[#040A12] text-[#6D7886] text-[9px] uppercase tracking-widest font-mono font-bold">
                      <th className="py-3.5 px-5">Employee</th>
                      <th className="py-3.5 px-5">Department</th>
                      <th className="py-3.5 px-5">Date</th>
                      <th className="py-3.5 px-5">Check In</th>
                      <th className="py-3.5 px-5">Check Out</th>
                      <th className="py-3.5 px-5">Working Hours</th>
                      <th className="py-3.5 px-5">Lunch</th>
                      <th className="py-3.5 px-5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C5CBD3]/10 text-xs">
                    {reportLoading ? (
                      <tr><td colSpan="8" className="text-center py-12 text-[#6D7886] font-mono uppercase tracking-widest text-[10px]">Loading...</td></tr>
                    ) : displayRows.length === 0 ? (
                      <tr><td colSpan="8" className="text-center py-16 opacity-40 font-mono uppercase tracking-widest text-[10px]">No attendance records found.</td></tr>
                    ) : (
                      displayRows.map((row) =>
                        row.isSunday ? (
                          <tr key={row.date.toDateString()} className="bg-[#040A12]/40">
                            <td colSpan="8" className="text-center py-3 text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#6D7886]">
                              Sunday &bull; {row.date.toLocaleDateString()}
                            </td>
                          </tr>
                        ) : (
                          <tr key={row.record._id} className="hover:bg-[#121D29]/40 transition-colors">
                            <td className="py-3 px-5 text-[#F2F4F7]">{row.record.employeeId?.fullName || 'Unknown'}</td>
                            <td className="py-3 px-5">
                              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#121D29] border border-[#C5CBD3]/10 text-[#C5CBD3] rounded-sm">
                                {row.record.employeeId?.department || '—'}
                              </span>
                            </td>
                            <td className="py-3 px-5 font-mono text-[#6D7886]">{new Date(row.record.date).toLocaleDateString()}</td>
                            <td className="py-3 px-5 font-mono text-[#C5CBD3]">{row.record.checkInAt ? new Date(row.record.checkInAt).toLocaleTimeString() : '—'}</td>
                            <td className="py-3 px-5 font-mono text-[#C5CBD3]">{row.record.checkOutAt ? new Date(row.record.checkOutAt).toLocaleTimeString() : '—'}</td>
                            <td className="py-3 px-5 font-mono text-emerald-400">{row.record.workingHours || 0}h</td>
                            <td className="py-3 px-5 font-mono text-amber-400">{row.record.lunchDurationMinutes ? `${row.record.lunchDurationMinutes}m` : '—'}</td>
                            <td className="py-3 px-5 text-center">
                              <span className={`inline-block px-2 py-0.5 border text-[9px] font-bold tracking-wider uppercase rounded ${statusColor(row.record.status)}`}>
                                {row.record.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}

        {!isManagerTier && (
          <motion.div variants={blockVariants} className="border border-[#C5CBD3]/15 bg-[#121D29]/10 rounded-sm overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 border-b border-[#C5CBD3]/10">
              <span className="text-[9px] uppercase tracking-widest text-[#6D7886] font-bold font-mono">Your Attendance History &bull; This Month</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#040A12] text-[#6D7886] text-[9px] uppercase tracking-widest font-mono font-bold">
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-5">Check In</th>
                    <th className="py-3.5 px-5">Check Out</th>
                    <th className="py-3.5 px-5">Working Hours</th>
                    <th className="py-3.5 px-5">Lunch</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C5CBD3]/10 text-xs">
                  {myHistoryLoading ? (
                    <tr><td colSpan="6" className="text-center py-12 text-[#6D7886] font-mono uppercase tracking-widest text-[10px]">Loading...</td></tr>
                  ) : myHistoryRows.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-16 opacity-40 font-mono uppercase tracking-widest text-[10px]">No attendance records found.</td></tr>
                  ) : (
                    myHistoryRows.map((row) =>
                      row.isSunday ? (
                        <tr key={row.date.toDateString()} className="bg-[#040A12]/40">
                          <td colSpan="6" className="text-center py-3 text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#6D7886]">
                            Sunday &bull; {row.date.toLocaleDateString()}
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.record._id} className="hover:bg-[#121D29]/40 transition-colors">
                          <td className="py-3 px-5 font-mono text-[#6D7886]">{new Date(row.record.date).toLocaleDateString()}</td>
                          <td className="py-3 px-5 font-mono text-[#C5CBD3]">{row.record.checkInAt ? new Date(row.record.checkInAt).toLocaleTimeString() : '—'}</td>
                          <td className="py-3 px-5 font-mono text-[#C5CBD3]">{row.record.checkOutAt ? new Date(row.record.checkOutAt).toLocaleTimeString() : '—'}</td>
                          <td className="py-3 px-5 font-mono text-emerald-400">{row.record.workingHours || 0}h</td>
                          <td className="py-3 px-5 font-mono text-amber-400">{row.record.lunchDurationMinutes ? `${row.record.lunchDurationMinutes}m` : '—'}</td>
                          <td className="py-3 px-5 text-center">
                            <span className={`inline-block px-2 py-0.5 border text-[9px] font-bold tracking-wider uppercase rounded ${statusColor(row.record.status)}`}>
                              {row.record.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
