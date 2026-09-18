import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiLogIn, FiLogOut, FiFilter, FiUsers, FiUser, FiCheckCircle, FiAlertCircle, FiXCircle, FiTrash2, FiCoffee, FiBarChart2 } from 'react-icons/fi';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import toast from 'react-hot-toast';
import { attendanceApi } from '../../api/attendance';
import { useAuth } from '../../hooks/useAuth';
import { socketService } from '../../services/socket';
import { employeesApi } from '../../api/employees';

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

const getTodayBounds = () => {
  const todayStr = formatLocalDate(new Date());
  return { startDate: todayStr, endDate: todayStr, department: '' };
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

const formatTimeDisplay = (timeStr, dateVal) => {
  if (timeStr && typeof timeStr === 'string' && !timeStr.includes('T')) return timeStr;
  if (dateVal) {
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {}
  }
  return '—';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-3 rounded-lg shadow-xl text-xs font-sans">
        <p className="font-bold text-[var(--crm-heading)] mb-1.5 border-b border-[var(--crm-line)] pb-1">{label} Department</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5 font-medium">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-bold text-[var(--crm-heading)]">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Attendance() {
  const { user, logout } = useAuth();
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [report, setReport] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [filters, setFilters] = useState(getTodayBounds);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [lunchLoading, setLunchLoading] = useState(false);
  const [lunchElapsed, setLunchElapsed] = useState(0);
  const [myHistory, setMyHistory] = useState([]);
  const [myHistoryLoading, setMyHistoryLoading] = useState(false);

  // Manual Attendance states
  const [employeesList, setEmployeesList] = useState([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    employeeId: '',
    date: formatLocalDate(new Date()),
    status: 'PRESENT',
    checkInTime: '09:00 AM',
    checkOutTime: '06:00 PM'
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const userRole = (user?.role || '').toUpperCase();
  const userPos = (user?.position || '').toLowerCase();
  const userDept = (user?.department || '').toUpperCase();

  const isManagerTier = [
    'ADMIN', 'SUPER_ADMIN', 'FOUNDER', 'CO_FOUNDER', 'CEO',
    'MANAGER', 'HR', 'HR_MANAGER', 'HR_EXECUTIVE'
  ].includes(userRole) ||
    userDept === 'ADMIN' || userDept === 'MANAGEMENT' ||
    userPos.includes('founder') || userPos.includes('ceo') || userPos.includes('admin') || userPos.includes('manager');

  const isAdmin = [
    'ADMIN', 'SUPER_ADMIN', 'FOUNDER', 'CO_FOUNDER', 'CEO'
  ].includes(userRole) ||
    userPos.includes('founder') || userPos.includes('ceo') || userPos.includes('admin');

  useEffect(() => {
    if (isManagerTier) {
      const fetchAllEmployees = async () => {
        try {
          const res = await employeesApi.getEmployees();
          if (res.success) {
            setEmployeesList(res.data.employees || []);
          }
        } catch (err) {
          console.error('Error fetching employees list:', err);
        }
      };
      fetchAllEmployees();
    }
  }, [isManagerTier]);

  const handleManualMarkSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.employeeId || !manualForm.date || !manualForm.status) {
      return toast.error('Employee, Date, and Status are required!');
    }
    setManualSubmitting(true);
    try {
      const res = await attendanceApi.markAttendanceManually(manualForm);
      if (res.success) {
        toast.success('Attendance marked manually!');
        setShowManualModal(false);
        setManualForm(prev => ({
          ...prev,
          employeeId: '',
          status: 'PRESENT',
          checkInTime: '09:00 AM',
          checkOutTime: '06:00 PM'
        }));
        fetchReport(filters);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setManualSubmitting(false);
    }
  };

  useEffect(() => {
    fetchToday();
    if (isManagerTier) fetchReport(filters);
    else fetchMyHistory(filters);

    const socket = socketService.getSocket();
    const handleUpdate = () => {
      fetchToday();
      if (isManagerTier) fetchReport(filters);
      else fetchMyHistory(filters);
    };

    if (socket) {
      socket.on('attendance_updated', handleUpdate);
    }
    window.addEventListener('attendance_updated', handleUpdate);

    return () => {
      if (socket) socket.off('attendance_updated', handleUpdate);
      window.removeEventListener('attendance_updated', handleUpdate);
    };
  }, [filters, isManagerTier]);

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
    if (!window.confirm('Check out now? This ends your work shift.')) {
      return;
    }
    setActionLoading(true);
    try {
      const response = await attendanceApi.checkOut();
      if (response.success) {
        toast.success('Checked out successfully! Shift completed. 🌙');
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
        if (isManagerTier) fetchReport(filters);
        else fetchMyHistory(getCurrentMonthBounds());
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
        if (isManagerTier) fetchReport(filters);
        else fetchMyHistory(getCurrentMonthBounds());
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

  const allDepartmentsList = useMemo(() => {
    const set = new Set(DEPARTMENTS);
    (employeesList || []).forEach(e => { if (e.department) set.add(e.department.toUpperCase()); });
    (report || []).forEach(r => { if (r.employeeId?.department) set.add(r.employeeId.department.toUpperCase()); });
    return Array.from(set).sort();
  }, [employeesList, report]);

  const availableEmployees = useMemo(() => {
    const map = new Map();
    (employeesList || []).forEach(emp => {
      const id = emp._id || emp.employeeId;
      if (id) {
        map.set(id, {
          id,
          name: emp.fullName || emp.name || 'Unknown',
          employeeId: emp.employeeId || '',
          dept: emp.department || '—',
          role: emp.role || '—'
        });
      }
    });

    (report || []).forEach(rec => {
      const empObj = rec.employeeId;
      const id = empObj?._id || empObj?.employeeId || empObj?.name;
      if (id && !map.has(id)) {
        map.set(id, {
          id,
          name: empObj?.fullName || empObj?.name || 'Unknown',
          employeeId: empObj?.employeeId || '',
          dept: empObj?.department || '—',
          role: empObj?.role || '—'
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [employeesList, report]);

  const filteredReport = useMemo(() => {
    return report.filter((rec) => {
      if (selectedEmployeeId) {
        const id = rec.employeeId?._id || rec.employeeId?.employeeId || rec.employeeId?.name;
        if (id !== selectedEmployeeId) return false;
      }
      if (employeeSearch) {
        const empName = (rec.employeeId?.fullName || rec.employeeId?.name || '').toLowerCase();
        const search = employeeSearch.toLowerCase();
        const matchName = empName.includes(search);
        const matchId = (rec.employeeId?.employeeId || '').toLowerCase().includes(search);
        if (!matchName && !matchId) return false;
      }
      return true;
    });
  }, [report, selectedEmployeeId, employeeSearch]);

  const selectedEmployeeMetrics = useMemo(() => {
    if (!selectedEmployeeId) return null;

    const empInfo = availableEmployees.find(e => e.id === selectedEmployeeId) || {
      name: 'Selected Employee',
      dept: '—',
      role: '—',
      employeeId: ''
    };

    const empRecords = report.filter(rec => {
      const id = rec.employeeId?._id || rec.employeeId?.employeeId || rec.employeeId?.name;
      return id === selectedEmployeeId;
    });

    const present = empRecords.filter(r => r.status === 'PRESENT').length;
    const late = empRecords.filter(r => r.status === 'LATE').length;
    const halfDay = empRecords.filter(r => r.status === 'HALF_DAY').length;
    const absent = empRecords.filter(r => r.status === 'ABSENT').length;
    const total = empRecords.length;

    const effectiveDays = present + late + (halfDay * 0.5);
    const rate = total > 0 ? Math.min(100, Math.round((effectiveDays / total) * 100)) : 0;

    let totalHours = 0;
    let hoursCount = 0;
    empRecords.forEach(r => {
      if (r.workingHours) {
        totalHours += Number(r.workingHours);
        hoursCount++;
      }
    });
    const avgHours = hoursCount > 0 ? (totalHours / hoursCount).toFixed(1) : '0';

    return {
      empInfo,
      present,
      late,
      halfDay,
      absent,
      total,
      rate,
      avgHours,
      recordsCount: empRecords.length
    };
  }, [selectedEmployeeId, report, availableEmployees]);

  const summary = useMemo(() => {
    return filteredReport.reduce(
      (acc, rec) => {
        if (rec.status === 'PRESENT') acc.present += 1;
        else if (rec.status === 'LATE') acc.late += 1;
        else if (rec.status === 'HALF_DAY') acc.halfDay += 1;
        else if (rec.status === 'ABSENT') acc.absent += 1;
        return acc;
      },
      { present: 0, late: 0, halfDay: 0, absent: 0 }
    );
  }, [filteredReport]);

  const departmentChartData = useMemo(() => {
    const map = new Map();
    allDepartmentsList.forEach(dept => {
      map.set(dept, { department: dept, Present: 0, Late: 0, HalfDay: 0, Absent: 0, Total: 0 });
    });

    filteredReport.forEach((rec) => {
      const dept = (rec.employeeId?.department || 'OTHER').toUpperCase();
      if (!map.has(dept)) {
        map.set(dept, { department: dept, Present: 0, Late: 0, HalfDay: 0, Absent: 0, Total: 0 });
      }
      const item = map.get(dept);
      item.Total += 1;
      if (rec.status === 'PRESENT') item.Present += 1;
      else if (rec.status === 'LATE') item.Late += 1;
      else if (rec.status === 'HALF_DAY') item.HalfDay += 1;
      else if (rec.status === 'ABSENT') item.Absent += 1;
    });

    const activeList = Array.from(map.values()).filter(item => item.Total > 0 || (filters.department && filters.department === item.department));
    return activeList.length > 0 ? activeList : [
      { department: 'ADMIN', Present: summary.present, Late: summary.late, HalfDay: summary.halfDay, Absent: summary.absent }
    ];
  }, [filteredReport, filters.department, summary, allDepartmentsList]);

  const displayRows = useMemo(
    () => buildDisplayRows(filteredReport, filters.startDate, filters.endDate),
    [filteredReport, filters.startDate, filters.endDate]
  );

  const myHistoryRows = useMemo(
    () => buildDisplayRows(myHistory, '', ''),
    [myHistory]
  );

  const statusColor = (status) => {
    const colors = {
      PRESENT: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold',
      LATE: 'bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold',
      HALF_DAY: 'bg-sky-500/10 text-sky-500 border-sky-500/20 font-bold',
      ABSENT: 'bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold'
    };
    return colors[status] || 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-faint)] border-[var(--crm-line)]';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--crm-bg)] flex items-center justify-center font-sans">
        <div className="w-12 h-1 bg-[var(--crm-line)] rounded animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen w-full bg-[var(--crm-bg)] text-[var(--crm-heading)] font-sans pb-12">

      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-line)] py-6 px-4 md:px-8 flex flex-col md:flex-row md:items-end justify-between gap-3 bg-[var(--crm-bg-sunken)]/40 backdrop-blur-sm">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold block font-sans">MODULE 02 // EMPLOYEE ATTENDANCE</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--crm-heading)] tracking-tight font-sans">Attendance Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-sans text-[var(--crm-heading)] bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] px-3 py-1.5 rounded-lg self-start md:self-auto font-medium shadow-sm">
          <FiClock size={14} className="text-blue-500" />
          <span>Official Shift &nbsp;09:00 AM &ndash; 06:00 PM</span>
        </div>
      </motion.div>

      <div className="w-full px-3 sm:px-6 md:px-8 py-6 space-y-6 min-w-0 overflow-x-hidden">

        {/* Check-in / Check-out card */}
        <motion.div variants={blockVariants} className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] rounded-xl p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <p className="text-lg font-bold text-[var(--crm-heading)]">{user?.fullName}</p>
              <p className="text-xs uppercase tracking-wider text-[var(--crm-ink-faint)] font-medium mt-0.5">{user?.department} &bull; {user?.role} &bull; {user?.employeeId}</p>

              <span className="text-[10px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold block mt-4 mb-2">Today's Status</span>
              {today?.checkInAt || today?.checkInTime ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-block px-2.5 py-1 border text-xs font-bold uppercase rounded-md ${statusColor(today.status)}`}>
                    {today.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-[var(--crm-heading)] font-semibold">In: {formatTimeDisplay(today.checkInTime, today.checkInAt)}</span>
                  {today.checkOutAt || today.checkOutTime ? (
                    <>
                      <span className="text-xs text-[var(--crm-heading)] font-semibold">Out: {formatTimeDisplay(today.checkOutTime, today.checkOutAt)}</span>
                      <span className="text-xs text-emerald-500 font-bold">{today.workingHours}h worked</span>
                      {today.overtimeHours > 0 && (
                        <span className="text-xs text-sky-400 font-bold">+{today.overtimeHours}h overtime</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-[var(--crm-ink-faint)] font-medium">Expected check-out: 06:00 PM</span>
                  )}
                  {today.lunchEndAt && (
                    <span className="text-xs text-amber-500 font-semibold">Lunch: {today.lunchDurationMinutes}m</span>
                  )}
                  {today.lunchStartAt && !today.lunchEndAt && (
                    <span className="text-xs text-amber-500 font-bold animate-pulse">On lunch: {formatElapsed(lunchElapsed)}</span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--crm-ink-faint)] font-normal">You have not checked in today.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {!today?.checkInAt && (
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <FiLogIn size={16} /> Check In
                </button>
              )}
              {today?.checkInAt && !today?.checkOutAt && (
                <>
                  {!today?.lunchStartAt && (
                    <button
                      onClick={handleLunchStart}
                      disabled={lunchLoading}
                      className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <FiCoffee size={16} /> Lunch Time
                    </button>
                  )}
                  {today?.lunchStartAt && !today?.lunchEndAt && (
                    <button
                      onClick={handleLunchEnd}
                      disabled={lunchLoading}
                      className="flex items-center gap-2 bg-amber-500 text-white hover:bg-amber-600 text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      <FiCoffee size={16} /> Back to Work <span className="font-mono">{formatElapsed(lunchElapsed)}</span>
                    </button>
                  )}
                  {today?.lunchEndAt && (
                    <button
                      disabled
                      title={`Lunch taken: ${today.lunchDurationMinutes} min`}
                      className="flex items-center gap-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-ink-faint)] text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg opacity-50 cursor-not-allowed"
                    >
                      <FiCoffee size={16} /> Lunch Taken ({today.lunchDurationMinutes}m)
                    </button>
                  )}
                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="flex items-center gap-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] hover:bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <FiLogOut size={16} /> Check Out
                  </button>
                </>
              )}
              {today?.checkOutAt && (
                <span className="text-xs uppercase tracking-wider text-emerald-500 font-bold self-center">Day Complete ✓</span>
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
                { label: 'Present', val: summary.present, icon: FiCheckCircle, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
                { label: 'Late', val: summary.late, icon: FiAlertCircle, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
                { label: 'Half Day', val: summary.halfDay, icon: FiClock, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
                { label: 'Absent', val: summary.absent, icon: FiXCircle, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' }
              ].map((card, idx) => (
                <div key={idx} className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold">{card.label}</p>
                    <p className="text-2xl font-bold text-[var(--crm-heading)] mt-1">{card.val}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${card.color}`}><card.icon size={18} /></div>
                </div>
              ))}
            </motion.div>

            {/* BAR CHART SECTION */}
            <motion.div variants={blockVariants} className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-3">
                <div className="flex items-center gap-2">
                  <FiBarChart2 className="text-blue-500" size={18} />
                  <h3 className="text-sm font-bold text-[var(--crm-heading)] uppercase tracking-wider font-sans">
                    Attendance Analytics Overview
                  </h3>
                </div>
                <span className="text-[11px] font-medium text-[var(--crm-ink-faint)]">
                  Grouped by Department
                </span>
              </div>
              
              <div className="w-full h-72 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
                  <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-line)" opacity={0.5} />
                    <XAxis dataKey="department" stroke="var(--crm-heading)" tick={{ fontSize: 11, fill: 'var(--crm-heading)' }} />
                    <YAxis stroke="var(--crm-heading)" tick={{ fontSize: 11, fill: 'var(--crm-heading)' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="HalfDay" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Selected Employee Detailed Analytics Card */}
            {selectedEmployeeMetrics && (
              <motion.div variants={blockVariants} className="bg-[var(--crm-bg-raised)] border border-blue-500/30 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--crm-line)] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-base">
                      <FiUser size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--crm-heading)]">{selectedEmployeeMetrics.empInfo.name}</h3>
                      <p className="text-xs text-[var(--crm-ink-faint)] font-medium">
                        {selectedEmployeeMetrics.empInfo.dept} &bull; {selectedEmployeeMetrics.empInfo.role} {selectedEmployeeMetrics.empInfo.employeeId ? `(${selectedEmployeeMetrics.empInfo.employeeId})` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEmployeeId('')}
                    className="px-3 py-1.5 bg-blue-200 text-blue-950 hover:bg-blue-300 border border-blue-300 text-xs font-bold uppercase tracking-wider rounded-md transition cursor-pointer self-start sm:self-auto"
                  >
                    Clear Employee Selection
                  </button>
                </div>

                {/* Grid of employee metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-[var(--crm-bg)] border border-emerald-500/30 p-3 rounded-lg text-center">
                    <p className="text-[10px] uppercase font-bold text-emerald-500">Present</p>
                    <p className="text-xl font-bold text-emerald-500 mt-1">{selectedEmployeeMetrics.present}</p>
                    <p className="text-[10px] text-[var(--crm-ink-faint)] font-medium">days</p>
                  </div>
                  <div className="bg-[var(--crm-bg)] border border-amber-500/30 p-3 rounded-lg text-center">
                    <p className="text-[10px] uppercase font-bold text-amber-500">Late</p>
                    <p className="text-xl font-bold text-amber-500 mt-1">{selectedEmployeeMetrics.late}</p>
                    <p className="text-[10px] text-[var(--crm-ink-faint)] font-medium">days</p>
                  </div>
                  <div className="bg-[var(--crm-bg)] border border-sky-500/30 p-3 rounded-lg text-center">
                    <p className="text-[10px] uppercase font-bold text-sky-400">Half Day / Leave</p>
                    <p className="text-xl font-bold text-sky-400 mt-1">{selectedEmployeeMetrics.halfDay}</p>
                    <p className="text-[10px] text-[var(--crm-ink-faint)] font-medium">days</p>
                  </div>
                  <div className="bg-[var(--crm-bg)] border border-rose-500/30 p-3 rounded-lg text-center">
                    <p className="text-[10px] uppercase font-bold text-rose-500">Absent</p>
                    <p className="text-xl font-bold text-rose-500 mt-1">{selectedEmployeeMetrics.absent}</p>
                    <p className="text-[10px] text-[var(--crm-ink-faint)] font-medium">days</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 bg-[var(--crm-bg)] border border-[var(--crm-line)] p-3 rounded-lg text-center">
                    <p className="text-[10px] uppercase font-bold text-[var(--crm-heading)]">Attendance Score</p>
                    <p className="text-xl font-bold text-blue-400 mt-1">{selectedEmployeeMetrics.rate}%</p>
                    <div className="w-full bg-[var(--crm-line)] h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${selectedEmployeeMetrics.rate >= 85 ? 'bg-emerald-500' : selectedEmployeeMetrics.rate >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${selectedEmployeeMetrics.rate}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--crm-ink-faint)] font-medium pt-1">
                  <span>Total Days Logged: <strong className="text-[var(--crm-heading)]">{selectedEmployeeMetrics.total}</strong></span>
                  <span>Avg Work Hours: <strong className="text-emerald-500">{selectedEmployeeMetrics.avgHours} hrs/day</strong></span>
                </div>
              </motion.div>
            )}

            {/* Filter Bar with Dept & Employee Dropdowns */}
            <motion.div variants={blockVariants} className="p-3 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm text-xs font-sans">
              <div className="flex flex-wrap items-center gap-2">
                {/* Clean Department Dropdown */}
                <select
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                  className="px-3 py-1.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-blue-500 rounded-md outline-none text-xs cursor-pointer text-[var(--crm-heading)] font-medium"
                >
                  <option value="" className="bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] font-sans">All Depts</option>
                  {allDepartmentsList.map((d) => (
                    <option key={d} value={d} className="bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] font-sans">{d}</option>
                  ))}
                </select>

                {/* All Employees Dropdown */}
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="px-3 py-1.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-blue-500 rounded-md outline-none text-xs cursor-pointer text-[var(--crm-heading)] font-medium max-w-[210px] truncate"
                >
                  <option value="" className="bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] font-sans">All Employees ({availableEmployees.length})</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] font-sans">
                      {emp.name} {emp.dept ? `(${emp.dept})` : ''}
                    </option>
                  ))}
                </select>

                {/* Employee Search Input */}
                <input
                  type="text"
                  placeholder="Search Employee..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="px-3 py-1.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-blue-500 rounded-md outline-none text-xs text-[var(--crm-heading)] font-medium w-36"
                />

                {/* Compact Date Range Pickers */}
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="px-2.5 py-1.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-blue-500 rounded-md outline-none text-xs text-[var(--crm-heading)] font-medium"
                />
                <span className="text-[var(--crm-ink-faint)] font-bold">&ndash;</span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="px-2.5 py-1.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-blue-500 rounded-md outline-none text-xs text-[var(--crm-heading)] font-medium"
                />

                {/* Apply Filter Button - blue-200 styled */}
                <button
                  onClick={handleApplyFilter}
                  className="px-3 py-1.5 bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 text-xs font-bold uppercase tracking-wider rounded-md transition cursor-pointer"
                >
                  Filter
                </button>

                {/* Today Only Button - blue-200 styled */}
                <button
                  onClick={() => {
                    const todayStr = formatLocalDate(new Date());
                    const todayF = { startDate: todayStr, endDate: todayStr, department: filters.department };
                    setFilters(todayF);
                    if (isManagerTier) fetchReport(todayF);
                    else fetchMyHistory(todayF);
                  }}
                  className="px-3 py-1.5 bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 text-xs font-bold uppercase tracking-wider rounded-md transition cursor-pointer"
                  title="Reset to today's date"
                >
                  Today
                </button>

                {/* This Month Button - blue-200 styled */}
                <button
                  onClick={() => {
                    const monthF = getCurrentMonthBounds();
                    monthF.department = filters.department;
                    setFilters(monthF);
                    if (isManagerTier) fetchReport(monthF);
                    else fetchMyHistory(monthF);
                  }}
                  className="px-3 py-1.5 bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 text-xs font-bold uppercase tracking-wider rounded-md transition cursor-pointer"
                  title="Filter full current month"
                >
                  This Month
                </button>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-2">
                {isManagerTier && (
                  <button
                    onClick={() => setShowManualModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-md transition shadow-sm cursor-pointer"
                  >
                    <FiLogIn size={13} /> Manual Mark
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={handleCleanupOrphaned}
                    disabled={cleanupLoading}
                    title="Clean invalid records"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-500 text-xs font-bold uppercase tracking-wider rounded-md transition disabled:opacity-50 cursor-pointer"
                  >
                    <FiTrash2 size={13} /> {cleanupLoading ? '...' : 'Clean'}
                  </button>
                )}
              </div>
            </motion.div>

            {/* Daily Logs Table View */}
            <motion.div variants={blockVariants} className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px] font-sans">
                  <thead>
                    <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-xs uppercase tracking-wider font-bold border-b border-[var(--crm-line)]">
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
                  <tbody className="divide-y divide-[var(--crm-line)] text-xs font-medium">
                    {reportLoading ? (
                      <tr><td colSpan="8" className="text-center py-12 text-[var(--crm-ink-faint)] uppercase tracking-wider text-xs">Loading records...</td></tr>
                    ) : filteredReport.length === 0 ? (
                      <tr><td colSpan="8" className="text-center py-16 text-[var(--crm-ink-faint)] uppercase tracking-wider text-xs">No attendance records found.</td></tr>
                    ) : (
                      filteredReport.map((record) => (
                        <tr key={record._id} className="hover:bg-[var(--crm-bg-sunken)]/50 transition-colors">
                          <td className="py-3.5 px-5 font-semibold text-[var(--crm-heading)]">{record.employeeId?.fullName || record.employeeId?.name || 'Unknown'}</td>
                          <td className="py-3.5 px-5">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] rounded-md">
                              {record.employeeId?.department || '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-[var(--crm-heading)]">{new Date(record.date).toLocaleDateString()}</td>
                          <td className="py-3.5 px-5 text-[var(--crm-heading)]">{formatTimeDisplay(record.checkInTime, record.checkInAt)}</td>
                          <td className="py-3.5 px-5 text-[var(--crm-heading)]">{formatTimeDisplay(record.checkOutTime, record.checkOutAt)}</td>
                          <td className="py-3.5 px-5 text-emerald-500 font-bold">
                            <div>
                              {record.workingHours
                                ? `${record.workingHours}h`
                                : (record.checkInAt && !record.checkOutAt
                                    ? `${((Date.now() - new Date(record.checkInAt).getTime()) / (1000 * 60 * 60)).toFixed(2)}h`
                                    : '0h')}
                            </div>
                            {record.checkInAt && !record.checkOutAt && (
                              <span className="text-[10px] text-emerald-500 font-bold block mt-0.5">🟢 Active Now</span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-amber-500 font-semibold">
                            {record.lunchStartAt ? (
                              <div>
                                <div className="text-xs font-bold">
                                  {formatTimeDisplay(null, record.lunchStartAt)} &ndash; {record.lunchEndAt ? formatTimeDisplay(null, record.lunchEndAt) : 'On Lunch'}
                                </div>
                                <div className="text-[10px] text-[var(--crm-ink-faint)]">
                                  ({record.lunchDurationMinutes || 0} min total)
                                </div>
                              </div>
                            ) : (
                              record.lunchDurationMinutes ? `${record.lunchDurationMinutes}m` : '—'
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 border text-[10px] font-bold tracking-wider uppercase rounded-md ${statusColor(record.status)}`}>
                              {record.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}

        {!isManagerTier && (
          <motion.div variants={blockVariants} className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-[var(--crm-line)]">
              <span className="text-xs uppercase tracking-wider text-[var(--crm-heading)] font-bold font-sans">Your Attendance History &bull; This Month</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px] font-sans">
                <thead>
                  <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-xs uppercase tracking-wider font-bold border-b border-[var(--crm-line)]">
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-5">Check In</th>
                    <th className="py-3.5 px-5">Check Out</th>
                    <th className="py-3.5 px-5">Working Hours</th>
                    <th className="py-3.5 px-5">Lunch</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--crm-line)] text-xs font-medium">
                  {myHistoryLoading ? (
                    <tr><td colSpan="6" className="text-center py-12 text-[var(--crm-ink-faint)] uppercase tracking-wider text-xs">Loading records...</td></tr>
                  ) : myHistoryRows.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-16 text-[var(--crm-ink-faint)] uppercase tracking-wider text-xs">No attendance records found.</td></tr>
                  ) : (
                    myHistoryRows.map((row) =>
                      row.isSunday ? (
                        <tr key={row.date.toDateString()} className="bg-[var(--crm-bg-sunken)]/40">
                          <td colSpan="6" className="text-center py-3 text-xs uppercase tracking-widest font-bold text-[var(--crm-ink-faint)]">
                            Sunday &bull; {row.date.toLocaleDateString()}
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.record._id} className="hover:bg-[var(--crm-bg-sunken)]/50 transition-colors">
                          <td className="py-3.5 px-5 text-[var(--crm-heading)]">{new Date(row.record.date).toLocaleDateString()}</td>
                          <td className="py-3.5 px-5 text-[var(--crm-heading)]">{formatTimeDisplay(row.record.checkInTime, row.record.checkInAt)}</td>
                          <td className="py-3.5 px-5 text-[var(--crm-heading)]">{formatTimeDisplay(row.record.checkOutTime, row.record.checkOutAt)}</td>
                          <td className="py-3.5 px-5 text-emerald-500 font-bold">{row.record.workingHours || 0}h</td>
                          <td className="py-3.5 px-5 text-amber-500 font-semibold">{row.record.lunchDurationMinutes ? `${row.record.lunchDurationMinutes}m` : '—'}</td>
                          <td className="py-3.5 px-5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 border text-[10px] font-bold tracking-wider uppercase rounded-md ${statusColor(row.record.status)}`}>
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
      {/* Manual Logger Modal */}
      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManualModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              className="relative bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] w-full max-w-md p-6 rounded-lg shadow-2xl font-mono text-xs z-10 text-left"
            >
              <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3 mb-4">
                <h3 className="text-sm font-serif font-normal uppercase text-[var(--crm-heading)] flex items-center gap-2">
                  <FiClock className="text-teal-400" /> Manual Attendance Log
                </h3>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="text-[var(--crm-ink-faint)] hover:text-white transition cursor-pointer"
                >
                  <FiXCircle size={16} />
                </button>
              </div>

              <form onSubmit={handleManualMarkSubmit} className="space-y-4">
                <div>
                  <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1 font-bold">Select Employee *</label>
                  <select
                    required
                    value={manualForm.employeeId}
                    onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
                    className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] px-2.5 py-2 rounded outline-none text-[var(--crm-heading)] cursor-pointer"
                  >
                    <option value="">Choose employee...</option>
                    {employeesList.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.department} - {emp.role.replace('_', ' ')})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1 font-bold">Date *</label>
                    <input
                      type="date"
                      required
                      value={manualForm.date}
                      onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                      className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] px-2.5 py-1.5 rounded outline-none text-[var(--crm-heading)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1 font-bold">Classification *</label>
                    <select
                      required
                      value={manualForm.status}
                      onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                      className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] px-2.5 py-1.5 rounded outline-none text-[var(--crm-heading)] cursor-pointer font-bold"
                    >
                      <option value="PRESENT" className="text-emerald-400 font-bold">Present (Full Time)</option>
                      <option value="LATE" className="text-amber-400 font-bold">Late Arrival</option>
                      <option value="HALF_DAY" className="text-sky-400 font-bold">Half Day (Half Time)</option>
                      <option value="ABSENT" className="text-rose-400 font-bold">Absent</option>
                      <option value="HOLIDAY" className="text-slate-400 font-bold">Holiday</option>
                      <option value="WEEKEND" className="text-slate-400 font-bold">Weekend</option>
                    </select>
                  </div>
                </div>

                {manualForm.status !== 'ABSENT' && manualForm.status !== 'HOLIDAY' && manualForm.status !== 'WEEKEND' && (
                  <div className="grid grid-cols-2 gap-3 border border-[var(--crm-line)] p-3 rounded bg-[var(--crm-bg-sunken)]/30 animate-fadeIn">
                    <div>
                      <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1">Check In Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 09:00 AM"
                        value={manualForm.checkInTime}
                        onChange={(e) => setManualForm({ ...manualForm, checkInTime: e.target.value })}
                        className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] px-2 py-1 rounded outline-none text-[var(--crm-heading)] text-[10px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1">Check Out Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 06:00 PM"
                        value={manualForm.checkOutTime}
                        onChange={(e) => setManualForm({ ...manualForm, checkOutTime: e.target.value })}
                        className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] px-2 py-1 rounded outline-none text-[var(--crm-heading)] text-[10px]"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="border border-[var(--crm-line)] hover:border-white px-4 py-2 rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={manualSubmitting}
                    className="bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg-sunken)] px-4 py-2 rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer disabled:opacity-40"
                  >
                    {manualSubmitting ? 'Logging...' : 'Save Attendance'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
