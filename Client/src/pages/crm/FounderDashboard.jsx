import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import { leaveApi } from '../../api/leave';
import { salesApi } from '../../api/sales';
import { careersApi } from '../../api/careers';
import { employeeSignupApi } from '../../api/employee-signup';
import {
  FiUsers, FiTrendingUp, FiCalendar, FiBriefcase, FiDollarSign, FiSearch,
  FiCheckCircle, FiXCircle, FiArrowRight, FiAlertCircle, FiTarget,
  FiUserPlus, FiExternalLink, FiAward, FiShield, FiBarChart2,
  FiPieChart, FiCreditCard, FiCheckSquare,FiX,
  FiFileText, FiTruck, FiSettings, FiGrid,
  FiRefreshCw, FiPlus, FiEdit, FiTrash2, FiEye,
  FiActivity, FiDatabase, FiGlobe, FiLock, FiBell,
  FiMessageSquare, FiZap, FiDownload, FiUpload,
  FiFilter, FiColumns, FiList, FiArrowUpRight,
  FiUserX, FiUserCheck, FiHome, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import { SkeletonStatGrid, SkeletonListCard } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import FounderTransportWidget from './transport/FounderTransportWidget';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

const EMPLOYEE_DEPARTMENTS = ['SALES', 'HR', 'IT', 'ADMIN', 'FINANCE', 'OPERATIONS', 'MARKETING'];
const EMPLOYEE_ROLES = ['EMPLOYEE', 'HR_EXECUTIVE', 'HR_MANAGER', 'ADMIN', 'MANAGER', 'HR', 'SALES_EXECUTIVE', 'SALES_MANAGER', 'PROCUREMENT', 'ACCOUNTS', 'IT', 'TRANSPORT'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 18, mass: 1 } }
};

const CARD = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)', boxShadow: 'var(--crm-shadow)' };
const CARD_SUNKEN = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' };
const LABEL_MONO = { fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' };
const HEADING = { fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' };

const toneColor = (tone) => ({
  ink: 'var(--crm-heading)',
  info: 'var(--crm-info)',
  warning: 'var(--crm-warning)',
  positive: 'var(--crm-positive)',
  danger: 'var(--crm-danger)',
  accent: 'var(--crm-accent)'
}[tone]);

const toneBg = (tone) => ({
  ink: 'var(--crm-bg-sunken)',
  info: 'var(--crm-info-bg)',
  warning: 'var(--crm-warning-bg)',
  positive: 'var(--crm-positive-bg)',
  danger: 'var(--crm-danger-bg)',
  accent: 'var(--crm-accent-bg)'
}[tone]);

const now = new Date();
const CHART_COLORS = ['var(--crm-accent)', 'var(--crm-info)', 'var(--crm-positive)', 'var(--crm-warning)', 'var(--crm-danger)'];

const STATUS_STYLES = {
  ACTIVE: { color: 'var(--crm-positive)', bg: 'var(--crm-positive-bg)', border: 'var(--crm-positive-bg)' },
  INACTIVE: { color: 'var(--crm-ink-faint)', bg: 'var(--crm-bg-sunken)', border: 'var(--crm-line)' },
  PENDING: { color: 'var(--crm-warning)', bg: 'var(--crm-warning-bg)', border: 'var(--crm-warning-bg)' },
  APPROVED: { color: 'var(--crm-positive)', bg: 'var(--crm-positive-bg)', border: 'var(--crm-positive-bg)' },
  REJECTED: { color: 'var(--crm-danger)', bg: 'var(--crm-danger-bg)', border: 'var(--crm-danger-bg)' }
};

const fmtCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;
const fmtNumber = (val) => (val || 0).toLocaleString('en-IN');
const formatDate = (d) => d.toISOString().slice(0, 10);

const handleExportReport = (summary, leaves, employees, jobs, leaderboard, deptCounts, roleCounts, openJobs) => {
  if (!summary) {
    toast.error('No data to export. Please refresh the dashboard.');
    return;
  }
  const rows = [
    ['ITO Founder Command Center — Executive Report', `Generated: ${new Date().toLocaleString('en-IN')}`],
    [''],
    ['ORGANIZATIONAL HEALTH'],
    ['Metric', 'Value'],
    ['Total Employees (All)', summary.totalEmployees || employees.length],
    ['Active Employees', summary.activeEmployees || employees.filter(e => e.status === 'ACTIVE').length],
    ['Present Today', summary.presentToday || 0],
    ['Open Tickets', summary.openTickets || 0],
    ['Pending Leave Requests', leaves.length],
    ['Department Coverage', `${Object.keys(deptCounts).length} / ${EMPLOYEE_DEPARTMENTS.length}`],
    [''],
    ['LEADS & PIPELINE'],
    ['Metric', 'Value'],
    ['Total Leads', summary.totalLeads || 0],
    ['Active Leads', summary.activeLeads || 0],
    ['Pending Leads (NEW_LEAD)', summary.pendingLeads || 0],
    ['Today\'s New Leads', summary.todayLeads || 0],
    ['AI-Generated Leads', summary.aiGeneratedLeads || 0],
    ['Hot Leads', summary.hotLeads || 0],
    ['Follow-ups Due Today', summary.followUpsDueToday || 0],
    ['Missed Follow-ups', summary.missedFollowUps || 0],
    [''],
    ['QUOTATIONS & ORDERS'],
    ['Metric', 'Value'],
    ['Total Quotations', summary.quotations?.total || 0],
    ['Pending Quotations', summary.quotations?.pending || 0],
    ['Pending Quotes Value', fmtCurrency(summary.quotations?.pendingValue || 0)],
    ['Quotations Sent', summary.quotations?.sent || 0],
    ['Quotations Approved', summary.quotations?.approved || 0],
    ['Orders Confirmed', summary.ordersConfirmed || 0],
    ['Pending Orders (Pipeline)', summary.pendingOrders || 0],
    [''],
    ['REVENUE & PAYMENTS'],
    ['Metric', 'Value'],
    ['Total Revenue Collected (All Time)', fmtCurrency(summary.revenue?.totalCollected || 0)],
    ['Pending Payments Count', summary.payments?.pendingCount || 0],
    ['Pending Payments Value', fmtCurrency(summary.payments?.pendingValue || 0)],
    [''],
    ['MONTHLY REVENUE TREND'],
    ['Month', 'Collected (₹)'],
    ...(summary.revenue?.monthlyTrend || []).map(m => [m.month, fmtCurrency(m.collected)]),
    [''],
    ['TRANSPORT & LOGISTICS'],
    ['Metric', 'Value'],
    ['Total Dispatches', summary.transport?.total || 0],
    ['In Transit', summary.transport?.inTransit || 0],
    ['Delivered', summary.transport?.delivered || 0],
    ['Pending (Assigned/Loading)', summary.transport?.pending || 0],
    ['Issues Raised', summary.transport?.issueRaised || 0],
    [''],
    ['DEPARTMENT PERFORMANCE'],
    ['Department', 'Total Leads', 'Won', 'Win Rate (%)'],
    ...(summary.departmentPerformance || []).map(d => [
      d.department,
      d.totalLeads,
      d.won,
      d.totalLeads > 0 ? ((d.won / d.totalLeads) * 100).toFixed(1) : '0.0'
    ]),
    [''],
    ['TOP PERFORMING EMPLOYEES'],
    ['Name', 'Employee ID', 'Total Leads', 'Conversions', 'Conversion Rate (%)'],
    ...(summary.topEmployees || []).map(e => [
      e.fullName,
      e.employeeId,
      e.totalLeads,
      e.conversions,
      e.totalLeads > 0 ? ((e.conversions / e.totalLeads) * 100).toFixed(1) : '0.0'
    ]),
    [''],
    ['WORKFORCE DISTRIBUTION — BY DEPARTMENT'],
    ['Department', 'Count'],
    ...Object.entries(deptCounts).map(([name, value]) => [name, value]),
    [''],
    ['WORKFORCE DISTRIBUTION — BY ROLE'],
    ['Role', 'Count'],
    ...Object.entries(roleCounts).map(([name, value]) => [name, value]),
    [''],
    ['LEAVE REQUESTS PENDING'],
    ['Employee', 'Department', 'Type', 'From', 'To', 'Days', 'Reason'],
    ...leaves.map(lv => [
      lv.employeeId?.name || 'Unknown',
      lv.employeeId?.department || '—',
      lv.leaveType?.replace('_', ' ') || '—',
      new Date(lv.fromDate).toLocaleDateString(),
      new Date(lv.toDate).toLocaleDateString(),
      lv.numberOfDays,
      lv.reason || '—'
    ]),
    [''],
    ['HIRING PIPELINE — OPEN REQUISITIONS'],
    ['Title', 'Department', 'Location'],
    ...openJobs.map(job => [job.title, job.department, job.location]),
    [''],
    ['SALES LEADERBOARD (THIS MONTH)'],
    ['Rank', 'Name', 'Deals Won', 'Revenue (₹)'],
    ...leaderboard.map((row, idx) => [
      idx + 1,
      row.fullName,
      row.dealsWon,
      fmtCurrency(row.revenue)
    ]),
    [''],
    ['SECURITY'],
    ['Metric', 'Value'],
    ['Active Security Alerts', summary.securityAlerts || 0],
    [''],
    ['Export generated by ITO CRM Founder Dashboard', `Timestamp: ${new Date().toISOString()}`]
  ];

  const csvContent = rows
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `founder-command-center-report-${formatDate(new Date())}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success('Founder report exported successfully');
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.INACTIVE;
  return (
    <span className="px-2 py-0.5 rounded-sm text-[9px] uppercase font-bold border whitespace-nowrap" style={{ color: s.color, background: s.bg, borderColor: s.border }}>
      {status}
    </span>
  );
}

function SectionHeader({ icon, title, count, action, children }) {
  return (
    <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--crm-line)' }}>
      <h3 className="text-xs uppercase tracking-widest font-bold flex items-center gap-2" style={LABEL_MONO}>
        {icon && <icon size={14} style={{ color: 'var(--crm-heading)' }} />}{title}
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {count !== undefined && (
          <span className="px-2 py-0.5 border rounded-sm text-[9px] uppercase tracking-wide whitespace-nowrap" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>
            {count}
          </span>
        )}
        {action && <div className="flex items-center gap-2">{action}</div>}
        {children}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, tone, trend }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="border p-4 sm:p-5 transition-all duration-300 rounded-sm flex flex-col min-w-0" style={CARD}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <span className="text-[9px] uppercase tracking-widest font-bold truncate" style={LABEL_MONO}>{title}</span>
        <div className="p-2 border rounded-sm flex-shrink-0" style={{ borderColor: 'var(--crm-line)', color: toneColor(tone), background: toneBg(tone) }}>
          <icon size={13} />
        </div>
      </div>
      <div className="flex flex-col mt-4 min-w-0">
        <span className="text-xl sm:text-2xl font-light tracking-tight whitespace-nowrap truncate" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}>{value}</span>
        {subtitle && <span className="text-[10px] mt-1 truncate" style={LABEL_MONO}>{subtitle}</span>}
        {trend && <span className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--crm-positive)' }}><FiTrendingUp size={10} />{trend}</span>}
      </div>
    </motion.div>
  );
}

export default function FounderDashboard() {
  const [summary, setSummary] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reviewingLeaveId, setReviewingLeaveId] = useState(null);
  const [submittingTarget, setSubmittingTarget] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('employeeId');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);

  const [targetForm, setTargetForm] = useState({
    employeeId: '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    targetValue: '',
    targetDeals: ''
  });

  const [employeeForm, setEmployeeForm] = useState({
    name: '', email: '', phone: '', department: 'SALES', position: '',
    role: 'EMPLOYEE', status: 'ACTIVE', salary: 0, joiningDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, leavesRes, empRes, jobsRes, leaderboardRes] = await Promise.all([
        adminApi.getDashboardSummary(),
        leaveApi.getLeaves({ status: 'PENDING' }),
        employeeSignupApi.getAllEmployees(),
        careersApi.getAllJobs(),
        salesApi.getLeaderboard({ period: 'monthly' })
      ]);
      if (summaryRes.success) setSummary(summaryRes.data.summary);
      if (leavesRes.success) setLeaves(leavesRes.data.leaves || []);
      if (empRes.success) setEmployees(empRes.data.employees || []);
      if (jobsRes.success) setJobs(jobsRes.data.jobs || []);
      if (leaderboardRes.success) setLeaderboard(leaderboardRes.data.leaderboard || []);
    } catch (error) {
      console.error('Failed to load founder dashboard data:', error);
      setError(error.message);
      toast.error('Failed to load founder dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveDecision = async (leaveId, status) => {
    setReviewingLeaveId(leaveId);
    try {
      const remarks = status === 'APPROVED' ? 'Approved by Founder' : 'Rejected by Founder';
      const res = await leaveApi.reviewLeave(leaveId, status, remarks);
      if (res && res.success) {
        toast.success(`Leave request ${status.toLowerCase()}.`);
        setLeaves((prev) => prev.filter((l) => l._id !== leaveId));
      } else {
        toast.error(res?.message || 'Failed to update leave request.');
      }
    } catch (error) {
      console.error('Failed to review leave request:', error);
      toast.error('Failed to update leave request.');
    } finally {
      setReviewingLeaveId(null);
    }
  };

  const handleAssignTarget = async (e) => {
    e.preventDefault();
    if (!targetForm.employeeId) {
      toast.error('Select a sales employee.');
      return;
    }
    if (!targetForm.targetValue || Number(targetForm.targetValue) <= 0) {
      toast.error('Enter a valid target value.');
      return;
    }
    setSubmittingTarget(true);
    try {
      const res = await salesApi.setTarget({
        employeeId: targetForm.employeeId,
        month: Number(targetForm.month),
        year: Number(targetForm.year),
        targetValue: Number(targetForm.targetValue),
        targetDeals: targetForm.targetDeals ? Number(targetForm.targetDeals) : undefined
      });
      if (res && res.success) {
        toast.success('Sales target assigned.');
        setTargetForm((prev) => ({ ...prev, targetValue: '', targetDeals: '' }));
      } else {
        toast.error(res?.message || 'Failed to assign target.');
      }
    } catch (error) {
      console.error('Failed to assign sales target:', error);
      toast.error('Failed to assign target.');
    } finally {
      setSubmittingTarget(false);
    }
  };

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...employeeForm, salary: Number(employeeForm.salary) };
      let res;
      if (editingEmployee) {
        res = await employeeSignupApi.updateEmployee(editingEmployee._id, payload);
      } else {
        res = await employeeSignupApi.createEmployee(payload);
      }
      if (res.success) {
        toast.success(editingEmployee ? 'Employee updated.' : 'Employee created.');
        setShowEmployeeModal(false);
        setEditingEmployee(null);
        setEmployeeForm({
          name: '', email: '', phone: '', department: 'SALES', position: '',
          role: 'EMPLOYEE', status: 'ACTIVE', salary: 0, joiningDate: new Date().toISOString().split('T')[0]
        });
        fetchAll();
      } else {
        toast.error(res?.message || 'Failed to save employee.');
      }
    } catch (error) {
      console.error('Failed to save employee:', error);
      toast.error('Failed to save employee.');
    }
  };

  const handleEditEmployee = (emp) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      name: emp.name, email: emp.email, phone: emp.phone, department: emp.department,
      position: emp.position, role: emp.role, status: emp.status, salary: emp.salary || 0,
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowEmployeeModal(true);
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Delete this employee? This action cannot be undone.')) return;
    try {
      const res = await employeeSignupApi.deleteEmployee(id);
      if (res.success) {
        toast.success('Employee deleted.');
        fetchAll();
      } else {
        toast.error(res?.message || 'Failed to delete employee.');
      }
    } catch (error) {
      console.error('Failed to delete employee:', error);
      toast.error('Failed to delete employee.');
    }
  };

  const salesEmployees = useMemo(() => employees.filter((e) => e.department === 'SALES' && e.status === 'ACTIVE'), [employees]);
  const activeEmployees = useMemo(() => employees.filter((e) => e.status === 'ACTIVE'), [employees]);

  const deptCounts = useMemo(() => {
    const counts = {};
    activeEmployees.forEach(e => { counts[e.department] = (counts[e.department] || 0) + 1; });
    return counts;
  }, [activeEmployees]);

  const roleCounts = useMemo(() => {
    const counts = {};
    activeEmployees.forEach(e => { counts[e.role] = (counts[e.role] || 0) + 1; });
    return counts;
  }, [activeEmployees]);

  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((e) =>
        e.name?.toLowerCase().includes(term) ||
        e.employeeId?.toLowerCase().includes(term) ||
        e.email?.toLowerCase().includes(term)
      );
    }
    if (deptFilter !== 'ALL') result = result.filter((e) => e.department === deptFilter);
    if (roleFilter !== 'ALL') result = result.filter((e) => e.role === roleFilter);
    if (statusFilter !== 'ALL') result = result.filter((e) => e.status === statusFilter);
    result.sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [employees, searchTerm, deptFilter, roleFilter, statusFilter, sortBy, sortOrder]);

  const openJobs = jobs.filter((j) => j.isActive);

  const stats = [
    { title: 'Total Employees', value: activeEmployees.length, subtitle: `${employees.length} total`, icon: FiUsers, tone: 'ink' },
    { title: 'Pending Leaves', value: leaves.length, subtitle: 'Awaiting review', icon: FiCalendar, tone: leaves.length > 0 ? 'warning' : 'ink' },
    { title: 'Open Jobs', value: openJobs.length, subtitle: 'Active requisitions', icon: FiBriefcase, tone: openJobs.length > 0 ? 'info' : 'ink' },
    { title: 'Active Leads', value: summary?.activeLeads || 0, subtitle: 'Pipeline health', icon: FiTrendingUp, tone: 'info' },
    { title: 'Revenue Collected', value: fmtCurrency(summary?.revenue?.totalCollected), subtitle: 'All time', icon: FiDollarSign, tone: 'positive' },
    { title: 'Pending Payments', value: fmtCurrency(summary?.payments?.pendingValue), subtitle: 'Awaiting collection', icon: FiAlertCircle, tone: 'danger' },
    { title: 'Sales Targets Set', value: summary?.targetsSet || 0, subtitle: 'This month', icon: FiTarget, tone: 'accent' },
    { title: 'Dept. Coverage', value: Object.keys(deptCounts).length, subtitle: `${EMPLOYEE_DEPARTMENTS.length} possible`, icon: FiGrid, tone: 'info' }
  ];

  const deptChartData = useMemo(() => Object.entries(deptCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value), [deptCounts]);
  const roleChartData = useMemo(() => Object.entries(roleCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value), [roleCounts]);

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="w-full border-b py-6" style={{ borderColor: 'var(--crm-line)' }}>
          <div className="crm-skeleton h-3 w-56 rounded-sm mb-3" style={{ background: 'var(--crm-bg-sunken)' }} />
          <div className="crm-skeleton h-7 w-72 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
        </div>
        <SkeletonStatGrid count={8} />
        <SkeletonListCard />
        <SkeletonListCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-16 text-center px-4">
        <FiAlertCircle size={48} style={{ color: 'var(--crm-danger)', marginBottom: 16 }} />
        <h3 className="text-lg font-medium" style={{ color: 'var(--crm-heading)' }}>Failed to load dashboard</h3>
        <p className="text-sm mt-2" style={{ color: 'var(--crm-ink-soft)' }}>{error}</p>
        <button onClick={fetchAll} className="mt-4 px-4 py-2 rounded-sm text-sm font-mono uppercase" style={{ background: 'var(--crm-accent)', color: 'var(--crm-bg)' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="w-full min-h-screen overflow-x-hidden" style={{ background: 'var(--crm-bg)' }}>
      {/* Header */}
      <motion.div variants={blockVariants} className="w-full border-b px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}>
        <div className="space-y-1 text-left min-w-0">
          <span className="text-[9px] uppercase tracking-[0.25em] font-bold block" style={LABEL_MONO}>Founder Oversight</span>
          <h1 className="text-xl sm:text-2xl font-normal tracking-tight uppercase truncate" style={HEADING}>Founder Command Center</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <motion.div whileHover={{ scale: 1.02 }} className="text-[9px] sm:text-[10px] border px-3 py-1.5 uppercase tracking-wide whitespace-nowrap rounded-sm select-none hidden sm:block" style={{ ...LABEL_MONO, background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)' }}>
            Cross-department oversight — every action audited
          </motion.div>
          <button onClick={() => { setShowEmployeeModal(true); setEditingEmployee(null); }} className="px-3 sm:px-4 py-2 text-[10px] font-mono uppercase rounded-sm flex items-center gap-2 transition-all" style={{ background: 'var(--crm-accent)', color: 'var(--crm-bg)' }}>
            <FiPlus size={12} /> <span className="hidden sm:inline">Add Employee</span>
          </button>
          <button onClick={fetchAll} className="px-3 sm:px-4 py-2 text-[10px] font-mono uppercase rounded-sm flex items-center gap-2 transition-all" style={{ background: 'var(--crm-bg-sunken)', color: 'var(--crm-heading)', border: '1px solid', borderColor: 'var(--crm-line)' }}>
            <FiRefreshCw size={12} /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => handleExportReport(summary, leaves, employees, jobs, leaderboard, deptCounts, roleCounts, openJobs)}
            className="px-3 sm:px-4 py-2 text-[10px] font-mono uppercase rounded-sm flex items-center gap-2 transition-all" style={{ background: 'var(--crm-positive)', color: 'var(--crm-bg)' }}
          >
            <FiDownload size={12} /> <span className="hidden sm:inline">Export Report</span>
          </button>
        </div>
      </motion.div>

      <div className="w-full px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* KPI Grid - Responsive: 1 col mobile, 2 tablet, 4 desktop, 8 xl */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
          {stats.map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))}
        </motion.div>

        {/* Phase 4: Founder Transport & Logistics Overview Widget */}
        <motion.div variants={blockVariants}>
          <FounderTransportWidget summary={summary} />
        </motion.div>

        {/* Charts Row - Stack on mobile, side-by-side on desktop */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <motion.div variants={blockVariants} className="border rounded-sm overflow-hidden lg:col-span-1" style={CARD}>
            <SectionHeader icon={FiPieChart} title="Workforce by Department" />
            <div className="p-4 sm:p-5 h-64 sm:h-72">
              {deptChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deptChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {deptChartData.map((_, i) => <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Employees']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No employee data" description="Employee directory will appear once staff are onboarded." />
              )}
            </div>
          </motion.div>

          <motion.div variants={blockVariants} className="border rounded-sm overflow-hidden lg:col-span-2" style={CARD}>
            <SectionHeader icon={FiBarChart2} title="Workforce by Role" />
            <div className="p-4 sm:p-5 h-64 sm:h-72">
              {roleChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-line)" />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--crm-ink-faint)', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--crm-heading)', fontSize: 10 }} width={100} />
                    <Tooltip formatter={(value) => [value, 'Employees']} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="var(--crm-accent)" maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No role data" description="Role distribution will appear once staff are onboarded." />
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* Main Content - Stacked full-width sections */}
        <div className="space-y-6">
          {/* Leave Approvals */}
          <motion.div variants={blockVariants} className="border rounded-sm overflow-hidden" style={CARD}>
            <SectionHeader icon={FiCalendar} title="Leave Approvals" count={leaves.length} />
            <div className="divide-y" style={{ borderColor: 'var(--crm-line)' }}>
              {leaves.length === 0 ? (
                <EmptyState title="No pending leave requests" description="Everything is up to date." className="py-8 sm:py-12" />
              ) : (
                leaves.map((lv) => (
                  <div key={lv._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={CARD_SUNKEN}>
                    <div className="space-y-1.5 text-xs sm:text-sm min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate" style={{ color: 'var(--crm-heading)' }}>{lv.employeeId?.fullName || lv.employeeId?.name || 'Employee'}</span>
                        <span className="text-[9px] sm:text-[10px] whitespace-nowrap" style={LABEL_MONO}>({lv.employeeId?.department || '—'})</span>
                      </div>
                      <p className="text-[10px] sm:text-[11px]" style={LABEL_MONO}>
                        {new Date(lv.fromDate).toLocaleDateString()} – {new Date(lv.toDate).toLocaleDateString()} ({lv.numberOfDays} day{lv.numberOfDays === 1 ? '' : 's'}) · {lv.leaveType.replace('_', ' ')}
                      </p>
                      <p className="text-[10px] sm:text-[11px] italic truncate" style={{ color: 'var(--crm-ink-soft)' }}>"{lv.reason}"</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                      <button disabled={reviewingLeaveId === lv._id} onClick={() => handleLeaveDecision(lv._id, 'APPROVED')} className="px-3 py-1.5 text-[9px] sm:text-[10px] font-mono uppercase rounded-sm border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default flex items-center gap-1" style={{ borderColor: 'var(--crm-positive-bg)', color: 'var(--crm-positive)', background: 'var(--crm-positive-bg)' }}>
                        <FiCheckCircle size={10} sm:size={11} /> <span className="hidden sm:inline">Approve</span>
                      </button>
                      <button disabled={reviewingLeaveId === lv._id} onClick={() => handleLeaveDecision(lv._id, 'REJECTED')} className="px-3 py-1.5 text-[9px] sm:text-[10px] font-mono uppercase rounded-sm border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default flex items-center gap-1" style={{ borderColor: 'var(--crm-danger-bg)', color: 'var(--crm-danger)', background: 'var(--crm-danger-bg)' }}>
                        <FiXCircle size={10} sm:size={11} /> <span className="hidden sm:inline">Reject</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Workforce Directory */}
          <motion.div variants={blockVariants} className="border rounded-sm overflow-hidden" style={CARD}>
            <SectionHeader 
              icon={FiUsers} 
              title="Workforce Directory" 
              action={
                <button onClick={() => setShowFilters(!showFilters)} className="px-3 py-1.5 text-[9px] font-mono uppercase rounded-sm border flex items-center gap-1 transition-all" style={{ borderColor: 'var(--crm-line)', color: 'var(--crm-heading)', background: 'var(--crm-bg-sunken)' }}>
                  <FiFilter size={10} /> Filters {showFilters ? <FiChevronUp size={10} /> : <FiChevronDown size={10} />}
                </button>
              }
            />
            
            {/* Collapsible Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 border-b overflow-hidden" style={{ borderColor: 'var(--crm-line)' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                      <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2" size={11} style={{ color: 'var(--crm-ink-faint)' }} />
                      <input type="text" placeholder="Search name, ID, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="text-[10px] sm:text-[11px] pl-7 pr-3 py-2 rounded-sm border outline-none w-full" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Department</label>
                      <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-[10px] sm:text-[11px] px-2 py-2 rounded-sm border outline-none cursor-pointer w-full" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                        <option value="ALL">All Departments</option>
                        {EMPLOYEE_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Role</label>
                      <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-[10px] sm:text-[11px] px-2 py-2 rounded-sm border outline-none cursor-pointer w-full" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                        <option value="ALL">All Roles</option>
                        {EMPLOYEE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Status</label>
                      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-[10px] sm:text-[11px] px-2 py-2 rounded-sm border outline-none cursor-pointer w-full" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Table with horizontal scroll on mobile */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="sticky top-0">
                  <tr className="border-b text-[8px] sm:text-[9px] uppercase tracking-wider" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}>
                    <th className="py-2.5 px-3 cursor-pointer hover:opacity-80 whitespace-nowrap" onClick={() => { setSortBy('employeeId'); setSortOrder(sortBy === 'employeeId' && sortOrder === 'asc' ? 'desc' : 'asc'); }}>Employee {sortBy === 'employeeId' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                    <th className="py-2.5 px-3 cursor-pointer hover:opacity-80 whitespace-nowrap" onClick={() => { setSortBy('department'); setSortOrder(sortBy === 'department' && sortOrder === 'asc' ? 'desc' : 'asc'); }}>Dept {sortBy === 'department' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                    <th className="py-2.5 px-3 cursor-pointer hover:opacity-80 whitespace-nowrap" onClick={() => { setSortBy('role'); setSortOrder(sortBy === 'role' && sortOrder === 'asc' ? 'desc' : 'asc'); }}>Role {sortBy === 'role' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                    <th className="py-2.5 px-3 cursor-pointer hover:opacity-80 whitespace-nowrap" onClick={() => { setSortBy('status'); setSortOrder(sortBy === 'status' && sortOrder === 'asc' ? 'desc' : 'asc'); }}>Status {sortBy === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                    <th className="py-2.5 px-3 cursor-pointer hover:opacity-80 whitespace-nowrap" onClick={() => { setSortBy('position'); setSortOrder(sortBy === 'position' && sortOrder === 'asc' ? 'desc' : 'asc'); }}>Position {sortBy === 'position' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs sm:text-sm divide-y" style={{ borderColor: 'var(--crm-line)' }}>
                  {filteredEmployees.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-8 sm:py-12" style={LABEL_MONO}>No employees match this filter.</td></tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp._id} className="hover:bg-[var(--crm-bg-sunken)]/50 transition-colors">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div style={{ color: 'var(--crm-heading)' }}>{emp.name}</div>
                          <div className="text-[9px] sm:text-[10px]" style={LABEL_MONO}>{emp.employeeId} · {emp.email}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap" style={LABEL_MONO}>
                          <span className="px-2 py-0.5 rounded-sm text-[8px] sm:text-[9px] uppercase font-bold border" style={{ color: 'var(--crm-accent)', background: 'var(--crm-accent-bg)', borderColor: 'var(--crm-accent-bg)' }}>
                            {emp.department}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap" style={LABEL_MONO}>{emp.role}</td>
                        <td className="py-3 px-3 whitespace-nowrap"><StatusBadge status={emp.status} /></td>
                        <td className="py-3 px-3 text-[9px] sm:text-[10px] truncate max-w-[150px]" style={{ color: 'var(--crm-ink-soft)' }}>{emp.position || '—'}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Link to={`/crm/employees/${emp._id}`} className="text-[9px] sm:text-[10px] uppercase flex items-center gap-1 hover:underline p-1.5 rounded-sm transition-colors" style={{ color: 'var(--crm-accent)', background: 'var(--crm-accent-bg)' }}>
                              <FiEye size={10} /> <span className="hidden sm:inline">View</span>
                            </Link>
                            <button onClick={() => handleEditEmployee(emp)} className="p-1.5 rounded-sm transition-colors" style={{ color: 'var(--crm-info)', background: 'var(--crm-info-bg)' }} title="Edit">
                              <FiEdit size={11} />
                            </button>
                            <button onClick={() => handleDeleteEmployee(emp._id)} className="p-1.5 rounded-sm transition-colors" style={{ color: 'var(--crm-danger)', background: 'var(--crm-danger-bg)' }} title="Delete">
                              <FiTrash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredEmployees.length > 0 && (
              <div className="p-3 border-t text-right text-[9px] sm:text-[10px]" style={{ borderColor: 'var(--crm-line)', ...LABEL_MONO }}>
                Showing {filteredEmployees.length} of {employees.length} employees
              </div>
            )}
          </motion.div>

          {/* Sales Target + Leaderboard - Stacked on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <motion.div variants={blockVariants} className="border rounded-sm overflow-hidden" style={CARD}>
              <SectionHeader icon={FiTarget} title="Assign Sales Target" />
              <form onSubmit={handleAssignTarget} className="p-4 sm:p-5 space-y-3 text-xs sm:text-sm">
                <div>
                  <label className="block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Sales Employee *</label>
                  <select required value={targetForm.employeeId} onChange={(e) => setTargetForm({ ...targetForm, employeeId: e.target.value })} className="w-full text-[10px] sm:text-[11px] px-3 py-2 rounded-sm border outline-none cursor-pointer" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                    <option value="">Select employee...</option>
                    {salesEmployees.map((e) => (
                      <option key={e._id} value={e._id}>{e.name} ({e.employeeId}) — {e.position || e.role}</option>
                    ))}
                  </select>
                  {salesEmployees.length === 0 && (
                    <p className="text-[9px] sm:text-[10px] mt-1" style={{ color: 'var(--crm-warning)' }}>No active SALES-department employees found.</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Month</label>
                    <select value={targetForm.month} onChange={(e) => setTargetForm({ ...targetForm, month: e.target.value })} className="w-full text-[10px] sm:text-[11px] px-2 py-2 rounded-sm border outline-none cursor-pointer" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                      {MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Year</label>
                    <input type="number" value={targetForm.year} onChange={(e) => setTargetForm({ ...targetForm, year: e.target.value })} className="w-full text-[10px] sm:text-[11px] px-2 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Target Value (₹) *</label>
                  <input type="number" required min="1" placeholder="e.g. 500000" value={targetForm.targetValue} onChange={(e) => setTargetForm({ ...targetForm, targetValue: e.target.value })} className="w-full text-[10px] sm:text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                </div>
                <div>
                  <label className="block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Target Deals (optional)</label>
                  <input type="number" min="0" placeholder="e.g. 10" value={targetForm.targetDeals} onChange={(e) => setTargetForm({ ...targetForm, targetDeals: e.target.value })} className="w-full text-[10px] sm:text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                </div>
                <button type="submit" disabled={submittingTarget} className="w-full py-2.5 rounded-sm text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default" style={{ background: 'var(--crm-accent)', color: 'var(--crm-bg)' }}>
                  {submittingTarget ? 'Assigning...' : 'Assign Target'}
                </button>
              </form>
            </motion.div>

            <motion.div variants={blockVariants} className="border rounded-sm overflow-hidden" style={CARD}>
              <SectionHeader icon={FiAward} title="This Month's Leaderboard" />
              <div className="divide-y" style={{ borderColor: 'var(--crm-line)' }}>
                {leaderboard.length === 0 ? (
                  <EmptyState title="No sales activity yet" description="Rankings appear once deals are logged." className="p-6 sm:p-8" />
                ) : (
                  leaderboard.map((row, idx) => (
                    <div key={row.employeeId} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={idx % 2 === 0 ? CARD_SUNKEN : {}}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[9px] sm:text-[10px] font-mono w-5" style={LABEL_MONO}>#{idx + 1}</span>
                        <div className="min-w-0">
                          <div className="truncate" style={{ color: 'var(--crm-heading)' }}>{row.fullName}</div>
                          <div className="text-[8px] sm:text-[9px]" style={LABEL_MONO}>{row.dealsWon} deal{row.dealsWon === 1 ? '' : 's'} won</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-[10px] sm:text-sm whitespace-nowrap" style={{ color: 'var(--crm-positive)' }}>{fmtCurrency(row.revenue)}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Hiring Pipeline + Quick Actions - Stacked on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <motion.div variants={blockVariants} className="border rounded-sm overflow-hidden" style={CARD}>
              <SectionHeader 
                icon={FiBriefcase} 
                title="Hiring Pipeline" 
                action={<Link to="/crm/jobs" className="text-[9px] sm:text-[10px] uppercase flex items-center gap-1 hover:underline" style={{ color: 'var(--crm-accent)' }}>Manage <FiExternalLink size={10} /></Link>}
              />
              <div className="divide-y" style={{ borderColor: 'var(--crm-line)' }}>
                {openJobs.length === 0 ? (
                  <EmptyState title="No open requisitions" description="Post a job from Manage Jobs to see it here." className="p-6 sm:p-8" />
                ) : (
                  openJobs.map((job) => (
                    <div key={job._id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={CARD_SUNKEN}>
                      <div className="min-w-0">
                        <div className="truncate" style={{ color: 'var(--crm-heading)' }}>{job.title}</div>
                        <div className="text-[8px] sm:text-[9px]" style={LABEL_MONO}>{job.department} · {job.location}</div>
                      </div>
                      <FiUserPlus size={12} style={{ color: 'var(--crm-ink-faint)' }} className="shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            <motion.div variants={blockVariants} className="border rounded-sm overflow-hidden" style={CARD}>
              <SectionHeader icon={FiZap} title="Quick Actions" />
              <div className="p-4 sm:p-5 space-y-2">
                {[
                  { to: '/crm/hr/manager', label: 'HR Manager Dashboard', icon: FiAward },
                  { to: '/crm/sales', label: 'Sales Performance', icon: FiTrendingUp },
                  { to: '/crm/reports', label: 'Reports', icon: FiBarChart2 },
                  { to: '/crm/security', label: 'Security', icon: FiShield },
                  { to: '/crm/leads', label: 'Leads Management', icon: FiUsers },
                  { to: '/crm/documents', label: 'Documents', icon: FiFileText },
                  { to: '/crm/employees', label: 'All Employees', icon: FiUsers },
                  { to: '/crm/jobs', label: 'Manage Jobs', icon: FiBriefcase },
                  { to: '/crm/tasks', label: 'Task Board', icon: FiCheckSquare },
                  { to: '/crm/admin', label: 'Admin Panel', icon: FiSettings },
                  { to: '/crm/career-leads', label: 'Career Leads', icon: FiUserPlus },
                  { to: '/crm/founder', label: 'Founder Dashboard', icon: FiHome },
                ].map((link) => (
                  <Link key={link.to} to={link.to} className="flex items-center justify-between p-2.5 border rounded-sm text-[9px] sm:text-xs transition-colors hover:opacity-80" style={CARD_SUNKEN}>
                    <span className="flex items-center gap-2 min-w-0" style={{ color: 'var(--crm-heading)' }}>
                      <link.icon size={12} style={{ color: 'var(--crm-ink-faint)' }} /> <span className="truncate">{link.label}</span>
                    </span>
                    <FiArrowRight size={10} sm:size={11} style={{ color: 'var(--crm-ink-faint)' }} className="shrink-0" />
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Add/Edit Employee Modal - Full screen on mobile */}
      <AnimatePresence>
        {showEmployeeModal && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="bg-[var(--crm-bg-raised)] rounded-sm w-full max-w-lg sm:max-w-2xl overflow-hidden border border-[var(--crm-ink-soft)]/15 shadow-2xl max-h-[95vh] flex flex-col">
              <div className="p-4 sm:p-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg)' }}>
                <div className="min-w-0">
                  <span className="text-[8px] sm:text-[9px] font-mono uppercase tracking-[0.2em] font-bold block" style={LABEL_MONO}>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</span>
                  <h3 className="text-sm sm:text-base font-serif text-[var(--crm-heading)] uppercase tracking-wide mt-1 truncate">{editingEmployee ? editingEmployee.name : 'Create Employee Record'}</h3>
                </div>
                <button onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); }} className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-2 rounded-sm hover:bg-[var(--crm-bg-raised)] transition-all flex-shrink-0"><FiX size={18} /></button>
              </div>
              <form onSubmit={handleEmployeeSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Full Name *</label>
                    <input required value={employeeForm.name} onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})} className="w-full text-[10px] sm:text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Email *</label>
                    <input required type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})} className="w-full text-[10px] sm:text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Phone *</label>
                    <input required value={employeeForm.phone} onChange={(e) => setEmployeeForm({...employeeForm, phone: e.target.value})} className="w-full text-[10px] sm:text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Department *</label>
                    <select value={employeeForm.department} onChange={(e) => setEmployeeForm({...employeeForm, department: e.target.value})} className="w-full text-[10px] sm:text-[11px] px-3 py-2 rounded-sm border outline-none cursor-pointer" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                      {EMPLOYEE_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Position *</label>
                    <input required value={employeeForm.position} onChange={(e) => setEmployeeForm({...employeeForm, position: e.target.value})} className="w-full text-[10px] sm:text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Role *</label>
                    <select value={employeeForm.role} onChange={(e) => setEmployeeForm({...employeeForm, role: e.target.value})} className="w-full text-[10px] sm:text-[11px] px-3 py-2 rounded-sm border outline-none cursor-pointer" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                      {EMPLOYEE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Status *</label>
                    <select value={employeeForm.status} onChange={(e) => setEmployeeForm({...employeeForm, status: e.target.value})} className="w-full text-[10px] sm:text-[11px] px-3 py-2 rounded-sm border outline-none cursor-pointer" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Salary (₹)</label>
                    <input type="number" min="0" value={employeeForm.salary} onChange={(e) => setEmployeeForm({...employeeForm, salary: e.target.value})} className="w-full text-[10px] sm:text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Joining Date *</label>
                    <input type="date" required value={employeeForm.joiningDate} onChange={(e) => setEmployeeForm({...employeeForm, joiningDate: e.target.value})} className="w-full text-[10px] sm:text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-2 border-t" style={{ borderColor: 'var(--crm-line)' }}>
                  <button type="submit" className="flex-1 py-2.5 bg-[var(--crm-accent)] hover:bg-[var(--crm-heading)] text-[var(--crm-bg)] text-[9px] sm:text-xs font-bold uppercase tracking-wider rounded-sm transition-all">
                    {editingEmployee ? 'Update Employee' : 'Create Employee'}
                  </button>
                  <button type="button" onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); }} className="flex-1 py-2.5 bg-[var(--crm-bg)] hover:bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] text-[9px] sm:text-xs font-bold uppercase tracking-wider rounded-sm transition-all">
                    Cancel
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