import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminApi } from '../../api/admin';
import { dashboardApi } from '../../api/dashboard';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../hooks/useAuth';
import { FiUsers, FiAlertCircle, FiFileText, FiCheckSquare, FiClock, FiActivity, FiBell, FiArrowRight, FiTruck, FiTrendingUp, FiUserCheck, FiLifeBuoy, FiAward, FiDownload, FiCalendar, FiMessageSquare } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SkeletonStatGrid, SkeletonChartCard, SkeletonListCard } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { DownloadButton } from '../../components/ui/AnimatedActionButton';
import EmployeeDashboard from './EmployeeDashboard';
import SalesExecutiveDashboard from './SalesExecutiveDashboard';
import SalesManagerDashboard from './SalesManagerDashboard';
import HrManagerDashboard from './HrManagerDashboard';
import HrExecutiveDashboard from './HrExecutiveDashboard';
import FinanceManagerDashboard from './FinanceManagerDashboard';
import FounderDashboard from './FounderDashboard';
import CEODashboard from './CEODashboard';
import TransportManager from './transport/TransportManager';
import TransportExecutive from './transport/TransportExecutive';
import DriverMobileView from './transport/DriverMobileView';

// Staggered layout entry configurations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const blockVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 100, damping: 18, mass: 1 }
  }
};

const CARD = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)', boxShadow: 'var(--crm-shadow)' };
const CARD_SUNKEN = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' };
const LABEL_MONO = { fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' };
const HEADING = { fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' };

export default function Dashboard() {
  const { user } = useAuth();
  const [adminViewMode, setAdminViewMode] = useState('COMPANY'); // 'COMPANY', 'MANAGER', 'EXECUTIVE'
  const [summary, setSummary] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [history, setHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateRangeOption, setDateRangeOption] = useState('LAST_6');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  useEffect(() => { fetchDashboardData(); }, [user]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && dateRangeOption !== 'CUSTOM') {
      refetchSummary(getDateRangeParams(dateRangeOption));
    }
  }, [dateRangeOption, user]);

  const formatDate = (d) => d.toISOString().slice(0, 10);

  const getDateRangeParams = (option) => {
    const now = new Date();
    if (option === 'THIS_MONTH') {
      return { startDate: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: formatDate(now) };
    }
    if (option === 'LAST_3') {
      return { startDate: formatDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)), endDate: formatDate(now) };
    }
    if (option === 'CUSTOM') {
      if (!customStart || !customEnd) return null;
      return { startDate: customStart, endDate: customEnd };
    }
    return {};
  };

  const refetchSummary = async (params) => {
    if (!params) return;
    try {
      const summaryRes = await adminApi.getDashboardSummary(params);
      if (summaryRes.success) setSummary(summaryRes.data.summary);
    } catch (error) {
      console.error(error);
    }
  };

  const handleApplyCustomRange = () => {
    refetchSummary(getDateRangeParams('CUSTOM'));
  };

  const handleExportReport = () => {
    if (!summary) throw new Error('no_summary');
    const rows = [
      ['Metric', 'Value'],
      ['Total Employees', summary.totalEmployees || 0],
      ['Active Employees', summary.activeEmployees || 0],
      ['Present Today', summary.presentToday || 0],
      ['Open Tickets', summary.openTickets || 0],
      ['Pending Leave Requests', summary.pendingLeaveRequests || 0],
      ['Active Leads', summary.activeLeads || 0],
      ['Pending Leads', summary.pendingLeads || 0],
      ['Quotations Sent', summary.quotations?.sent || 0],
      ['Orders Confirmed', summary.ordersConfirmed || 0],
      ['Pending Orders', summary.pendingOrders || 0],
      ['Total Revenue Collected', summary.revenue?.totalCollected || 0],
      ['Pending Payments Value', summary.payments?.pendingValue || 0],
      []
    ];

    rows.push(['Department Performance']);
    rows.push(['Department', 'Total Leads', 'Won']);
    (summary.departmentPerformance || []).forEach((d) => rows.push([d.department, d.totalLeads, d.won]));
    rows.push([]);

    rows.push(['Top Performing Employees']);
    rows.push(['Name', 'Total Leads', 'Conversions']);
    (summary.topEmployees || []).forEach((e) => rows.push([e.fullName, e.totalLeads, e.conversions]));
    rows.push([]);

    rows.push(['Monthly Revenue Trend']);
    rows.push(['Month', 'Collected']);
    (summary.revenue?.monthlyTrend || []).forEach((m) => rows.push([m.month, m.collected]));

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dashboard-report-${formatDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      const [notificationsRes] = await Promise.all([notificationsApi.getNotifications()]);
      if (notificationsRes.success) {
        setNotifications(notificationsRes.data.notifications);
        setUnreadCount(notificationsRes.data.notifications.filter((item) => !item.isRead).length);
      }
      const isAdminUser =
        user?.role === 'ADMIN' ||
        user?.department === 'ADMIN' ||
        (user?.position && user.position.toLowerCase().includes('admin'));

      if (isAdminUser) {
        const [summaryRes, pipelineRes, performanceRes] = await Promise.all([
          adminApi.getDashboardSummary(), adminApi.getPipeline(), adminApi.getEmployeePerformance()
        ]);
        if (summaryRes.success) setSummary(summaryRes.data.summary);
        if (pipelineRes.success) setPipeline(pipelineRes.data.pipeline);
        if (performanceRes.success) setPerformance(performanceRes.data.performance);
      } else {
        const [summaryRes, historyRes] = await Promise.all([
          dashboardApi.getDashboardSummary(), dashboardApi.getHistory()
        ]);
        if (summaryRes.success) setSummary(summaryRes.data.summary);
        if (historyRes.success) setHistory(historyRes.data.activities);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin =
    user?.role === 'ADMIN' ||
    user?.department === 'ADMIN' ||
    (user?.position && user.position.toLowerCase().includes('admin'));
  const fmtCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;

  if (loading) {
    return (
      <div className="w-full space-y-8">
        <div className="w-full border-b py-6" style={{ borderColor: 'var(--crm-line)' }}>
          <div className="crm-skeleton h-3 w-56 rounded-sm mb-3" style={{ background: 'var(--crm-bg-sunken)' }} />
          <div className="crm-skeleton h-7 w-72 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
        </div>
        <SkeletonStatGrid count={isAdmin ? 8 : 5} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SkeletonChartCard />
          <SkeletonListCard />
        </div>
      </div>
    );
  }

  const dept = user?.department || '';
  const role = user?.role || '';
  const pos = user?.position?.toLowerCase() || '';

  const isCEO = role === 'CEO' || pos.includes('chief executive') || pos === 'ceo' || user?.email?.toLowerCase()?.startsWith('ceo@');
  const isFounder = !isCEO && (role === 'FOUNDER' || role === 'CO_FOUNDER' || pos.includes('founder') || user?.email?.toLowerCase()?.startsWith('founder@'));

  if (isFounder) {
    return <FounderDashboard />;
  }

  if (isCEO) {
    return <CEODashboard />;
  }

  // 1. Transport Department Routing
  const isTransportDept = (dept === 'TRANSPORT' || dept === 'LOGISTICS' || role === 'TRANSPORT' || role === 'LOGISTICS' || role === 'DRIVER') && !isAdmin;
  const isTransportManager = isTransportDept && (role === 'MANAGER' || role === 'TRANSPORT_MANAGER' || role === 'LOGISTICS_MANAGER' || pos.includes('manager'));
  const isDriver = isTransportDept && (role === 'DRIVER' || pos.includes('driver'));
  const isTransportExecutive = isTransportDept && !isTransportManager && !isDriver;

  if (isTransportManager) {
    return <TransportManager />;
  }

  if (isDriver) {
    return <DriverMobileView />;
  }

  if (isTransportExecutive) {
    return <TransportExecutive />;
  }

  // 2. Sales Department Routing
  const isSalesDept = (dept === 'SALES' || role === 'SALES' || role === 'SALES_MANAGER' || role === 'SALES_EXECUTIVE') && !isAdmin;
  const isSalesManager = isSalesDept && (role === 'MANAGER' || role === 'SALES_MANAGER' || pos.includes('manager'));
  const isSalesExecutive = isSalesDept && !isSalesManager;

  if (isSalesManager) {
    return <SalesManagerDashboard />;
  }

  if (isSalesExecutive) {
    return <SalesExecutiveDashboard />;
  }

  // 3. HR Department Routing
  const isHrDept = (dept === 'HR' || role === 'HR' || role === 'HR_MANAGER' || role === 'HR_EXECUTIVE') && !isAdmin;
  const isHrManager = isHrDept && (role === 'MANAGER' || role === 'HR_MANAGER' || pos.includes('manager'));
  const isHrExecutive = isHrDept && !isHrManager;

  if (isHrManager) {
    return <HrManagerDashboard />;
  }

  if (isHrExecutive) {
    return <HrExecutiveDashboard />;
  }

  // 4. Finance Department Routing
  const isFinanceDept = (dept === 'FINANCE' || dept === 'ACCOUNTS' || role === 'FINANCE' || role === 'ACCOUNTS' || role === 'FINANCE_MANAGER' || role === 'FINANCE_EXECUTIVE') && !isAdmin;
  if (isFinanceDept) {
    return <FinanceManagerDashboard />;
  }

  if (role === 'EMPLOYEE' && !isAdmin) {
    return <EmployeeDashboard />;
  }

  if (isAdmin && adminViewMode === 'MANAGER') {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white border border-slate-200 px-6 py-3 rounded-lg shadow-sm font-mono text-[9px] text-slate-500">
          <span>Viewing as: <strong className="text-teal-700">SALES MANAGER</strong> (Admin bypass mode)</span>
          <button 
            onClick={() => setAdminViewMode('COMPANY')}
            className="text-slate-600 hover:text-slate-800 font-bold uppercase underline tracking-wider cursor-pointer bg-transparent border-none"
          >
            Back to Company Summary
          </button>
        </div>
        <SalesManagerDashboard />
      </div>
    );
  }

  if (isAdmin && adminViewMode === 'EXECUTIVE') {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white border border-slate-200 px-6 py-3 rounded-lg shadow-sm font-mono text-[9px] text-slate-500">
          <span>Viewing as: <strong className="text-teal-700">SALES EXECUTIVE</strong> (Admin bypass mode)</span>
          <button 
            onClick={() => setAdminViewMode('COMPANY')}
            className="text-slate-600 hover:text-slate-800 font-bold uppercase underline tracking-wider cursor-pointer bg-transparent border-none"
          >
            Back to Company Summary
          </button>
        </div>
        <SalesExecutiveDashboard />
      </div>
    );
  }

  if (isAdmin && adminViewMode === 'FINANCE_MANAGER') {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] px-6 py-3 rounded-lg shadow-sm font-mono text-[9px] text-[var(--crm-ink-soft)]">
          <span>Viewing as: <strong className="text-teal-400">FINANCE MANAGER</strong> (Admin bypass mode)</span>
          <button 
            onClick={() => setAdminViewMode('COMPANY')}
            className="text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)] font-bold uppercase underline tracking-wider cursor-pointer bg-transparent border-none"
          >
            Back to Company Summary
          </button>
        </div>
        <FinanceManagerDashboard />
      </div>
    );
  }


  if (isAdmin && adminViewMode === 'HR_MANAGER') {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] px-6 py-3 rounded-lg shadow-sm font-mono text-[9px] text-[var(--crm-ink-soft)]">
          <span>Viewing as: <strong className="text-teal-400">HR MANAGER</strong> (Admin bypass mode)</span>
          <button 
            onClick={() => setAdminViewMode('COMPANY')}
            className="text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)] font-bold uppercase underline tracking-wider cursor-pointer bg-transparent border-none"
          >
            Back to Company Summary
          </button>
        </div>
        <HrManagerDashboard />
      </div>
    );
  }

  if (isAdmin && adminViewMode === 'HR_EXECUTIVE') {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] px-6 py-3 rounded-lg shadow-sm font-mono text-[9px] text-[var(--crm-ink-soft)]">
          <span>Viewing as: <strong className="text-teal-400">HR EXECUTIVE</strong> (Admin bypass mode)</span>
          <button 
            onClick={() => setAdminViewMode('COMPANY')}
            className="text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)] font-bold uppercase underline tracking-wider cursor-pointer bg-transparent border-none"
          >
            Back to Company Summary
          </button>
        </div>
        <HrExecutiveDashboard />
      </div>
    );
  }

  const stats = isAdmin ? [
    { title: 'Total Employees', value: summary?.totalEmployees || 0, icon: FiUsers, tone: 'ink' },
    { title: 'Active Leads', value: summary?.activeLeads || 0, icon: FiActivity, tone: 'info' },
    { title: 'Completed & Delivered', value: summary?.completedLeads || 0, icon: FiCheckSquare, tone: 'positive' },
    { title: 'Payment Received', value: fmtCurrency(summary?.revenue?.totalCollected || 0), icon: FiTrendingUp, tone: 'positive' },
    { title: 'Quotations Sent', value: summary?.quotations?.sent || 0, icon: FiFileText, tone: 'ink' },
    { title: 'Orders Confirmed', value: summary?.ordersConfirmed || 0, icon: FiCheckSquare, tone: 'positive' },
    { title: 'Total Conversion %', value: `${(summary?.quotations?.sent || 0) > 0 ? Math.round(((summary?.ordersConfirmed || 0) / (summary?.quotations?.sent || 1)) * 100) : 0}%`, icon: FiTrendingUp, tone: 'positive' },
    { title: 'Pending Payments', value: fmtCurrency(summary?.payments?.pendingOrdersValue || summary?.payments?.pendingValue || 0), icon: FiAlertCircle, tone: 'danger' }
  ] : [
    { title: 'Assigned Pipeline Leads', value: summary?.totalLeads || 0, icon: FiUsers, tone: 'ink' },
    { title: 'Active Logistics Routing', value: summary?.activeLeads || 0, icon: FiTruck, tone: 'accent' },
    { title: 'Pending Quotations', value: summary?.pendingQuotations || 0, icon: FiFileText, tone: 'ink' },
    { title: 'Concluded Transactions', value: summary?.completedTasks || 0, icon: FiCheckSquare, tone: 'positive' },
    { title: 'Unread Node Alerts', value: unreadCount, icon: FiBell, tone: 'warning' }
  ];

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

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full m-0 p-0 block space-y-6"
    >
      {/* Page Header Content Row */}
      <motion.div variants={blockVariants} className="w-full border-b pb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4" style={{ borderColor: 'var(--crm-line)' }}>
        <div className="space-y-1 text-left">
          <span className="text-[10px] uppercase tracking-[0.25em] font-extrabold font-mono text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-md inline-block">
            Internal Operations Suite
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[var(--crm-heading)] font-sans flex items-center gap-2 mt-1">
            Global Ledger Base
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto font-sans">
          <Link
            to="/crm/manager-chat"
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 text-[10px] uppercase font-extrabold tracking-wider rounded-xl transition shadow-xs cursor-pointer"
          >
            <FiMessageSquare size={14} /> <span>Executive Chat</span>
          </Link>
          {isAdmin && (
            <div className="flex items-center gap-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-1.5 rounded-xl text-[10px] uppercase font-extrabold tracking-wider shadow-xs">
              <span className="text-[var(--crm-ink-faint)] font-mono">View Role:</span>
              <select
                value={adminViewMode}
                onChange={(e) => setAdminViewMode(e.target.value)}
                className="bg-transparent border-none outline-none font-extrabold text-teal-400 cursor-pointer text-xs"
              >
                <option value="COMPANY" className="bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)]">Admin (Company)</option>
                <option value="MANAGER" className="bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)]">Sales Manager</option>
                <option value="EXECUTIVE" className="bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)]">Sales Executive</option>
                <option value="HR_MANAGER" className="bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)]">HR Manager</option>
                <option value="HR_EXECUTIVE" className="bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)]">HR Executive</option>
                <option value="FINANCE_MANAGER" className="bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)]">Finance Department</option>
              </select>
            </div>
          )}
          {isAdmin && (
            <DownloadButton
              action={handleExportReport}
              className="text-[10px] border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] hover:bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] px-3 py-2 uppercase font-extrabold tracking-wider rounded-xl transition-all cursor-pointer shadow-xs"
              icon={FiDownload}
              iconSize={13}
              idleLabel="Export Report"
              busyLabel="Exporting..."
              doneLabel="Exported"
            />
          )}
        </div>
      </motion.div>

      {/* Grid Stats Block View */}
      <div className="w-full py-4 space-y-6">
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              variants={blockVariants}
              whileHover={{ y: -3 }}
              className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] p-5 rounded-2xl transition-all duration-300 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-teal-500/30 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] uppercase font-mono font-extrabold tracking-wider text-[var(--crm-ink-faint)]">{stat.title}</span>
                <div
                  className="p-2.5 border rounded-xl transition-transform duration-300 shadow-2xs"
                  style={{ borderColor: 'var(--crm-line)', color: toneColor(stat.tone), background: toneBg(stat.tone) }}
                >
                  <stat.icon size={15} />
                </div>
              </div>
              <div className="flex items-end justify-between mt-4">
                <span className="text-2xl sm:text-3xl font-black tracking-tight whitespace-nowrap text-[var(--crm-heading)] font-mono">{stat.value}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Analytical Interface Charts Layer */}
        <motion.div variants={blockVariants} className="w-full overflow-hidden">
          {isAdmin ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Chart Block 1: Lead Pipeline Manifest */}
              <div className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] p-5.5 rounded-2xl w-full overflow-hidden text-left shadow-xs hover:shadow-md transition-all">
                <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-3 mb-4">
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-[var(--crm-heading)] font-sans flex items-center gap-2">
                    <FiActivity className="text-sky-400" size={15} /> Lead Pipeline Manifest
                  </h3>
                  <span className="text-[9px] font-mono text-[var(--crm-ink-faint)] font-bold">Stage Breakdown</span>
                </div>
                {pipeline.length === 0 ? (
                  <EmptyState title="No pipeline data yet" description="Leads will appear here once routed." />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={pipeline} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-line)" opacity={0.3} vertical={false} />
                      <XAxis dataKey="_id" stroke="var(--crm-ink-faint)" opacity={0.9} fontSize={10} tickLine={false} />
                      <YAxis stroke="var(--crm-ink-faint)" opacity={0.9} fontSize={10} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'var(--crm-bg-sunken)', opacity: 0.5 }} 
                        contentStyle={{ backgroundColor: '#0a192f', borderColor: '#1e3a5f', borderRadius: '8px', textTransform: 'uppercase', fontSize: '11px', color: '#e2e8f0', fontFamily: 'var(--crm-font-mono)' }} 
                      />
                      <Bar dataKey="total" fill="#38bdf8" name="Total Leads" maxBarSize={28} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Chart Block 2: Employee Performance Matrix */}
              <div className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] p-5.5 rounded-2xl w-full overflow-hidden text-left shadow-xs hover:shadow-md transition-all">
                <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-3 mb-4">
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-[var(--crm-heading)] font-sans flex items-center gap-2">
                    <FiAward className="text-emerald-400" size={15} /> Employee Performance Matrix
                  </h3>
                  <span className="text-[9px] font-mono text-[var(--crm-ink-faint)] font-bold">Leads vs Won Conversions</span>
                </div>
                {performance.length === 0 ? (
                  <EmptyState title="No performance data yet" description="Employee conversions will appear here." />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={performance} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-line)" opacity={0.3} vertical={false} />
                      <XAxis dataKey="name" stroke="var(--crm-ink-faint)" opacity={0.9} fontSize={10} tickLine={false} />
                      <YAxis stroke="var(--crm-ink-faint)" opacity={0.9} fontSize={10} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'var(--crm-bg-sunken)', opacity: 0.5 }} 
                        contentStyle={{ backgroundColor: '#0a192f', borderColor: '#1e3a5f', borderRadius: '8px', textTransform: 'uppercase', fontSize: '11px', color: '#e2e8f0', fontFamily: 'var(--crm-font-mono)' }} 
                      />
                      <Legend 
                        formatter={(value) => <span className="text-[10px] uppercase font-bold text-[var(--crm-heading)] font-mono">{value === 'leads' ? 'Total Leads' : 'Won Deals'}</span>}
                      />
                      <Bar dataKey="leads" fill="#38bdf8" name="leads" maxBarSize={24} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="won" fill="#10b981" name="won" maxBarSize={24} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Employee Log Framework */}
              <div className="lg:col-span-8 border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] p-5.5 rounded-2xl text-left shadow-xs">
                <h3 className="text-xs uppercase font-extrabold tracking-wider mb-4 border-b border-[var(--crm-line)] pb-3 text-[var(--crm-heading)] font-sans">Personal Operational Audit</h3>
                {history.length === 0 ? (
                  <EmptyState title="No activity yet" description="Your recent actions will show up here." />
                ) : (
                  <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                    {history.map((act) => (
                      <motion.div
                        key={act._id}
                        whileHover={{ x: 2 }}
                        className="text-xs py-2.5 border-b border-[var(--crm-line)] flex justify-between items-center gap-4 px-2 transition-colors duration-150 rounded-lg"
                      >
                        <span className="font-medium text-[var(--crm-heading)]">{act.actionType}</span>
                        <span className="opacity-70 text-[10px] font-mono tracking-wider px-2 py-0.5 border border-[var(--crm-line)] rounded-md bg-[var(--crm-bg-sunken)]">{new Date(act.createdAt).toLocaleDateString()}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Conversion Statistics Tracker */}
              <div className="lg:col-span-4 border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] p-5.5 rounded-2xl text-left flex flex-col justify-between gap-4 shadow-xs">
                <h3 className="text-xs uppercase font-extrabold tracking-wider border-b border-[var(--crm-line)] pb-3 text-[var(--crm-heading)] font-sans">Conversion Performance</h3>
                <div className="space-y-3 flex-1 flex flex-col justify-center font-mono">
                  <motion.div whileHover={{ scale: 1.01 }} className="p-3.5 border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-xs flex justify-between items-center rounded-xl shadow-2xs">
                    <span className="uppercase text-[10px] tracking-wider text-[var(--crm-ink-faint)] font-bold">Total Leads Linked:</span>
                    <strong className="text-sm font-black text-[var(--crm-heading)]">{summary?.totalLeads || 0}</strong>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.01 }} className="p-3.5 border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-xs flex justify-between items-center rounded-xl shadow-2xs">
                    <span className="uppercase text-[10px] tracking-wider text-[var(--crm-ink-faint)] font-bold">Concluded Batches:</span>
                    <strong className="text-sm font-black text-emerald-400">{summary?.completedTasks || 0}</strong>
                  </motion.div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {isAdmin && (
          <motion.div variants={blockVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Monthly Revenue Trend */}
            <div className="lg:col-span-2 border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] p-5.5 rounded-2xl w-full overflow-hidden text-left shadow-xs hover:shadow-md transition-all">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-[var(--crm-line)] pb-3">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-[var(--crm-heading)] font-sans flex items-center gap-2">
                  <FiTrendingUp className="text-emerald-400" size={15} /> Monthly Sales / Revenue Collected
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <FiCalendar size={13} className="text-[var(--crm-ink-faint)]" />
                  <select
                    value={dateRangeOption}
                    onChange={(e) => setDateRangeOption(e.target.value)}
                    className="text-[10px] uppercase font-extrabold tracking-wider border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] rounded-xl px-3 py-1.5 outline-none cursor-pointer font-sans"
                  >
                    <option value="THIS_MONTH">This Month</option>
                    <option value="LAST_3">Last 3 Months</option>
                    <option value="LAST_6">Last 6 Months</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                  {dateRangeOption === 'CUSTOM' && (
                    <>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="text-[10px] border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] rounded-xl px-2 py-1 outline-none font-mono"
                      />
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="text-[10px] border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] rounded-xl px-2 py-1 outline-none font-mono"
                      />
                      <button
                        onClick={handleApplyCustomRange}
                        className="text-[10px] uppercase font-extrabold tracking-wider border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] px-3 py-1 rounded-xl transition cursor-pointer"
                      >
                        Apply
                      </button>
                    </>
                  )}
                </div>
              </div>
              {(summary?.revenue?.monthlyTrend || []).length === 0 ? (
                <EmptyState title="No revenue data yet" description="Collected revenue will chart here as payments come in." />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={summary?.revenue?.monthlyTrend || []} margin={{ left: -10, right: 10, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-line)" opacity={0.3} vertical={false} />
                    <XAxis dataKey="month" stroke="var(--crm-ink-faint)" opacity={0.9} fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--crm-ink-faint)" opacity={0.9} fontSize={10} tickLine={false} />
                    <Tooltip cursor={{ fill: 'var(--crm-bg-sunken)', opacity: 0.5 }} contentStyle={{ backgroundColor: '#0a192f', borderColor: '#1e3a5f', borderRadius: '8px', textTransform: 'uppercase', fontSize: '11px', color: '#e2e8f0', fontFamily: 'var(--crm-font-mono)' }} formatter={(val) => fmtCurrency(val)} />
                    <Bar dataKey="collected" fill="#10b981" name="Revenue Collected" maxBarSize={32} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Follow-Ups */}
            <div className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] p-5.5 rounded-2xl text-left flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition-all">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-[var(--crm-heading)] font-sans border-b border-[var(--crm-line)] pb-3 flex items-center gap-2">
                <FiClock className="text-amber-400" size={15} /> Follow-Ups
              </h3>
              <div className="space-y-3 my-auto">
                <div className="p-4 border rounded-xl flex justify-between items-center bg-amber-500/10 border-amber-500/20 shadow-2xs">
                  <span className="uppercase tracking-wider text-[10px] font-mono font-extrabold text-amber-400">Due Today</span>
                  <strong className="text-2xl font-black font-mono text-amber-400">{summary?.followUpsDueToday || 0}</strong>
                </div>
                <div className="p-4 border rounded-xl flex justify-between items-center bg-rose-500/10 border-rose-500/20 shadow-2xs">
                  <span className="uppercase tracking-wider text-[10px] font-mono font-extrabold text-rose-400">Missed / Overdue</span>
                  <strong className="text-2xl font-black font-mono text-rose-400">{summary?.missedFollowUps || 0}</strong>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isAdmin && (
          <motion.div variants={blockVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Transport Running Status */}
            <div className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] p-5.5 rounded-2xl text-left shadow-xs">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-[var(--crm-heading)] font-sans mb-4 border-b border-[var(--crm-line)] pb-3 flex items-center gap-2">
                <FiTruck className="text-sky-400" size={15} /> Transport Running Status
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 border rounded-xl bg-sky-500/10 border-sky-500/20">
                  <p className="text-[9px] uppercase tracking-wider font-extrabold font-mono text-sky-400">In Transit</p>
                  <p className="text-2xl font-black mt-1 font-mono text-[var(--crm-heading)]">{summary?.transport?.inTransit || 0}</p>
                </div>
                <div className="p-3.5 border rounded-xl bg-emerald-500/10 border-emerald-500/20">
                  <p className="text-[9px] uppercase tracking-wider font-extrabold font-mono text-emerald-400">Delivered</p>
                  <p className="text-2xl font-black mt-1 font-mono text-[var(--crm-heading)]">{summary?.transport?.delivered || 0}</p>
                </div>
                <div className="p-3.5 border rounded-xl bg-amber-500/10 border-amber-500/20">
                  <p className="text-[9px] uppercase tracking-wider font-extrabold font-mono text-amber-400">Pending</p>
                  <p className="text-2xl font-black mt-1 font-mono text-[var(--crm-heading)]">{summary?.transport?.pending || 0}</p>
                </div>
                <div className="p-3.5 border rounded-xl bg-rose-500/10 border-rose-500/20">
                  <p className="text-[9px] uppercase tracking-wider font-extrabold font-mono text-rose-400">Issue Raised</p>
                  <p className="text-2xl font-black mt-1 font-mono text-[var(--crm-heading)]">{summary?.transport?.issueRaised || 0}</p>
                </div>
              </div>
            </div>

            {/* Top Performing Employees */}
            <div className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] p-5.5 rounded-2xl text-left shadow-xs">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-[var(--crm-heading)] font-sans mb-4 border-b border-[var(--crm-line)] pb-3 flex items-center gap-2">
                <FiAward className="text-amber-400" size={15} /> Top Performing Employees
              </h3>
              {(summary?.topEmployees || []).length === 0 ? (
                <EmptyState title="No conversions yet" />
              ) : (
                <div className="space-y-2">
                  {summary.topEmployees.map((emp, idx) => (
                    <div key={emp._id} className="flex items-center justify-between text-xs py-2 border-b border-[var(--crm-line)] last:border-0">
                      <span className="font-medium text-[var(--crm-heading)]">{idx + 1}. {emp.fullName}</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">{emp.conversions}/{emp.totalLeads} won</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Department Performance */}
            <div className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] p-5.5 rounded-2xl text-left shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-4 border-b border-[var(--crm-line)] pb-3">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-[var(--crm-heading)] font-sans">Department Performance</h3>
                {(summary?.departmentPerformance || []).length > 0 && (
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="text-[9px] uppercase font-extrabold tracking-wider border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] rounded-xl px-2.5 py-1 outline-none cursor-pointer font-sans"
                  >
                    <option value="ALL">All</option>
                    {summary.departmentPerformance.map((d) => (
                      <option key={d.department} value={d.department}>{d.department}</option>
                    ))}
                  </select>
                )}
              </div>
              {(summary?.departmentPerformance || []).length === 0 ? (
                <EmptyState title="No routed leads yet" />
              ) : (
                <div className="space-y-2">
                  {summary.departmentPerformance
                    .filter((dept) => deptFilter === 'ALL' || dept.department === deptFilter)
                    .map((dept) => (
                    <div key={dept.department} className="flex items-center justify-between text-xs py-2 border-b border-[var(--crm-line)] last:border-0">
                      <span className="uppercase tracking-wider text-[10px] font-mono font-bold text-[var(--crm-heading)]">{dept.department}</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">{dept.won}/{dept.totalLeads} won</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {isAdmin && (
          <motion.div variants={blockVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Link to="/crm/attendance" className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] hover:border-teal-500/40 p-5.5 rounded-2xl text-left transition-all flex items-center justify-between group shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-mono font-extrabold tracking-wider text-[var(--crm-ink-faint)] flex items-center gap-1.5"><FiUserCheck size={14} className="text-emerald-400" /> Employees Present Today</span>
                <p className="text-2xl font-black tracking-tight mt-2 font-mono text-[var(--crm-heading)]">{summary?.presentToday || 0} <span className="text-xs font-normal text-[var(--crm-ink-faint)]">/ {summary?.totalEmployees || 0}</span></p>
              </div>
              <FiArrowRight size={18} className="transition-transform group-hover:translate-x-1 text-[var(--crm-ink-faint)] group-hover:text-emerald-400" />
            </Link>
            <Link to="/crm/tickets" className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] hover:border-sky-500/40 p-5.5 rounded-2xl text-left transition-all flex items-center justify-between group shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-mono font-extrabold tracking-wider text-[var(--crm-ink-faint)] flex items-center gap-1.5"><FiLifeBuoy size={14} className="text-sky-400" /> Open Support Tickets</span>
                <p className="text-2xl font-black tracking-tight mt-2 font-mono text-[var(--crm-heading)]">{summary?.openTickets || 0}</p>
              </div>
              <FiArrowRight size={18} className="transition-transform group-hover:translate-x-1 text-[var(--crm-ink-faint)] group-hover:text-sky-400" />
            </Link>
            <Link to="/crm/leave" className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] hover:border-purple-500/40 p-5.5 rounded-2xl text-left transition-all flex items-center justify-between group shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-mono font-extrabold tracking-wider text-[var(--crm-ink-faint)] flex items-center gap-1.5"><FiCalendar size={14} className="text-purple-400" /> Pending Leave Approvals</span>
                <p className="text-2xl font-black tracking-tight mt-2 font-mono text-[var(--crm-heading)]">{summary?.pendingLeaveRequests || 0}</p>
              </div>
              <FiArrowRight size={18} className="transition-transform group-hover:translate-x-1 text-[var(--crm-ink-faint)] group-hover:text-purple-400" />
            </Link>
          </motion.div>
        )}

        {/* Grid Distribution System Summary */}
        <motion.div variants={blockVariants} className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] p-5.5 rounded-2xl text-left shadow-xs">
          <h3 className="text-xs uppercase font-extrabold tracking-wider mb-5 border-b border-[var(--crm-line)] pb-3 text-[var(--crm-heading)] font-sans">Lead Segment Distribution Matrix</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 font-mono">
            {summary?.stageCounts && Object.entries(summary.stageCounts).map(([stage, count]) => (
              <motion.div
                key={stage}
                whileHover={{ scale: 1.02 }}
                className="p-4 border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-left rounded-xl transition-colors cursor-default shadow-2xs"
              >
                <p className="text-[9px] uppercase tracking-wider font-extrabold text-[var(--crm-ink-faint)] truncate font-sans">{stage.replace(/_/g, ' ')}</p>
                <p className="text-2xl font-black mt-1.5 text-[var(--crm-heading)]">{count}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
