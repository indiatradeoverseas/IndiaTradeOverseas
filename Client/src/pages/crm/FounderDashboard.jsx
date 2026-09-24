import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import { leaveApi } from '../../api/leave';
import { salesApi } from '../../api/sales';
import { careersApi } from '../../api/careers';
import { employeeSignupApi } from '../../api/employee-signup';
import controlledCampaignApi from '../../api/controlledCampaigns';
import {
  FiUsers, FiTrendingUp, FiCalendar, FiBriefcase, FiDollarSign, FiSearch,
  FiCheckCircle, FiXCircle, FiArrowRight, FiAlertCircle, FiTarget,
  FiUserPlus, FiAward, FiShield, FiBarChart2, FiPieChart, FiCreditCard,
  FiCheckSquare, FiX, FiFileText, FiTruck, FiSettings, FiRefreshCw,
  FiPlus, FiEdit, FiTrash2, FiEye, FiActivity, FiGlobe, FiLock, FiBell,
  FiMessageSquare, FiZap, FiDownload, FiFilter, FiUserCheck, FiUserX,
  FiClock, FiChevronDown, FiChevronUp, FiSliders, FiCheck, FiUpload, FiAlertTriangle
} from 'react-icons/fi';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart
} from 'recharts';
import { SkeletonStatGrid, SkeletonListCard } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import FounderTransportWidget from './transport/FounderTransportWidget';
import ScreenshotAlertsWidget from '../../components/crm/ScreenshotAlertsWidget';
import EmployeeActivityMonitor from '../../components/crm/EmployeeActivityMonitor';
import FileSharingWidget from '../../components/crm/FileSharingWidget';
import WarningLetterModal from '../../components/crm/warning';
import TerminationLetterModal from '../../components/crm/Termination';
import PiLetterModal from '../../components/crm/Pi';
import ExperienceLetterModal from '../../components/crm/Experience';

const EMPLOYEE_DEPARTMENTS = ['SALES', 'HR', 'IT', 'ADMIN', 'FINANCE', 'OPERATIONS', 'MARKETING', 'TRANSPORT'];
const EMPLOYEE_ROLES = [
  'SALES_EXECUTIVE',
  'SALES_MANAGER',
  'HR_EXECUTIVE',
  'HR_MANAGER',
  'TRANSPORT_MANAGER',
  'TRANSPORT_EXECUTIVE',
  'DRIVER',
  'CEO',
  'ADMIN',
  'SALES_TRIAL'
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const now = new Date();

const STAGE_COLORS = [
  '#0284c7', // cyan/sky
  '#a855f7', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#3b82f6', // blue
  '#ec4899', // pink
  '#84cc16', // lime
  '#6366f1', // indigo
  '#64748b'  // slate
];

const AXIS_TICK_STYLE = { fill: 'var(--crm-ink-faint)', fontSize: 11, fontFamily: 'var(--crm-font-body)', fontWeight: 500 };
const XAXIS_TICK_STYLE = { fill: 'var(--crm-heading)', fontSize: 11, fontFamily: 'var(--crm-font-body)', fontWeight: 600 };
const CHART_GRID_STROKE = 'rgba(197,203,211,0.12)';
const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--crm-bg-raised)',
  border: '1px solid var(--crm-line)',
  borderRadius: '8px',
  fontSize: '11px',
  fontFamily: 'var(--crm-font-body)',
  color: 'var(--crm-heading)',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)'
};
const CHART_TOOLTIP_LABEL_STYLE = { color: 'var(--crm-heading)', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px', fontFamily: 'var(--crm-font-body)' };
const CHART_TOOLTIP_ITEM_STYLE = { fontSize: '11px', fontFamily: 'var(--crm-font-body)', padding: '2px 0' };
const CHART_LEGEND_STYLE = { fontSize: '11px', fontFamily: 'var(--crm-font-body)', color: 'var(--crm-ink-faint)', paddingTop: '10px' };

const CARD_STYLE = {
  borderColor: 'var(--crm-line)',
  background: 'var(--crm-bg-raised)',
  boxShadow: 'var(--crm-shadow)'
};

const CARD_SUNKEN = {
  borderColor: 'var(--crm-line)',
  background: 'var(--crm-bg-sunken)'
};

const LABEL_MONO = {
  fontFamily: 'var(--crm-font-body)',
  color: 'var(--crm-ink-faint)'
};

const HEADING_STYLE = {
  fontFamily: 'var(--crm-font-body)',
  color: 'var(--crm-heading)'
};

const CHART_COLORS = [
  'var(--crm-accent)',
  'var(--crm-info)',
  'var(--crm-positive)',
  'var(--crm-warning)',
  'var(--crm-danger)',
  '#a855f7',
  '#ec4899'
];

const fmtCurrency = (val, currency = 'INR') => {
  const num = Number(val);
  if (
    val === null ||
    val === undefined ||
    val === '' ||
    Number.isNaN(num)
  ) {
    return '₹0.00';
  }

  const code = String(currency || 'INR').trim().toUpperCase() || 'INR';

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2
    }).format(num);
  } catch {
    return `${code} ${num.toLocaleString('en-IN')}`;
  }
};

const fmtNumber = (val) => Number(val || 0).toLocaleString('en-IN');

export default function FounderDashboard() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState('ALL');

  // Date Range State for Business Overview Chart
  const [dateRange, setDateRange] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Data states
  const [summary, setSummary] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [pipelineData, setPipelineData] = useState([]);
  const [monthlyLeadsData, setMonthlyLeadsData] = useState([]);
  const [controlledCampaignSnapshot, setControlledCampaignSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [perfPeriod, setPerfPeriod] = useState('monthly');
  const [reviewingLeaveId, setReviewingLeaveId] = useState(null);
  const [submittingTarget, setSubmittingTarget] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [letterModal, setLetterModal] = useState({ open: false, type: null, employee: null });
  const [openHeaderLetterDropdown, setOpenHeaderLetterDropdown] = useState(false);
  const [openRowDropdownId, setOpenRowDropdownId] = useState(null);

  // Search & Filter state for Workforce Directory
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('employeeId');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);

  // Forms
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

  const fetchControlledCampaignSnapshot = async () => {
    try {
      const listResponse = await controlledCampaignApi.list();
      const listData = listResponse?.data ?? listResponse ?? {};
      const rows = Array.isArray(listData?.campaigns)
        ? listData.campaigns
        : [];

      if (rows.length === 0) {
        setControlledCampaignSnapshot(null);
        return;
      }

      const latest = rows[0];
      const campaignId = latest?.campaign?._id;
      let metrics = null;

      if (campaignId) {
        try {
          const metricsResponse =
            await controlledCampaignApi.getMetrics(campaignId);

          metrics =
            metricsResponse?.data ??
            metricsResponse ??
            null;
        } catch (metricsError) {
          console.warn(
            'Controlled campaign metrics are not available yet:',
            metricsError?.message || metricsError
          );
        }
      }

      setControlledCampaignSnapshot({
        campaign: latest?.campaign || null,
        readiness: latest?.readiness || null,
        metrics
      });
    } catch (campaignError) {
      console.warn(
        'Controlled campaign snapshot could not be loaded:',
        campaignError?.message || campaignError
      );

      setControlledCampaignSnapshot(null);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [
    dateRange,
    customStartDate,
    customEndDate,
    perfPeriod
  ]);

  useEffect(() => {
    fetchControlledCampaignSnapshot();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { range: dateRange };
      if (dateRange === 'Custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }

      const [summaryRes, leavesRes, empRes, jobsRes, leaderboardRes, pipelineRes] = await Promise.all([
        adminApi.getDashboardSummary(params).catch(() => ({ success: false })),
        leaveApi.getLeaves({ status: 'PENDING' }).catch(() => ({ success: false })),
        employeeSignupApi.getAllEmployees().catch(() => ({ success: false })),
        careersApi.getAllJobs().catch(() => ({ success: false })),
        salesApi.getLeaderboard({ period: perfPeriod }).catch(() => ({ success: false })),
        adminApi.getPipeline().catch(() => ({ success: false }))
      ]);

      if (summaryRes?.success && summaryRes.data?.summary) {
        setSummary(summaryRes.data.summary);
      } else if (summaryRes?.summary) {
        setSummary(summaryRes.summary);
      } else {
        setSummary({});
      }

      if (leavesRes?.success) setLeaves(leavesRes.data?.leaves || leavesRes.leaves || []);
      if (empRes?.success) setEmployees(empRes.data?.employees || empRes.employees || []);
      if (jobsRes?.success) setJobs(jobsRes.data?.jobs || jobsRes.jobs || []);
      if (leaderboardRes?.success) setLeaderboard(leaderboardRes.data?.leaderboard || leaderboardRes.leaderboard || []);

      const pResData = pipelineRes?.data?.data || pipelineRes?.data || pipelineRes || {};
      let pData = [];
      let mData = [];
      if (Array.isArray(pResData.pipeline)) {
        pData = pResData.pipeline;
      } else if (pResData.pipeline && Array.isArray(pResData.pipeline.pipeline)) {
        pData = pResData.pipeline.pipeline;
      } else if (Array.isArray(pResData)) {
        pData = pResData;
      }

      if (Array.isArray(pResData.monthly)) {
        mData = pResData.monthly;
      } else if (pResData.pipeline && Array.isArray(pResData.pipeline.monthly)) {
        mData = pResData.pipeline.monthly;
      }

      setPipelineData(pData);
      setMonthlyLeadsData(mData);
    } catch (err) {
      console.error('Failed to load founder dashboard data:', err);
      setError(err.message || 'Failed to fetch founder dashboard data.');
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
      toast.error('Failed to delete employee.');
    }
  };

  // Computed Business Overview Numbers matching CEO Dashboard
  const activeEmployeesCount = useMemo(() => {
    const activeFromEmp = employees.filter((e) => ['ACTIVE', 'Active'].includes(e.status)).length;
    return Math.max(activeFromEmp, summary?.activeEmployees || 0);
  }, [employees, summary]);

  const activeEmployees = useMemo(() => employees.filter((e) => ['ACTIVE', 'Active'].includes(e.status)), [employees]);
  const salesEmployees = useMemo(() => employees.filter((e) => e.department === 'SALES' && ['ACTIVE', 'Active'].includes(e.status)), [employees]);

  const totalEmployeesCount = useMemo(() => {
    const rawTotal = Math.max(summary?.totalEmployees || 0, employees.length || 0);
    return Math.max(rawTotal, activeEmployeesCount);
  }, [summary, employees, activeEmployeesCount]);

  const totalPipelineLeads = useMemo(() => {
    return pipelineData.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [pipelineData]);

  const activeLeadsCount =
    summary?.activeLeads !== undefined
      ? summary.activeLeads
      : (summary?.totalLeads || 0);

  const completedDeliveredCount =
    summary?.completedLeads !== undefined
      ? summary.completedLeads
      : (
          summary?.deliveredLeads ||
          summary?.transport?.delivered ||
          0
        );

  const quotationsSentCount =
    summary?.quotations?.sent !== undefined
      ? summary.quotations.sent
      : (summary?.quotations?.total || 0);

  const ordersConfirmedCount =
    (
      summary?.ordersConfirmed !== undefined &&
      summary?.ordersConfirmed > 0
    )
      ? summary.ordersConfirmed
      : Math.max(
          summary?.completedLeads || 0,
          summary?.transport?.delivered || 0
        );

  const revenueByCurrency =
    Array.isArray(summary?.revenue?.byCurrency)
      ? summary.revenue.byCurrency
      : [];

  const revenueDisplay =
    summary?.revenue?.totalCollected !== null &&
    summary?.revenue?.totalCollected !== undefined
      ? fmtCurrency(
          summary.revenue.totalCollected,
          summary?.revenue?.currency || 'INR'
        )
      : revenueByCurrency.length > 1
        ? 'Mixed currencies'
        : revenueByCurrency.length === 1
          ? fmtCurrency(
              revenueByCurrency[0]?.collected,
              revenueByCurrency[0]?._id
            )
          : fmtCurrency(0, 'INR');

  const revenueSubtitle =
    revenueByCurrency.length > 1
      ? revenueByCurrency
          .map((row) =>
            fmtCurrency(
              row?.collected,
              row?._id
            )
          )
          .join(' · ')
      : 'Finance-verified revenue collected';

  // Total Conversion % = Orders Confirmed / Quotations Sent * 100
  const totalConversionPercent = useMemo(() => {
    const totalWonOrConfirmed = Math.max(ordersConfirmedCount, completedDeliveredCount, summary?.completedLeads || 0);
    if (quotationsSentCount > 0) {
      return Math.round((totalWonOrConfirmed / quotationsSentCount) * 100);
    }
    if (activeLeadsCount + totalWonOrConfirmed > 0) {
      return Math.round((totalWonOrConfirmed / (activeLeadsCount + totalWonOrConfirmed)) * 100);
    }
    return summary?.conversionRate || 0;
  }, [ordersConfirmedCount, completedDeliveredCount, summary, quotationsSentCount, activeLeadsCount]);

  const pendingPaymentsAmount =
    summary?.payments?.pendingOrdersValue ??
    summary?.payments?.pendingValue ??
    null;
  const presentTodayCount = summary?.presentToday ?? 0;
  const newLeadsCount = summary?.newLeads ?? summary?.pendingLeads ?? 0;
  const assignedLeadsCount = summary?.assignedLeads ?? 0;

  // 10 Main Business Overview KPI Cards
  const kpiCards = [
    { title: 'Total Employees', value: fmtNumber(totalEmployeesCount), subtitle: `${activeEmployeesCount} active staff · ${totalEmployeesCount} total`, icon: FiUsers, color: 'var(--crm-info)' },
    { title: 'Present Employees', value: fmtNumber(presentTodayCount), subtitle: 'Checked-in staff today', icon: FiUserCheck, color: 'var(--crm-positive)' },
    { title: 'Active Leads', value: fmtNumber(activeLeadsCount), subtitle: 'Pipeline in progress', icon: FiTrendingUp, color: 'var(--crm-accent)' },
    { title: 'New Leads', value: fmtNumber(newLeadsCount), subtitle: 'Fresh pipeline entries', icon: FiPlus, color: '#0284c7' },
    { title: 'Assigned Leads', value: fmtNumber(assignedLeadsCount), subtitle: 'Delegated to sales staff', icon: FiUserPlus, color: '#a855f7' },
    { title: 'Completed & Delivered', value: fmtNumber(completedDeliveredCount), subtitle: 'Orders fulfilled', icon: FiCheckCircle, color: 'var(--crm-positive)' },
    { title: 'Payment Received', value: revenueDisplay, subtitle: revenueSubtitle, icon: FiCreditCard, color: 'var(--crm-positive)' },
    { title: 'Quotations Sent', value: fmtNumber(quotationsSentCount), subtitle: `${summary?.quotations?.approved || 0} approved`, icon: FiFileText, color: '#a855f7' },
    { title: 'Orders Confirmed', value: fmtNumber(ordersConfirmedCount), subtitle: `${summary?.pendingOrders || 0} pending pipeline`, icon: FiCheckSquare, color: 'var(--crm-positive)' },
    { title: 'Pending Payments', value: fmtCurrency(pendingPaymentsAmount), subtitle: `${summary?.payments?.pendingOrdersCount || summary?.payments?.pendingCount || 0} records pending`, icon: FiAlertCircle, color: 'var(--crm-danger)' }
  ];

  // ComposedChart Data for Combined Business Overview
  const composedChartData = useMemo(() => {
    if (summary?.businessTrend && Array.isArray(summary.businessTrend) && summary.businessTrend.length > 0) {
      return summary.businessTrend;
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIdx - i + 12) % 12;
      result.push({
        period: months[idx],
        'Total Employees': totalEmployeesCount,
        'Active Leads': activeLeadsCount,
        'Completed & Delivered': completedDeliveredCount,
        'Quotations Sent': quotationsSentCount,
        'Orders Confirmed': ordersConfirmedCount,
        'Conversion %': totalConversionPercent
      });
    }
    return result;
  }, [summary, totalEmployeesCount, activeLeadsCount, completedDeliveredCount, quotationsSentCount, ordersConfirmedCount, totalConversionPercent]);

  const deptCounts = useMemo(() => {
    const counts = {};
    activeEmployees.forEach((e) => { counts[e.department] = (counts[e.department] || 0) + 1; });
    return counts;
  }, [activeEmployees]);

  const roleCounts = useMemo(() => {
    const counts = {};
    activeEmployees.forEach((e) => { counts[e.role] = (counts[e.role] || 0) + 1; });
    return counts;
  }, [activeEmployees]);

  const deptChartData = useMemo(() => Object.entries(deptCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value), [deptCounts]);
  const roleChartData = useMemo(() => Object.entries(roleCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value), [roleCounts]);

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

  const salesAndTransportLeaderboard = useMemo(() => {
    return (leaderboard || []).filter((item) => {
      const dept = String(item.department || '').toUpperCase();
      const role = String(item.role || '').toUpperCase();
      return (
        dept.includes('SALES') ||
        dept.includes('TRANSPORT') ||
        role.includes('SALES') ||
        role.includes('TRANSPORT') ||
        role.includes('DRIVER')
      );
    });
  }, [leaderboard]);

  const handleExportCSV = () => {
    const rows = [
      ['ITO FOUNDER COMMAND CENTER — EXECUTIVE REPORT'],
      [`Generated At: ${new Date().toLocaleString('en-IN')}`],
      ['Date Range Filter:', dateRange],
      [''],
      ['ORGANIZATIONAL HEALTH'],
      ['Total Employees', totalEmployeesCount],
      ['Active Staff', activeEmployees.length],
      ['Active Leads', activeLeadsCount],
      ['Completed & Delivered', completedDeliveredCount],
      ['Payment Received', revenueDisplay],
      ['Quotations Sent', quotationsSentCount],
      ['Orders Confirmed', ordersConfirmedCount],
      ['Total Conversion %', `${totalConversionPercent}%`],
      ['Pending Payments', fmtCurrency(pendingPaymentsAmount)],
      ['Pending Leaves', leaves.length]
    ];
    const csvContent = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Founder-Report-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Founder report exported successfully.');
  };

  if (loading) {
    return (
      <div className="w-full space-y-6 p-6">
        <div className="w-full border-b py-6" style={{ borderColor: 'var(--crm-line)' }}>
          <div className="crm-skeleton h-3 w-56 rounded-sm mb-3" style={{ background: 'var(--crm-bg-sunken)' }} />
          <div className="crm-skeleton h-8 w-80 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
        </div>
        <SkeletonStatGrid count={8} />
        <SkeletonListCard />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full min-h-screen overflow-x-hidden font-sans" style={{ background: 'var(--crm-bg)' }}>
      {/* Top Header Bar */}
      <div
        className="sticky top-0 z-20 w-full border-b px-4 py-4 sm:px-6 sm:py-5"
        style={{
          borderColor: 'var(--crm-line)',
          background: 'color-mix(in srgb, var(--crm-bg-raised) 94%, transparent)',
          backdropFilter: 'blur(14px)'
        }}
      >
        <div className="mx-auto max-w-[1700px] space-y-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    borderColor: 'var(--crm-line)',
                    background: 'var(--crm-bg-sunken)',
                    color: 'var(--crm-accent)'
                  }}
                >
                  <FiShield size={17} />
                </div>

                <div className="min-w-0">
                  <span
                    className="block text-[9px] font-bold uppercase tracking-[0.22em]"
                    style={{ color: 'var(--crm-accent)' }}
                  >
                    Founder Oversight · Enterprise Command
                  </span>

                  <h1
                    className="mt-0.5 truncate text-xl font-semibold tracking-tight sm:text-2xl"
                    style={{ color: 'var(--crm-heading)' }}
                  >
                    Founder Command Center
                  </h1>
                </div>
              </div>

              <p
                className="mt-2 max-w-3xl text-xs leading-5 sm:text-sm"
                style={{ color: 'var(--crm-ink-faint)' }}
              >
                Executive oversight across acquisition, workforce, operations, sales and enterprise controls.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/crm/manager-chat"
                className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide transition"
                style={{
                  borderColor: 'var(--crm-line)',
                  background: 'var(--crm-bg-sunken)',
                  color: 'var(--crm-heading)'
                }}
              >
                <FiMessageSquare size={12} />
                Manager Chat
              </Link>

              <button
                type="button"
                onClick={() => {
                  fetchAll();
                  fetchControlledCampaignSnapshot();
                }}
                className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide transition"
                style={{
                  borderColor: 'var(--crm-line)',
                  background: 'var(--crm-bg-sunken)',
                  color: 'var(--crm-heading)'
                }}
              >
                <FiRefreshCw size={12} />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex min-h-[38px] items-center gap-2 rounded-lg px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide transition"
                style={{
                  background: 'var(--crm-accent)',
                  color: '#fff'
                }}
              >
                <FiDownload size={12} />
                Export Report
              </button>
            </div>
          </div>

          <div
            className="flex items-center gap-2 overflow-x-auto border-t pt-3 pb-1 scrollbar-none"
            style={{ borderColor: 'var(--crm-line)' }}
          >
            {[
              { id: 'ALL', label: 'All Modules' },
              { id: 'OVERVIEW', label: 'Overview' },
              { id: 'FILES', label: 'File Sharing' },
              { id: 'WORKFORCE', label: 'Workforce & Targets' },
              { id: 'ATTENDANCE', label: 'Attendance & Telemetry' },
              { id: 'TRANSPORT', label: 'Transport Map' },
              { id: 'ALERTS', label: 'Alerts & Approvals' }
            ].map((tab) => {
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="whitespace-nowrap rounded-lg border px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide transition"
                  style={{
                    borderColor: active
                      ? 'var(--crm-accent)'
                      : 'var(--crm-line)',
                    background: active
                      ? 'var(--crm-accent-bg)'
                      : 'var(--crm-bg-sunken)',
                    color: active
                      ? 'var(--crm-accent)'
                      : 'var(--crm-ink-faint)'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1700px] space-y-8 px-4 py-6 sm:px-6">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border p-4 text-sm"
            style={{
              borderColor: 'var(--crm-danger)',
              background: 'var(--crm-danger-bg)',
              color: 'var(--crm-danger)'
            }}
          >
            <FiAlertCircle className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}


        
        {/* =========================================================================
            SECTION 2: BUSINESS OVERVIEW SECTION (8 KPI CARDS + RECHARTS COMPOSED CHART + DATE RANGE)
            ========================================================================= */}
        {(activeTab === 'ALL' || activeTab === 'OVERVIEW') && (
          <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="overflow-hidden rounded-2xl border p-4 sm:p-6" style={CARD_STYLE}>
            <div className="mb-5 flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-end xl:justify-between" style={{ borderColor: 'var(--crm-line)' }}>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--crm-accent)' }}>Core Enterprise Telemetry</span>
                <h2 className="mt-1 flex items-center gap-2 text-base font-semibold sm:text-lg" style={{ color: 'var(--crm-heading)' }}>
                  <FiBarChart2 className="text-[var(--crm-accent)]" /> Founder Business Overview
                </h2>
                <p className="mt-1 text-xs leading-5" style={{ color: 'var(--crm-ink-faint)' }}>
                  Executive view of workforce, pipeline, fulfilment, quotation and revenue signals.
                </p>
              </div>

              {/* Date Range Filter Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[9px] font-bold uppercase tracking-wide" style={LABEL_MONO}>Range</span>

                {['ALL', 'Today', '7d', '30d', '90d', 'Custom'].map((range) => {
                  const active = dateRange === range;

                  return (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setDateRange(range)}
                      className="rounded-lg border px-3 py-1.5 text-[10px] font-semibold uppercase transition"
                      style={{
                        borderColor: active
                          ? 'var(--crm-accent)'
                          : 'var(--crm-line)',
                        background: active
                          ? 'var(--crm-accent-bg)'
                          : 'var(--crm-bg-sunken)',
                        color: active
                          ? 'var(--crm-accent)'
                          : 'var(--crm-ink-faint)'
                      }}
                    >
                      {range}
                    </button>
                  );
                })}

                {dateRange === 'Custom' && (
                  <div className="mt-2 flex w-full items-center gap-2 sm:mt-0 sm:w-auto">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-[10px] outline-none sm:flex-none"
                      style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}
                    />
                    <span className="text-[10px]" style={LABEL_MONO}>to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-[10px] outline-none sm:flex-none"
                      style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 10 Business Overview Telemetry KPI Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {kpiCards.map((card, i) => (
                <motion.div key={i} whileHover={{ y: -2 }} className="flex min-h-[118px] flex-col justify-between rounded-xl border p-4" style={CARD_SUNKEN}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--crm-ink-faint)]">{card.title}</span>
                    <div className="flex-shrink-0 rounded-lg border p-2" style={{ borderColor: 'var(--crm-line)', color: card.color, background: 'var(--crm-bg-raised)' }}>
                      <card.icon size={14} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="break-words text-xl font-semibold text-[var(--crm-heading)] sm:text-2xl">{card.value}</div>
                    <div className="mt-1 text-[10px] leading-4 text-[var(--crm-ink-faint)]">{card.subtitle}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recharts ComposedChart Section */}
            <div className="mt-5 rounded-xl border p-4 sm:p-5" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}>
              <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
                <div>
                  <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-[var(--crm-ink-faint)] block">
                    Core Enterprise Telemetry
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2 font-sans">
                    <FiActivity className="text-emerald-400 animate-pulse" /> Combined Business Performance (Bars: Volume/Revenue, Line: Total Conversion %)
                  </h3>
                </div>
                <span className="text-[9px] font-sans uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                  Founder Command Feed
                </span>
              </div>

              <div className="h-80 sm:h-96 w-full">
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={composedChartData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                    <XAxis dataKey="period" tick={XAXIS_TICK_STYLE} />
                    <YAxis yAxisId="left" tick={AXIS_TICK_STYLE} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#ec4899', fontSize: 11, fontFamily: 'var(--crm-font-mono)' }} unit="%" />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                      itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                    />
                    <Legend wrapperStyle={CHART_LEGEND_STYLE} />

                    <Bar yAxisId="left" dataKey="Total Employees" fill="var(--crm-info)" opacity={0.7} maxBarSize={20} radius={[2, 2, 0, 0]} />
                    <Bar yAxisId="left" dataKey="Active Leads" fill="var(--crm-accent)" opacity={0.8} maxBarSize={20} radius={[2, 2, 0, 0]} />
                    <Bar yAxisId="left" dataKey="Completed & Delivered" fill="var(--crm-positive)" opacity={0.8} maxBarSize={20} radius={[2, 2, 0, 0]} />
                    <Bar yAxisId="left" dataKey="Quotations Sent" fill="#a855f7" opacity={0.8} maxBarSize={20} radius={[2, 2, 0, 0]} />
                    <Bar yAxisId="left" dataKey="Orders Confirmed" fill="#38bdf8" opacity={0.8} maxBarSize={20} radius={[2, 2, 0, 0]} />

                    <Line yAxisId="right" type="monotone" dataKey="Conversion %" stroke="#ec4899" strokeWidth={3} dot={{ r: 5, fill: '#ec4899' }} activeDot={{ r: 8 }} name="Total Conversion %" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stage Distribution & Monthly Trends Section (matching Reports.jsx) */}
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Stage Distribution (Donut Chart + Grid Badges Legend) */}
              <div className="space-y-4 rounded-xl border p-5 lg:col-span-6" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}>
                <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
                  <div>
                    <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-[var(--crm-ink-faint)] block">Pipeline Telemetry</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2 font-sans">
                      <FiPieChart className="text-purple-400" /> Stage Distribution ({totalPipelineLeads} Total Leads)
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-5 h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={pipelineData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="total"
                          nameKey="_id"
                        >
                          {pipelineData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STAGE_COLORS[index % STAGE_COLORS.length]} stroke="var(--crm-bg)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                          itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                          formatter={(val, name) => [`${val} Leads`, String(name).replace(/_/g, ' ')]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="sm:col-span-7 grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                    {pipelineData.map((entry, index) => {
                      const pct = totalPipelineLeads > 0 ? Math.round(((entry.total || 0) / totalPipelineLeads) * 100) : 0;
                      const color = STAGE_COLORS[index % STAGE_COLORS.length];
                      return (
                        <div
                          key={entry._id || index}
                          className="flex items-center justify-between p-2 rounded border bg-[var(--crm-bg-sunken)] transition-colors hover:bg-[var(--crm-bg)]"
                          style={{ borderColor: 'var(--crm-line)' }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-[10px] font-sans font-bold uppercase truncate text-[var(--crm-heading)]" title={entry._id}>
                              {String(entry._id || 'STAGE').replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-sans text-xs flex-shrink-0">
                            <span className="font-bold text-[var(--crm-heading)]">{entry.total || 0}</span>
                            <span className="text-[9px] text-[var(--crm-ink-faint)] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Monthly Trends (Leads, Won & Lost) Line Chart */}
              <div className="space-y-4 rounded-xl border p-5 lg:col-span-6" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}>
                <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
                  <div>
                    <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-[var(--crm-ink-faint)] block">Historical Progress</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2 font-sans">
                      <FiTrendingUp className="text-emerald-400" /> Monthly Trends (Leads, Won & Lost)
                    </h3>
                  </div>
                  <span className="text-[9px] font-sans uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded">
                    Telemetry Stream
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={monthlyLeadsData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                      <XAxis dataKey="month" tick={XAXIS_TICK_STYLE} />
                      <YAxis tick={AXIS_TICK_STYLE} />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                        itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                      />
                      <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                      <Line type="monotone" dataKey="leads" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4, fill: '#38bdf8' }} activeDot={{ r: 6 }} name="Total Leads" />
                      <Line type="monotone" dataKey="won" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} name="Won" />
                      <Line type="monotone" dataKey="lost" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} activeDot={{ r: 6 }} name="Lost" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            SECTION 3: ENTERPRISE FILE SHARING MODULE (FOUNDER, CEO, ADMIN -> STAFF)
            ========================================================================= */}
        {(activeTab === 'ALL' || activeTab === 'FILES') && (
          <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <FileSharingWidget initialTab="ALL_AUDIT" />
          </motion.div>
        )}

        {/* =========================================================================
            ATTENDANCE & ACTIVE/INACTIVE USER TELEMETRY
            ========================================================================= */}
        {(activeTab === 'ALL' || activeTab === 'ATTENDANCE') && (
          <div className="space-y-6">
            <EmployeeActivityMonitor title="Employee Activity & Working Hours Monitor" />
          </div>
        )}

        {/* =========================================================================
            WORKFORCE MANAGEMENT & SALES TARGET ASSIGNMENT
            ========================================================================= */}
        {(activeTab === 'ALL' || activeTab === 'WORKFORCE') && (
          <div className="space-y-6">
            {/* Workforce Directory */}
            <div className="overflow-hidden rounded-2xl border" style={CARD_STYLE}>
              <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}>
                <h3 className="text-xs uppercase font-bold tracking-widest flex items-center gap-2" style={LABEL_MONO}>
                  <FiUsers className="text-[var(--crm-heading)]" /> Workforce Directory Management ({employees.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[9px] font-semibold uppercase transition" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                    <FiFilter size={10} /> Filters {showFilters ? <FiChevronUp size={10} /> : <FiChevronDown size={10} />}
                  </button>
                  <button onClick={() => { setShowEmployeeModal(true); setEditingEmployee(null); }} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[9px] font-semibold uppercase" style={{ background: 'var(--crm-accent)', color: '#fff' }}>
                    <FiPlus size={10} /> Add Staff
                  </button>
                </div>
              </div>

              {/* Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 border-b overflow-hidden" style={{ borderColor: 'var(--crm-line)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="relative">
                        <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2" size={11} style={{ color: 'var(--crm-ink-faint)' }} />
                        <input type="text" placeholder="Search name, ID, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="text-[10px] pl-7 pr-3 py-2 rounded-lg border outline-none w-full" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Department</label>
                        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-[10px] px-2 py-2 rounded-lg border outline-none cursor-pointer w-full" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                          <option value="ALL">All Departments</option>
                          {EMPLOYEE_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Role</label>
                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-[10px] px-2 py-2 rounded-lg border outline-none cursor-pointer w-full" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                          <option value="ALL">All Roles</option>
                          {EMPLOYEE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Status</label>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-[10px] px-2 py-2 rounded-lg border outline-none cursor-pointer w-full" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                          <option value="ALL">All Status</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Employee Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b text-[9px] uppercase font-sans" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)', color: 'var(--crm-ink-faint)' }}>
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Dept</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Position</th>
                      <th className="py-2.5 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y" style={{ borderColor: 'var(--crm-line)' }}>
                    {filteredEmployees.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-8 font-sans text-[var(--crm-ink-faint)]">No employees found.</td></tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr key={emp._id} className="hover:bg-[var(--crm-bg-sunken)]/50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-[var(--crm-heading)]">{emp.name}</div>
                            <div className="text-[9px] font-sans text-[var(--crm-ink-faint)]">{emp.employeeId} · {emp.email}</div>
                          </td>
                          <td className="py-3 px-3 font-sans">
                            <span className="px-2.5 py-1 rounded-full text-[8px] uppercase font-bold border border-cyan-800 bg-cyan-950 text-cyan-400 font-sans shadow-xs">
                              {emp.department}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-sans text-[var(--crm-heading)]">{emp.role}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-1 rounded-full text-[8px] font-bold border uppercase ${
                              emp.status === 'ACTIVE'
                                ? 'border-emerald-800 bg-emerald-950 text-emerald-400'
                                : 'border-rose-800 bg-rose-950 text-rose-400'
                            }`}>
                              {emp.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[10px] text-[var(--crm-ink-soft)]">{emp.position || '—'}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link to={`/crm/employees/${emp._id}`} className="text-[9px] uppercase p-1.5 rounded-md bg-[var(--crm-accent-bg)] text-[var(--crm-accent)] hover:underline border border-cyan-800" title="View Profile">
                                <FiEye size={11} />
                              </Link>

                              {/* Per-Employee Row Letter Dropdown */}
                              <div className="relative inline-block text-left">
                                <button
                                  onClick={() => setOpenRowDropdownId(openRowDropdownId === emp._id ? null : emp._id)}
                                  className="px-2 py-1 text-[9px] font-sans uppercase font-bold rounded bg-amber-950/80 text-amber-300 border border-amber-800 hover:bg-amber-900 cursor-pointer flex items-center gap-1 transition-colors"
                                  title="Issue Official HR Letter"
                                >
                                  <FiFileText size={10} /> Letter <FiChevronDown size={10} className={`transition-transform ${openRowDropdownId === emp._id ? 'rotate-180' : ''}`} />
                                </button>

                                {openRowDropdownId === emp._id && (
                                  <div className="absolute right-0 mt-1 w-52 rounded-md bg-[#090f1f] border border-cyan-500/40 shadow-2xl z-50 py-1 font-sans text-xs">
                                    <div className="px-2.5 py-1 border-b border-slate-800 text-[8px] uppercase tracking-wider text-cyan-400 font-bold truncate">
                                      Issue for {emp.name}:
                                    </div>
                                    <button
                                      onClick={() => { setLetterModal({ open: true, type: 'WARNING', employee: emp }); setOpenRowDropdownId(null); }}
                                      className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-amber-950/70 hover:text-amber-300 flex items-center gap-2 text-[11px] font-medium cursor-pointer"
                                    >
                                      <FiAlertTriangle className="text-amber-400" size={12} /> Warning Letter
                                    </button>
                                    <button
                                      onClick={() => { setLetterModal({ open: true, type: 'TERMINATION', employee: emp }); setOpenRowDropdownId(null); }}
                                      className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-rose-950/70 hover:text-rose-300 flex items-center gap-2 text-[11px] font-medium cursor-pointer"
                                    >
                                      <FiUserX className="text-rose-400" size={12} /> Termination Letter
                                    </button>
                                    <button
                                      onClick={() => { setLetterModal({ open: true, type: 'PI', employee: emp }); setOpenRowDropdownId(null); }}
                                      className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-purple-950/70 hover:text-purple-300 flex items-center gap-2 text-[11px] font-medium cursor-pointer"
                                    >
                                      <FiTrendingUp className="text-purple-400" size={12} /> PIP / PI Letter
                                    </button>
                                    <button
                                      onClick={() => { setLetterModal({ open: true, type: 'EXPERIENCE', employee: emp }); setOpenRowDropdownId(null); }}
                                      className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-cyan-950/70 hover:text-cyan-300 flex items-center gap-2 text-[11px] font-medium cursor-pointer"
                                    >
                                      <FiAward className="text-cyan-400" size={12} /> Experience Letter
                                    </button>
                                  </div>
                                )}
                              </div>

                              <button onClick={() => handleEditEmployee(emp)} className="p-1.5 rounded-md bg-sky-950 text-sky-400 border border-sky-800 cursor-pointer" title="Edit Employee">
                                <FiEdit size={11} />
                              </button>
                              <button onClick={() => handleDeleteEmployee(emp._id)} className="p-1.5 rounded-md bg-rose-950 text-rose-400 border border-rose-800 cursor-pointer" title="Delete Employee">
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
            </div>

            {/* Target Assignment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3 overflow-hidden rounded-2xl border p-5" style={CARD_STYLE}>
                <div className="border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
                  <h3 className="text-xs uppercase font-bold tracking-widest flex items-center gap-2" style={LABEL_MONO}>
                    <FiTarget className="text-amber-400" /> Assign Monthly Sales Targets
                  </h3>
                </div>
                <form onSubmit={handleAssignTarget} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Sales Employee *</label>
                    <select required value={targetForm.employeeId} onChange={(e) => setTargetForm({ ...targetForm, employeeId: e.target.value })} className="w-full text-[10px] px-3 py-2 rounded-lg border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                      <option value="">Select sales staff...</option>
                      {salesEmployees.map((e) => (
                        <option key={e._id} value={e._id}>{e.name} ({e.employeeId}) — {e.position || e.role}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Target Amount (₹) *</label>
                      <input type="number" required placeholder="Target revenue..." value={targetForm.targetValue} onChange={(e) => setTargetForm({ ...targetForm, targetValue: e.target.value })} className="w-full text-[10px] px-3 py-2 rounded-lg border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Deals Target</label>
                      <input type="number" placeholder="Deals count..." value={targetForm.targetDeals} onChange={(e) => setTargetForm({ ...targetForm, targetDeals: e.target.value })} className="w-full text-[10px] px-3 py-2 rounded-lg border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                    </div>
                  </div>
                  <button type="submit" disabled={submittingTarget} className="w-full py-2 text-[10px] font-sans uppercase font-bold rounded" style={{ background: 'var(--crm-accent)', color: 'var(--crm-bg)' }}>
                    {submittingTarget ? 'Assigning...' : 'Assign Target'}
                  </button>
                </form>
              </div>

              {/* Department & Role Workforce Charts */}
              <div className="space-y-4 rounded-2xl border p-4" style={CARD_STYLE}>
                <h3 className="text-xs uppercase font-bold tracking-widest border-b pb-2 flex items-center gap-2" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>
                  <FiPieChart className="text-sky-400" /> Workforce Distribution
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={deptChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {deptChartData.map((_, i) => <Cell key={`c-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SALES LEADERBOARD & PERFORMANCE MODULE
            ========================================================================= */}
        {(activeTab === 'ALL' || activeTab === 'SALES') && (
          <div className="border rounded-sm overflow-hidden space-y-4 p-5" style={CARD_STYLE}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
              <h3 className="text-xs uppercase font-bold tracking-widest flex items-center gap-2" style={LABEL_MONO}>
                <FiTrendingUp className="text-emerald-400" /> Executive Sales & Transport Leaderboard ({salesAndTransportLeaderboard.length} Executives)
              </h3>
              <span className="text-[10px] font-sans text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                Live Sales Revenue
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b text-[9px] uppercase font-sans" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)', color: 'var(--crm-ink-faint)' }}>
                    <th className="py-2.5 px-3">Sales Staff</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Revenue Achieved</th>
                    <th className="py-2.5 px-3">Won Deals</th>
                    <th className="py-2.5 px-3">Conversion %</th>
                    <th className="py-2.5 px-3">Rank</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y font-sans" style={{ borderColor: 'var(--crm-line)' }}>
                  {salesAndTransportLeaderboard.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-8 text-[var(--crm-ink-faint)]">No sales or transport leaderboard data recorded for selected period.</td></tr>
                  ) : (
                    salesAndTransportLeaderboard.map((item, idx) => {
                      const wonCount = item.wonDeals || item.dealsWon || 0;
                      const totalCount = item.totalLeads || 0;
                      let convPct = item.conversionRate !== undefined && item.conversionRate !== null && item.conversionRate > 0
                        ? item.conversionRate
                        : (totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : (wonCount > 0 ? 100 : 0));
                      if (convPct > 100) convPct = 100;

                      return (
                        <tr key={item._id || item.employeeId || idx} className="hover:bg-[var(--crm-bg-sunken)]/50">
                          <td className="py-3 px-3 font-bold text-[var(--crm-heading)]">{item.name || item.employeeName || item.fullName || 'Sales Executive'}</td>
                          <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-[8px] uppercase font-bold border border-cyan-800 bg-cyan-950 text-cyan-400">{item.department || 'SALES'}</span></td>
                          <td className="py-3 px-3 font-bold text-emerald-400">{fmtCurrency(item.revenue || item.totalRevenue || 0)}</td>
                          <td className="py-3 px-3 text-[var(--crm-heading)]">{wonCount} Deals</td>
                          <td className="py-3 px-3 font-bold text-pink-400">{convPct}%</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${idx === 0 ? 'bg-amber-950 border border-amber-800 text-amber-300' : 'bg-slate-900 border border-slate-700 text-slate-300'}`}>
                              #{idx + 1} {idx === 0 ? '🏆 TOP' : 'ACTIVE'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            RECRUITMENT & HIRING PIPELINE MODULE
            ========================================================================= */}
        {(activeTab === 'ALL' || activeTab === 'HIRING') && (
          <div className="border rounded-sm overflow-hidden space-y-4 p-5" style={CARD_STYLE}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
              <h3 className="text-xs uppercase font-bold tracking-widest flex items-center gap-2" style={LABEL_MONO}>
                <FiBriefcase className="text-amber-400" /> Active Job Postings ({jobs.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b text-[9px] uppercase font-sans" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)', color: 'var(--crm-ink-faint)' }}>
                    <th className="py-2.5 px-3">Job Position</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y font-sans" style={{ borderColor: 'var(--crm-line)' }}>
                  {jobs.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-6 text-[var(--crm-ink-faint)]">No active job postings found.</td></tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job._id} className="hover:bg-[var(--crm-bg-sunken)]/50">
                        <td className="py-2.5 px-3 font-bold text-[var(--crm-heading)]">{job.title}</td>
                        <td className="py-2.5 px-3 text-[10px] text-cyan-400">{job.department}</td>
                        <td className="py-2.5 px-3 text-[10px] text-[var(--crm-ink-soft)]">{job.jobType || 'Full-time'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${job.isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                            {job.isActive ? 'OPEN' : 'CLOSED'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            LIVE TRANSPORT RADAR MAP
            ========================================================================= */}
        {(activeTab === 'ALL' || activeTab === 'TRANSPORT') && (
          <FounderTransportWidget summary={summary} />
        )}

        {/* =========================================================================
            ALERTS & APPROVALS
            ========================================================================= */}
        {(activeTab === 'ALL' || activeTab === 'ALERTS') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScreenshotAlertsWidget />

            {/* Leave Approvals */}
            <div className="overflow-hidden rounded-2xl border" style={CARD_STYLE}>
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}>
                <h3 className="text-xs uppercase font-bold tracking-widest flex items-center gap-2" style={LABEL_MONO}>
                  <FiClock className="text-amber-400" /> Pending Leave Approvals ({leaves.length})
                </h3>
              </div>
              <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: 'var(--crm-line)' }}>
                {leaves.length === 0 ? (
                  <EmptyState title="No pending leave requests" description="All requests are processed." className="py-8" />
                ) : (
                  leaves.map((lv) => (
                    <div key={lv._id} className="p-4 flex items-center justify-between gap-3 bg-[var(--crm-bg-sunken)]">
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-[var(--crm-heading)]">{lv.employeeName || lv.employeeId?.fullName || 'Employee'}</div>
                        <div className="text-[10px] text-[var(--crm-ink-faint)] font-sans">
                          {new Date(lv.fromDate).toLocaleDateString()} – {new Date(lv.toDate).toLocaleDateString()} ({lv.numberOfDays} Days)
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button disabled={reviewingLeaveId === lv._id} onClick={() => handleLeaveDecision(lv._id, 'APPROVED')} className="px-2.5 py-1 text-[9px] font-sans uppercase rounded bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900">
                          Approve
                        </button>
                        <button disabled={reviewingLeaveId === lv._id} onClick={() => handleLeaveDecision(lv._id, 'REJECTED')} className="px-2.5 py-1 text-[9px] font-sans uppercase rounded bg-rose-950 text-rose-400 border border-rose-800 hover:bg-rose-900">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      <AnimatePresence>
        {showEmployeeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} className="w-full max-w-lg space-y-4 rounded-2xl border p-5 font-sans sm:p-6" style={CARD_STYLE}>
              <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
                <h3 className="text-sm uppercase font-bold font-sans text-[var(--crm-heading)]">
                  {editingEmployee ? 'Edit Staff Member' : 'Add New Employee'}
                </h3>
                <button onClick={() => setShowEmployeeModal(false)} className="text-[var(--crm-ink-faint)] hover:text-white">
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleEmployeeSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Full Name *</label>
                    <input required type="text" value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} className="w-full text-[10px] px-3 py-2 rounded-lg border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Email *</label>
                    <input required type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} className="w-full text-[10px] px-3 py-2 rounded-lg border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Phone</label>
                    <input type="text" value={employeeForm.phone} onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })} className="w-full text-[10px] px-3 py-2 rounded-lg border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Position</label>
                    <input type="text" value={employeeForm.position} onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })} className="w-full text-[10px] px-3 py-2 rounded-lg border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Department</label>
                    <select value={employeeForm.department} onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })} className="w-full text-[10px] px-2 py-2 rounded-lg border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                      {EMPLOYEE_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider mb-1" style={LABEL_MONO}>Role</label>
                    <select value={employeeForm.role} onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })} className="w-full text-[10px] px-2 py-2 rounded-lg border outline-none" style={{ ...CARD_SUNKEN, color: 'var(--crm-heading)' }}>
                      {EMPLOYEE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--crm-line)' }}>
                  <button type="button" onClick={() => setShowEmployeeModal(false)} className="px-4 py-2 text-[10px] font-sans uppercase rounded border border-[var(--crm-line)] text-[var(--crm-heading)]">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-[10px] font-sans uppercase font-bold rounded" style={{ background: 'var(--crm-accent)', color: 'var(--crm-bg)' }}>
                    Save Staff
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HR Action Letter Modals (Warning, Termination, PIP) */}
      {letterModal.open && letterModal.type === 'WARNING' && (
        <WarningLetterModal
          isOpen={true}
          onClose={() => setLetterModal({ open: false, type: null, employee: null })}
          employee={letterModal.employee}
          allEmployees={employees}
        />
      )}

      {letterModal.open && letterModal.type === 'TERMINATION' && (
        <TerminationLetterModal
          isOpen={true}
          onClose={() => setLetterModal({ open: false, type: null, employee: null })}
          employee={letterModal.employee}
          allEmployees={employees}
        />
      )}

      {letterModal.open && letterModal.type === 'PI' && (
        <PiLetterModal
          isOpen={true}
          onClose={() => setLetterModal({ open: false, type: null, employee: null })}
          employee={letterModal.employee}
          allEmployees={employees}
        />
      )}

      {letterModal.open && letterModal.type === 'EXPERIENCE' && (
        <ExperienceLetterModal
          isOpen={true}
          onClose={() => setLetterModal({ open: false, type: null, employee: null })}
          employee={letterModal.employee}
          allEmployees={employees}
        />
      )}
    </motion.div>
  );
}
