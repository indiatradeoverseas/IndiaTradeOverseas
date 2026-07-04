import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { dashboardApi } from '../../api/dashboard';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../hooks/useAuth';
import { FiUsers, FiAlertCircle, FiFileText, FiCheckSquare, FiClock, FiActivity, FiBell } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [history, setHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

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
          adminApi.getDashboardSummary(),
          adminApi.getPipeline(),
          adminApi.getEmployeePerformance()
        ]);

        if (summaryRes.success) setSummary(summaryRes.data.summary);
        if (pipelineRes.success) setPipeline(pipelineRes.data.pipeline);
        if (performanceRes.success) setPerformance(performanceRes.data.performance);
      } else {
        const [summaryRes, historyRes] = await Promise.all([
          dashboardApi.getDashboardSummary(),
          dashboardApi.getHistory()
        ]);

        if (summaryRes.success) setSummary(summaryRes.data.summary);
        if (historyRes.success) setHistory(historyRes.data.activities);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#FBF7EF]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C99B38]"></div>
          <p className="text-xs tracking-widest uppercase font-serif text-[#0B2D5B] opacity-70">Assembling Operations Intelligence...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';

  const stats = isAdmin
    ? [
        { title: 'Total Users', value: summary?.users || 0, icon: FiUsers, color: 'bg-[#0B2D5B]' },
        { title: 'Active Users', value: summary?.activeUsers || 0, icon: FiUsers, color: 'bg-emerald-700' },
        { title: 'Open Alerts', value: summary?.openAlerts || 0, icon: FiAlertCircle, color: 'bg-rose-700' },
        { title: 'Pending Quotations', value: summary?.pendingQuotations || 0, icon: FiFileText, color: 'bg-[#C99B38]' },
        { title: 'Unread Notifications', value: unreadCount, icon: FiBell, color: 'bg-amber-600' }
      ]
    : [
        { title: 'My Total Leads', value: summary?.totalLeads || 0, icon: FiUsers, color: 'bg-[#0B2D5B]' },
        { title: 'Active Leads', value: summary?.activeLeads || 0, icon: FiClock, color: 'bg-[#1E4670]' },
        { title: 'Pending Quotations', value: summary?.pendingQuotations || 0, icon: FiFileText, color: 'bg-[#C99B38]' },
        { title: 'Completed Tasks', value: summary?.completedTasks || 0, icon: FiCheckSquare, color: 'bg-emerald-700' },
        { title: 'Unread Notifications', value: unreadCount, icon: FiBell, color: 'bg-amber-600' }
      ];

  const getStageDisplay = (stage) => stage.replace(/_/g, ' ');

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'LEAD_CREATED': return 'text-[#0B2D5B] bg-[#0B2D5B]/5 border border-[#0B2D5B]/10';
      case 'LEAD_ASSIGNED': return 'text-purple-700 bg-purple-50 border border-purple-100';
      case 'LEAD_STAGE_CHANGED': return 'text-[#C99B38] bg-[#C99B38]/5 border border-[#C99B38]/10';
      case 'LEAD_ACTIVITY_ADDED': return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
      default: return 'text-gray-600 bg-gray-50 border border-gray-200/60';
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#0B2D5B] px-4 sm:px-8 py-8 space-y-8 font-sans antialiased">
      
      {/* Dynamic Greeting Deck */}
      <div className="border-b border-[#C99B38]/10 pb-6">
        <span className="text-xs uppercase tracking-widest text-[#C99B38] font-bold">Trading Centralized Nexus</span>
        <h1 className="text-3xl font-serif text-[#0B2D5B] tracking-wide mt-1">Dashboard</h1>
        <p className="text-sm text-gray-500 font-light mt-0.5">
          {isAdmin
            ? "Welcome back, Administrator! Reviewing absolute operational cross-sections and system infrastructure logs."
            : `Welcome back, ${user.fullName}! Reviewing scheduled milestones, pipeline states, and transaction histories.`}
        </p>
      </div>

      {/* Metric Cards Carousel Track */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {stats.map((stat, index) => {
          const isNotificationCard = stat.title === 'Unread Notifications';
          const cardContent = (
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">{stat.title}</p>
                <p className="text-3xl font-serif text-[#0B2D5B] mt-2 font-normal">{stat.value}</p>
              </div>
              <div className={`${stat.color} text-white p-3 rounded-lg shadow-md shrink-0`}>
                <stat.icon size={20} />
              </div>
            </div>
          );

          if (isNotificationCard) {
            return (
              <Link 
                key={index} 
                to="/crm/notifications" 
                className="bg-white rounded-xl p-5 border border-amber-600/20 hover:border-amber-600 shadow-sm hover:shadow-md transition-all duration-300 block cursor-pointer group"
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <div key={index} className="bg-white rounded-xl p-5 border border-[#C99B38]/10 shadow-sm hover:border-[#C99B38]/30 transition-all duration-300">
              {cardContent}
            </div>
          );
        })}
      </div>

      {/* Core Analytic Charts (Admin View) */}
      {isAdmin ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-[#C99B38]/10 shadow-sm">
            <h2 className="text-sm font-serif uppercase tracking-wider text-[#0B2D5B] mb-6">Lead Pipeline Manifest</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={pipeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="_id" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip cursor={{ fill: '#FBF7EF' }} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #C99B38' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="total" fill="#0B2D5B" radius={[4, 4, 0, 0]} name="Active Leads" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-6 border border-[#C99B38]/10 shadow-sm">
            <h2 className="text-sm font-serif uppercase tracking-wider text-[#0B2D5B] mb-6">Employee Performance Matrix</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="_id" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #C99B38' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="leads" fill="#0B2D5B" radius={[2, 2, 0, 0]} name="Assigned" />
                <Bar dataKey="won" fill="#047857" radius={[2, 2, 0, 0]} name="Won" />
                <Bar dataKey="lost" fill="#b91c1c" radius={[2, 2, 0, 0]} name="Lost" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        /* Operations Tracking & Progress Cards (Employee View) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-xl p-6 border border-[#C99B38]/10 shadow-sm">
            <h2 className="text-sm font-serif uppercase tracking-wider text-[#0B2D5B] mb-6 flex items-center gap-2">
              <FiActivity className="text-[#C99B38]" /> Personal Activity History
            </h2>
            <div className="flow-root max-h-[420px] overflow-y-auto pr-2 scrollbar-none">
              <ul className="-mb-8">
                {history.length === 0 ? (
                  <div className="text-center py-16 text-xs uppercase tracking-widest text-gray-400">
                    No historic transaction signatures mapped to this profile node.
                  </div>
                ) : (
                  history.map((act, actIdx) => (
                    <li key={act._id}>
                      <div className="relative pb-8">
                        {actIdx !== history.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-[1px] bg-gray-100" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white ${getActionColor(act.actionType)}`}>
                              <FiActivity size={13} />
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                            <div className="space-y-1">
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold text-[#0B2D5B] uppercase tracking-wide text-xs">
                                  {act.actionType.replace(/_/g, ' ')}
                                </span>
                                <span className="text-gray-400 font-light"> on Charter Lead </span>
                                <span className="font-medium text-[#0B2D5B] underline decoration-[#C99B38]/40 decoration-wavy">
                                  {act.leadId ? `${act.leadId.customerName} (${act.leadId.leadCode})` : 'N/A'}
                                </span>
                              </p>
                              {act.note && (
                                <p className="text-xs text-gray-500 bg-[#FBF7EF] border border-gray-100 p-2 rounded italic max-w-xl font-light">
                                  "{act.note}"
                                </p>
                              )}
                            </div>
                            <div className="text-right text-[11px] font-mono text-gray-400 whitespace-nowrap pt-0.5">
                              {new Date(act.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-xl p-6 border border-[#C99B38]/10 shadow-sm flex flex-col justify-between">
            <div className="space-y-5">
              <h2 className="text-sm font-serif uppercase tracking-wider text-[#0B2D5B]">Yield Indexes</h2>
              
              <div className="bg-[#FBF7EF] p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Leads Dispatched</p>
                  <p className="text-2xl font-serif text-[#0B2D5B] mt-1">{summary?.totalLeads || 0}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[#0B2D5B] bg-white border border-[#0B2D5B]/10 px-2.5 py-1 rounded font-bold">
                  Active: {summary?.activeLeads || 0}
                </span>
              </div>

              <div className="bg-[#FBF7EF] p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Leads Cleared</p>
                  <p className="text-2xl font-serif text-emerald-800 mt-1">{summary?.completedTasks || 0}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded font-bold">
                  Conversion: {summary?.totalLeads ? Math.round((summary.completedTasks / summary.totalLeads) * 100) : 0}%
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 mt-6">
              <p className="text-[11px] text-gray-400 font-light text-center leading-normal">
                To alter pipeline stages, secure price structures, or log operational notes, visit the internal <b className="font-semibold text-[#0B2D5B]">Leads</b> console tree.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Communications Block */}
      <div className="bg-white rounded-xl p-6 border border-[#C99B38]/10 shadow-sm">
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-sm font-serif uppercase tracking-wider text-[#0B2D5B]">System Telemetry Notifications</h2>
            <p className="text-xs text-gray-400 font-light mt-0.5">Task dispatches, structural procurement modifications, and general core adjustments.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/40">
            <FiBell size={12} /> {unreadCount} unread node items
          </span>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-16 text-xs uppercase tracking-widest text-gray-400">No communication packets transmitted to this terminal.</div>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => (
              <div key={notification._id} className={`p-4 rounded-lg border transition-colors ${notification.isRead ? 'border-gray-100 bg-white hover:bg-[#FBF7EF]/20' : 'border-amber-600/20 bg-amber-50/20'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-700 font-light">{notification.message}</p>
                  <span className="text-[10px] font-mono text-gray-400 shrink-0">{new Date(notification.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-3 flex gap-2 text-[10px] uppercase tracking-wider font-bold">
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-500 border border-gray-200/40">{notification.type}</span>
                  {notification.isRead ? (
                    <span className="px-2 py-0.5 bg-emerald-50 rounded text-emerald-800 border border-emerald-200/50">Read</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-100 rounded text-amber-800 border border-amber-200/60">Unread</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cluster Stage Distributions Grid Container */}
      <div className="bg-white rounded-xl p-6 border border-[#C99B38]/10 shadow-sm">
        <h2 className="text-sm font-serif uppercase tracking-wider text-[#0B2D5B] mb-5">Lead Segment Distribution Matrix</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {summary?.stageCounts && Object.entries(summary.stageCounts).map(([stage, count]) => (
            <div key={stage} className="text-center p-4 bg-[#FBF7EF]/40 rounded-lg border border-gray-100/70 hover:border-[#C99B38]/30 hover:bg-[#FBF7EF] transition-all duration-200">
              <p className="text-2xl font-serif text-[#0B2D5B] font-normal">{count}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis">{getStageDisplay(stage)}</p>
            </div>
          ))}
          {!summary?.stageCounts || Object.keys(summary.stageCounts).length === 0 ? (
            <div className="col-span-full text-center py-8 text-xs uppercase tracking-widest text-gray-400 bg-[#FBF7EF]/10">
              No mapped stages matching this transaction sector.
            </div>
          ) : null}
        </div>
      </div>

    </div>
  );
}