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
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';

  const stats = isAdmin
    ? [
      { title: 'Total Users', value: summary?.users || 0, icon: FiUsers, color: 'bg-blue-500' },
      { title: 'Active Users', value: summary?.activeUsers || 0, icon: FiUsers, color: 'bg-green-500' },
      { title: 'Open Alerts', value: summary?.openAlerts || 0, icon: FiAlertCircle, color: 'bg-red-500' },
      { title: 'Pending Quotations', value: summary?.pendingQuotations || 0, icon: FiFileText, color: 'bg-yellow-500' },
      { title: 'Unread Notifications', value: unreadCount, icon: FiBell, color: 'bg-violet-500' }
    ]
    : [
      { title: 'My Total Leads', value: summary?.totalLeads || 0, icon: FiUsers, color: 'bg-blue-500' },
      { title: 'Active Leads', value: summary?.activeLeads || 0, icon: FiClock, color: 'bg-indigo-500' },
      { title: 'Pending Quotations', value: summary?.pendingQuotations || 0, icon: FiFileText, color: 'bg-yellow-500' },
      { title: 'Completed Tasks', value: summary?.completedTasks || 0, icon: FiCheckSquare, color: 'bg-emerald-500' },
      { title: 'Unread Notifications', value: unreadCount, icon: FiBell, color: 'bg-violet-500' }
    ];

  const getStageDisplay = (stage) => stage.replace(/_/g, ' ');

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'LEAD_CREATED': return 'text-blue-600 bg-blue-100';
      case 'LEAD_ASSIGNED': return 'text-purple-600 bg-purple-100';
      case 'LEAD_STAGE_CHANGED': return 'text-orange-600 bg-orange-100';
      case 'LEAD_ACTIVITY_ADDED': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          {isAdmin
            ? "Welcome back, Administrator! Here is the company-wide system overview."
            : `Welcome back, ${user.fullName}! Here is a summary of your assigned tasks and work history.`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const isNotificationCard = stat.title === 'Unread Notifications';
          const cardContent = (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-xl shadow-sm`}>
                <stat.icon className="text-white" size={24} />
              </div>
            </div>
          );

          if (isNotificationCard) {
            return (
              <Link 
                key={index} 
                to="/crm/notifications" 
                className="card hover:shadow-md transition duration-200 hover:border-violet-300 bg-gradient-to-br hover:from-violet-50/20 hover:to-white block cursor-pointer"
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <div key={index} className="card hover:shadow-md transition duration-200">
              {cardContent}
            </div>
          );
        })}
      </div>

      {isAdmin ? (
        /* Admin-only charts */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Pipeline</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Employee Performance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="leads" fill="#3b82f6" name="Total Leads" />
                <Bar dataKey="won" fill="#10b981" name="Won" />
                <Bar dataKey="lost" fill="#ef4444" name="Lost" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        /* Employee History & Task Feed */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiActivity className="text-blue-500" /> My Activity History
            </h2>
            <div className="flow-root max-h-[450px] overflow-y-auto pr-2">
              <ul className="-mb-8">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No recent activities recorded for your account.
                  </div>
                ) : (
                  history.map((act, actIdx) => (
                    <li key={act._id}>
                      <div className="relative pb-8">
                        {actIdx !== history.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getActionColor(act.actionType)}`}>
                              <FiActivity size={16} />
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-800">
                                <span className="font-semibold text-gray-950">{act.actionType.replace(/_/g, ' ')}</span>{' '}
                                on Lead{' '}
                                <span className="font-medium text-blue-600">
                                  {act.leadId ? `${act.leadId.customerName} (${act.leadId.leadCode})` : 'N/A'}
                                </span>
                              </p>
                              {act.note && (
                                <p className="text-xs text-gray-500 mt-1 italic">
                                  "{act.note}"
                                </p>
                              )}
                            </div>
                            <div className="text-right text-xs whitespace-nowrap text-gray-500">
                              <time dateTime={act.createdAt}>
                                {new Date(act.createdAt).toLocaleString()}
                              </time>
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

          <div className="card flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Performance</h2>
              <div className="space-y-4">
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Leads Assigned</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{summary?.totalLeads || 0}</p>
                  </div>
                  <span className="text-xs text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full font-medium">Active: {summary?.activeLeads || 0}</span>
                </div>

                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Leads Won</p>
                    <p className="text-2xl font-bold text-emerald-900 mt-1">{summary?.completedTasks || 0}</p>
                  </div>
                  <span className="text-xs text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full font-medium">
                    Rate: {summary?.totalLeads ? Math.round((summary.completedTasks / summary.totalLeads) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                Need details? Visit the <b>Leads</b> tab in the sidebar to update customer stages or margins.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-500">Tasks, purchase alerts, and admin updates for your account.</p>
          </div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-sm font-semibold">
            <FiBell size={16} /> {unreadCount} unread
          </span>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No new notifications yet.</div>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => (
              <div key={notification._id} className={`p-4 rounded-2xl border ${notification.isRead ? 'border-gray-200 bg-white' : 'border-violet-200 bg-violet-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                  <span className="text-xs text-gray-500">{new Date(notification.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                  <span className="px-2 py-1 bg-gray-100 rounded-full">{notification.type}</span>
                  {notification.isRead ? (
                    <span className="px-2 py-1 bg-green-100 rounded-full text-green-700">Read</span>
                  ) : (
                    <span className="px-2 py-1 bg-violet-100 rounded-full text-violet-700">Unread</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stage Distribution */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Stage Distribution</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {summary?.stageCounts && Object.entries(summary.stageCounts).map(([stage, count]) => (
            <div key={stage} className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100/50 transition">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{getStageDisplay(stage)}</p>
            </div>
          ))}
          {!summary?.stageCounts || Object.keys(summary.stageCounts).length === 0 ? (
            <div className="col-span-full text-center py-4 text-gray-500 text-sm">
              No active stages to display.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}