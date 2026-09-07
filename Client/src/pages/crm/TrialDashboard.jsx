import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiGrid, FiBell, FiCheckSquare, FiUsers, FiMessageSquare,
  FiSend, FiCheck, FiClock, FiPlus, FiUpload, FiFileText,
  FiArrowRight, FiPhone, FiAlertCircle, FiTrendingUp, FiZap, FiDownload
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { leadsApi } from '../../api/leads';
import { taskApi } from '../../api/task';
import { notificationsApi } from '../../api/notifications';
import { salesApi } from '../../api/sales';
import { useAuth } from '../../hooks/useAuth';
import { socketService } from '../../services/socket';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.05 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20 } }
};

export default function TrialDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'notifications' | 'tasks' | 'leads' | 'chat'

  // Data States
  const [myLeads, setMyLeads] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [loading, setLoading] = useState(true);

  // Task Completion Modal
  const [completionTaskId, setCompletionTaskId] = useState(null);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [completionFile, setCompletionFile] = useState(null);
  const [submittingCompletion, setSubmittingCompletion] = useState(false);

  useEffect(() => {
    loadTrialDashboardData();
  }, [user]);

  useEffect(() => {
    const skt = socketService.connect(user);
    if (skt) {
      const handleBroadcast = (msg) => {
        if (msg) setChatMessages(prev => [...prev, msg]);
      };
      skt.on('sales_chat_message', handleBroadcast);
      return () => {
        skt.off('sales_chat_message', handleBroadcast);
      };
    }
  }, [user]);

  const loadTrialDashboardData = async () => {
    setLoading(true);
    try {
      const [leadsRes, tasksRes, notifRes, chatRes] = await Promise.all([
        leadsApi.getLeads({ myLeadsOnly: 'true' }),
        taskApi.getTasks(),
        notificationsApi.getNotifications().catch(() => ({ success: false })),
        salesApi.getCoachingMessages().catch(() => ({ success: false }))
      ]);

      if (leadsRes.success) setMyLeads(leadsRes.data?.leads || []);
      if (tasksRes.success) setMyTasks(tasksRes.data?.tasks || []);
      if (notifRes.success) setNotifications(notifRes.data?.notifications || notifRes.notifications || []);
      if (chatRes && Array.isArray(chatRes)) setChatMessages(chatRes);
      else if (chatRes && chatRes.data?.messages) setChatMessages(chatRes.data.messages);
    } catch (err) {
      console.error('Trial dashboard load error:', err);
      toast.error('Failed to load Trial Executive Dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setSendingChat(true);
    try {
      const text = chatInput.trim();
      const res = await salesApi.sendCoachingMessage(text);
      if (res) {
        const skt = socketService.connect(user);
        const msgPayload = {
          _id: res._id || `msg_${Date.now()}`,
          senderId: user._id,
          senderName: user.fullName || user.name || 'Trial Executive',
          senderRole: user.role || 'TRIAL_EXECUTIVE',
          content: text,
          createdAt: new Date()
        };
        if (skt) skt.emit('send_sales_chat_message', msgPayload);
        setChatMessages(prev => [...prev, msgPayload]);
        setChatInput('');
      }
    } catch (err) {
      toast.error('Failed to send chat message');
    } finally {
      setSendingChat(false);
    }
  };

  const handleTaskStatusUpdate = async (e) => {
    e.preventDefault();
    if (!completionTaskId) return;
    setSubmittingCompletion(true);
    try {
      const formData = new FormData();
      formData.append('status', 'COMPLETED');
      formData.append('remarks', completionRemarks);
      if (completionFile) formData.append('file', completionFile);

      const res = await taskApi.updateTaskStatus(completionTaskId, formData);
      if (res.success) {
        toast.success('Task completion file submitted to Manager! 🎉');
        setCompletionTaskId(null);
        setCompletionRemarks('');
        setCompletionFile(null);
        const tasksRes = await taskApi.getTasks();
        if (tasksRes.success) setMyTasks(tasksRes.data?.tasks || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task status');
    } finally {
      setSubmittingCompletion(false);
    }
  };

  // Helper: Format message text with Clickable Lead Codes
  const renderMessageContent = (content, leadList = []) => {
    if (!content) return null;
    const parts = content.split(/(\b(?:LD|LEAD)-[A-Za-z0-9-]+|\b[0-9a-fA-F]{24}\b)/g);
    return (
      <span>
        {parts.map((part, idx) => {
          const matchedLead = leadList.find(l => 
            l.leadCode === part || String(l._id) === part
          );
          if (matchedLead || /^(?:LD|LEAD)-/.test(part)) {
            const targetId = matchedLead ? matchedLead._id : part;
            return (
              <Link
                key={idx}
                to={`/crm/leads/${targetId}`}
                className="bg-teal-950/80 hover:bg-teal-900 border border-teal-700/60 text-teal-300 font-mono font-bold text-[10px] px-1.5 py-0.5 rounded mx-0.5 inline-flex items-center gap-1 transition underline cursor-pointer"
                title="Click to open Lead Manifest"
              >
                📄 {matchedLead ? matchedLead.leadCode : part}
              </Link>
            );
          }
          return part;
        })}
      </span>
    );
  };

  const pendingTasksCount = myTasks.filter(t => t.status !== 'COMPLETED').length;
  const completedTasksCount = myTasks.filter(t => t.status === 'COMPLETED').length;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto w-full min-w-0 font-sans antialiased text-[var(--crm-ink-soft)] bg-[var(--crm-bg)] pb-16">
      
      {/* Trial Header Bar */}
      <motion.div variants={blockVariants} className="w-full bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 sm:p-5 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm text-left">
        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-[0.25em] text-teal-400 font-bold block font-mono">TRIAL EXECUTIVE WORKSPACE</span>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--crm-heading)] tracking-tight flex items-center gap-2">
            <FiZap className="text-amber-400" size={22} /> Trial Sales Executive Console
          </h1>
          <p className="text-xs text-[var(--crm-ink-faint)] font-light">
            Executive: <strong className="text-[var(--crm-heading)] font-semibold font-mono">{user?.fullName || user?.name}</strong> &bull; Assigned Leads starting at <span className="text-teal-400 font-mono font-bold uppercase">Lead Qualification</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={loadTrialDashboardData}
            className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border border-[var(--crm-line)] px-3 py-2 text-[10px] uppercase font-bold tracking-wider rounded transition cursor-pointer"
          >
            Refresh Data
          </button>
        </div>
      </motion.div>

      {/* Tabs Navigation */}
      <motion.div variants={blockVariants} className="bg-[var(--crm-bg-raised)] border-y border-[var(--crm-line)] px-4 py-1 flex overflow-x-auto custom-scrollbar shadow-sm min-w-0 w-full">
        <nav className="flex space-x-6 min-w-max px-1">
          {[
            { id: 'dashboard', label: 'Dashboard Overview', icon: FiGrid },
            { id: 'notifications', label: `Notifications (${notifications.filter(n => !n.isRead).length})`, icon: FiBell },
            { id: 'tasks', label: `My Tasks (${pendingTasksCount})`, icon: FiCheckSquare },
            { id: 'leads', label: `Assigned Leads (${myLeads.length})`, icon: FiUsers },
            { id: 'chat', label: 'Sales Team Chat Hub', icon: FiMessageSquare }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 text-[11px] uppercase tracking-wider font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-400'
                  : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
              }`}
            >
              <tab.icon size={14} className={activeTab === tab.id ? 'text-teal-400' : 'text-inherit'} />
              {tab.label}
            </button>
          ))}
        </nav>
      </motion.div>

      {/* Main Tab Screen Render */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3 font-mono">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs tracking-widest uppercase text-[var(--crm-ink-faint)]">Syncing Trial Executive Data...</p>
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="w-full space-y-6 text-left"
          >
            {/* TAB 1: DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* KPI Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-lg shadow-sm">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold">ASSIGNED LEADS</span>
                    <p className="text-2xl font-bold text-teal-400 mt-1">{myLeads.length}</p>
                    <span className="text-[9px] text-[var(--crm-ink-faint)] mt-1 block">Starting at Qualification</span>
                  </div>

                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-lg shadow-sm">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold">PENDING TASKS</span>
                    <p className="text-2xl font-bold text-amber-400 mt-1">{pendingTasksCount}</p>
                    <span className="text-[9px] text-[var(--crm-ink-faint)] mt-1 block">Assigned by Manager</span>
                  </div>

                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-lg shadow-sm">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold">COMPLETED TASKS</span>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{completedTasksCount}</p>
                    <span className="text-[9px] text-[var(--crm-ink-faint)] mt-1 block">Verified & Approved</span>
                  </div>

                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-lg shadow-sm">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold">UNREAD ALERTS</span>
                    <p className="text-2xl font-bold text-rose-400 mt-1">{notifications.filter(n => !n.isRead).length}</p>
                    <span className="text-[9px] text-[var(--crm-ink-faint)] mt-1 block">Follow-up Notifications</span>
                  </div>
                </div>

                {/* Quick Quick-Action Overview Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Assigned Leads Table preview */}
                  <div className="lg:col-span-8 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3">
                      <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold flex items-center gap-1.5">
                        <FiUsers className="text-teal-400" size={14} /> My Assigned Leads
                      </h3>
                      <button onClick={() => setActiveTab('leads')} className="text-[10px] font-mono text-teal-400 font-bold hover:underline">
                        View All →
                      </button>
                    </div>

                    <div className="overflow-x-auto mt-4 font-mono text-xs">
                      {myLeads.length === 0 ? (
                        <div className="py-12 border border-dashed border-[var(--crm-line)] rounded text-center text-[var(--crm-ink-faint)] uppercase text-[10px]">
                          No assigned leads assigned yet.
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead>
                            <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest border-b border-[var(--crm-line)]">
                              <th className="py-2.5 px-3">Lead Code</th>
                              <th className="py-2.5 px-3">Customer</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3">Stage</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                            {myLeads.slice(0, 5).map((l) => (
                              <tr key={l._id} className="hover:bg-[var(--crm-bg-sunken)]/40 transition">
                                <td className="py-2.5 px-3 font-bold text-[var(--crm-heading)]">{l.leadCode}</td>
                                <td className="py-2.5 px-3 font-sans font-medium">{l.customerName}</td>
                                <td className="py-2.5 px-3">{l.productCategory}</td>
                                <td className="py-2.5 px-3">
                                  <span className="bg-teal-950/60 text-teal-400 border border-teal-800 text-[8px] px-2 py-0.5 rounded font-bold uppercase">
                                    {l.stage.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <Link to={`/crm/leads/${l._id}`} className="text-teal-400 font-bold hover:underline text-[10px]">
                                    Open Lead →
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Tasks List preview */}
                  <div className="lg:col-span-4 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm font-mono text-xs space-y-3">
                    <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3">
                      <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold flex items-center gap-1.5">
                        <FiCheckSquare className="text-amber-400" size={14} /> Assigned Tasks
                      </h3>
                      <button onClick={() => setActiveTab('tasks')} className="text-[10px] text-amber-400 font-bold hover:underline">
                        View All →
                      </button>
                    </div>

                    {myTasks.length === 0 ? (
                      <div className="py-12 border border-dashed border-[var(--crm-line)] rounded text-center text-[var(--crm-ink-faint)] uppercase text-[10px]">
                        No active manager tasks.
                      </div>
                    ) : (
                      myTasks.slice(0, 4).map((t) => (
                        <div key={t._id} className="p-3 border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)]/40 rounded space-y-1.5">
                          <div className="flex justify-between items-start">
                            <h5 className="font-bold text-[var(--crm-heading)] truncate max-w-[160px]">{t.title}</h5>
                            <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              t.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}>{t.status}</span>
                          </div>
                          <p className="text-[10px] text-[var(--crm-ink-faint)]">Due: {new Date(t.dueDate).toLocaleDateString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm font-mono text-xs space-y-4">
                <div className="border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                  <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold flex items-center gap-1.5">
                    <FiBell className="text-rose-400 animate-pulse" size={15} /> Notifications & Follow-up Alerts
                  </h3>
                  <span className="text-[10px] text-[var(--crm-ink-faint)]">Updated Live</span>
                </div>

                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="py-16 text-center text-[var(--crm-ink-faint)] uppercase tracking-widest text-[10px]">
                      No notification messages.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`p-3.5 border rounded-md flex items-start justify-between gap-3 transition ${
                          n.isRead ? 'bg-[var(--crm-bg-sunken)]/30 border-[var(--crm-line)]' : 'bg-teal-950/20 border-teal-800/60'
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="font-sans text-xs font-semibold text-[var(--crm-heading)]">{n.message}</p>
                          <span className="text-[9px] text-[var(--crm-ink-faint)] block font-mono">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {n.metadata?.leadId && (
                          <Link
                            to={`/crm/leads/${n.metadata.leadId}`}
                            className="bg-teal-900 hover:bg-teal-800 text-teal-200 text-[9px] font-bold uppercase px-2.5 py-1.5 rounded transition whitespace-nowrap cursor-pointer shrink-0"
                          >
                            Open Lead →
                          </Link>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: MY TASKS */}
            {activeTab === 'tasks' && (
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm font-mono text-xs space-y-4">
                <div className="border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                  <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold flex items-center gap-1.5">
                    <FiCheckSquare className="text-amber-400" size={15} /> Manager Assigned Tasks
                  </h3>
                  <span className="text-[10px] text-[var(--crm-ink-faint)]">{myTasks.length} Total Tasks</span>
                </div>

                <div className="overflow-x-auto mt-2">
                  {myTasks.length === 0 ? (
                    <div className="py-16 text-center text-[var(--crm-ink-faint)] uppercase tracking-widest text-[10px]">
                      No manager tasks assigned to you.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest border-b border-[var(--crm-line)]">
                          <th className="py-3 px-4">Task Title</th>
                          <th className="py-3 px-4">Due Date</th>
                          <th className="py-3 px-4">Priority</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                        {myTasks.map((task) => (
                          <tr key={task._id} className="hover:bg-[var(--crm-bg-sunken)]/40 transition">
                            <td className="py-3 px-4 font-semibold text-[var(--crm-heading)]">{task.title}</td>
                            <td className="py-3 px-4 text-[var(--crm-ink-faint)]">{new Date(task.dueDate).toLocaleDateString('en-IN')}</td>
                            <td className="py-3 px-4">
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase ${
                                task.priority === 'HIGH' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-slate-800 text-slate-300'
                              }`}>{task.priority}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase ${
                                task.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}>{task.status}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {task.status !== 'COMPLETED' ? (
                                <button
                                  onClick={() => {
                                    setCompletionTaskId(task._id);
                                    setCompletionRemarks('');
                                    setCompletionFile(null);
                                  }}
                                  className="bg-teal-700 hover:bg-teal-600 text-white font-bold text-[9px] uppercase px-3 py-1.5 rounded transition cursor-pointer"
                                >
                                  + Submit Completion
                                </button>
                              ) : (
                                <span className="text-[9px] text-emerald-400 font-bold">✓ Submitted</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: ASSIGNED LEADS */}
            {activeTab === 'leads' && (
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm font-mono text-xs space-y-4">
                <div className="border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                  <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold flex items-center gap-1.5">
                    <FiUsers className="text-teal-400" size={15} /> My Assigned Leads (Starting at Qualification)
                  </h3>
                  <span className="text-[10px] text-[var(--crm-ink-faint)]">{myLeads.length} Leads</span>
                </div>

                <div className="overflow-x-auto mt-2">
                  {myLeads.length === 0 ? (
                    <div className="py-16 text-center text-[var(--crm-ink-faint)] uppercase tracking-widest text-[10px]">
                      No leads assigned yet.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest border-b border-[var(--crm-line)]">
                          <th className="py-3 px-4">Lead Code</th>
                          <th className="py-3 px-4">Customer Name</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Priority</th>
                          <th className="py-3 px-4">Current Stage</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                        {myLeads.map((lead) => (
                          <tr key={lead._id} className="hover:bg-[var(--crm-bg-sunken)]/40 transition">
                            <td className="py-3 px-4 font-bold text-[var(--crm-heading)]">{lead.leadCode}</td>
                            <td className="py-3 px-4 font-sans font-medium">{lead.customerName}</td>
                            <td className="py-3 px-4">{lead.productCategory}</td>
                            <td className="py-3 px-4">
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase border ${
                                lead.priority === 'HOT' ? 'bg-rose-950 text-rose-400 border-rose-800' : 'bg-amber-950 text-amber-400 border-amber-800'
                              }`}>{lead.priority || 'WARM'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="bg-teal-950/80 text-teal-300 font-mono text-[8px] font-bold px-2 py-0.5 rounded border border-teal-800 uppercase">
                                {lead.stage?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Link
                                to={`/crm/leads/${lead._id}`}
                                className="bg-teal-700 hover:bg-teal-600 text-white font-bold text-[9px] uppercase px-3 py-1.5 rounded transition cursor-pointer inline-flex items-center gap-1"
                              >
                                View Lead Progression →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: SALES TEAM CHAT HUB */}
            {activeTab === 'chat' && (
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm flex flex-col h-[550px]">
                <div className="border-b border-[var(--crm-line)] pb-3 flex justify-between items-center shrink-0 font-mono">
                  <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold flex items-center gap-1.5">
                    <FiMessageSquare className="text-teal-400" size={15} /> Sales Team Chat Hub (Trial Exec & Sales Manager)
                  </h3>
                  <span className="text-[8px] text-emerald-400 font-mono font-bold animate-pulse">
                    🟢 Live Socket Connection
                  </span>
                </div>

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto my-3 pr-2 space-y-3 custom-scrollbar text-xs font-sans">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[var(--crm-ink-faint)] font-mono uppercase tracking-widest text-[9px]">
                      No messages yet. Send a message or lead ID to your Manager!
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.senderId === user._id || (msg.senderName && msg.senderName === (user.fullName || user.name));
                      const isManager = ['ADMIN', 'MANAGER', 'SALES_MANAGER'].includes(msg.senderRole);

                      return (
                        <div key={msg._id || Math.random()} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[80%] rounded-lg p-3 space-y-1 shadow-sm ${
                            isMe 
                              ? 'bg-teal-600 text-white' 
                              : isManager 
                                ? 'bg-indigo-950/80 border border-indigo-800 text-[var(--crm-heading)]' 
                                : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)]'
                          }`}>
                            <div className="flex justify-between items-center gap-4 text-[9px] font-mono font-bold opacity-80 border-b border-white/10 pb-1">
                              <span>{msg.senderName} ({msg.senderRole || 'Executive'})</span>
                            </div>
                            <div className="leading-relaxed break-words font-sans text-xs pt-1">
                              {renderMessageContent(msg.content, myLeads)}
                            </div>
                          </div>
                          <span className="text-[8px] text-[var(--crm-ink-faint)] font-mono mt-0.5 px-1">
                            {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Chat Input Form */}
                <form onSubmit={handleSendChatMessage} className="flex gap-2 shrink-0 border-t border-[var(--crm-line)] pt-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type message or paste Lead Code e.g. LD-1725... (Clickable link for Manager)"
                    className="flex-1 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition font-sans"
                  />
                  <button
                    type="submit"
                    disabled={sendingChat || !chatInput.trim()}
                    className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-mono font-bold text-xs px-4 py-2.5 rounded transition flex items-center justify-center cursor-pointer"
                  >
                    <FiSend size={14} />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TASK COMPLETION MODAL */}
      <AnimatePresence>
        {completionTaskId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-lg p-6 w-full max-w-md shadow-2xl relative text-[var(--crm-ink-soft)] font-mono text-left space-y-4"
            >
              <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2">
                  <FiUpload className="text-teal-400" size={16} /> Submit Task Completion File
                </h3>
                <button onClick={() => setCompletionTaskId(null)} className="text-xs text-[var(--crm-ink-faint)] hover:text-white font-bold">✕</button>
              </div>

              <form onSubmit={handleTaskStatusUpdate} className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Attach Verification File *</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setCompletionFile(e.target.files[0])}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2 rounded text-[10px]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Completion Remarks / Notes</label>
                  <textarea
                    rows={3}
                    value={completionRemarks}
                    onChange={(e) => setCompletionRemarks(e.target.value)}
                    placeholder="Describe work completed..."
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded outline-none resize-none font-sans"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={submittingCompletion}
                    className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold uppercase py-2.5 rounded text-[10px] tracking-wider transition cursor-pointer"
                  >
                    {submittingCompletion ? 'Submitting File...' : 'Submit to Manager'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompletionTaskId(null)}
                    className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] px-4 py-2.5 rounded text-[10px] font-bold uppercase cursor-pointer"
                  >
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
