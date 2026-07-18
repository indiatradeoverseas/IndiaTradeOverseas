import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminApi } from '../../api/admin';
import { dashboardApi } from '../../api/dashboard';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../hooks/useAuth';
import { FiUsers, FiAlertCircle, FiFileText, FiCheckSquare, FiClock, FiActivity, FiBell, FiArrowRight, FiTruck, FiTrendingUp } from 'react-icons/fi';
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

  useEffect(() => { fetchDashboardData(); }, [user]);

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
  const stats = isAdmin ? [
    { title: 'Total Registered Users', value: summary?.users || 0, icon: FiUsers, color: 'text-[#F2F4F7] bg-[#121D29]/60' },
    { title: 'Live Transport Modules', value: summary?.activeUsers || 0, icon: FiTruck, color: 'text-indigo-400 bg-indigo-950/20' },
    { title: 'Open Risk Alerts', value: summary?.openAlerts || 0, icon: FiAlertCircle, color: 'text-rose-400 bg-rose-950/20' },
    { title: 'Pending Trade Quotes', value: summary?.pendingQuotations || 0, icon: FiFileText, color: 'text-[#C5CBD3] bg-[#121D29]/40' },
    { title: 'Unread Telemetry', value: unreadCount, icon: FiBell, color: 'text-amber-400 bg-amber-950/20' }
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
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="text-[10px] font-mono text-[#6D7886] bg-[#0E1116] border border-[#C5CBD3]/10 px-3 py-1.5 uppercase tracking-wide whitespace-nowrap self-start md:self-auto rounded-sm select-none"
        >
          NODE // SECURE_AUTH_LAYER_OK
        </motion.div>
      </motion.div>

      {/* Grid Stats Block View */}
      <div className="w-full py-8 space-y-8 bg-[#0E1116]">
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <span className="text-3xl font-serif font-light tracking-tight text-[#F2F4F7]">{stat.value}</span>
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