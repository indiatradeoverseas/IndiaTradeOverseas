import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminApi } from '../../api/admin';
import { dashboardApi } from '../../api/dashboard';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../hooks/useAuth';
import { FiUsers, FiAlertCircle, FiFileText, FiCheckSquare, FiClock, FiActivity, FiBell, FiArrowRight, FiTruck, FiTrendingUp, FiUserCheck, FiLifeBuoy, FiAward, FiDownload, FiCalendar } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

export default function Dashboard() {
  const { user } = useAuth();
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
    if (!summary) return;
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
      if (user.role === 'ADMIN') {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1116] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-[2px] bg-[#C5CBD3]" 
        />
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';
  const fmtCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;
  const stats = isAdmin ? [
    { title: 'Total Employees', value: summary?.totalEmployees || 0, icon: FiUsers, color: 'text-[#F2F4F7] bg-[#121D29]/60' },
    { title: 'Active Leads', value: summary?.activeLeads || 0, icon: FiActivity, color: 'text-sky-400 bg-sky-950/20' },
    { title: 'Pending Leads', value: summary?.pendingLeads || 0, icon: FiAlertCircle, color: 'text-amber-400 bg-amber-950/20' },
    { title: 'Quotations Sent', value: summary?.quotations?.sent || 0, icon: FiFileText, color: 'text-[#C5CBD3] bg-[#121D29]/40' },
    { title: 'Orders Confirmed', value: summary?.ordersConfirmed || 0, icon: FiCheckSquare, color: 'text-emerald-400 bg-emerald-950/20' },
    { title: 'Pending Orders', value: summary?.pendingOrders || 0, icon: FiClock, color: 'text-amber-400 bg-amber-950/20' },
    { title: 'Total Revenue', value: fmtCurrency(summary?.revenue?.totalCollected), icon: FiTrendingUp, color: 'text-emerald-400 bg-emerald-950/20' },
    { title: 'Pending Payments', value: fmtCurrency(summary?.payments?.pendingValue), icon: FiAlertCircle, color: 'text-rose-400 bg-rose-950/20' }
  ] : [
    { title: 'Assigned Pipeline Leads', value: summary?.totalLeads || 0, icon: FiUsers, color: 'text-[#F2F4F7] bg-[#121D29]/60' },
    { title: 'Active Logistics Routing', value: summary?.activeLeads || 0, icon: FiTruck, color: 'text-indigo-400 bg-indigo-950/20' },
    { title: 'Pending Quotations', value: summary?.pendingQuotations || 0, icon: FiFileText, color: 'text-[#C5CBD3] bg-[#121D29]/40' },
    { title: 'Concluded Transactions', value: summary?.completedTasks || 0, icon: FiCheckSquare, color: 'text-emerald-400 bg-emerald-950/20' },
    { title: 'Unread Node Alerts', value: unreadCount, icon: FiBell, color: 'text-amber-400 bg-amber-950/20' }
  ];

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="w-full bg-[#0E1116] text-[#C5CBD3] m-0 p-0 block"
    >
      {/* Page Header Content Row */}
      <motion.div variants={blockVariants} className="w-full border-b border-[#C5CBD3]/10 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-[#040A12]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#6D7886] font-bold block font-mono">INTERNAL OPERATIONS SUITE</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F2F4F7] tracking-tight uppercase">Global Ledger Base</h1>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          {isAdmin && (
            <button
              onClick={handleExportReport}
              className="flex items-center gap-1.5 text-[10px] font-mono text-[#C5CBD3] bg-[#0E1116] border border-[#C5CBD3]/15 hover:border-[#F2F4F7]/40 hover:text-[#F2F4F7] px-3 py-1.5 uppercase tracking-wide whitespace-nowrap rounded-sm transition-all"
            >
              <FiDownload size={12} /> Export Report
            </button>
          )}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="text-[10px] font-mono text-[#6D7886] bg-[#0E1116] border border-[#C5CBD3]/10 px-3 py-1.5 uppercase tracking-wide whitespace-nowrap rounded-sm select-none"
          >
            NODE // SECURE_AUTH_LAYER_OK
          </motion.div>
        </div>
      </motion.div>

      {/* Grid Stats Block View */}
      <div className="w-full py-8 space-y-8 bg-[#0E1116]">
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div 
              key={i} 
              variants={blockVariants}
              whileHover={{ y: -4, borderColor: 'rgba(197,203,211,0.35)' }}
              className="bg-[#121D29]/30 border border-[#C5CBD3]/15 p-5 transition-all duration-300 rounded-sm shadow-xl flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2 text-left">
                <span className="text-[9px] uppercase tracking-widest text-[#6D7886] font-bold font-mono">{stat.title}</span>
                <div className={`p-2 border border-[#C5CBD3]/10 rounded-sm transition-transform duration-300 ${stat.color}`}><stat.icon size={13} /></div>
              </div>
              <div className="flex items-end justify-between mt-4 text-left">
                <span className="text-2xl font-serif font-light tracking-tight text-[#F2F4F7] whitespace-nowrap">{stat.value}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Analytical Interface Charts Layer */}
        <motion.div variants={blockVariants} className="w-full overflow-hidden">
          {isAdmin ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Chart Block 1 */}
              <div className="border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm w-full overflow-hidden text-left shadow-lg">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[#6D7886] mb-4 font-bold border-b border-[#C5CBD3]/10 pb-1.5">Lead Pipeline Manifest</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={pipeline} margin={{ left: -30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#C5CBD3" opacity={0.03} vertical={false} />
                    <XAxis dataKey="_id" stroke="#6D7886" opacity={0.7} fontSize={9} tickLine={false} />
                    <YAxis stroke="#6D7886" opacity={0.7} fontSize={9} tickLine={false} />
                    <Tooltip cursor={{ fill: '#121D29', opacity: 0.3 }} contentStyle={{ backgroundColor: '#0E1116', borderColor: 'rgba(197,203,211,0.2)', textTransform: 'uppercase', fontSize: '10px', fontFamily: 'monospace' }} />
                    <Bar dataKey="total" fill="#C5CBD3" maxBarSize={20} radius={[1, 1, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Block 2 */}
              <div className="border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm w-full overflow-hidden text-left shadow-lg">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[#6D7886] mb-4 font-bold border-b border-[#C5CBD3]/10 pb-1.5">Employee Performance Matrix</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={performance} margin={{ left: -30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#C5CBD3" opacity={0.03} vertical={false} />
                    <XAxis dataKey="_id" stroke="#6D7886" opacity={0.7} fontSize={9} tickLine={false} />
                    <YAxis stroke="#6D7886" opacity={0.7} fontSize={9} tickLine={false} />
                    <Tooltip cursor={{ fill: '#121D29', opacity: 0.3 }} contentStyle={{ backgroundColor: '#0E1116', borderColor: 'rgba(197,203,211,0.2)', textTransform: 'uppercase', fontSize: '10px', fontFamily: 'monospace' }} />
                    <Bar dataKey="leads" fill="#6D7886" maxBarSize={10} radius={[1, 1, 0, 0]} />
                    <Bar dataKey="won" fill="#10B981" maxBarSize={10} radius={[1, 1, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Employee Log Framework */}
              <div className="lg:col-span-8 border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm text-left shadow-lg">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[#6D7886] mb-4 font-bold border-b border-[#C5CBD3]/10 pb-1.5">Personal Operational Audit</h3>
                <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                  {history.map((act) => (
                    <motion.div 
                      key={act._id} 
                      whileHover={{ x: 2 }}
                      className="text-xs py-2.5 border-b border-[#C5CBD3]/10 flex justify-between items-center gap-4 hover:bg-[#121D29]/40 px-2 transition-colors duration-150 rounded-sm"
                    >
                      <span className="text-[#F2F4F7] font-light">{act.actionType}</span>
                      <span className="opacity-60 font-mono text-[10px] tracking-wider bg-[#0E1116] px-2 py-0.5 border border-[#C5CBD3]/10 rounded-sm">{new Date(act.createdAt).toLocaleDateString()}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Conversion Statistics Tracker */}
              <div className="lg:col-span-4 border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm text-left shadow-lg flex flex-col justify-between gap-4">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[#6D7886] font-bold border-b border-[#C5CBD3]/10 pb-1.5">Conversion Performance</h3>
                <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                  <motion.div whileHover={{ scale: 1.01 }} className="p-3.5 bg-[#040A12]/80 border border-[#C5CBD3]/10 text-xs flex justify-between items-center rounded-sm shadow-inner">
                    <span className="text-[#6D7886] uppercase font-mono tracking-wider text-[10px]">Total Leads Linked:</span>
                    <strong className="text-[#F2F4F7] text-sm font-medium font-serif">{summary?.totalLeads || 0}</strong>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.01 }} className="p-3.5 bg-[#040A12]/80 border border-[#C5CBD3]/10 text-xs flex justify-between items-center rounded-sm shadow-inner">
                    <span className="text-[#6D7886] uppercase font-mono tracking-wider text-[10px]">Concluded Batches:</span>
                    <strong className="text-emerald-400 text-sm font-medium font-serif">{summary?.completedTasks || 0}</strong>
                  </motion.div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {isAdmin && (
          <motion.div variants={blockVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Monthly Revenue Trend */}
            <div className="lg:col-span-2 border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm w-full overflow-hidden text-left shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-[#C5CBD3]/10 pb-1.5">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[#6D7886] font-bold">Monthly Sales / Revenue Collected</h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <FiCalendar size={11} className="text-[#6D7886]" />
                  <select
                    value={dateRangeOption}
                    onChange={(e) => setDateRangeOption(e.target.value)}
                    className="text-[9px] font-mono uppercase tracking-wide bg-[#0E1116] border border-[#C5CBD3]/15 focus:border-[#F2F4F7]/40 rounded-sm px-2 py-1 outline-none cursor-pointer text-[#C5CBD3]"
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
                        className="text-[9px] font-mono bg-[#0E1116] border border-[#C5CBD3]/15 rounded-sm px-1.5 py-1 outline-none text-[#C5CBD3]"
                      />
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="text-[9px] font-mono bg-[#0E1116] border border-[#C5CBD3]/15 rounded-sm px-1.5 py-1 outline-none text-[#C5CBD3]"
                      />
                      <button
                        onClick={handleApplyCustomRange}
                        className="text-[9px] font-mono uppercase tracking-wide bg-[#0E1116] border border-[#C5CBD3]/20 hover:border-[#F2F4F7]/40 text-[#C5CBD3] px-2 py-1 rounded-sm transition-all"
                      >
                        Apply
                      </button>
                    </>
                  )}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summary?.revenue?.monthlyTrend || []} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#C5CBD3" opacity={0.03} vertical={false} />
                  <XAxis dataKey="month" stroke="#6D7886" opacity={0.7} fontSize={9} tickLine={false} />
                  <YAxis stroke="#6D7886" opacity={0.7} fontSize={9} tickLine={false} />
                  <Tooltip cursor={{ fill: '#121D29', opacity: 0.3 }} contentStyle={{ backgroundColor: '#0E1116', borderColor: 'rgba(197,203,211,0.2)', textTransform: 'uppercase', fontSize: '10px', fontFamily: 'monospace' }} formatter={(val) => fmtCurrency(val)} />
                  <Bar dataKey="collected" fill="#10B981" maxBarSize={28} radius={[1, 1, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Follow-Ups */}
            <div className="border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm text-left shadow-lg flex flex-col justify-between gap-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#6D7886] font-bold border-b border-[#C5CBD3]/10 pb-1.5">Follow-Ups</h3>
              <div className="space-y-2.5">
                <div className="p-3.5 bg-amber-950/20 border border-amber-500/20 flex justify-between items-center rounded-sm">
                  <span className="text-amber-400 uppercase font-mono tracking-wider text-[10px]">Due Today</span>
                  <strong className="text-amber-400 text-lg font-serif">{summary?.followUpsDueToday || 0}</strong>
                </div>
                <div className="p-3.5 bg-rose-950/20 border border-rose-500/20 flex justify-between items-center rounded-sm">
                  <span className="text-rose-400 uppercase font-mono tracking-wider text-[10px]">Missed / Overdue</span>
                  <strong className="text-rose-400 text-lg font-serif">{summary?.missedFollowUps || 0}</strong>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isAdmin && (
          <motion.div variants={blockVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Transport Running Status */}
            <div className="border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm text-left shadow-lg">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#6D7886] mb-4 font-bold border-b border-[#C5CBD3]/10 pb-1.5 flex items-center gap-1.5"><FiTruck size={12} /> Transport Running Status</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-sky-950/20 border border-sky-500/20 rounded-sm">
                  <p className="text-[9px] uppercase tracking-widest text-sky-400 font-mono font-bold">In Transit</p>
                  <p className="text-xl font-serif text-[#F2F4F7] mt-1">{summary?.transport?.inTransit || 0}</p>
                </div>
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-sm">
                  <p className="text-[9px] uppercase tracking-widest text-emerald-400 font-mono font-bold">Delivered</p>
                  <p className="text-xl font-serif text-[#F2F4F7] mt-1">{summary?.transport?.delivered || 0}</p>
                </div>
                <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-sm">
                  <p className="text-[9px] uppercase tracking-widest text-amber-400 font-mono font-bold">Pending</p>
                  <p className="text-xl font-serif text-[#F2F4F7] mt-1">{summary?.transport?.pending || 0}</p>
                </div>
                <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-sm">
                  <p className="text-[9px] uppercase tracking-widest text-rose-400 font-mono font-bold">Issue Raised</p>
                  <p className="text-xl font-serif text-[#F2F4F7] mt-1">{summary?.transport?.issueRaised || 0}</p>
                </div>
              </div>
            </div>

            {/* Top Performing Employees */}
            <div className="border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm text-left shadow-lg">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#6D7886] mb-4 font-bold border-b border-[#C5CBD3]/10 pb-1.5 flex items-center gap-1.5"><FiAward size={12} /> Top Performing Employees</h3>
              <div className="space-y-2">
                {(summary?.topEmployees || []).length === 0 ? (
                  <p className="text-[10px] text-[#6D7886] font-mono uppercase tracking-widest py-4 text-center">No conversions yet</p>
                ) : summary.topEmployees.map((emp, idx) => (
                  <div key={emp._id} className="flex items-center justify-between text-xs py-2 border-b border-[#C5CBD3]/10 last:border-0">
                    <span className="text-[#C5CBD3] font-light">{idx + 1}. {emp.fullName}</span>
                    <span className="font-mono text-[10px] text-emerald-400">{emp.conversions}/{emp.totalLeads} won</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Performance */}
            <div className="border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm text-left shadow-lg">
              <div className="flex items-center justify-between gap-2 mb-4 border-b border-[#C5CBD3]/10 pb-1.5">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[#6D7886] font-bold">Department Performance</h3>
                {(summary?.departmentPerformance || []).length > 0 && (
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="text-[9px] font-mono uppercase tracking-wide bg-[#0E1116] border border-[#C5CBD3]/15 focus:border-[#F2F4F7]/40 rounded-sm px-2 py-1 outline-none cursor-pointer text-[#C5CBD3]"
                  >
                    <option value="ALL">All</option>
                    {summary.departmentPerformance.map((d) => (
                      <option key={d.department} value={d.department}>{d.department}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-2">
                {(summary?.departmentPerformance || []).length === 0 ? (
                  <p className="text-[10px] text-[#6D7886] font-mono uppercase tracking-widest py-4 text-center">No routed leads yet</p>
                ) : summary.departmentPerformance
                    .filter((dept) => deptFilter === 'ALL' || dept.department === deptFilter)
                    .map((dept) => (
                  <div key={dept.department} className="flex items-center justify-between text-xs py-2 border-b border-[#C5CBD3]/10 last:border-0">
                    <span className="text-[#C5CBD3] font-mono uppercase tracking-wide text-[10px]">{dept.department}</span>
                    <span className="font-mono text-[10px] text-[#F2F4F7]">{dept.won}/{dept.totalLeads} won</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {isAdmin && (
          <motion.div variants={blockVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Link to="/crm/attendance" className="border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm text-left shadow-lg hover:border-[#C5CBD3]/35 transition-all flex items-center justify-between group">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-[#6D7886] font-bold font-mono flex items-center gap-1.5"><FiUserCheck size={12} /> Employees Present Today</span>
                <p className="text-2xl font-serif font-light tracking-tight text-[#F2F4F7] mt-2">{summary?.presentToday || 0} <span className="text-xs text-[#6D7886] font-mono">/ {summary?.totalEmployees || 0}</span></p>
              </div>
              <FiArrowRight size={16} className="text-[#6D7886] group-hover:text-[#F2F4F7] transition-colors" />
            </Link>
            <Link to="/crm/tickets" className="border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm text-left shadow-lg hover:border-[#C5CBD3]/35 transition-all flex items-center justify-between group">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-[#6D7886] font-bold font-mono flex items-center gap-1.5"><FiLifeBuoy size={12} /> Open Support Tickets</span>
                <p className="text-2xl font-serif font-light tracking-tight text-[#F2F4F7] mt-2">{summary?.openTickets || 0}</p>
              </div>
              <FiArrowRight size={16} className="text-[#6D7886] group-hover:text-[#F2F4F7] transition-colors" />
            </Link>
            <Link to="/crm/leave" className="border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm text-left shadow-lg hover:border-[#C5CBD3]/35 transition-all flex items-center justify-between group">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-[#6D7886] font-bold font-mono flex items-center gap-1.5"><FiCalendar size={12} /> Pending Leave Approvals</span>
                <p className="text-2xl font-serif font-light tracking-tight text-[#F2F4F7] mt-2">{summary?.pendingLeaveRequests || 0}</p>
              </div>
              <FiArrowRight size={16} className="text-[#6D7886] group-hover:text-[#F2F4F7] transition-colors" />
            </Link>
          </motion.div>
        )}

        {/* Grid Distribution System Summary */}
        <motion.div variants={blockVariants} className="border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm shadow-xl text-left">
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#6D7886] mb-5 font-bold border-b border-[#C5CBD3]/10 pb-1.5">Lead Segment Distribution Matrix</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {summary?.stageCounts && Object.entries(summary.stageCounts).map(([stage, count]) => (
              <motion.div 
                key={stage} 
                whileHover={{ scale: 1.02, bg: "#040A12" }}
                className="p-4 bg-[#040A12]/60 border border-[#C5CBD3]/10 text-left rounded-sm shadow-inner transition-colors hover:border-[#C5CBD3]/30 cursor-default"
              >
                <p className="text-[9px] uppercase tracking-widest text-[#6D7886] font-mono font-bold truncate">{stage.replace(/_/g, ' ')}</p>
                <p className="text-2xl font-serif font-normal text-[#F2F4F7] mt-1.5">{count}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}