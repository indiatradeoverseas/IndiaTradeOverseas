import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminApi } from '../../api/admin';
import { dashboardApi } from '../../api/dashboard';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../hooks/useAuth';
import { FiUsers, FiAlertCircle, FiFileText, FiCheckSquare, FiClock, FiActivity, FiBell, FiArrowRight, FiTruck, FiTrendingUp, FiUserCheck, FiLifeBuoy, FiAward, FiDownload, FiCalendar } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SkeletonStatGrid, SkeletonChartCard, SkeletonListCard } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { DownloadButton } from '../../components/ui/AnimatedActionButton';
import EmployeeDashboard from './EmployeeDashboard';
import SalesExecutiveDashboard from './SalesExecutiveDashboard';
import SalesManagerDashboard from './SalesManagerDashboard';
import HrManagerDashboard from './HrManagerDashboard';
import HrExecutiveDashboard from './HrExecutiveDashboard';

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

  const isSalesExecutive = user?.role === 'SALES' || user?.role === 'SALES_EXECUTIVE' || (user?.department === 'SALES' && !user?.position?.toLowerCase()?.includes('manager') && !isAdmin);
  const isSalesManager = user?.role === 'MANAGER' || user?.role === 'SALES_MANAGER' || (user?.department === 'SALES' && user?.position?.toLowerCase()?.includes('manager') && !isAdmin);

  if (isSalesExecutive) {
    return <SalesExecutiveDashboard />;
  }

  if (isSalesManager) {
    return <SalesManagerDashboard />;
  }

  if (user?.role === 'HR_MANAGER' && !isAdmin) {
    return <HrManagerDashboard />;
  }

  if ((user?.role === 'HR_EXECUTIVE' || user?.role === 'HR') && !isAdmin) {
    return <HrExecutiveDashboard />;
  }

  if (user?.role === 'EMPLOYEE' && !isAdmin) {
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

  const stats = isAdmin ? [
    { title: 'Total Employees', value: summary?.totalEmployees || 0, icon: FiUsers, tone: 'ink' },
    { title: 'Active Leads', value: summary?.activeLeads || 0, icon: FiActivity, tone: 'info' },
    { title: 'Pending Leads', value: summary?.pendingLeads || 0, icon: FiAlertCircle, tone: 'warning' },
    { title: 'Quotations Sent', value: summary?.quotations?.sent || 0, icon: FiFileText, tone: 'ink' },
    { title: 'Orders Confirmed', value: summary?.ordersConfirmed || 0, icon: FiCheckSquare, tone: 'positive' },
    { title: 'Pending Orders', value: summary?.pendingOrders || 0, icon: FiClock, tone: 'warning' },
    { title: 'Total Revenue', value: fmtCurrency(summary?.revenue?.totalCollected), icon: FiTrendingUp, tone: 'positive' },
    { title: 'Pending Payments', value: fmtCurrency(summary?.payments?.pendingValue), icon: FiAlertCircle, tone: 'danger' }
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
      className="w-full m-0 p-0 block"
    >
      {/* Page Header Content Row */}
      <motion.div variants={blockVariants} className="w-full border-b py-6 flex flex-col md:flex-row md:items-end justify-between gap-4" style={{ borderColor: 'var(--crm-line)' }}>
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] font-bold block" style={LABEL_MONO}>Internal Operations Suite</span>
          <h1 className="text-2xl sm:text-3xl font-normal tracking-tight uppercase" style={HEADING}>Global Ledger Base</h1>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          {isAdmin && (
            <DownloadButton
              action={handleExportReport}
              className="text-[10px] border px-3 py-1.5 uppercase tracking-wide whitespace-nowrap rounded-sm transition-all cursor-pointer disabled:cursor-default"
              style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}
              icon={FiDownload}
              iconSize={12}
              idleLabel="Export Report"
              busyLabel="Exporting..."
              doneLabel="Exported"
            />
          )}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="text-[10px] border px-3 py-1.5 uppercase tracking-wide whitespace-nowrap rounded-sm select-none"
            style={{ ...LABEL_MONO, background: 'var(--crm-bg-raised)' }}
          >
            Node // Secure Auth Layer OK
          </motion.div>
        </div>
      </motion.div>

      {/* Grid Stats Block View */}
      <div className="w-full py-8 space-y-8">
        {isAdmin && (
          <div className="flex border border-slate-200 p-1 bg-slate-50 rounded font-mono text-[9px] max-w-md">
            {[
              { id: 'COMPANY', label: 'Company Overview' },
              { id: 'MANAGER', label: 'Sales Manager View' },
              { id: 'EXECUTIVE', label: 'Sales Executive View' }
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setAdminViewMode(view.id)}
                className={`flex-1 px-3 py-1.5 uppercase rounded font-bold tracking-wider transition cursor-pointer ${
                  adminViewMode === view.id
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
        )}
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              variants={blockVariants}
              whileHover={{ y: -4 }}
              className="border p-5 transition-all duration-300 rounded-sm flex flex-col justify-between"
              style={CARD}
            >
              <div className="flex items-start justify-between gap-2 text-left">
                <span className="text-[9px] uppercase tracking-widest font-bold" style={LABEL_MONO}>{stat.title}</span>
                <div
                  className="p-2 border rounded-sm transition-transform duration-300"
                  style={{ borderColor: 'var(--crm-line)', color: toneColor(stat.tone), background: toneBg(stat.tone) }}
                >
                  <stat.icon size={13} />
                </div>
              </div>
              <div className="flex items-end justify-between mt-4 text-left">
                <span className="text-2xl font-light tracking-tight whitespace-nowrap" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}>{stat.value}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Analytical Interface Charts Layer */}
        <motion.div variants={blockVariants} className="w-full overflow-hidden">
          {isAdmin ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Chart Block 1 */}
              <div className="border p-5 rounded-sm w-full overflow-hidden text-left" style={CARD}>
                <h3 className="text-xs uppercase tracking-widest mb-4 font-bold border-b pb-1.5" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>Lead Pipeline Manifest</h3>
                {pipeline.length === 0 ? (
                  <EmptyState title="No pipeline data yet" description="Leads will appear here once routed." />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={pipeline} margin={{ left: -30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-ink-soft)" opacity={0.06} vertical={false} />
                      <XAxis dataKey="_id" stroke="var(--crm-ink-faint)" opacity={0.8} fontSize={9} tickLine={false} />
                      <YAxis stroke="var(--crm-ink-faint)" opacity={0.8} fontSize={9} tickLine={false} />
                      <Tooltip cursor={{ fill: 'var(--crm-bg-sunken)', opacity: 0.4 }} contentStyle={{ backgroundColor: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line-strong)', textTransform: 'uppercase', fontSize: '10px', fontFamily: 'var(--crm-font-mono)' }} />
                      <Bar dataKey="total" fill="var(--crm-accent)" maxBarSize={20} radius={[1, 1, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Chart Block 2 */}
              <div className="border p-5 rounded-sm w-full overflow-hidden text-left" style={CARD}>
                <h3 className="text-xs uppercase tracking-widest mb-4 font-bold border-b pb-1.5" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>Employee Performance Matrix</h3>
                {performance.length === 0 ? (
                  <EmptyState title="No performance data yet" description="Employee conversions will appear here." />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={performance} margin={{ left: -30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-ink-soft)" opacity={0.06} vertical={false} />
                      <XAxis dataKey="_id" stroke="var(--crm-ink-faint)" opacity={0.8} fontSize={9} tickLine={false} />
                      <YAxis stroke="var(--crm-ink-faint)" opacity={0.8} fontSize={9} tickLine={false} />
                      <Tooltip cursor={{ fill: 'var(--crm-bg-sunken)', opacity: 0.4 }} contentStyle={{ backgroundColor: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line-strong)', textTransform: 'uppercase', fontSize: '10px', fontFamily: 'var(--crm-font-mono)' }} />
                      <Bar dataKey="leads" fill="var(--crm-ink-faint)" maxBarSize={10} radius={[1, 1, 0, 0]} />
                      <Bar dataKey="won" fill="var(--crm-positive)" maxBarSize={10} radius={[1, 1, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Employee Log Framework */}
              <div className="lg:col-span-8 border p-5 rounded-sm text-left" style={CARD}>
                <h3 className="text-xs uppercase tracking-widest mb-4 font-bold border-b pb-1.5" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>Personal Operational Audit</h3>
                {history.length === 0 ? (
                  <EmptyState title="No activity yet" description="Your recent actions will show up here." />
                ) : (
                  <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                    {history.map((act) => (
                      <motion.div
                        key={act._id}
                        whileHover={{ x: 2 }}
                        className="text-xs py-2.5 border-b flex justify-between items-center gap-4 px-2 transition-colors duration-150 rounded-sm"
                        style={{ borderColor: 'var(--crm-line)' }}
                      >
                        <span className="font-light" style={{ color: 'var(--crm-heading)' }}>{act.actionType}</span>
                        <span className="opacity-70 text-[10px] tracking-wider px-2 py-0.5 border rounded-sm" style={{ ...LABEL_MONO, background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)' }}>{new Date(act.createdAt).toLocaleDateString()}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Conversion Statistics Tracker */}
              <div className="lg:col-span-4 border p-5 rounded-sm text-left flex flex-col justify-between gap-4" style={CARD}>
                <h3 className="text-xs uppercase tracking-widest font-bold border-b pb-1.5" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>Conversion Performance</h3>
                <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                  <motion.div whileHover={{ scale: 1.01 }} className="p-3.5 border text-xs flex justify-between items-center rounded-sm" style={CARD_SUNKEN}>
                    <span className="uppercase text-[10px] tracking-wider" style={LABEL_MONO}>Total Leads Linked:</span>
                    <strong className="text-sm font-medium" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}>{summary?.totalLeads || 0}</strong>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.01 }} className="p-3.5 border text-xs flex justify-between items-center rounded-sm" style={CARD_SUNKEN}>
                    <span className="uppercase text-[10px] tracking-wider" style={LABEL_MONO}>Concluded Batches:</span>
                    <strong className="text-sm font-medium" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-positive)' }}>{summary?.completedTasks || 0}</strong>
                  </motion.div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {isAdmin && (
          <motion.div variants={blockVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Monthly Revenue Trend */}
            <div className="lg:col-span-2 border p-5 rounded-sm w-full overflow-hidden text-left" style={CARD}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b pb-1.5" style={{ borderColor: 'var(--crm-line)' }}>
                <h3 className="text-xs uppercase tracking-widest font-bold" style={LABEL_MONO}>Monthly Sales / Revenue Collected</h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <FiCalendar size={11} style={{ color: 'var(--crm-ink-faint)' }} />
                  <select
                    value={dateRangeOption}
                    onChange={(e) => setDateRangeOption(e.target.value)}
                    className="text-[9px] uppercase tracking-wide border rounded-sm px-2 py-1 outline-none cursor-pointer"
                    style={{ ...LABEL_MONO, background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)' }}
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
                        className="text-[9px] border rounded-sm px-1.5 py-1 outline-none"
                        style={{ fontFamily: 'var(--crm-font-mono)', background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)', color: 'var(--crm-ink-soft)' }}
                      />
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="text-[9px] border rounded-sm px-1.5 py-1 outline-none"
                        style={{ fontFamily: 'var(--crm-font-mono)', background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)', color: 'var(--crm-ink-soft)' }}
                      />
                      <button
                        onClick={handleApplyCustomRange}
                        className="text-[9px] uppercase tracking-wide border px-2 py-1 rounded-sm transition-all cursor-pointer"
                        style={{ ...LABEL_MONO, background: 'var(--crm-bg-sunken)' }}
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
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={summary?.revenue?.monthlyTrend || []} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-ink-soft)" opacity={0.06} vertical={false} />
                    <XAxis dataKey="month" stroke="var(--crm-ink-faint)" opacity={0.8} fontSize={9} tickLine={false} />
                    <YAxis stroke="var(--crm-ink-faint)" opacity={0.8} fontSize={9} tickLine={false} />
                    <Tooltip cursor={{ fill: 'var(--crm-bg-sunken)', opacity: 0.4 }} contentStyle={{ backgroundColor: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line-strong)', textTransform: 'uppercase', fontSize: '10px', fontFamily: 'var(--crm-font-mono)' }} formatter={(val) => fmtCurrency(val)} />
                    <Bar dataKey="collected" fill="var(--crm-positive)" maxBarSize={28} radius={[1, 1, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Follow-Ups */}
            <div className="border p-5 rounded-sm text-left flex flex-col justify-between gap-3" style={CARD}>
              <h3 className="text-xs uppercase tracking-widest font-bold border-b pb-1.5" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>Follow-Ups</h3>
              <div className="space-y-2.5">
                <div className="p-3.5 border flex justify-between items-center rounded-sm" style={{ background: 'var(--crm-warning-bg)', borderColor: 'var(--crm-warning)', borderOpacity: 0.2 }}>
                  <span className="uppercase tracking-wider text-[10px]" style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-warning)' }}>Due Today</span>
                  <strong className="text-lg" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-warning)' }}>{summary?.followUpsDueToday || 0}</strong>
                </div>
                <div className="p-3.5 border flex justify-between items-center rounded-sm" style={{ background: 'var(--crm-danger-bg)', borderColor: 'var(--crm-danger)', borderOpacity: 0.2 }}>
                  <span className="uppercase tracking-wider text-[10px]" style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-danger)' }}>Missed / Overdue</span>
                  <strong className="text-lg" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-danger)' }}>{summary?.missedFollowUps || 0}</strong>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isAdmin && (
          <motion.div variants={blockVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Transport Running Status */}
            <div className="border p-5 rounded-sm text-left" style={CARD}>
              <h3 className="text-xs uppercase tracking-widest mb-4 font-bold border-b pb-1.5 flex items-center gap-1.5" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}><FiTruck size={12} /> Transport Running Status</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-sm" style={{ background: 'var(--crm-info-bg)', borderColor: 'var(--crm-line)' }}>
                  <p className="text-[9px] uppercase tracking-widest font-bold" style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-info)' }}>In Transit</p>
                  <p className="text-xl mt-1" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}>{summary?.transport?.inTransit || 0}</p>
                </div>
                <div className="p-3 border rounded-sm" style={{ background: 'var(--crm-positive-bg)', borderColor: 'var(--crm-line)' }}>
                  <p className="text-[9px] uppercase tracking-widest font-bold" style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-positive)' }}>Delivered</p>
                  <p className="text-xl mt-1" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}>{summary?.transport?.delivered || 0}</p>
                </div>
                <div className="p-3 border rounded-sm" style={{ background: 'var(--crm-warning-bg)', borderColor: 'var(--crm-line)' }}>
                  <p className="text-[9px] uppercase tracking-widest font-bold" style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-warning)' }}>Pending</p>
                  <p className="text-xl mt-1" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}>{summary?.transport?.pending || 0}</p>
                </div>
                <div className="p-3 border rounded-sm" style={{ background: 'var(--crm-danger-bg)', borderColor: 'var(--crm-line)' }}>
                  <p className="text-[9px] uppercase tracking-widest font-bold" style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-danger)' }}>Issue Raised</p>
                  <p className="text-xl mt-1" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}>{summary?.transport?.issueRaised || 0}</p>
                </div>
              </div>
            </div>

            {/* Top Performing Employees */}
            <div className="border p-5 rounded-sm text-left" style={CARD}>
              <h3 className="text-xs uppercase tracking-widest mb-4 font-bold border-b pb-1.5 flex items-center gap-1.5" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}><FiAward size={12} /> Top Performing Employees</h3>
              {(summary?.topEmployees || []).length === 0 ? (
                <EmptyState title="No conversions yet" />
              ) : (
                <div className="space-y-2">
                  {summary.topEmployees.map((emp, idx) => (
                    <div key={emp._id} className="flex items-center justify-between text-xs py-2 border-b last:border-0" style={{ borderColor: 'var(--crm-line)' }}>
                      <span className="font-light" style={{ color: 'var(--crm-ink-soft)' }}>{idx + 1}. {emp.fullName}</span>
                      <span className="text-[10px]" style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-positive)' }}>{emp.conversions}/{emp.totalLeads} won</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Department Performance */}
            <div className="border p-5 rounded-sm text-left" style={CARD}>
              <div className="flex items-center justify-between gap-2 mb-4 border-b pb-1.5" style={{ borderColor: 'var(--crm-line)' }}>
                <h3 className="text-xs uppercase tracking-widest font-bold" style={LABEL_MONO}>Department Performance</h3>
                {(summary?.departmentPerformance || []).length > 0 && (
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="text-[9px] uppercase tracking-wide border rounded-sm px-2 py-1 outline-none cursor-pointer"
                    style={{ ...LABEL_MONO, background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)' }}
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
                    <div key={dept.department} className="flex items-center justify-between text-xs py-2 border-b last:border-0" style={{ borderColor: 'var(--crm-line)' }}>
                      <span className="uppercase tracking-wide text-[10px]" style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-soft)' }}>{dept.department}</span>
                      <span className="text-[10px]" style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-heading)' }}>{dept.won}/{dept.totalLeads} won</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {isAdmin && (
          <motion.div variants={blockVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Link to="/crm/attendance" className="border p-5 rounded-sm text-left transition-all flex items-center justify-between group" style={CARD}>
              <div>
                <span className="text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5" style={LABEL_MONO}><FiUserCheck size={12} /> Employees Present Today</span>
                <p className="text-2xl font-light tracking-tight mt-2" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}>{summary?.presentToday || 0} <span className="text-xs" style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' }}>/ {summary?.totalEmployees || 0}</span></p>
              </div>
              <FiArrowRight size={16} className="transition-colors group-hover:opacity-100" style={{ color: 'var(--crm-ink-faint)' }} />
            </Link>
            <Link to="/crm/tickets" className="border p-5 rounded-sm text-left transition-all flex items-center justify-between group" style={CARD}>
              <div>
                <span className="text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5" style={LABEL_MONO}><FiLifeBuoy size={12} /> Open Support Tickets</span>
                <p className="text-2xl font-light tracking-tight mt-2" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}>{summary?.openTickets || 0}</p>
              </div>
              <FiArrowRight size={16} className="transition-colors group-hover:opacity-100" style={{ color: 'var(--crm-ink-faint)' }} />
            </Link>
            <Link to="/crm/leave" className="border p-5 rounded-sm text-left transition-all flex items-center justify-between group" style={CARD}>
              <div>
                <span className="text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5" style={LABEL_MONO}><FiCalendar size={12} /> Pending Leave Approvals</span>
                <p className="text-2xl font-light tracking-tight mt-2" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}>{summary?.pendingLeaveRequests || 0}</p>
              </div>
              <FiArrowRight size={16} className="transition-colors group-hover:opacity-100" style={{ color: 'var(--crm-ink-faint)' }} />
            </Link>
          </motion.div>
        )}

        {/* Grid Distribution System Summary */}
        <motion.div variants={blockVariants} className="border p-5 rounded-sm text-left" style={CARD}>
          <h3 className="text-xs uppercase tracking-widest mb-5 font-bold border-b pb-1.5" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>Lead Segment Distribution Matrix</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {summary?.stageCounts && Object.entries(summary.stageCounts).map(([stage, count]) => (
              <motion.div
                key={stage}
                whileHover={{ scale: 1.02 }}
                className="p-4 border text-left rounded-sm transition-colors cursor-default"
                style={CARD_SUNKEN}
              >
                <p className="text-[9px] uppercase tracking-widest font-bold truncate" style={LABEL_MONO}>{stage.replace(/_/g, ' ')}</p>
                <p className="text-2xl font-normal mt-1.5" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}>{count}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
