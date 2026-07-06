import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminApi } from '../../api/admin';
import { dashboardApi } from '../../api/dashboard';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../hooks/useAuth';
import { FiUsers, FiAlertCircle, FiFileText, FiCheckSquare, FiClock, FiActivity, FiBell, FiArrowRight, FiTruck, FiTrendingUp } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.02 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 22 } }
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

  if (loading) return <div className="min-h-screen bg-[#FBF7EF] flex items-center justify-center"><div className="w-12 h-[1px] bg-[#C99B38] animate-pulse"/></div>;

  const isAdmin = user?.role === 'ADMIN';
  const stats = isAdmin ? [
    { title: 'Total Registered Users', value: summary?.users || 0, icon: FiUsers, color: 'text-[#0B2D5B] bg-[#0B2D5B]/5' },
    { title: 'Live Transport Modules', value: summary?.activeUsers || 0, icon: FiTruck, color: 'text-indigo-800 bg-indigo-800/5' },
    { title: 'Open Risk Alerts', value: summary?.openAlerts || 0, icon: FiAlertCircle, color: 'text-rose-800 bg-rose-800/5' },
    { title: 'Pending Trade Quotes', value: summary?.pendingQuotations || 0, icon: FiFileText, color: 'text-[#C99B38] bg-[#C99B38]/5' },
    { title: 'Unread Telemetry', value: unreadCount, icon: FiBell, color: 'text-amber-800 bg-amber-800/5' }
  ] : [
    { title: 'Assigned Pipeline Leads', value: summary?.totalLeads || 0, icon: FiUsers, color: 'text-[#0B2D5B] bg-[#0B2D5B]/5' },
    { title: 'Active Logistics Routing', value: summary?.activeLeads || 0, icon: FiTruck, color: 'text-indigo-800 bg-indigo-800/5' },
    { title: 'Pending Quotations', value: summary?.pendingQuotations || 0, icon: FiFileText, color: 'text-[#C99B38] bg-[#C99B38]/5' },
    { title: 'Concluded Transactions', value: summary?.completedTasks || 0, icon: FiCheckSquare, color: 'text-emerald-800 bg-emerald-800/5' },
    { title: 'Unread Node Alerts', value: unreadCount, icon: FiBell, color: 'text-amber-800 bg-amber-800/5' }
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="w-full bg-[#FBF7EF] text-[#0B2D5B] m-0 p-0 box-border block">
      <motion.div variants={blockVariants} className="w-full border-b border-[#C99B38]/20 px-4 sm:px-8 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-[#FBF7EF]">
        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#C99B38] font-bold block">INTERNAL OPERATIONS SUITE</span>
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight">Global Ledger Base</h1>
        </div>
        <div className="text-[10px] font-mono text-[#0B2D5B]/70 bg-[#0B2D5B]/5 border border-[#C99B38]/20 px-3 py-1.5 uppercase tracking-wide whitespace-nowrap self-start md:self-auto">NODE // SECURE_AUTH_LAYER_OK</div>
      </motion.div>

      <div className="w-full px-4 sm:px-8 py-6 space-y-6">
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((stat, i) => (
            <motion.div key={i} variants={blockVariants} className="bg-[#FBF7EF] border border-[#C99B38]/15 p-4 transition-all duration-200 rounded-none">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[9px] uppercase tracking-widest text-[#0B2D5B]/50 font-bold">{stat.title}</span>
                <div className={`p-2 border border-[#C99B38]/10 ${stat.color}`}><stat.icon size={13} /></div>
              </div>
              <div className="flex items-end justify-between mt-3">
                <span className="text-3xl font-serif font-light tracking-tight">{stat.value}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Dynamic Matrix Splits & Tables wrap seamlessly inside custom scrollboxes to prevent overflowing mobile widths */}
        <motion.div variants={blockVariants} className="w-full overflow-hidden">
          {isAdmin ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-[#C99B38]/15 p-4 bg-[#FBF7EF] w-full overflow-hidden">
                <h3 className="text-sm font-serif mb-4">Lead Pipeline Manifest</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={pipeline} margin={{ left: -30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#C99B38" opacity={0.1} vertical={false} />
                    <XAxis dataKey="_id" stroke="#0B2D5B" opacity={0.5} fontSize={9} tickLine={false} />
                    <YAxis stroke="#0B2D5B" opacity={0.5} fontSize={9} tickLine={false} />
                    <Bar dataKey="total" fill="#0B2D5B" maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="border border-[#C99B38]/15 p-4 bg-[#FBF7EF] w-full overflow-hidden">
                <h3 className="text-sm font-serif mb-4">Employee Performance Matrix</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={performance} margin={{ left: -30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#C99B38" opacity={0.1} vertical={false} />
                    <XAxis dataKey="_id" stroke="#0B2D5B" opacity={0.5} fontSize={9} tickLine={false} />
                    <YAxis stroke="#0B2D5B" opacity={0.5} fontSize={9} tickLine={false} />
                    <Bar dataKey="leads" fill="#0B2D5B" maxBarSize={10} />
                    <Bar dataKey="won" fill="#047857" maxBarSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 border border-[#C99B38]/15 p-4 bg-[#FBF7EF]">
                <h3 className="text-sm font-serif mb-4">Personal Operational Audit</h3>
                <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                  {history.map((act) => (
                    <div key={act._id} className="text-xs py-2 border-b border-[#C99B38]/10 flex justify-between gap-2">
                      <span>{act.actionType}</span>
                      <span className="opacity-40 font-mono text-[10px]">{new Date(act.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-4 border border-[#C99B38]/15 p-4 bg-[#FBF7EF] flex flex-col justify-between gap-4">
                <h3 className="text-sm font-serif">Conversion Performance</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-[#0B2D5B]/5 text-xs flex justify-between"><span>Total:</span><strong>{summary?.totalLeads || 0}</strong></div>
                  <div className="p-3 bg-[#0B2D5B]/5 text-xs flex justify-between"><span>Cleared:</span><strong>{summary?.completedTasks || 0}</strong></div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div variants={blockVariants} className="border border-[#C99B38]/15 p-4 bg-[#FBF7EF]">
          <h3 className="text-sm font-serif mb-4">Lead Segment Distribution Matrix</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {summary?.stageCounts && Object.entries(summary.stageCounts).map(([stage, count]) => (
              <div key={stage} className="p-3 bg-[#0B2D5B]/5 border border-[#C99B38]/10 text-left">
                <p className="text-[8px] uppercase tracking-wider text-[#0B2D5B]/50 truncate">{stage.replace(/_/g, ' ')}</p>
                <p className="text-xl font-serif mt-1">{count}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}