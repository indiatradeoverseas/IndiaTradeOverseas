import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiClock, FiActivity, FiCheckCircle, FiAlertCircle,
  FiFilter, FiDownload, FiSearch, FiRefreshCw, FiPhoneCall,
  FiFileText, FiCheckSquare, FiMic, FiEdit3, FiSliders,
  FiAward, FiCalendar, FiPieChart, FiBarChart2, FiGrid, FiList,
  FiChevronDown, FiChevronUp, FiLogIn, FiLogOut, FiCoffee, FiZap
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { employeeActivityApi } from '../../api/employeeActivity';

const CARD = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)', boxShadow: 'var(--crm-shadow)' };
const CARD_SUNKEN = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' };
const LABEL_MONO = { fontFamily: 'var(--crm-font-body)', color: 'var(--crm-ink-faint)' };
const HEADING = { fontFamily: 'var(--crm-font-body)', color: 'var(--crm-heading)' };

const DEPARTMENTS = ['ALL', 'SALES', 'HR', 'IT', 'FINANCE', 'OPERATIONS', 'MARKETING', 'TRANSPORT', 'ADMIN'];

const formatTimeOrDate = (dateVal) => {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';

  const todayStr = new Date().toISOString().slice(0, 10);
  const targetStr = d.toISOString().slice(0, 10);

  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (targetStr === todayStr) {
    return timeStr;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (targetStr === yesterday.toISOString().slice(0, 10)) {
    return `Yesterday ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return `${dateStr} ${timeStr}`;
};

export default function EmployeeActivityMonitor({ scopeDepartment = null, showLunchTiming = true, title = "Employee Activity & Working Hours Monitor" }) {
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'report6pm' | 'analytics'
  const [period, setPeriod] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [employees, setEmployees] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [report6PM, setReport6PM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState(scopeDepartment || 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedEmpId, setExpandedEmpId] = useState(null);

  useEffect(() => {
    fetchData();
    // Heartbeat every 2 minutes
    const interval = setInterval(() => {
      employeeActivityApi.sendHeartbeat();
      fetchLiveStatusSilently();
    }, 120000);

    return () => clearInterval(interval);
  }, [scopeDepartment]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsReports();
    } else if (activeTab === 'report6pm') {
      fetch6PMReportData();
    }
  }, [activeTab, period, deptFilter]);

  const fetchLiveStatusSilently = async () => {
    try {
      const res = await employeeActivityApi.getLiveStatuses();
      if (res && res.success) {
        setEmployees(res.data.employees || []);
      }
    } catch (e) {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await employeeActivityApi.sendHeartbeat();
      const res = await employeeActivityApi.getLiveStatuses();
      if (res && res.success) {
        setEmployees(res.data.employees || []);
      } else {
        toast.error('Failed to load employee activity statuses.');
      }
    } catch (err) {
      console.error('Activity monitor fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    if (activeTab === 'analytics') await fetchAnalyticsReports();
    if (activeTab === 'report6pm') await fetch6PMReportData();
    setRefreshing(false);
    toast.success('Activity monitoring refreshed');
  };

  const fetchAnalyticsReports = async () => {
    try {
      const res = await employeeActivityApi.getReports({
        period,
        department: deptFilter
      });
      if (res && res.success) {
        setReportData(res.data.report);
      }
    } catch (err) {
      console.error('Failed to load activity reports:', err);
    }
  };

  const fetch6PMReportData = async () => {
    try {
      const res = await employeeActivityApi.get6PMReport();
      if (res && res.success) {
        setReport6PM(res.data.report);
      }
    } catch (err) {
      console.error('Failed to load 6PM report:', err);
    }
  };

  const handleExport = async () => {
    try {
      toast.loading('Generating activity report CSV...', { id: 'export-csv' });
      await employeeActivityApi.exportReportCSV({
        period,
        department: deptFilter
      });
      toast.success('Report downloaded successfully!', { id: 'export-csv' });
    } catch (err) {
      toast.error('Export failed.', { id: 'export-csv' });
    }
  };

  // Filtered live employee list
  const filteredEmployees = useMemo(() => {
    let result = employees;

    if (scopeDepartment && scopeDepartment !== 'ALL') {
      result = result.filter(e => (e.department || '').toUpperCase() === scopeDepartment.toUpperCase());
    } else if (deptFilter !== 'ALL') {
      result = result.filter(e => (e.department || '').toUpperCase() === deptFilter.toUpperCase());
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(e => e.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e =>
        (e.fullName || '').toLowerCase().includes(term) ||
        (e.employeeId || '').toLowerCase().includes(term) ||
        (e.department || '').toLowerCase().includes(term) ||
        (e.role || '').toLowerCase().includes(term)
      );
    }

    return result;
  }, [employees, scopeDepartment, deptFilter, statusFilter, searchTerm]);

  // Aggregate stats
  const activeCount = useMemo(() => filteredEmployees.filter(e => e.isGreenDotActive).length, [filteredEmployees]);
  const idleCount = useMemo(() => filteredEmployees.filter(e => e.status === 'IDLE').length, [filteredEmployees]);
  const offlineCount = useMemo(() => filteredEmployees.filter(e => e.status === 'OFFLINE').length, [filteredEmployees]);

  const totalCrmActions = useMemo(() => filteredEmployees.reduce((acc, e) => acc + (e.totalCrmActions || 0), 0), [filteredEmployees]);

  const renderMatrixItem = (label, value) => (
    <div className="p-2.5 rounded-xl border text-center transition-all duration-200 hover:border-cyan-500/40 hover:bg-[var(--crm-bg-sunken)]/80" style={CARD_SUNKEN}>
      <span className="block text-[10px] font-medium text-[var(--crm-ink-faint)] truncate mb-0.5">{label}</span>
      <span className="text-sm font-bold font-mono text-[var(--crm-heading)]">{value || 0}</span>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      {/* Header bar */}
      <div className="border p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-sm" style={CARD}>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--crm-ink-faint)] uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Real-time Shift & Activity Telemetry</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--crm-heading)] font-sans">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 rounded-xl border" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}>
            <button
              onClick={() => setActiveTab('live')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'live' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)]'}`}
            >
              Live Telemetry
            </button>
            <button
              onClick={() => setActiveTab('report6pm')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'report6pm' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)]'}`}
            >
              6:00 PM Report
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'analytics' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)]'}`}
            >
              Historical Reports
            </button>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="p-2.5 border rounded-xl transition-all hover:bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)]" style={CARD_SUNKEN} title="Refresh">
            <FiRefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleExport} className="px-3.5 py-2 border text-xs font-semibold rounded-xl flex items-center gap-2 transition-all hover:opacity-90 shadow-sm" style={{ background: 'var(--crm-positive-bg)', color: 'var(--crm-positive)', borderColor: 'rgba(86,165,135,0.3)' }}>
            <FiDownload size={14} /> <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:border-emerald-500/40" style={CARD}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--crm-ink-faint)]">Active Staff Now</span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-400 font-sans tracking-tight">{activeCount}</span>
            <span className="text-xs font-medium text-[var(--crm-ink-faint)]">/ {filteredEmployees.length} Total</span>
          </div>
        </div>

        <div className="border p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:border-rose-500/40" style={CARD}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--crm-ink-faint)]">Idle / Inactive</span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-rose-400 font-sans tracking-tight">{idleCount}</span>
            <span className="text-xs font-medium text-[var(--crm-ink-faint)]">No Action &gt;5m</span>
          </div>
        </div>

        <div className="border p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:border-slate-500/40" style={CARD}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--crm-ink-faint)]">Offline / Signed Out</span>
            <span className="w-3 h-3 rounded-full bg-slate-500 ring-4 ring-slate-500/20" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-400 font-sans tracking-tight">{offlineCount}</span>
            <span className="text-xs font-medium text-[var(--crm-ink-faint)]">Logged Out</span>
          </div>
        </div>

        <div className="border p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:border-cyan-500/40" style={CARD}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--crm-ink-faint)]">Today's CRM Actions</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <FiActivity size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-cyan-400 font-sans tracking-tight">{totalCrmActions}</span>
            <span className="text-xs font-medium text-[var(--crm-ink-faint)]">Calls, Notes, Updates</span>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={CARD_SUNKEN}>
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[220px]">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)]" size={14} />
                <input
                  type="text"
                  placeholder="Search name, ID, department..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border outline-none font-sans text-[var(--crm-heading)] bg-[var(--crm-bg)] focus:border-cyan-500/50 transition-all placeholder:text-[var(--crm-ink-faint)]"
                  style={{ borderColor: 'var(--crm-line)' }}
                />
              </div>

              {!scopeDepartment && (
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="text-xs px-3.5 py-2.5 rounded-xl border outline-none font-sans text-[var(--crm-heading)] bg-[var(--crm-bg)] cursor-pointer focus:border-cyan-500/50 transition-all"
                  style={{ borderColor: 'var(--crm-line)' }}
                >
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>)}
                </select>
              )}

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs px-3.5 py-2.5 rounded-xl border outline-none font-sans text-[var(--crm-heading)] bg-[var(--crm-bg)] cursor-pointer focus:border-cyan-500/50 transition-all"
                style={{ borderColor: 'var(--crm-line)' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE (Green Dot)</option>
                <option value="IDLE">IDLE / INACTIVE</option>
                <option value="OFFLINE">OFFLINE</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-xl border bg-[var(--crm-bg)]" style={{ borderColor: 'var(--crm-line)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-cyan-500/10 text-cyan-400 font-bold' : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'}`}
                title="Grid View"
              >
                <FiGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-cyan-500/10 text-cyan-400 font-bold' : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'}`}
                title="Table View"
              >
                <FiList size={15} />
              </button>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEmployees.length === 0 ? (
                <div className="col-span-full py-16 text-center border rounded-2xl" style={CARD_SUNKEN}>
                  <p className="text-sm font-sans text-[var(--crm-ink-faint)]">No employees found matching filter criteria.</p>
                </div>
              ) : (
                filteredEmployees.map(emp => {
                  const isOnline = emp.isGreenDotActive;
                  const isIdle = emp.status === 'IDLE';

                  return (
                    <motion.div
                      key={emp.employeeId}
                      whileHover={{ y: -3 }}
                      transition={{ duration: 0.2 }}
                      className="border rounded-2xl p-5 space-y-4 relative overflow-hidden backdrop-blur-sm transition-shadow duration-300 hover:shadow-xl hover:border-cyan-500/40"
                      style={CARD}
                    >
                      {/* Employee Top Header */}
                      <div className="flex items-start justify-between gap-3 pb-1">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={emp.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.fullName)}&background=1e293b&color=38bdf8&bold=true`}
                              alt={emp.fullName}
                              className="w-11 h-11 rounded-full object-cover border-2 shadow-sm"
                              style={{ borderColor: 'var(--crm-line)' }}
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--crm-bg-raised)] ${
                                isOnline ? 'bg-emerald-500 ring-2 ring-emerald-500/40 animate-pulse' : isIdle ? 'bg-rose-500 ring-2 ring-rose-500/40 animate-pulse' : 'bg-slate-500'
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-[var(--crm-heading)] truncate font-sans tracking-tight">{emp.fullName}</h4>
                            <p className="text-[11px] font-mono text-[var(--crm-ink-faint)] tracking-tight truncate">
                              {emp.employeeId} <span className="text-slate-600">·</span> {emp.department}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase border flex items-center gap-1.5 whitespace-nowrap shadow-xs shrink-0 ${
                            isOnline
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isIdle
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isOnline ? 'bg-emerald-400 animate-ping' : isIdle ? 'bg-rose-500 animate-ping' : 'bg-slate-400'
                          }`} />
                          <span>{isOnline ? 'ACTIVE' : isIdle ? `INACTIVE (${emp.inactiveDurationMins || 0}M)` : 'OFFLINE'}</span>
                        </div>
                      </div>

                      {/* Shift Hours Telemetry Card */}
                      <div className="rounded-xl p-3.5 border space-y-2.5" style={CARD_SUNKEN}>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-[var(--crm-ink-faint)] tracking-wider">First Login</span>
                            <span className="font-mono text-xs font-semibold text-[var(--crm-heading)] mt-0.5 block">
                              {formatTimeOrDate(emp.firstLoginAt)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-[var(--crm-ink-faint)] tracking-wider">Last Logout</span>
                            <span className="font-mono text-xs font-semibold text-[var(--crm-heading)] mt-0.5 block">
                              {formatTimeOrDate(emp.lastLogoutAt)}
                            </span>
                          </div>
                        </div>

                        <div className="border-t pt-2 flex justify-between items-center text-xs" style={{ borderColor: 'var(--crm-line)' }}>
                          <span className="text-[10px] uppercase font-semibold text-[var(--crm-ink-faint)] tracking-wider">Last Active:</span>
                          <span className="font-mono text-xs font-semibold text-[var(--crm-heading)]">
                            {formatTimeOrDate(emp.lastActiveAt)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t pt-2.5" style={{ borderColor: 'var(--crm-line)' }}>
                          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-start">
                            <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Active Hours</span>
                            <span className="text-xs font-mono font-bold text-emerald-300 mt-0.5">{emp.activeHoursFormatted || '0h 0m'}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 flex flex-col items-start">
                            <span className="text-[9px] uppercase font-bold text-rose-400 tracking-wider">Inactive Hours</span>
                            <span className="text-xs font-mono font-bold text-rose-300 mt-0.5">{emp.inactiveHoursFormatted || '0h 0m'}</span>
                          </div>
                        </div>

                        {showLunchTiming && (
                          <div className="border-t pt-2 flex justify-between items-center text-xs" style={{ borderColor: 'var(--crm-line)' }}>
                            <span className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1.5 tracking-wider">
                              <FiClock size={12} /> Lunch Timing
                            </span>
                            <span className="font-mono text-xs font-semibold text-rose-300">
                              {emp.lunchTimingFormatted || 'Not Taken Yet'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Completed Work Matrix Grid */}
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-semibold text-[var(--crm-ink-faint)] tracking-wider block">
                          Completed Work ({(emp.department || 'GENERAL').toUpperCase()} MATRIX)
                        </span>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {((dept) => {
                            const d = (dept || '').toUpperCase();

                            if (d === 'HR') {
                              return (
                                <>
                                  {renderMatrixItem('Tickets Res.', emp.ticketsResolvedCount)}
                                  {renderMatrixItem('Onboarding', emp.onboardingTasksCount)}
                                  {renderMatrixItem('Leave Appr.', emp.leaveApprovalsCount)}
                                  {renderMatrixItem('Calls/Int.', emp.callsLoggedCount)}
                                  {renderMatrixItem('Notes', emp.notesEnteredCount)}
                                  {renderMatrixItem('Status Chg', emp.employeeStatusChangesCount || emp.statusChangesCount)}
                                </>
                              );
                            }

                            if (d === 'TRANSPORT') {
                              return (
                                <>
                                  {renderMatrixItem('Trips Assgd.', emp.tripsAssignedCount)}
                                  {renderMatrixItem('PODs Upd.', emp.podsUploadedCount)}
                                  {renderMatrixItem('Dispatch Upd.', emp.dispatchUpdatesCount)}
                                  {renderMatrixItem('Driver Logs', emp.driverLogsCount)}
                                  {renderMatrixItem('Freight Docs', emp.freightDocsCount)}
                                  {renderMatrixItem('Driver Calls', emp.callsLoggedCount)}
                                </>
                              );
                            }

                            // DEFAULT / SALES
                            return (
                              <>
                                {renderMatrixItem('Calls', emp.callsLoggedCount)}
                                {renderMatrixItem('Leads Upd.', emp.leadsUpdatedCount)}
                                {renderMatrixItem('Follow-ups', emp.followupsCompletedCount)}
                                {renderMatrixItem('Notes', emp.notesEnteredCount)}
                                {renderMatrixItem('Recordings', emp.recordingsUploadedCount)}
                                {renderMatrixItem('Status Chg', emp.statusChangesCount)}
                              </>
                            );
                          })(emp.department)}
                        </div>
                      </div>

                      {/* Productivity Rating Bar */}
                      <div className="pt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] font-semibold text-[var(--crm-ink-faint)] uppercase tracking-wider">Productivity Rating</span>
                          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${
                            emp.productivityScore >= 75
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : emp.productivityScore >= 50
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}>
                            {emp.productivityScore || 0}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden border border-[var(--crm-line)]/30 p-0.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.max(0, emp.productivityScore || 0))}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${
                              emp.productivityScore >= 75
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : emp.productivityScore >= 50
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                : 'bg-gradient-to-r from-rose-500 to-orange-400'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Expandable Activity Logs Accordion */}
                      <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--crm-line)' }}>
                        <button
                          onClick={() => setExpandedEmpId(expandedEmpId === emp.employeeId ? null : emp.employeeId)}
                          className="w-full py-2 px-3 rounded-xl border text-[10px] uppercase font-semibold tracking-wider flex items-center justify-between transition-all hover:border-cyan-500/50 active:scale-[0.99] text-cyan-400"
                          style={CARD_SUNKEN}
                        >
                          <span className="flex items-center gap-2">
                            <FiFileText size={13} />
                            <span>Activity Logs & Remarks ({emp.activityLogs?.length || 0})</span>
                          </span>
                          {expandedEmpId === emp.employeeId ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                        </button>

                        <AnimatePresence>
                          {expandedEmpId === emp.employeeId && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden text-xs"
                            >
                              {(!emp.activityLogs || emp.activityLogs.length === 0) ? (
                                <p className="py-3 text-center text-xs p-3 border rounded-xl" style={{ ...CARD_SUNKEN, color: 'var(--crm-ink-faint)' }}>
                                  No activity remarks recorded for today.
                                </p>
                              ) : (
                                <div className="max-h-52 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                  {emp.activityLogs.slice().reverse().map((log, idx) => (
                                    <div key={idx} className="p-3 border rounded-xl space-y-1.5 transition-colors hover:border-[var(--crm-line-strong)]" style={CARD_SUNKEN}>
                                      <div className="flex justify-between items-center text-[10px]">
                                        <span className="font-semibold text-cyan-400 uppercase px-2 py-0.5 border rounded-md bg-cyan-500/10 border-cyan-500/30">
                                          {log.actionType.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-[var(--crm-ink-faint)] font-mono">{formatTimeOrDate(log.timestamp)}</span>
                                      </div>
                                      <p className="text-xs text-[var(--crm-heading)] font-sans break-words font-medium leading-relaxed">
                                        {log.details || 'CRM action completed.'}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="border rounded-2xl overflow-x-auto shadow-sm" style={CARD}>
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b text-[10px] uppercase font-semibold tracking-wider font-sans" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)', color: 'var(--crm-ink-faint)' }}>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Dept / Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">First Login</th>
                    <th className="py-3.5 px-4">Last Logout</th>
                    <th className="py-3.5 px-4">Last Active</th>
                    <th className="py-3.5 px-4">Active Hours</th>
                    <th className="py-3.5 px-4">Inactive Hours</th>
                    {showLunchTiming && <th className="py-3.5 px-4">Lunch Timing</th>}
                    <th className="py-3.5 px-4">Calls</th>
                    <th className="py-3.5 px-4">Notes</th>
                    <th className="py-3.5 px-4">Total Actions</th>
                    <th className="py-3.5 px-4">Score</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y font-sans" style={{ borderColor: 'var(--crm-line)' }}>
                  {filteredEmployees.map(emp => (
                    <tr key={emp.employeeId} className="hover:bg-[var(--crm-bg-sunken)]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[var(--crm-heading)]">{emp.fullName}</div>
                        <div className="text-[10px] font-mono text-[var(--crm-ink-faint)]">{emp.employeeId}</div>
                      </td>
                      <td className="py-3.5 px-4">{emp.department} · <span className="text-[11px] text-[var(--crm-ink-faint)]">{emp.role}</span></td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-semibold inline-flex items-center gap-1.5 ${
                          emp.isGreenDotActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : emp.status === 'IDLE'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.isGreenDotActive ? 'bg-emerald-400 animate-ping' : emp.status === 'IDLE' ? 'bg-rose-500 animate-ping' : 'bg-slate-400'}`} />
                          {emp.isGreenDotActive ? 'Active' : emp.status === 'IDLE' ? 'Idle' : 'Offline'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{formatTimeOrDate(emp.firstLoginAt)}</td>
                      <td className="py-3.5 px-4 font-mono">{formatTimeOrDate(emp.lastLogoutAt)}</td>
                      <td className="py-3.5 px-4 font-mono">{formatTimeOrDate(emp.lastActiveAt)}</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold font-mono">{emp.activeHoursFormatted}</td>
                      <td className="py-3.5 px-4 text-rose-400 font-bold font-mono">{emp.inactiveHoursFormatted}</td>
                      {showLunchTiming && <td className="py-3.5 px-4 text-rose-300 font-mono text-[11px]">{emp.lunchTimingFormatted || 'Not Taken Yet'}</td>}
                      <td className="py-3.5 px-4 font-mono">{emp.callsLoggedCount}</td>
                      <td className="py-3.5 px-4 font-mono">{emp.notesEnteredCount}</td>
                      <td className="py-3.5 px-4 font-bold text-cyan-400 font-mono">{emp.totalCrmActions}</td>
                      <td className="py-3.5 px-4 font-bold font-mono">{emp.productivityScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6:00 PM Shift End Report Tab */}
      {activeTab === 'report6pm' && (
        <div className="border rounded-2xl p-6 space-y-6" style={CARD}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--crm-line)' }}>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Official Daily Closing Briefing</span>
              <h3 className="text-xl font-bold tracking-tight text-[var(--crm-heading)] font-sans mt-0.5">6:00 PM Employee Shift & Productivity Report</h3>
            </div>
            <button onClick={fetch6PMReportData} className="px-3.5 py-2 border text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all hover:bg-[var(--crm-bg-sunken)]" style={CARD_SUNKEN}>
              <FiRefreshCw size={13} /> Generate Fresh 6PM Summary
            </button>
          </div>

          {report6PM ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 border rounded-2xl text-center space-y-1" style={CARD_SUNKEN}>
                  <span className="block text-xs uppercase font-semibold text-[var(--crm-ink-faint)]">Active Shift Staff</span>
                  <span className="text-2xl font-bold text-emerald-400 font-sans">{report6PM.summary.activeEmployeesCount}</span>
                </div>
                <div className="p-4 border rounded-2xl text-center space-y-1" style={CARD_SUNKEN}>
                  <span className="block text-xs uppercase font-semibold text-[var(--crm-ink-faint)]">Grand Active Hours</span>
                  <span className="text-2xl font-bold text-cyan-400 font-mono">{report6PM.summary.grandTotalActiveHours}</span>
                </div>
                <div className="p-4 border rounded-2xl text-center space-y-1" style={CARD_SUNKEN}>
                  <span className="block text-xs uppercase font-semibold text-[var(--crm-ink-faint)]">Grand Inactive Hours</span>
                  <span className="text-2xl font-bold text-rose-400 font-mono">{report6PM.summary.grandTotalInactiveHours}</span>
                </div>
                <div className="p-4 border rounded-2xl text-center space-y-1" style={CARD_SUNKEN}>
                  <span className="block text-xs uppercase font-semibold text-[var(--crm-ink-faint)]">Total Genuine Actions</span>
                  <span className="text-2xl font-bold text-[var(--crm-heading)] font-mono">{report6PM.summary.grandTotalCrmActions}</span>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="border rounded-2xl overflow-x-auto shadow-sm" style={CARD_SUNKEN}>
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b text-[10px] uppercase font-semibold tracking-wider font-sans" style={{ borderColor: 'var(--crm-line)', color: 'var(--crm-ink-faint)' }}>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Dept</th>
                      <th className="py-3 px-4">Shift Active Hours</th>
                      <th className="py-3 px-4">Shift Inactive Hours</th>
                      <th className="py-3 px-4">Completed Work Matrix</th>
                      <th className="py-3 px-4">Overall Productivity</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y font-sans" style={{ borderColor: 'var(--crm-line)' }}>
                    {report6PM.employeeBreakdown.map(emp => (
                      <tr key={emp.employeeId} className="hover:bg-[var(--crm-bg-raised)]/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-[var(--crm-heading)]">{emp.fullName} <span className="text-[10px] font-mono text-[var(--crm-ink-faint)] font-normal">({emp.employeeId})</span></td>
                        <td className="py-3 px-4">{emp.department}</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold font-mono">{emp.activeHoursFormatted}</td>
                        <td className="py-3 px-4 text-rose-400 font-bold font-mono">{emp.inactiveHoursFormatted}</td>
                        <td className="py-3 px-4 text-xs">
                          {((dept) => {
                            const d = (dept || '').toUpperCase();
                            if (d === 'HR') {
                              return `Tickets: ${emp.ticketsResolvedCount || 0} · Onboarding: ${emp.onboardingTasksCount || 0} · Leaves: ${emp.leaveApprovalsCount || 0} · Calls: ${emp.callsLoggedCount || 0}`;
                            }
                            if (d === 'TRANSPORT') {
                              return `Trips: ${emp.tripsAssignedCount || 0} · PODs: ${emp.podsUploadedCount || 0} · Dispatches: ${emp.dispatchUpdatesCount || 0} · Driver Calls: ${emp.callsLoggedCount || 0}`;
                            }
                            return `Calls: ${emp.callsLoggedCount || 0} · Followups: ${emp.followupsCompletedCount || 0} · Recs: ${emp.recordingsUploadedCount || 0} · Leads Upd: ${emp.leadsUpdatedCount || 0}`;
                          })(emp.department)}
                        </td>
                        <td className="py-3 px-4 font-bold text-cyan-400 font-mono">{emp.productivityScore}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm font-sans text-[var(--crm-ink-faint)]">Generating 6:00 PM Summary Report...</div>
          )}
        </div>
      )}

      {/* Historical Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="border rounded-2xl p-6 space-y-6" style={CARD}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--crm-line)' }}>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Historical Activity Analytics</span>
              <h3 className="text-xl font-bold tracking-tight text-[var(--crm-heading)] font-sans mt-0.5">Employee & Department Reports</h3>
            </div>
            <div className="flex items-center gap-2">
              <select value={period} onChange={e => setPeriod(e.target.value)} className="text-xs px-3.5 py-2 border rounded-xl outline-none font-sans text-[var(--crm-heading)] bg-[var(--crm-bg)]" style={CARD_SUNKEN}>
                <option value="daily">Daily Report</option>
                <option value="weekly">Weekly Report</option>
                <option value="monthly">Monthly Report</option>
              </select>
            </div>
          </div>

          {reportData ? (
            <div className="space-y-6">
              {/* Department Aggregates */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] font-sans">Department Performance Summary</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reportData.departmentSummary.map(d => (
                    <div key={d.department} className="p-4 border rounded-2xl space-y-3 transition-all hover:border-cyan-500/40" style={CARD_SUNKEN}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-[var(--crm-heading)] font-sans">{d.department}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 border rounded-lg bg-[var(--crm-bg)]" style={{ borderColor: 'var(--crm-line)' }}>{d.recordCount} Logs</span>
                      </div>
                      <div className="text-xs font-sans grid grid-cols-2 gap-2 text-[var(--crm-ink-faint)]">
                        <div>Active: <span className="text-emerald-400 font-bold font-mono">{d.activeHoursFormatted}</span></div>
                        <div>Inactive: <span className="text-rose-400 font-bold font-mono">{d.inactiveHoursFormatted}</span></div>
                        <div>Actions: <span className="text-[var(--crm-heading)] font-bold font-mono">{d.totalCrmActions}</span></div>
                        <div>Avg Score: <span className="text-cyan-400 font-bold font-mono">{d.avgProductivityScore}%</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employee Aggregates */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] font-sans">Employee Performance Breakdown</h4>
                <div className="border rounded-2xl overflow-x-auto shadow-sm" style={CARD_SUNKEN}>
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b text-[10px] uppercase font-semibold tracking-wider font-sans" style={{ borderColor: 'var(--crm-line)', color: 'var(--crm-ink-faint)' }}>
                        <th className="py-3 px-4">Employee ID</th>
                        <th className="py-3 px-4">Dept</th>
                        <th className="py-3 px-4">Total Active Hours</th>
                        <th className="py-3 px-4">Total Inactive Hours</th>
                        <th className="py-3 px-4">Calls Logged</th>
                        <th className="py-3 px-4">Notes Entered</th>
                        <th className="py-3 px-4">Total Genuine Actions</th>
                        <th className="py-3 px-4">Avg Productivity Score</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y font-sans" style={{ borderColor: 'var(--crm-line)' }}>
                      {reportData.employeeSummary.map(e => (
                        <tr key={e.employeeId} className="hover:bg-[var(--crm-bg-raised)]/50 transition-colors">
                          <td className="py-3 px-4 font-bold font-mono text-[var(--crm-heading)]">{e.employeeId}</td>
                          <td className="py-3 px-4">{e.department}</td>
                          <td className="py-3 px-4 text-emerald-400 font-bold font-mono">{e.activeHoursFormatted}</td>
                          <td className="py-3 px-4 text-rose-400 font-bold font-mono">{e.inactiveHoursFormatted}</td>
                          <td className="py-3 px-4 font-mono">{e.callsLogged}</td>
                          <td className="py-3 px-4 font-mono">{e.notesEntered}</td>
                          <td className="py-3 px-4 font-bold font-mono text-[var(--crm-heading)]">{e.totalCrmActions}</td>
                          <td className="py-3 px-4 font-bold font-mono text-cyan-400">{e.avgProductivityScore}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm font-sans text-[var(--crm-ink-faint)]">Loading historical activity analytics...</div>
          )}
        </div>
      )}
    </div>
  );
}
