import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheckSquare,
  FiCalendar,
  FiClock,
  FiUser,
  FiSend,
  FiActivity,
  FiChevronRight,
  FiBriefcase,
  FiMapPin,
  FiPlus,
  FiLayers,
  FiUserCheck,
  FiFileText,
  FiPaperclip
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { attendanceApi } from '../../api/attendance';
import { leaveApi } from '../../api/leave';
import { taskApi } from '../../api/task';

// Animation variants matching CRM portal design system
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 18 } }
};

const CARD = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)', boxShadow: 'var(--crm-shadow)' };
const CARD_SUNKEN = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' };
const LABEL_MONO = { fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' };
const HEADING = { fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' };

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Attendance states
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  // Leave states
  const [leaveBalance, setLeaveBalance] = useState({ remainingLeaves: 4, extraLeavesUsed: 0 });
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [applyFromDate, setApplyFromDate] = useState('');
  const [applyToDate, setApplyToDate] = useState('');
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [leaveReason, setLeaveReason] = useState('');
  const [extraReason, setExtraReason] = useState('');
  const [applyingLeave, setApplyingLeave] = useState(false);

  // Tasks states
  const [tasks, setTasks] = useState([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskRemarks, setTaskRemarks] = useState('');
  const [selectedTaskStatus, setSelectedTaskStatus] = useState('');
  const [completionFile, setCompletionFile] = useState(null);
  const [updatingTaskStatus, setUpdatingTaskStatus] = useState(false);

  // Real-time socket triggers & global events
  useEffect(() => {
    fetchInitialDashboardData();

    // Listen to real-time events from socket
    const handleTaskAssigned = () => {
      fetchTasks();
    };
    const handleTaskUpdated = () => {
      fetchTasks();
    };
    const handleAttendanceUpdated = () => {
      fetchTodayAttendance();
      fetchAttendanceLogs();
    };

    window.addEventListener('task_assigned_event', handleTaskAssigned);
    window.addEventListener('task_updated_event', handleTaskUpdated);
    window.addEventListener('attendance_updated', handleAttendanceUpdated);

    return () => {
      window.removeEventListener('task_assigned_event', handleTaskAssigned);
      window.removeEventListener('task_updated_event', handleTaskUpdated);
      window.removeEventListener('attendance_updated', handleAttendanceUpdated);
    };
  }, []);

  useEffect(() => {
    if (selectedTask) {
      setSelectedTaskStatus(selectedTask.status);
      setCompletionFile(null);
      setTaskRemarks(selectedTask.remarks || '');
    }
  }, [selectedTask]);

  const fetchInitialDashboardData = async () => {
    setAttendanceLoading(true);
    await Promise.all([
      fetchTodayAttendance(),
      fetchAttendanceLogs(),
      fetchLeaveBalance(),
      fetchLeaveHistory(),
      fetchTasks()
    ]);
    setAttendanceLoading(false);
  };

  const fetchTodayAttendance = async () => {
    try {
      const res = await attendanceApi.getMyToday();
        setTodayAttendance(res.data.record || res.data.attendance);
    } catch (err) {
      console.error('Error fetching today attendance:', err);
    }
  };

  const fetchAttendanceLogs = async () => {
    try {
      const res = await attendanceApi.getMyHistory({ limit: 5 });
      if (res.success) {
        setAttendanceHistory(res.data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching attendance history:', err);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const res = await leaveApi.getMyBalance();
      if (res.success) {
        setLeaveBalance(res.data.balance || { remainingLeaves: 4, extraLeavesUsed: 0 });
      }
    } catch (err) {
      console.error('Error fetching leave balance:', err);
    }
  };

  const fetchLeaveHistory = async () => {
    try {
      const res = await leaveApi.getLeaves();
      if (res.success) {
        setLeaveHistory(res.data.leaves || []);
      } else if (Array.isArray(res)) {
        setLeaveHistory(res);
      }
    } catch (err) {
      console.error('Error fetching leave history:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await taskApi.getTasks();
      if (res.success) {
        setTasks(res.data.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching employee tasks:', err);
    }
  };

  // Clock Actions
  const handleCheckIn = async () => {
    try {
      const res = await attendanceApi.checkIn();
      if (res.success) {
        toast.success('Successfully checked in! Have a great day. ☀️');
        fetchTodayAttendance();
        fetchAttendanceLogs();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await attendanceApi.checkOut();
      if (res.success) {
        toast.success('Successfully checked out! See you tomorrow. 🌙');
        fetchTodayAttendance();
        fetchAttendanceLogs();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    }
  };

  // Leave Submit
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!applyFromDate || !applyToDate || !leaveReason.trim()) {
      return toast.error('Please specify leave dates and a valid reason.');
    }

    setApplyingLeave(true);
    try {
      const leaveData = {
        fromDate: applyFromDate,
        toDate: applyToDate,
        leaveType,
        reason: leaveReason
      };

      // Check if balance is exhausted and user needs Extra Leave
      const isExtra = leaveBalance.remainingLeaves === 0;
      if (isExtra) {
        if (!extraReason.trim()) {
          setApplyingLeave(false);
          return toast.error('Extra leaves require mandatory justificationRemarks');
        }
        leaveData.isExtraLeave = true;
        leaveData.extraLeaveReason = extraReason;
      }

      const res = await leaveApi.applyForLeave(leaveData);
      if (res.success) {
        toast.success(isExtra ? 'Extra leave request submitted for HR Approval!' : 'Leave request applied successfully!');
        setApplyFromDate('');
        setApplyToDate('');
        setLeaveReason('');
        setExtraReason('');
        fetchLeaveBalance();
        fetchLeaveHistory();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setApplyingLeave(false);
    }
  };

  // Task Status Update Submit
  const handleUpdateTaskStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    setUpdatingTaskStatus(true);
    try {
      let payload;
      if (selectedTaskStatus === 'COMPLETED' && completionFile) {
        payload = new FormData();
        payload.append('status', selectedTaskStatus);
        payload.append('remarks', taskRemarks || 'Completed by employee');
        payload.append('file', completionFile);
      } else {
        payload = {
          status: selectedTaskStatus,
          remarks: taskRemarks || 'Status updated by employee'
        };
      }

      const res = await taskApi.updateTaskStatus(selectedTask._id, payload);
      if (res.success) {
        toast.success(`Task status updated to ${selectedTaskStatus}!`);
        setSelectedTask(null);
        setTaskRemarks('');
        setCompletionFile(null);
        fetchTasks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task status');
    } finally {
      setUpdatingTaskStatus(false);
    }
  };

  // Filters tasks
  const filteredTasks = tasks.filter(t => {
    if (taskStatusFilter === 'ALL') return true;
    return t.status === taskStatusFilter;
  });

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 font-sans antialiased text-[var(--crm-ink-soft)] bg-[var(--crm-bg)] block pb-12 w-full max-w-full overflow-x-hidden text-left"
    >
      {/* Employee Greeting Header */}
      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-line)] py-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1 text-left flex-1 min-w-0">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--crm-accent)] font-bold block font-mono">Employee Hub</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] tracking-tight uppercase">Welcome, {user?.name || user?.fullName}</h1>
          <p className="text-xs text-[var(--crm-ink-faint)] font-light max-w-2xl mt-1">
            Department: <strong className="text-[var(--crm-heading)] font-mono">{user?.department}</strong> • Position: <strong className="text-[var(--crm-heading)] font-mono">{user?.position || 'Staff'}</strong>
          </p>
        </div>
        <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] px-4 py-2 text-[10px] font-mono font-bold text-[var(--crm-heading)] tracking-widest uppercase rounded-sm select-none shrink-0">
          Status // Active Node
        </div>
      </motion.div>

      {/* Tabs navigation */}
      <motion.div variants={blockVariants} className="border-b border-[var(--crm-line)] flex overflow-x-auto scrollbar-none w-full max-w-full">
        <nav className="flex space-x-6 min-w-max">
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: FiActivity },
            { id: 'tasks', label: `My Tasks (${tasks.filter(t => t.status !== 'COMPLETED').length})`, icon: FiCheckSquare },
            { id: 'leaves', label: 'Leaves Desk', icon: FiCalendar },
            { id: 'profile', label: 'My Profile Card', icon: FiUser }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 text-[11px] uppercase tracking-widest font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-[var(--crm-accent)] text-[var(--crm-heading)]'
                  : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)]'
              }`}
            >
              <tab.icon size={13} className={activeTab === tab.id ? 'text-[var(--crm-accent)]' : 'text-inherit'} />
              {tab.label}
            </button>
          ))}
        </nav>
      </motion.div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column (Attendance Mark & Stats) */}
              <div className="lg:col-span-6 space-y-6">
                
                {/* Attendance Marking Widget */}
                <div className="border p-5 rounded-sm space-y-4" style={CARD}>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold font-mono text-[var(--crm-heading)] border-b pb-2 flex justify-between items-center" style={{ borderColor: 'var(--crm-line)' }}>
                    <span>Daily Attendance Logger</span>
                    <FiClock size={12} className="text-[var(--crm-accent)]" />
                  </h3>

                  {attendanceLoading ? (
                    <div className="crm-skeleton h-24 w-full rounded-sm" />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 border rounded-sm" style={CARD_SUNKEN}>
                        <span className="text-xs font-mono text-[var(--crm-ink-faint)]">Status Today:</span>
                        <strong className={`text-xs font-mono uppercase ${
                          todayAttendance ? 'text-[var(--crm-positive)]' : 'text-[var(--crm-danger)] animate-pulse'
                        }`}>
                          {todayAttendance ? (todayAttendance.clockOut ? 'Shift Completed' : 'Clocked In') : 'Absent / Not Checked In'}
                        </strong>
                      </div>

                      {todayAttendance && (
                        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                          <div className="p-2 border rounded-sm text-center" style={CARD_SUNKEN}>
                            <span className="text-[8px] text-[var(--crm-ink-faint)] uppercase block">Check In</span>
                            <span className="text-[var(--crm-heading)] font-bold">{new Date(todayAttendance.clockIn).toLocaleTimeString()}</span>
                          </div>
                          <div className="p-2 border rounded-sm text-center" style={CARD_SUNKEN}>
                            <span className="text-[8px] text-[var(--crm-ink-faint)] uppercase block">Check Out</span>
                            <span className="text-[var(--crm-heading)] font-bold">
                              {todayAttendance.clockOut ? new Date(todayAttendance.clockOut).toLocaleTimeString() : '--:--'}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3">
                        {!todayAttendance && (
                          <button
                            onClick={handleCheckIn}
                            className="flex-1 bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border border-[var(--crm-positive)]/20 hover:bg-[var(--crm-positive)] hover:text-[var(--crm-bg-sunken)] py-2.5 rounded-sm text-[10px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer text-center"
                          >
                            Clock In
                          </button>
                        )}
                        {todayAttendance && !todayAttendance.clockOut && (
                          <button
                            onClick={handleCheckOut}
                            className="flex-1 bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border border-[var(--crm-danger)]/20 hover:bg-[var(--crm-danger)] hover:text-white py-2.5 rounded-sm text-[10px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer text-center"
                          >
                            Clock Out
                          </button>
                        )}
                        {todayAttendance && todayAttendance.clockOut && (
                          <button
                            disabled
                            className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-ink-faint)] py-2.5 rounded-sm text-[10px] font-bold font-mono uppercase tracking-wider cursor-not-allowed text-center"
                          >
                            Shift Completed
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Leave Balances Display */}
                <div className="border p-5 rounded-sm space-y-4" style={CARD}>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold font-mono text-[var(--crm-heading)] border-b pb-2 flex justify-between items-center" style={{ borderColor: 'var(--crm-line)' }}>
                    <span>Leave Balances (This Month)</span>
                    <FiCalendar size={12} className="text-[var(--crm-accent)]" />
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-sm text-center" style={CARD_SUNKEN}>
                      <span className="text-[9px] font-mono text-[var(--crm-ink-faint)] uppercase block mb-1">Paid Leaves Left</span>
                      <strong className="text-3xl font-serif text-[var(--crm-positive)]">{leaveBalance.remainingLeaves} <span className="text-xs font-mono text-[var(--crm-ink-faint)]">/ 4</span></strong>
                    </div>
                    <div className="p-4 border rounded-sm text-center" style={CARD_SUNKEN}>
                      <span className="text-[9px] font-mono text-[var(--crm-ink-faint)] uppercase block mb-1">Extra Leaves Used</span>
                      <strong className="text-3xl font-serif text-[var(--crm-warning)]">{leaveBalance.extraLeavesUsed || 0}</strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column (Tasks & Actions Summaries) */}
              <div className="lg:col-span-6 space-y-6">
                
                {/* Recent Task Summaries */}
                <div className="border p-5 rounded-sm space-y-4" style={CARD}>
                  <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                    <h3 className="text-[10px] uppercase tracking-widest font-bold font-mono text-[var(--crm-heading)] flex items-center gap-1.5">
                      <FiCheckSquare size={12} className="text-[var(--crm-accent)]" /> Assigned Task Board
                    </h3>
                    <button onClick={() => setActiveTab('tasks')} className="text-[9px] text-[var(--crm-accent)] font-mono hover:underline flex items-center gap-0.5">
                      View all <FiChevronRight size={10} />
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {tasks.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[var(--crm-ink-faint)] font-mono border border-dashed rounded-sm" style={{ borderColor: 'var(--crm-line)' }}>
                        No tasks assigned to you.
                      </div>
                    ) : (
                      tasks.slice(0, 3).map((item) => (
                        <div key={item._id} className="p-3 border rounded-sm text-xs font-mono space-y-1.5 hover:border-[var(--crm-accent)]/30 transition" style={CARD_SUNKEN}>
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-semibold text-[var(--crm-heading)] truncate max-w-[70%]">{item.title}</span>
                            <span className={`text-[7px] font-bold px-1 rounded-sm uppercase ${
                              item.status === 'COMPLETED' ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)]' :
                              item.status === 'IN_PROGRESS' ? 'bg-[var(--crm-accent-bg)] text-[var(--crm-accent)]' :
                              'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)]'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          <p className="text-[9px] text-[var(--crm-ink-faint)] line-clamp-1 italic">"{item.description}"</p>
                          <div className="flex justify-between text-[7px] text-[var(--crm-ink-faint)] border-t pt-1" style={{ borderColor: 'var(--crm-line)' }}>
                            <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                            <span>Assigned By: {item.assignedBy?.name || 'HR Manager'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Attendance Mini Audit log */}
                <div className="border p-5 rounded-sm space-y-4" style={CARD}>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold font-mono text-[var(--crm-heading)] border-b pb-2 flex justify-between items-center" style={{ borderColor: 'var(--crm-line)' }}>
                    <span>Recent Clock Logs</span>
                    <FiActivity size={12} className="text-[var(--crm-accent)]" />
                  </h3>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                    {attendanceHistory.length === 0 ? (
                      <div className="text-center py-6 text-[9px] font-mono text-[var(--crm-ink-faint)]">No recent history</div>
                    ) : (
                      attendanceHistory.slice(0, 4).map((log) => (
                        <div key={log._id} className="flex justify-between items-center border-b pb-1.5 text-[9px] font-mono last:border-0" style={{ borderColor: 'var(--crm-line)' }}>
                          <span className="text-[var(--crm-heading)]">{new Date(log.date).toLocaleDateString()}</span>
                          <span className={`px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase ${
                            log.status === 'PRESENT' ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)]' :
                            log.status === 'LATE' ? 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)]' :
                            'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)]'
                          }`}>{log.status}</span>
                          <span className="text-[var(--crm-ink-faint)]">
                            {log.clockIn ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'} - {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: MY TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              
              {/* Task filters */}
              <div className="bg-[var(--crm-bg-raised)]/20 p-4 border border-[var(--crm-line)] rounded-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-heading)] font-bold">Allocated Directives</h3>
                  <p className="text-[10px] text-[var(--crm-ink-faint)] font-light mt-0.5">Review and manage status updates for tasks assigned by managers.</p>
                </div>
                <div className="flex border border-[var(--crm-line)] p-1 bg-[var(--crm-bg-sunken)] rounded-sm font-mono text-[9px]">
                  {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map(status => (
                    <button
                      key={status}
                      onClick={() => setTaskStatusFilter(status)}
                      className={`px-3 py-1 uppercase rounded-sm font-bold tracking-wider transition cursor-pointer ${
                        taskStatusFilter === status ? 'bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] shadow' : 'text-[var(--crm-ink-faint)] hover:text-white'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tasks Grid */}
              {filteredTasks.length === 0 ? (
                <div className="bg-[var(--crm-bg-raised)]/10 border border-[var(--crm-line)] py-16 rounded-sm text-center text-xs font-mono uppercase text-[var(--crm-ink-faint)]">
                  No tasks matched the selected filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredTasks.map((t) => (
                    <div
                      key={t._id}
                      className={`bg-[var(--crm-bg-raised)]/30 border p-5 rounded-sm shadow flex flex-col justify-between hover:border-[var(--crm-accent)]/30 transition duration-200 ${
                        t.status === 'COMPLETED' ? 'opacity-80 border-[var(--crm-positive)]/20' : ''
                      }`}
                      style={CARD}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] font-mono text-[var(--crm-ink-faint)] uppercase">
                            Due: {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 border rounded-sm uppercase ${
                            t.priority === 'HIGH' ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20' :
                            t.priority === 'LOW' ? 'bg-[var(--crm-info-bg)] text-[var(--crm-info)] border-[var(--crm-info)]/20' :
                            'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20'
                          }`}>
                            {t.priority}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-serif text-sm font-semibold text-[var(--crm-heading)] leading-tight">{t.title}</h4>
                          <p className="text-[10px] text-[var(--crm-ink-soft)] font-light mt-1.5 italic">"{t.description}"</p>
                        </div>

                        {t.fileOriginalName && (
                          <div className="flex items-center gap-1.5 text-[9px] font-mono mt-2">
                            <span className="text-[var(--crm-ink-faint)]">Attached File:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const baseUrl = 'http://localhost:5000/';
                                const absoluteUrl = t.fileUrl.startsWith('http') ? t.fileUrl : `${baseUrl}${t.fileUrl}`;
                                const link = document.createElement('a');
                                link.href = absoluteUrl;
                                link.setAttribute('download', t.fileOriginalName);
                                link.setAttribute('target', '_blank');
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                              }}
                              className="text-teal-400 hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              <FiPaperclip size={10} /> {t.fileOriginalName}
                            </button>
                          </div>
                        )}

                        {t.status === 'COMPLETED' && t.completionFileOriginalName && (
                          <div className="flex items-center gap-1.5 text-[9px] font-mono mt-1">
                            <span className="text-[var(--crm-ink-faint)]">Completion File:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const baseUrl = 'http://localhost:5000/';
                                const absoluteUrl = t.completionFileUrl.startsWith('http') ? t.completionFileUrl : `${baseUrl}${t.completionFileUrl}`;
                                const link = document.createElement('a');
                                link.href = absoluteUrl;
                                link.setAttribute('download', t.completionFileOriginalName);
                                link.setAttribute('target', '_blank');
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                              }}
                              className="text-emerald-400 hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              <FiFileText size={10} /> {t.completionFileOriginalName}
                            </button>
                          </div>
                        )}

                        {t.remarks && (
                          <div className="p-2 border rounded-sm bg-[var(--crm-bg-sunken)]/60 text-[9px] font-mono">
                            <span className="text-[8px] text-[var(--crm-ink-faint)] uppercase block">Execution remarks:</span>
                            "{t.remarks}"
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--crm-line)] flex items-center justify-between font-mono text-[9px]">
                        <span className="text-[var(--crm-ink-faint)]">Assigned By: {t.assignedBy?.name}</span>
                        {t.status !== 'COMPLETED' ? (
                          <button
                            onClick={() => setSelectedTask(t)}
                            className="bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] hover:bg-[var(--crm-ink-soft)] px-3 py-1 rounded text-[8px] font-bold uppercase transition cursor-pointer"
                          >
                            Update Status
                          </button>
                        ) : (
                          <span className="text-[var(--crm-positive)] font-bold flex items-center gap-1">✓ Complete</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LEAVES DESK */}
          {activeTab === 'leaves' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Leave apply form */}
              <div className="lg:col-span-5 border p-5 rounded-sm space-y-4" style={CARD}>
                <h3 className="text-[10px] uppercase tracking-widest font-bold font-mono text-[var(--crm-heading)] border-b pb-2 flex items-center gap-1.5" style={{ borderColor: 'var(--crm-line)' }}>
                  <FiPlus className="text-[var(--crm-accent)]" /> Submit Leave Application
                </h3>

                <form onSubmit={handleApplyLeave} className="space-y-4 font-mono text-xs text-left">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1">From Date *</label>
                      <input
                        type="date"
                        required
                        value={applyFromDate}
                        onChange={(e) => setApplyFromDate(e.target.value)}
                        className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 px-2 py-1.5 rounded-sm outline-none text-[var(--crm-heading)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1">To Date *</label>
                      <input
                        type="date"
                        required
                        value={applyToDate}
                        onChange={(e) => setApplyToDate(e.target.value)}
                        className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 px-2 py-1.5 rounded-sm outline-none text-[var(--crm-heading)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1">Leave Classification *</label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                      className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 px-2 py-1.5 rounded-sm outline-none text-[var(--crm-heading)] cursor-pointer"
                    >
                      <option value="CASUAL">Casual Leave</option>
                      <option value="MEDICAL">Medical Leave</option>
                      <option value="SICK">Sick Leave</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1">Application Reason *</label>
                    <textarea
                      required
                      rows={3}
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder="Describe the reason for applying..."
                      className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 px-2 py-1.5 rounded-sm outline-none text-[var(--crm-heading)] resize-none"
                    />
                  </div>

                  {leaveBalance.remainingLeaves === 0 && (
                    <div className="p-3 border border-[var(--crm-warning)]/30 bg-[var(--crm-warning-bg)]/15 rounded-sm space-y-2 animate-fadeIn">
                      <span className="text-[9px] text-[var(--crm-warning)] font-bold uppercase tracking-wider block">⚠️ Paid Leave Balance Exhausted!</span>
                      <p className="text-[8px] text-[var(--crm-ink-soft)] leading-normal">
                        You have exhausted your 4 paid leaves for this calendar month. Any further leaves require mandatory HR override approval as "Extra Leave".
                      </p>
                      <div>
                        <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-warning)] mb-1 font-bold">Extra Leave Justification remarks *</label>
                        <input
                          type="text"
                          required
                          value={extraReason}
                          onChange={(e) => setExtraReason(e.target.value)}
                          placeholder="e.g. Verified medical emergency certificate reference"
                          className="w-full bg-[var(--crm-bg)] border border-[var(--crm-warning)]/30 focus:border-[var(--crm-warning)] px-2 py-1.5 rounded-sm outline-none text-[var(--crm-heading)] text-[10px]"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={applyingLeave}
                    className="w-full bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg-sunken)] py-2 text-[10px] font-bold uppercase tracking-wider rounded-sm transition cursor-pointer shadow disabled:opacity-40"
                  >
                    {applyingLeave ? 'Submitting Application...' : 'File Application'}
                  </button>
                </form>
              </div>

              {/* Leave Request history */}
              <div className="lg:col-span-7 border p-5 rounded-sm space-y-4" style={CARD}>
                <h3 className="text-[10px] uppercase tracking-widest font-bold font-mono text-[var(--crm-heading)] border-b pb-2 flex justify-between items-center" style={{ borderColor: 'var(--crm-line)' }}>
                  <span>Leave Requests Audit Ledger</span>
                  <FiFileText size={12} className="text-[var(--crm-accent)]" />
                </h3>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                  {leaveHistory.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[var(--crm-ink-faint)] font-mono">
                      No leave requests submitted yet.
                    </div>
                  ) : (
                    leaveHistory.map((item) => (
                      <div key={item._id} className="p-3 border rounded-sm text-xs font-mono space-y-2" style={CARD_SUNKEN}>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-[var(--crm-heading)]">
                            {new Date(item.fromDate).toLocaleDateString()} - {new Date(item.toDate).toLocaleDateString()}
                          </span>
                          <span className={`text-[7px] font-bold px-1.5 py-0.5 border rounded-sm uppercase tracking-wider ${
                            item.status === 'APPROVED' || item.status === 'HR_APPROVED_EXTRA' ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20' :
                            item.status === 'REJECTED' ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20' :
                            'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="text-[9px] text-[var(--crm-ink-soft)] space-y-1">
                          <p>Type: <span className="text-[var(--crm-heading)]">{item.leaveType} {item.isExtraLeave && '(EXTRA)'}</span></p>
                          <p>Reason: <span className="text-[var(--crm-heading)] italic">"{item.reason}"</span></p>
                          {item.hrRemarks && <p className="text-[var(--crm-positive)]">HR Remarks: "{item.hrRemarks}"</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: PROFILE CARD */}
          {activeTab === 'profile' && (
            <div className="max-w-xl mx-auto border p-6 rounded-sm space-y-6" style={CARD}>
              <div className="flex flex-col sm:flex-row items-center gap-5 border-b pb-6" style={{ borderColor: 'var(--crm-line)' }}>
                <div className="w-20 h-20 bg-[var(--crm-bg-sunken)] rounded-full border border-[var(--crm-line)] flex items-center justify-center text-[var(--crm-ink-faint)] overflow-hidden shrink-0 shadow-inner">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt="profile" className="w-full h-full object-cover" />
                  ) : (
                    <FiUser size={36} />
                  )}
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <h3 className="text-lg font-serif text-[var(--crm-heading)]">{user?.name || user?.fullName}</h3>
                  <p className="text-xs font-mono text-[var(--crm-accent)] uppercase tracking-wider">{user?.position || 'Staff'} • {user?.role}</p>
                  <p className="text-[10px] font-mono text-[var(--crm-ink-faint)]">{user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-left">
                <div className="space-y-1">
                  <span className="text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] block">Department</span>
                  <strong className="text-[var(--crm-heading)]">{user?.department}</strong>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] block">Joining Date</span>
                  <strong className="text-[var(--crm-heading)]">{user?.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : '--'}</strong>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] block">Phone Number</span>
                  <strong className="text-[var(--crm-heading)]">{user?.phone || 'Not provided'}</strong>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] block">Reporting Manager</span>
                  <strong className="text-[var(--crm-heading)]">{user?.reportingManager ? user.reportingManager.name || 'Assigned Manager' : 'HR Manager / Admin'}</strong>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* UPDATE TASK STATUS MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-[var(--crm-bg-raised)] rounded-sm p-6 w-full max-w-md border border-[var(--crm-line)] shadow-2xl text-left">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--crm-line)]">
              <div>
                <h2 className="font-serif text-sm font-semibold text-[var(--crm-heading)] uppercase tracking-wide">Update Task Execution</h2>
                <p className="text-[9px] text-[var(--crm-ink-faint)] font-mono mt-0.5">TASK: {selectedTask.title}</p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-[var(--crm-ink-faint)] hover:text-white font-mono cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUpdateTaskStatusSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-2">Set Status *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['PENDING', 'IN_PROGRESS', 'COMPLETED'].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setSelectedTaskStatus(status)}
                      className={`py-2 rounded-sm text-[8px] font-bold uppercase transition cursor-pointer text-center border ${
                        selectedTaskStatus === status
                          ? 'border-[var(--crm-accent)] bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] font-extrabold'
                          : 'bg-[var(--crm-bg)] border border-[var(--crm-line)] hover:border-[var(--crm-accent)]/50 text-[var(--crm-ink-soft)]'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {selectedTaskStatus === 'COMPLETED' && (
                <div className="animate-fadeIn">
                  <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1.5 font-bold">Attach Completion File *</label>
                  <input
                    type="file"
                    required
                    accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv, .pdf, .docx, .doc, image/*"
                    onChange={(e) => setCompletionFile(e.target.files[0])}
                    className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] font-mono text-[10px] px-3 py-2 rounded outline-none focus:border-teal-500 transition file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9px] file:font-mono file:font-semibold file:bg-teal-950/40 file:text-teal-400 hover:file:bg-teal-900/60 file:cursor-pointer"
                  />
                </div>
              )}

              <div>
                <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1">Execution Remarks / Logs</label>
                <textarea
                  rows={3}
                  value={taskRemarks}
                  onChange={(e) => setTaskRemarks(e.target.value)}
                  placeholder="Provide execution details, reports reference, or obstacles encountered..."
                  className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 px-2 py-1.5 rounded-sm outline-none text-[var(--crm-heading)] resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-[var(--crm-line)]">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 py-2 bg-transparent border border-[var(--crm-line)] text-[var(--crm-ink-soft)] text-[8px] font-bold uppercase rounded-sm transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingTaskStatus}
                  className="flex-1 py-2 bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] hover:bg-[var(--crm-ink-soft)] hover:text-white text-[8px] font-bold uppercase rounded-sm transition cursor-pointer text-center"
                >
                  {updatingTaskStatus ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </motion.div>
  );
}
