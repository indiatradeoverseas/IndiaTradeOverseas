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
  FiPieChart, FiCreditCard,
  FiFileText, FiTruck, FiSettings, FiGrid,
  FiRefreshCw, FiPlus, FiEdit, FiTrash2, FiEye
} from 'react-icons/fi';
import { SkeletonStatGrid, SkeletonListCard } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

const EMPLOYEE_DEPARTMENTS = ['SALES', 'HR', 'IT', 'ADMIN', 'FINANCE', 'OPERATIONS', 'MARKETING'];
const EMPLOYEE_ROLES = ['EMPLOYEE', 'HR_EXECUTIVE', 'HR_MANAGER', 'ADMIN', 'MANAGER', 'HR'];
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

const STATUS_COLORS = {
  ACTIVE: { color: 'var(--crm-positive)', bg: 'var(--crm-positive-bg)', border: 'var(--crm-positive-bg)' },
  INACTIVE: { color: 'var(--crm-ink-faint)', bg: 'var(--crm-bg-sunken)', border: 'var(--crm-line)' },
  PENDING: { color: 'var(--crm-warning)', bg: 'var(--crm-warning-bg)', border: 'var(--crm-warning-bg)' },
  APPROVED: { color: 'var(--crm-positive)', bg: 'var(--crm-positive-bg)', border: 'var(--crm-positive-bg)' },
  REJECTED: { color: 'var(--crm-danger)', bg: 'var(--crm-danger-bg)', border: 'var(--crm-danger-bg)' }
};

const fmtCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;
const fmtNumber = (val) => (val || 0).toLocaleString('en-IN');

function getStatusBadge(status) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.INACTIVE;
  return (
    <span className="px-2 py-0.5 rounded-sm text-[9px] uppercase font-bold border" style={{ color: s.color, background: s.bg, borderColor: s.border }}>
      {status}
    </span>
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
    { title: 'Total Employees', value: activeEmployees.length, icon: FiUsers, tone: 'ink', subtitle: `${employees.length} total` },
    { title: 'Pending Leaves', value: leaves.length, icon: FiCalendar, tone: leaves.length > 0 ? 'warning' : 'ink', subtitle: 'Awaiting review' },
    { title: 'Open Jobs', value: openJobs.length, icon: FiBriefcase, tone: openJobs.length > 0 ? 'info' : 'ink', subtitle: 'Active requisitions' },
    { title: 'Active Leads', value: summary?.activeLeads || 0, icon: FiTrendingUp, tone: 'info', subtitle: 'Pipeline health' },
    { title: 'Revenue Collected', value: fmtCurrency(summary?.revenue?.totalCollected), icon: FiDollarSign, tone: 'positive', subtitle: 'All time' },
    { title: 'Pending Payments', value: fmtCurrency(summary?.payments?.pendingValue), icon: FiAlertCircle, tone: 'danger', subtitle: 'Awaiting collection' },
    { title: 'Sales Targets Set', value: summary?.targetsSet || 0, icon: FiTarget, tone: 'accent', subtitle: 'This month' },
    { title: 'Dept. Coverage', value: Object.keys(deptCounts).length, icon: FiGrid, tone: 'info', subtitle: `${EMPLOYEE_DEPARTMENTS.length} possible` }
  ];

  const deptChartData = useMemo(() => Object.entries(deptCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value), [deptCounts]);
  const roleChartData = useMemo(() => Object.entries(roleCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value), [roleCounts]);

  if (loading) {
    return (
      <div className="w-full space-y-8">
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
      <div className="w-full py-16 text-center">
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
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="w-full min-h-screen" style={{ background: 'var(--crm-bg)' }}>
      {/* Header */}
      <motion.div variants={blockVariants} className="w-full border-b px-6 py-5 flex flex-col md:flex-row md:items-end justify-between gap-4" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}>
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] font-bold block" style={LABEL_MONO}>Founder Oversight</span>
          <h1 className="text-2xl sm:text-3xl font-normal tracking-tight uppercase" style={HEADING}>Founder Command Center</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <motion.div whileHover={{ scale: 1.02 }} className="text-[10px] border px-3 py-1.5 uppercase tracking-wide whitespace-nowrap rounded-sm select-none" style={{ ...LABEL_MONO, background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)' }}>
            Cross-department oversight — every action audited
          </motion.div>
          <button onClick={() => { setShowEmployeeModal(true); setEditingEmployee(null); }} className="px-4 py-2 text-[10px] font-mono uppercase rounded-sm flex items-center gap-2 transition-all" style={{ background: 'var(--crm-accent)', color: 'var(--crm-bg)' }}>
            <FiPlus size={12} /> Add Employee
          </button>
          <button onClick={fetchAll} className="px-4 py-2 text-[10px] font-mono uppercase rounded-sm flex items-center gap-2 transition-all" style={{ background: 'var(--crm-bg-sunken)', color: 'var(--crm-heading)', border: '1px solid', borderColor: 'var(--crm-line)' }}>
            <FiRefreshCw size={12} /> Refresh
          </button>
        </div>
      </motion.div>

      <div className="w-full px-6 py-8 space-y-8">
        {/* KPI Grid */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          {stats.map((stat, i) => (
            <motion.div key={i} variants={blockVariants} whileHover={{ y: -4 }} className="border p-5 transition-all duration-300 rounded-sm flex flex-col" style={CARD}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[9px] uppercase tracking-widest font-bold" style={LABEL_MONO}>{stat.title}</span>
                <div className="p-2 border rounded-sm" style={{ borderColor: 'var(--crm-line)', color: toneColor(stat.tone), background: toneBg(stat.tone) }}>
                  <stat.icon size={13} />
                </div>
              </div>
              <div className="flex flex-col mt-4">
                <span className="text-xl sm:text-2xl font-light tracking-tight whitespace-nowrap" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}>{stat.value}</span>
                <span className="text-[10px] mt-1" style={LABEL_MONO}>{stat.subtitle}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Row */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={blockVariants} className="border rounded-sm p-6 lg:col-span-2" style={CARD}>
            <h3 className="text-xs uppercase tracking-widest font-bold border-b pb-3 mb-4 flex items-center gap-2" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>
              <FiPieChart size={14} style={{ color: 'var(--crm-heading)' }} /> Workforce by Department
            </h3>
            <div className="h-72">
              {deptChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deptChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
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

          <motion.div variants={blockVariants} className="border rounded-sm p-6" style={CARD}>
            <h3 className="text-xs uppercase tracking-widest font-bold border-b pb-3 mb-4 flex items-center gap-2" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>
              <FiBarChart2 size={14} style={{ color: 'var(--crm-heading)' }} /> Workforce by Role
            </h3>
            <div className="h-72">
              {roleChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-line)" />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--crm-ink-faint)', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--crm-heading)', fontSize: 10 }} width={120} />
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN - 8/12 */}
          <div className="lg:col-span-8 space-y-6">
            {/* Leave Approvals */}
            <motion.div variants={blockVariants} className="border rounded-sm overflow-hidden" style={CARD}>
              <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--crm-line)' }}>
                <h3 className="text-xs uppercase tracking-widest font-bold flex items-center gap-2" style={LABEL_MONO}>
                  <FiCalendar size={14} style={{ color: 'var(--crm-heading)' }} /> Leave Approvals
                </h3>
                <span className="px-2 py-0.5 border rounded-sm text-[9px] uppercase tracking-wide" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>{leaves.length} Pending</span>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--crm-line)' }}>
                {leaves.length === 0 ? (
                  <EmptyState title="No pending leave requests" description="Everything is up to date." className="py-12" />
                ) : (
                  leaves.map((lv) => (
                    <div key={lv._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={CARD_SUNKEN}>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium" style={{ color: 'var(--crm-heading)' }}>{lv.employeeId?.name || 'Unknown Employee'}</span>
                          <span className="text-[10px]" style={LABEL_MONO}>({lv.employeeId?.department || '—'})</span>
                        </div>
                        <p className="text-[11px]" style={LABEL_MONO}>
                          {new Date(lv.fromDate).toLocaleDateString()} – {new Date(lv.toDate).toLocaleDateString()} ({lv.numberOfDays} day{lv.numberOfDays === 1 ? '' : 's'}) · {lv.leaveType.replace('_', ' ')}
                        </p>
                        <p className="text-[11px] italic" style={{ color: 'var(--crm-ink-soft)' }}>"{lv.reason}"</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button disabled={reviewingLeaveId === lv._id} onClick={() => handleLeaveDecision(lv._id, 'APPROVED')} className="px-3 py-1.5 text-[10px] font-mono uppercase rounded-sm border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default flex items-center gap-1" style={{ borderColor: 'var(--crm-positive-bg)', color: 'var(--crm-positive)', background: 'var(--crm-positive-bg)' }}>
                          <FiCheckCircle size={11} /> Approve
                        </button>
                        <button disabled={reviewingLeaveId === lv._id} onClick={() => handleLeaveDecision(lv._id, 'REJECTED')} className="px-3 py-1.5 text-[10px] font-mono uppercase rounded-sm border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default flex items-center gap-1" style={{ borderColor: 'var(--crm-danger-bg)', color: 'var(--crm-danger)', background: 'var(--crm-danger-bg)' }}>
                          <FiXCircle size={11} /> Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Workforce Directory */}
            <motion.div variants={blockVariants} className="border rounded-sm overflow-hidden" style={CARD}>
              <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--crm-line)' }}>
                <h3 className="text-xs uppercase tracking-widest font-bold flex items-center gap-2" style={LABEL_MONO}>
                  <FiUsers size={14} style={{ color: 'var(--crm-heading)' }} /> Workforce Directory
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2" size={11} style={{ color: 'var(--crm-ink-faint)' }} />
                    <input type="text" placeholder="Search name, ID, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="text-[11px] pl-7 pr-3 py-1.5 rounded-sm border outline-none w-48" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                  <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-[11px] px-2 py-1.5 rounded-sm border outline-none cursor-pointer" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                    <option value="ALL">All Departments</option>
                    {EMPLOYEE_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-[11px] px-2 py-1.5 rounded-sm border outline-none cursor-pointer" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                    <option value="ALL">All Roles</option>
                    {EMPLOYEE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-[11px] px-2 py-1.5 rounded-sm border outline-none cursor-pointer" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="sticky top-0">
                    <tr className="border-b text-[9px] uppercase tracking-wider" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}>
                      <th className="py-2.5 px-3 cursor-pointer hover:opacity-80" onClick={() => setSortBy('employeeId')}>Employee {sortBy === 'employeeId' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="py-2.5 px-3 cursor-pointer hover:opacity-80" onClick={() => setSortBy('department')}>Department {sortBy === 'department' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="py-2.5 px-3 cursor-pointer hover:opacity-80" onClick={() => setSortBy('role')}>Role {sortBy === 'role' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="py-2.5 px-3 cursor-pointer hover:opacity-80" onClick={() => setSortBy('status')}>Status {sortBy === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="py-2.5 px-3 cursor-pointer hover:opacity-80" onClick={() => setSortBy('position')}>Position</th>
                      <th className="py-2.5 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y" style={{ borderColor: 'var(--crm-line)' }}>
                    {filteredEmployees.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-12" style={LABEL_MONO}>No employees match this filter.</td></tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr key={emp._id} className="hover:bg-[var(--crm-bg-sunken)]/50 transition-colors">
                          <td className="py-3 px-3">
                            <div style={{ color: 'var(--crm-heading)' }}>{emp.name}</div>
                            <div className="text-[10px]" style={LABEL_MONO}>{emp.employeeId} · {emp.email}</div>
                          </td>
                          <td className="py-3 px-3" style={LABEL_MONO}>
                            <span className="px-2 py-0.5 rounded-sm text-[9px] uppercase font-bold border" style={{ color: 'var(--crm-accent)', background: 'var(--crm-accent-bg)', borderColor: 'var(--crm-accent-bg)' }}>
                              {emp.department}
                            </span>
                          </td>
                          <td className="py-3 px-3" style={LABEL_MONO}>{emp.role}</td>
                          <td className="py-3 px-3">{getStatusBadge(emp.status)}</td>
                          <td className="py-3 px-3 text-[10px]" style={{ color: 'var(--crm-ink-soft)' }}>{emp.position || '—'}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              <Link to={`/crm/employees/${emp._id}`} className="text-[10px] uppercase flex items-center gap-1 hover:underline p-1.5 rounded-sm transition-colors" style={{ color: 'var(--crm-accent)', background: 'var(--crm-accent-bg)' }}>
                                <FiEye size={10} /> View
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
                <div className="p-3 border-t text-right text-[10px]" style={{ borderColor: 'var(--crm-line)', ...LABEL_MONO }}>
                  Showing {filteredEmployees.length} of {employees.length} employees
                </div>
              )}
            </motion.div>
          </div>

          {/* RIGHT COLUMN - 4/12 */}
          <div className="lg:col-span-4 space-y-6">
            {/* Sales Target Assignor */}
            <motion.div variants={blockVariants} className="border rounded-sm p-5" style={CARD}>
              <h3 className="text-xs uppercase tracking-widest font-bold border-b pb-3 mb-4 flex items-center gap-2" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>
                <FiTarget size={14} style={{ color: 'var(--crm-heading)' }} /> Assign Sales Target
              </h3>
              <form onSubmit={handleAssignTarget} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Sales Employee *</label>
                  <select required value={targetForm.employeeId} onChange={(e) => setTargetForm({ ...targetForm, employeeId: e.target.value })} className="w-full text-[11px] px-3 py-2 rounded-sm border outline-none cursor-pointer" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                    <option value="">Select employee...</option>
                    {salesEmployees.map((e) => (
                      <option key={e._id} value={e._id}>{e.name} ({e.employeeId}) — {e.position || e.role}</option>
                    ))}
                  </select>
                  {salesEmployees.length === 0 && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--crm-warning)' }}>No active SALES-department employees found.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Month</label>
                    <select value={targetForm.month} onChange={(e) => setTargetForm({ ...targetForm, month: e.target.value })} className="w-full text-[11px] px-2 py-2 rounded-sm border outline-none cursor-pointer" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                      {MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Year</label>
                    <input type="number" value={targetForm.year} onChange={(e) => setTargetForm({ ...targetForm, year: e.target.value })} className="w-full text-[11px] px-2 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Target Value (₹) *</label>
                  <input type="number" required min="1" placeholder="e.g. 500000" value={targetForm.targetValue} onChange={(e) => setTargetForm({ ...targetForm, targetValue: e.target.value })} className="w-full text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Target Deals (optional)</label>
                  <input type="number" min="0" placeholder="e.g. 10" value={targetForm.targetDeals} onChange={(e) => setTargetForm({ ...targetForm, targetDeals: e.target.value })} className="w-full text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                </div>
                <button type="submit" disabled={submittingTarget} className="w-full py-2.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default" style={{ background: 'var(--crm-accent)', color: 'var(--crm-bg)' }}>
                  {submittingTarget ? 'Assigning...' : 'Assign Target'}
                </button>
              </form>
            </motion.div>

            {/* Leaderboard */}
            <motion.div variants={blockVariants} className="border rounded-sm p-5" style={CARD}>
              <h3 className="text-xs uppercase tracking-widest font-bold border-b pb-3 mb-4 flex items-center gap-2" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>
                <FiAward size={14} style={{ color: 'var(--crm-heading)' }} /> This Month's Leaderboard
              </h3>
              {leaderboard.length === 0 ? (
                <EmptyState title="No sales activity yet" description="Rankings appear once deals are logged." />
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {leaderboard.map((row, idx) => (
                    <div key={row.employeeId} className="flex items-center justify-between p-2.5 border rounded-sm text-xs" style={CARD_SUNKEN}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono w-5" style={LABEL_MONO}>#{idx + 1}</span>
                        <div>
                          <div style={{ color: 'var(--crm-heading)' }}>{row.fullName}</div>
                          <div className="text-[9px]" style={LABEL_MONO}>{row.dealsWon} deal{row.dealsWon === 1 ? '' : 's'} won</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold" style={{ color: 'var(--crm-positive)' }}>{fmtCurrency(row.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Hiring Pipeline */}
            <motion.div variants={blockVariants} className="border rounded-sm p-5" style={CARD}>
              <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: 'var(--crm-line)' }}>
                <h3 className="text-xs uppercase tracking-widest font-bold flex items-center gap-2" style={LABEL_MONO}>
                  <FiBriefcase size={14} style={{ color: 'var(--crm-heading)' }} /> Hiring Pipeline
                </h3>
                <Link to="/crm/jobs" className="text-[10px] uppercase flex items-center gap-1 hover:underline" style={{ color: 'var(--crm-accent)' }}>
                  Manage <FiExternalLink size={10} />
                </Link>
              </div>
              {openJobs.length === 0 ? (
                <EmptyState title="No open requisitions" description="Post a job from Manage Jobs to see it here." />
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                  {openJobs.map((job) => (
                    <div key={job._id} className="p-2.5 border rounded-sm text-xs flex items-center justify-between gap-2" style={CARD_SUNKEN}>
                      <div className="min-w-0">
                        <div className="truncate" style={{ color: 'var(--crm-heading)' }}>{job.title}</div>
                        <div className="text-[9px]" style={LABEL_MONO}>{job.department} · {job.location}</div>
                      </div>
                      <FiUserPlus size={12} style={{ color: 'var(--crm-ink-faint)' }} className="shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={blockVariants} className="border rounded-sm p-5" style={CARD}>
              <h3 className="text-xs uppercase tracking-widest font-bold border-b pb-3 mb-4" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { to: '/crm/hr/manager', label: 'HR Manager Dashboard', icon: FiAward },
                  { to: '/crm/sales', label: 'Sales Performance', icon: FiTrendingUp },
                  { to: '/crm/reports', label: 'Reports', icon: FiBarChart2 },
                  { to: '/crm/security', label: 'Security', icon: FiShield },
                  { to: '/crm/leads', label: 'Leads Management', icon: FiUsers },
                  { to: '/crm/dispatches', label: 'Dispatches', icon: FiTruck },
                  { to: '/crm/payments', label: 'Payments', icon: FiCreditCard },
                  { to: '/crm/documents', label: 'Documents', icon: FiFileText },
                  { to: '/crm/employees', label: 'All Employees', icon: FiUsers },
                  { to: '/crm/jobs', label: 'Manage Jobs', icon: FiBriefcase },
                  { to: '/crm/tasks', label: 'Task Board', icon: FiCheckSquare },
                  { to: '/crm/admin', label: 'Admin Panel', icon: FiSettings },
                ].map((link) => (
                  <Link key={link.to} to={link.to} className="flex items-center justify-between p-2.5 border rounded-sm text-xs transition-colors hover:opacity-80" style={CARD_SUNKEN}>
                    <span className="flex items-center gap-2" style={{ color: 'var(--crm-heading)' }}>
                      <link.icon size={12} style={{ color: 'var(--crm-ink-faint)' }} /> {link.label}
                    </span>
                    <FiArrowRight size={11} style={{ color: 'var(--crm-ink-faint)' }} />
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Add/Edit Employee Modal */}
      <AnimatePresence>
        {showEmployeeModal && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="bg-[var(--crm-bg-raised)] rounded-sm w-full max-w-lg overflow-hidden border border-[var(--crm-ink-soft)]/15 shadow-2xl max-h-[90vh] flex flex-col">
              <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg)' }}>
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] font-bold block" style={LABEL_MONO}>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</span>
                  <h3 className="text-base font-serif text-[var(--crm-heading)] uppercase tracking-wide mt-1">{editingEmployee ? editingEmployee.name : 'Create Employee Record'}</h3>
                </div>
                <button onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); }} className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-1.5 rounded-sm hover:bg-[var(--crm-bg-raised)] transition-all"><FiX size={18} /></button>
              </div>
              <form onSubmit={handleEmployeeSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Full Name *</label>
                    <input required value={employeeForm.name} onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})} className="w-full text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Email *</label>
                    <input required type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})} className="w-full text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Phone *</label>
                    <input required value={employeeForm.phone} onChange={(e) => setEmployeeForm({...employeeForm, phone: e.target.value})} className="w-full text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Department *</label>
                    <select value={employeeForm.department} onChange={(e) => setEmployeeForm({...employeeForm, department: e.target.value})} className="w-full text-[11px] px-3 py-2 rounded-sm border outline-none cursor-pointer" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                      {EMPLOYEE_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Position *</label>
                    <input required value={employeeForm.position} onChange={(e) => setEmployeeForm({...employeeForm, position: e.target.value})} className="w-full text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Role *</label>
                    <select value={employeeForm.role} onChange={(e) => setEmployeeForm({...employeeForm, role: e.target.value})} className="w-full text-[11px] px-3 py-2 rounded-sm border outline-none cursor-pointer" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                      {EMPLOYEE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Status *</label>
                    <select value={employeeForm.status} onChange={(e) => setEmployeeForm({...employeeForm, status: e.target.value})} className="w-full text-[11px] px-3 py-2 rounded-sm border outline-none cursor-pointer" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Salary (₹)</label>
                    <input type="number" min="0" value={employeeForm.salary} onChange={(e) => setEmployeeForm({...employeeForm, salary: e.target.value})} className="w-full text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Joining Date *</label>
                    <input type="date" required value={employeeForm.joiningDate} onChange={(e) => setEmployeeForm({...employeeForm, joiningDate: e.target.value})} className="w-full text-[11px] px-3 py-2 rounded-sm border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                </div>
                <div className="flex space-x-3 pt-3 border-t" style={{ borderColor: 'var(--crm-line)' }}>
                  <button type="submit" className="flex-1 py-2.5 bg-[var(--crm-accent)] hover:bg-[var(--crm-heading)] text-[var(--crm-bg)] text-xs font-bold uppercase tracking-wider rounded-sm transition-all">
                    {editingEmployee ? 'Update Employee' : 'Create Employee'}
                  </button>
                  <button type="button" onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); }} className="flex-1 py-2.5 bg-[var(--crm-bg)] hover:bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] text-xs font-bold uppercase tracking-wider rounded-sm transition-all">
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