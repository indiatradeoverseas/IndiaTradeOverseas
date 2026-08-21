import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPhone, 
  FiMail, 
  FiUserPlus, 
  FiCheckCircle, 
  FiFileText, 
  FiTrendingUp, 
  FiAward, 
  FiArrowUpRight, 
  FiArrowDownRight, 
  FiCalendar, 
  FiZap, 
  FiClock, 
  FiChevronRight, 
  FiUsers, 
  FiAlertCircle,
  FiRotateCw,
  FiPaperclip,
  FiDownload,
  FiFolder,
  FiCheckSquare
} from 'react-icons/fi';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { salesApi } from '../../api/sales';
import { leadsApi } from '../../api/leads';
import { taskApi } from '../../api/task';
import { sharedFilesApi } from '../../api/sharedFiles';

// Framer motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 18 } }
};

// Map lead stages into Commodity Trading Kanban Pipeline Stages
const KANBAN_STAGES = [
  { key: 'Lead', label: 'Lead', dbStages: ['NEW_LEAD', 'ASSIGNED', 'CONTACTED', 'LEAD_QUALIFICATION', 'FOLLOW_UP', 'REQUIREMENT_CAPTURED', 'REQUIREMENT_RECEIVED'] },
  { key: 'QuoteSent', label: 'Quote Sent', dbStages: ['QUOTATION_REQUIRED', 'QUOTATION_PENDING_APPROVAL', 'QUOTATION_APPROVED', 'QUOTATION_REQUESTED', 'QUOTATION_SHARED', 'QUOTATION_SENT'] },
  { key: 'ICPO', label: 'ICPO Pending', dbStages: ['LOI_PO_PENDING', 'PO_RECEIVED', 'PRICE_DISCUSSION', 'NEGOTIATION', 'SAMPLE_SENT'] },
  { key: 'Documentation', label: 'Documentation', dbStages: ['DOCUMENT_PENDING', 'PAYMENT_PENDING', 'ORDER_CONFIRMED', 'DISPATCH_PENDING', 'DISPATCH_PLANNED', 'PAYMENT_DISCUSSION'] },
  { key: 'Closed', label: 'Closed', dbStages: ['CLOSED_WON', 'DEAL_WON'] }
];

export default function SalesExecutiveDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(true);

  // Daily Action View States
  const [performance, setPerformance] = useState(null);
  const [deals, setDeals] = useState([]);
  const [todos, setTodos] = useState([]);
  
  // Gamification View States
  const [leaderboardTab, setLeaderboardTab] = useState('monthly');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [lbLoading, setLbLoading] = useState(false);

  // Manager Tasks & Shared Files States
  const [managerTasks, setManagerTasks] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  // Greeting Message based on local hour
  const [greeting, setGreeting] = useState('Good Morning');
  
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting('Good Morning');
    else if (hr < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Fetch performance and activities
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Performance targets & activity count
      const perfRes = await salesApi.getMyPerformance();
      if (perfRes.success) {
        setPerformance(perfRes.data.performance);
      }

      // 2. Fetch User's Deals
      const leadsRes = await leadsApi.getLeads({ limit: 100 });
      if (leadsRes.success) {
        // Filter leads assigned to the logged-in user
        const myLeads = (leadsRes.data.leads || []).filter(lead => {
          const ownerId = lead.assignedTo?._id || lead.assignedTo;
          return ownerId && String(ownerId) === String(user._id);
        });
        setDeals(myLeads);

        // 3. Generate priority to-dos from active deal status
        generateToDos(myLeads);
      }

      // 4. Fetch initial leaderboard (monthly)
      await fetchLeaderboard('monthly');

      // 5. Fetch Manager's Tasks assigned to me
      try {
        const tasksRes = await taskApi.getTasks({ status: 'PENDING,IN_PROGRESS' });
        if (tasksRes.success) {
          setManagerTasks(tasksRes.data?.tasks || []);
        }
      } catch (err) {
        console.error('Error fetching manager tasks:', err);
      }

      // 6. Fetch Shared Files received by me
      try {
        const filesRes = await sharedFilesApi.getSharedFiles({ direction: 'received' });
        if (filesRes.success) {
          setSharedFiles(filesRes.files || []);
        }
      } catch (err) {
        console.error('Error fetching shared files:', err);
      }

    } catch (err) {
      console.error('Error fetching executive dashboard details:', err);
      toast.error('Could not load recent performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Handle Leaderboard Tab Switching
  const fetchLeaderboard = async (period) => {
    setLbLoading(true);
    try {
      const lbRes = await salesApi.getLeaderboard({ period });
      if (lbRes.success) {
        setLeaderboardData(lbRes.leaderboard || []);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLbLoading(false);
    }
  };

  const handleLbTabChange = (period) => {
    setLeaderboardTab(period);
    fetchLeaderboard(period);
  };

  // Generate dynamic to-dos from current deals in pipeline
  const generateToDos = (myLeads) => {
    const actionList = [];
    
    // Sort leads by priority (HOT first)
    const hotLeads = myLeads.filter(l => l.priority === 'HOT');
    const icpoPending = myLeads.filter(l => l.stage === 'LOI_PO_PENDING' || l.stage === 'NEGOTIATION');
    const docPending = myLeads.filter(l => l.stage === 'DOCUMENT_PENDING');

    hotLeads.forEach((lead) => {
      actionList.push({
        id: `todo-hot-${lead._id}`,
        text: `Call ${lead.customerName} for FCO closure (HOT Lead)`,
        leadId: lead._id,
        category: 'CALL',
        done: false
      });
    });

    icpoPending.forEach((lead) => {
      actionList.push({
        id: `todo-icpo-${lead._id}`,
        text: `Follow up on ICPO with ${lead.companyName || lead.customerName}`,
        leadId: lead._id,
        category: 'FOLLOW_UP',
        done: false
      });
    });

    docPending.forEach((lead) => {
      actionList.push({
        id: `todo-doc-${lead._id}`,
        text: `Upload BL / Draft Documents for ${lead.companyName || lead.customerName}`,
        leadId: lead._id,
        category: 'DOCUMENT',
        done: false
      });
    });

    // Default checklist fallback if action list is dry
    if (actionList.length === 0) {
      actionList.push(
        { id: 'todo-def-1', text: 'Call prospective clients for ICPO approvals', category: 'CALL', done: false },
        { id: 'todo-def-2', text: 'Follow up on FCO with ABC Corp', category: 'FOLLOW_UP', done: false },
        { id: 'todo-def-3', text: 'Upload BL for shipment #123', category: 'DOCUMENT', done: false }
      );
    }

    setTodos(actionList);
  };

  const toggleTodo = (id) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  // Update task status from Manager's Tasks section
  const handleTaskStatusUpdate = async (taskId, newStatus) => {
    setUpdatingTaskId(taskId);
    try {
      const res = await taskApi.updateTaskStatus(taskId, newStatus, 'Status updated by executive');
      if (res.success) {
        toast.success(`Task status updated to ${newStatus}`);
        setManagerTasks(prev => 
          prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t)
              .filter(t => newStatus !== 'COMPLETED') // remove completed tasks from daily action list if you want, or keep them. Let's filter out COMPLETED to keep list actionable
        );
      }
    } catch (err) {
      toast.error('Failed to update task status');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Download Shared File helper
  const handleDownloadSharedFile = async (fileId, fileName) => {
    try {
      const response = await sharedFilesApi.downloadFile(fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Download completed');
    } catch (err) {
      console.error('File download error:', err);
      toast.error('Could not download file');
    }
  };

  // Download Task File Attachment
  const handleDownloadTaskFile = (fileUrl, originalName) => {
    if (!fileUrl) return;
    // Construct absolute URL to download the file from server static files / uploads directory
    // If it's a relative path starting with 'uploads', prepend backend base url
    const baseUrl = 'http://localhost:5000/'; // fallback local api base
    const absoluteUrl = fileUrl.startsWith('http') ? fileUrl : `${baseUrl}${fileUrl}`;
    
    const link = document.createElement('a');
    link.href = absoluteUrl;
    link.setAttribute('download', originalName || 'attachment');
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Calculation for Targets
  const targetVal = performance?.target?.targetValue || 2500000; // default ₹25 Lakhs
  const achievedVal = performance?.revenue || 0;
  const remainingVal = Math.max(0, targetVal - achievedVal);
  const targetProgressPercent = Math.min(100, Math.round((achievedVal / targetVal) * 100));

  // Lead Conversion Calculation (Leads -> Orders)
  const totalMyLeads = performance?.totalLeads || deals.length || 0;
  const wonMyDeals = performance?.dealsWon || deals.filter(d => ['CLOSED_WON', 'DEAL_WON'].includes(d.stage)).length || 0;
  const conversionRate = totalMyLeads > 0 ? Math.round((wonMyDeals / totalMyLeads) * 100) : 0;

  // Render circular progress path definitions
  const radius = 50;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (targetProgressPercent / 100) * circumference;

  // Format monetary value
  const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  // Department ranking dataset (Metals, Agri, Energy - mapped from commodity categories)
  const departmentRankData = [
    { name: 'Metals Division', avgRevenue: 1850000, color: '#0f766e' },
    { name: 'Agri Commodities', avgRevenue: 1420000, color: '#0284c7' },
    { name: 'Energy Sectors', avgRevenue: 2240000, color: '#f59e0b' }
  ];

  // Map user rank status
  const myRankIndex = leaderboardData.findIndex(r => r.employeeId === user._id);
  const myRankNum = myRankIndex !== -1 ? myRankIndex + 1 : 3; // Mock #3 if not in top list yet
  const rankBadge = myRankNum === 1 ? '🥇 Gold' : myRankNum === 2 ? '🥈 Silver' : myRankNum === 3 ? '🥉 Bronze' : '⭐ Rep';

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="space-y-6 block pb-12 w-full max-w-full font-sans antialiased text-[var(--crm-ink-soft)] bg-[var(--crm-bg)]"
    >
      {/* Header Bar */}
      <motion.div variants={itemVariants} className="w-full bg-[var(--crm-bg-raised)] border-b border-[var(--crm-line)] px-6 py-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shadow-sm rounded-b-md">
        <div className="space-y-1 text-left flex-1 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.25em] text-teal-500 font-bold block font-mono">Commodity Trading Portal</span>
          <h1 className="text-2xl sm:text-3xl font-normal text-[var(--crm-heading)] tracking-tight">{greeting}, {user?.name || user?.fullName || 'Sales Executive'}</h1>
          <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-0.5">
            Role: <strong className="text-[var(--crm-heading)] font-semibold font-mono">Sales Executive ({user?.department || 'SALES'})</strong> &bull; Node Status: <span className="text-emerald-500 font-semibold font-mono">Live</span>
          </p>
        </div>
        <div className="flex gap-2 self-stretch md:self-auto font-mono">
          <button 
            onClick={loadDashboardData}
            className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border border-[var(--crm-line)] px-3.5 py-2 text-[10px] uppercase font-bold tracking-wider rounded transition shadow-sm cursor-pointer"
          >
            <FiRotateCw className={`${loading ? 'animate-spin' : ''}`} size={12} /> Sync Data
          </button>
          <div className="bg-[var(--crm-bg-sunken)] text-teal-400 border border-[var(--crm-line)] px-4 py-2 text-[10px] font-bold tracking-widest uppercase rounded flex items-center justify-center select-none shadow-sm">
            DESK MODE // ACTIVE
          </div>
        </div>
      </motion.div>

      {/* Tabs navigation */}
      <motion.div variants={itemVariants} className="bg-[var(--crm-bg-raised)] border-y border-[var(--crm-line)] px-6 py-1 flex overflow-x-auto scrollbar-none shadow-sm">
        <nav className="flex space-x-8 min-w-max">
          {[
            { id: 'daily', label: 'Daily Action View ("मेरा काम")', icon: FiClock },
            { id: 'leaderboard', label: 'Leaderboard & Gamification', icon: FiAward },
            { id: 'shared_files', label: 'Shared Files ("साझा फ़ाइलएं")', icon: FiFolder }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3.5 px-1 border-b-2 text-[11px] uppercase tracking-widest font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-500'
                  : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)]'
              }`}
            >
              <tab.icon size={13} className={activeTab === tab.id ? 'text-teal-500' : 'text-inherit'} />
              {tab.label}
            </button>
          ))}
        </nav>
      </motion.div>

      {/* Main Tab Screen Render */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3">
            <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono tracking-widest uppercase text-[var(--crm-ink-faint)]">Loading Dashboard Metrics...</p>
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="px-6 space-y-6"
          >
            {/* TAB 1: DAILY ACTION VIEW */}
            {activeTab === 'daily' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left/Middle Column (KPIs, Target Progress, Deal Pipeline) */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Manager's Tasks Card Section */}
                  {managerTasks.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[var(--crm-bg-raised)] border border-teal-900/50 p-5 rounded-lg shadow-sm text-left mb-6"
                    >
                      <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-teal-400">
                          <FiCheckSquare size={14} /> Assigned Tasks from Manager
                        </span>
                        <span className="bg-teal-950/40 text-teal-400 font-mono text-[9px] px-2 py-0.5 rounded-full font-bold border border-teal-900/30">
                          {managerTasks.length} Pending
                        </span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {managerTasks.map((task) => (
                          <div 
                            key={task._id} 
                            className="p-4 border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)]/40 hover:bg-[var(--crm-bg-sunken)] rounded-md transition text-xs font-mono space-y-3 flex flex-col justify-between"
                          >
                            <div className="space-y-1">
                              <div className="flex justify-between items-start gap-2">
                                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                                  task.priority === 'HIGH' ? 'bg-rose-950/40 text-rose-400 border border-rose-900/30' :
                                  task.priority === 'MEDIUM' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' :
                                  'bg-slate-800/40 text-slate-400 border border-slate-700/30'
                                }`}>
                                  {task.priority}
                                </span>
                                <span className="text-[8px] text-[var(--crm-ink-faint)] font-light">
                                  Due: {new Date(task.dueDate).toLocaleDateString('en-IN')}
                                </span>
                              </div>
                              <h4 className="font-sans font-bold text-sm text-[var(--crm-heading)] pt-1">
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="font-sans text-[var(--crm-ink-soft)] text-[11px] leading-relaxed pt-1 whitespace-pre-wrap">
                                  {task.description}
                                </p>
                              )}
                              <p className="text-[9px] text-[var(--crm-ink-faint)] pt-1">
                                Assigned by: <strong className="text-[var(--crm-ink-soft)]">{task.assignedBy?.name || 'Manager'}</strong>
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-[var(--crm-line)]/50 mt-2">
                              {/* File Attachment Link */}
                              {task.fileUrl ? (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadTaskFile(task.fileUrl, task.fileOriginalName)}
                                  className="text-teal-400 hover:text-teal-300 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                >
                                  <FiPaperclip size={11} /> Attachment
                                </button>
                              ) : (
                                <span className="text-[var(--crm-ink-faint)] text-[9px]">No attachment</span>
                              )}

                              {/* Status Action Selector */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-[var(--crm-ink-faint)]">Status:</span>
                                <select
                                  value={task.status}
                                  disabled={updatingTaskId === task._id}
                                  onChange={(e) => handleTaskStatusUpdate(task._id, e.target.value)}
                                  className="bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] font-mono text-[9px] px-2 py-1 rounded outline-none cursor-pointer hover:border-teal-500 transition disabled:opacity-50"
                                >
                                  <option value="PENDING">Pending</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="COMPLETED">Completed</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* KPI Cards Row (6 in a row) */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { label: 'Calls Today', val: performance?.callsLogged ?? 0, trend: '↑', text: 'vs yesterday', color: 'text-teal-400 bg-teal-950/20', border: 'border-[var(--crm-line)]', icon: FiPhone },
                      { label: 'Emails Sent', val: performance?.emailsLogged ?? 0, trend: '↑', text: 'vs yesterday', color: 'text-indigo-400 bg-indigo-950/20', border: 'border-[var(--crm-line)]', icon: FiMail },
                      { label: 'Leads Gen', val: totalMyLeads, trend: '↑', text: 'vs yesterday', color: 'text-cyan-400 bg-cyan-950/20', border: 'border-[var(--crm-line)]', icon: FiUserPlus },
                      { label: 'Follow-ups', val: performance?.target?.targetDeals || 12, trend: '↓', text: 'vs yesterday', color: 'text-amber-400 bg-amber-950/20', border: 'border-[var(--crm-line)]', icon: FiCalendar },
                      { label: 'Quotes Sent', val: deals.filter(d => KANBAN_STAGES[1].dbStages.includes(d.stage)).length, trend: '↑', text: 'vs yesterday', color: 'text-sky-400 bg-sky-950/20', border: 'border-[var(--crm-line)]', icon: FiFileText },
                      { label: 'Closed Won', val: wonMyDeals, trend: '↑', text: 'vs yesterday', color: 'text-emerald-400 bg-emerald-950/20', border: 'border-[var(--crm-line)]', icon: FiCheckCircle }
                    ].map((kpi, idx) => (
                      <motion.div 
                        key={idx}
                        whileHover={{ y: -3 }}
                        className={`bg-[var(--crm-bg-raised)] border ${kpi.border} p-4 rounded-lg flex flex-col justify-between shadow-sm transition-all`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold font-mono">{kpi.label}</span>
                          <div className={`p-1.5 rounded-md ${kpi.color}`}>
                            <kpi.icon size={12} />
                          </div>
                        </div>
                        <div className="mt-3 text-left">
                          <p className="text-xl font-semibold text-[var(--crm-heading)] leading-tight tracking-tight">{kpi.val}</p>
                          <span className={`text-[9px] font-mono font-medium flex items-center gap-0.5 mt-1 ${
                            kpi.trend === '↑' ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {kpi.trend} {kpi.trend === '↑' ? '12%' : '4%'} <span className="text-[var(--crm-ink-faint)] font-light">{kpi.text}</span>
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Target Progress Panel (Middle) */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>Monthly Performance Target</span>
                      <FiTrendingUp className="text-teal-500" size={14} />
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center mt-5">
                      
                      {/* Circular Gauge */}
                      <div className="md:col-span-4 flex flex-col items-center justify-center py-2">
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            {/* Background Circle */}
                            <circle
                              className="text-[var(--crm-bg-sunken)]"
                              strokeWidth={strokeWidth}
                              stroke="currentColor"
                              fill="transparent"
                              r={normalizedRadius}
                              cx={radius}
                              cy={radius}
                            />
                            {/* Progress Circle */}
                            <circle
                              className="text-teal-500 transition-all duration-700 ease-out"
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${circumference} ${circumference}`}
                              style={{ strokeDashoffset }}
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="transparent"
                              r={normalizedRadius}
                              cx={radius}
                              cy={radius}
                            />
                          </svg>
                          <div className="absolute text-center">
                            <span className="text-xl font-bold text-[var(--crm-heading)] leading-none">{targetProgressPercent}%</span>
                            <span className="text-[8px] uppercase block font-mono text-[var(--crm-ink-faint)] font-bold mt-0.5">Achieved</span>
                          </div>
                        </div>
                      </div>

                      {/* Stat Breakdown */}
                      <div className="md:col-span-8 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-md">
                            <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-mono block">Monthly Target</span>
                            <strong className="text-sm font-semibold text-[var(--crm-ink-soft)] block mt-1">{currency(targetVal)}</strong>
                          </div>
                          <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-md">
                            <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-mono block">Achieved</span>
                            <strong className="text-sm font-semibold text-emerald-300 block mt-1">{currency(achievedVal)}</strong>
                          </div>
                          <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-md">
                            <span className="text-[9px] uppercase tracking-wider text-amber-400 font-mono block">Remaining</span>
                            <strong className="text-sm font-semibold text-amber-300 block mt-1">{currency(remainingVal)}</strong>
                          </div>
                        </div>

                        {/* Conversion Rate */}
                        <div className="flex items-center justify-between border-t border-[var(--crm-line)] pt-4">
                          <div>
                            <span className="text-xs font-semibold text-[var(--crm-heading)] block">Lead-to-Order Conversion Rate</span>
                            <span className="text-[10px] text-[var(--crm-ink-faint)]">Total won deals divided by assigned leads</span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-normal text-teal-400 tracking-tight font-mono">{conversionRate}%</span>
                            <div className="w-24 bg-[var(--crm-bg-sunken)] h-1.5 rounded-full overflow-hidden mt-1 border border-[var(--crm-line)]">
                              <div className="bg-teal-500 h-full" style={{ width: `${conversionRate}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Deals Pipeline Kanban (Bottom) */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>My Deals Pipeline</span>
                      <span className="text-[9px] font-mono font-medium bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-2 py-0.5 rounded text-[var(--crm-ink-soft)] uppercase">
                        Commodity Stages
                      </span>
                    </h3>

                    {/* Kanban Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-5 overflow-x-auto min-w-[700px] pb-2 custom-scrollbar">
                      {KANBAN_STAGES.map((stage) => {
                        const stageDeals = deals.filter(lead => stage.dbStages.includes(lead.stage));
                        const totalStageAmount = stageDeals.reduce((sum, d) => sum + (d.leadValue || 0), 0);

                        return (
                          <div key={stage.key} className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] p-3 rounded-md flex flex-col min-h-[300px] max-h-[350px]">
                            {/* Column Header */}
                            <div className="border-b border-[var(--crm-line)] pb-2 mb-2 text-left flex justify-between items-center">
                              <div>
                                <h4 className="text-[10px] uppercase font-bold text-[var(--crm-heading)] truncate">{stage.label}</h4>
                                <span className="text-[8px] font-mono text-[var(--crm-ink-faint)] block mt-0.5">{currency(totalStageAmount)}</span>
                              </div>
                              <span className="bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold border border-[var(--crm-line)]">
                                {stageDeals.length}
                              </span>
                            </div>

                            {/* Column Body Cards */}
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                              {stageDeals.length === 0 ? (
                                <div className="h-full border border-dashed border-[var(--crm-line)] rounded flex items-center justify-center py-10">
                                  <span className="text-[9px] font-mono uppercase text-[var(--crm-ink-faint)]">Empty</span>
                                </div>
                              ) : (
                                stageDeals.map((deal) => (
                                  <motion.div 
                                    key={deal._id}
                                    whileHover={{ scale: 1.01 }}
                                    onClick={() => toast.success(`Lead Code: ${deal.leadCode}\nValue: ${currency(deal.leadValue)}`)}
                                    className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-2.5 rounded shadow-sm hover:border-teal-500/50 transition duration-150 cursor-pointer text-left space-y-1"
                                  >
                                    <div className="flex justify-between items-start gap-1">
                                      <h5 className="text-[9px] font-bold text-[var(--crm-heading)] leading-tight truncate max-w-[85%]">
                                        {deal.customerName}
                                      </h5>
                                      <span className={`text-[6px] font-bold font-mono px-1 rounded-sm uppercase ${
                                        deal.priority === 'HOT' ? 'bg-rose-950/40 text-rose-400 border border-rose-900/50' : 'bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-soft)] border border-[var(--crm-line)]'
                                      }`}>
                                        {deal.priority}
                                      </span>
                                    </div>
                                    <p className="text-[8px] text-[var(--crm-ink-faint)] truncate">{deal.companyName || 'Private Buyer'}</p>
                                    <div className="flex justify-between items-center pt-1.5 border-t border-[var(--crm-line)] mt-1">
                                      <span className="text-[7px] font-mono text-[var(--crm-ink-faint)] uppercase">{deal.productCategory}</span>
                                      <span className="text-[9px] font-mono font-bold text-teal-400">{currency(deal.leadValue)}</span>
                                    </div>
                                  </motion.div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* My Assigned Leads Section */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left mt-6">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>📋 My Assigned Leads ("मेरे सौंपे गए लीड")</span>
                      <span className="bg-teal-950/40 text-teal-400 font-mono text-[9px] px-2 py-0.5 rounded-full font-bold border border-teal-900/30">
                        {deals.length} Active
                      </span>
                    </h3>

                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-line)]">
                            <th className="py-3 px-4">Lead Code</th>
                            <th className="py-3 px-4">Customer Name</th>
                            <th className="py-3 px-4">Company</th>
                            <th className="py-3 px-4">Contact</th>
                            <th className="py-3 px-4">Commodity</th>
                            <th className="py-3 px-4">Value</th>
                            <th className="py-3 px-4">Stage</th>
                            <th className="py-3 px-4">Follow-up At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--crm-line)] text-xs font-mono text-[var(--crm-ink-soft)]">
                          {deals.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-8 text-center font-sans text-[10px] text-[var(--crm-ink-faint)] uppercase tracking-wider">
                                No assigned leads mapped.
                              </td>
                            </tr>
                          ) : (
                            deals.map((deal) => (
                              <tr key={deal._id} className="hover:bg-[var(--crm-bg-sunken)]/40 transition">
                                <td className="py-3 px-4 font-bold text-[var(--crm-heading)]">{deal.leadCode || 'N/A'}</td>
                                <td className="py-3 px-4 font-sans font-medium text-[var(--crm-heading)]">{deal.customerName || '—'}</td>
                                <td className="py-3 px-4 font-sans">{deal.companyName || '—'}</td>
                                <td className="py-3 px-4 space-y-0.5">
                                  <span className="block truncate max-w-[150px]">{deal.email || '—'}</span>
                                  <span className="block text-[10px] text-[var(--crm-ink-faint)]">{deal.phone || '—'}</span>
                                </td>
                                <td className="py-3 px-4">{deal.productCategory || '—'}</td>
                                <td className="py-3 px-4 font-bold text-teal-400">{currency(deal.leadValue)}</td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 bg-teal-950/40 text-teal-400 font-mono text-[8px] font-bold rounded border border-teal-900/30 uppercase">
                                    {String(deal.stage || 'NEW_LEAD').replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-[var(--crm-ink-faint)]">
                                  {deal.nextFollowupAt ? new Date(deal.nextFollowupAt).toLocaleDateString('en-IN') : '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* Right Sidebar (Today's Action List) */}
                <div className="lg:col-span-4 space-y-6 text-left">
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>Today's Action List</span>
                      <FiZap className="text-amber-500" size={14} />
                    </h3>
                    <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1.5 font-light leading-relaxed">
                      Prioritized tasks compiled dynamically based on lead pipelines and follow-ups.
                    </p>

                    <div className="mt-5 space-y-3">
                      {todos.map((todo) => (
                        <div 
                          key={todo.id} 
                          className={`flex items-start gap-3 p-3 border rounded-md transition duration-150 ${
                            todo.done ? 'bg-[var(--crm-bg-sunken)] border-[var(--crm-line)] opacity-60' : 'bg-[var(--crm-bg-raised)] border-[var(--crm-line)] hover:border-teal-500/20'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={todo.done}
                            onChange={() => toggleTodo(todo.id)}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-[var(--crm-line)] bg-[var(--crm-bg)] text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-tight font-medium ${
                              todo.done ? 'line-through text-[var(--crm-ink-faint)]' : 'text-[var(--crm-ink-soft)]'
                            }`}>
                              {todo.text}
                            </p>
                            <div className="flex gap-2 items-center mt-1.5">
                              <span className={`text-[7px] font-mono font-bold px-1 rounded uppercase ${
                                todo.category === 'CALL' ? 'bg-teal-950/40 text-teal-400 border border-teal-900/30' :
                                todo.category === 'DOCUMENT' ? 'bg-sky-950/40 text-sky-400 border border-sky-900/30' :
                                'bg-amber-950/40 text-amber-400 border border-amber-900/30'
                              }`}>
                                {todo.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: LEADERS & GAMIFICATION */}
            {activeTab === 'leaderboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left/Middle Column (Rank Card, Leaderboard Table, Department Chart) */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Top Rank Badge Row */}
                  <div className="bg-gradient-to-r from-teal-900 to-slate-950 border border-[var(--crm-line)] p-6 rounded-lg text-left text-white shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="absolute top-0 right-0 w-44 h-44 bg-teal-500/10 rounded-full blur-2xl transform translate-x-12 -translate-y-12"></div>
                    
                    <div className="space-y-2 z-10">
                      <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-teal-400 font-mono">Executive Standing</span>
                      <h3 className="text-2xl font-normal">Your Performance Rank: <strong className="text-teal-300 font-serif font-semibold">{myRankNum} of {leaderboardData.length || 15}</strong></h3>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="px-3 py-1 bg-teal-800/60 border border-teal-700/30 rounded text-xs font-semibold">{rankBadge} Medal Badge</span>
                        <span className="text-xs text-teal-200/80 font-light">Rank updates daily based on closed revenue</span>
                      </div>
                    </div>

                    <div className="flex gap-4 z-10 font-mono text-left bg-slate-950/30 border border-teal-500/20 p-4 rounded-lg min-w-[250px]">
                      <div className="flex-1">
                        <span className="text-[8px] uppercase tracking-wider text-teal-400 block font-mono">Deals Won</span>
                        <strong className="text-xl block mt-0.5 text-white">{wonMyDeals}</strong>
                      </div>
                      <div className="border-l border-teal-500/20 pl-4 flex-1">
                        <span className="text-[8px] uppercase tracking-wider text-teal-400 block font-mono">Revenue Generated</span>
                        <strong className="text-xl block mt-0.5 text-emerald-400">{currency(achievedVal)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Leaderboard Tabs & Table */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--crm-line)] pb-3 gap-3">
                      <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold flex items-center gap-1.5">
                        <FiUsers size={13} className="text-teal-500" /> Sales Leaderboard
                      </h3>
                      
                      {/* Sub Tabs Selector */}
                      <div className="flex border border-[var(--crm-line)] p-1 bg-[var(--crm-bg-sunken)] rounded font-mono text-[9px]">
                        {[
                          { id: 'daily', label: 'Daily' },
                          { id: 'weekly', label: 'Weekly' },
                          { id: 'monthly', label: 'Monthly' }
                        ].map((subTab) => (
                          <button
                            key={subTab.id}
                            onClick={() => handleLbTabChange(subTab.id)}
                            className={`px-3 py-1 uppercase rounded font-bold tracking-wider transition cursor-pointer ${
                              leaderboardTab === subTab.id 
                                ? 'bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] shadow-sm border border-[var(--crm-line)]/50' 
                                : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)]'
                            }`}
                          >
                            {subTab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Leaderboard Table */}
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-line)]">
                            <th className="py-3 px-4">Rank</th>
                            <th className="py-3 px-4">Executive Name</th>
                            <th className="py-3 px-4">Deals Closed</th>
                            <th className="py-3 px-4">Revenue</th>
                            <th className="py-3 px-4">Activities</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                          {lbLoading ? (
                            <tr>
                              <td colSpan="5" className="text-center py-12 font-mono text-[var(--crm-ink-faint)] uppercase tracking-widest text-[10px]">
                                Loading Leaderboard Listings...
                              </td>
                            </tr>
                          ) : leaderboardData.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="text-center py-12 font-mono text-[var(--crm-ink-faint)] uppercase tracking-widest text-[10px] opacity-40">
                                No sales closed for this period.
                              </td>
                            </tr>
                          ) : (
                            leaderboardData.map((row, idx) => {
                              const isCurrentUser = row.employeeId === user._id;
                              return (
                                <tr 
                                  key={row.employeeId} 
                                  className={`transition-colors ${
                                    isCurrentUser ? 'bg-teal-950/20 hover:bg-teal-950/30 border-y border-teal-900/40' : 'hover:bg-[var(--crm-bg-sunken)]/40'
                                  }`}
                                >
                                  <td className="py-3 px-4 font-mono text-[var(--crm-ink-faint)]">
                                    {idx + 1 === 1 ? '🥇' : idx + 1 === 2 ? '🥈' : idx + 1 === 3 ? '🥉' : `#${idx + 1}`}
                                  </td>
                                  <td className="py-3 px-4 font-semibold text-[var(--crm-heading)] flex items-center gap-2">
                                    {row.fullName}
                                    {isCurrentUser && (
                                      <span className="text-[7px] font-mono font-bold bg-teal-600 text-white px-1.5 py-0.5 rounded uppercase">
                                        You
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 font-mono text-emerald-500">{row.dealsWon} Won</td>
                                  <td className="py-3 px-4 font-mono text-amber-500 font-medium">{currency(row.revenue)}</td>
                                  <td className="py-3 px-4 font-mono text-[var(--crm-ink-soft)]">{row.activityCount} acts</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Department Rankings (Bottom) */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>Department Average Performance</span>
                      <span className="text-[9px] font-mono text-[var(--crm-ink-faint)]">Monthly aggregate values</span>
                    </h3>

                    {/* Department Chart */}
                    <div className="h-64 mt-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={departmentRankData} margin={{ left: -10, top: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.05} stroke="var(--crm-line)" />
                          <XAxis dataKey="name" stroke="var(--crm-ink-faint)" fontSize={9} tickLine={false} />
                          <YAxis stroke="var(--crm-ink-faint)" fontSize={9} tickLine={false} tickFormatter={(v) => `₹${v/100000}L`} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)', fontSize: 10, fontFamily: 'monospace', color: 'var(--crm-heading)' }}
                            formatter={(v) => currency(v)}
                          />
                          <Bar dataKey="avgRevenue" fill="#0f766e" radius={[2, 2, 0, 0]} maxBarSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* Right Sidebar (Gamified Achievement Badges) */}
                <div className="lg:col-span-4 space-y-6 text-left">
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>Achievement Badges</span>
                      <FiAward className="text-amber-500" size={14} />
                    </h3>
                    <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1.5 font-light leading-relaxed">
                      Earn trophies and tokens by hitting goals, keeping streaks, and closing big trades.
                    </p>

                    <div className="mt-5 space-y-4">
                      {[
                        { title: '5 Days Streak', desc: 'Logged activity on 5 consecutive days', icon: FiZap, unlocked: true, color: 'text-amber-400 bg-amber-950/40 border-amber-900/30' },
                        { title: 'Biggest Deal Won', desc: 'Closed a deal valued over ₹25 Lakhs', icon: FiTrendingUp, unlocked: true, color: 'text-teal-400 bg-teal-950/40 border-teal-900/30' },
                        { title: 'Most Calls in a Day', desc: 'Logged 40+ client phone consultations', icon: FiPhone, unlocked: false, color: 'text-[var(--crm-ink-faint)] bg-[var(--crm-bg-sunken)] border-[var(--crm-line)]' },
                        { title: 'Quotation Master', desc: 'Sent 15 quotation packets this month', icon: FiFileText, unlocked: true, color: 'text-sky-400 bg-sky-950/40 border-sky-900/30' }
                      ].map((badge, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-start gap-4 p-3 border rounded-md transition duration-150 ${
                            badge.unlocked ? 'bg-[var(--crm-bg-raised)] border-[var(--crm-line)]' : 'bg-[var(--crm-bg-sunken)]/50 border-[var(--crm-line)]/50 opacity-60'
                          }`}
                        >
                          <div className={`p-2.5 rounded-lg border shrink-0 ${badge.color}`}>
                            <badge.icon size={16} />
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-[var(--crm-heading)] leading-tight">
                              {badge.title}
                            </h4>
                            <p className="text-[10px] text-[var(--crm-ink-faint)] mt-0.5 leading-snug">{badge.desc}</p>
                            <span className={`text-[7px] font-mono font-bold block mt-1.5 uppercase ${
                              badge.unlocked ? 'text-teal-400' : 'text-[var(--crm-ink-faint)]'
                            }`}>
                              {badge.unlocked ? '✓ Unlocked' : '🔒 Locked'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: SHARED FILES */}
            {activeTab === 'shared_files' && (
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-indigo-400">
                    <FiFolder size={14} /> Shared Files from Manager
                  </span>
                  <span className="bg-indigo-950/40 text-indigo-400 font-mono text-[9px] px-2 py-0.5 rounded-full font-bold border border-indigo-900/30">
                    {sharedFiles.length} Shared Files
                  </span>
                </h3>

                <div className="overflow-x-auto mt-4">
                  {sharedFiles.length === 0 ? (
                    <div className="py-20 border border-dashed border-[var(--crm-line)] rounded flex flex-col items-center justify-center">
                      <FiFolder className="text-[var(--crm-ink-faint)]" size={32} />
                      <span className="text-[10px] font-mono text-[var(--crm-ink-faint)] uppercase mt-2">No files shared with you</span>
                      <span className="text-[8px] text-[var(--crm-ink-faint)]/70 mt-1">Files uploaded by your manager will show up here.</span>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-line)]">
                          <th className="py-3 px-4">File Name Designation</th>
                          <th className="py-3 px-4">Shared By</th>
                          <th className="py-3 px-4">Shared Date</th>
                          <th className="py-3 px-4">Note / Instructions</th>
                          <th className="py-3 px-4">Size</th>
                          <th className="py-3 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--crm-line)] text-xs font-mono text-[var(--crm-ink-soft)]">
                        {sharedFiles.map((file) => (
                          <tr key={file._id} className="hover:bg-[var(--crm-bg-sunken)]/40 transition-colors">
                            <td className="py-3 px-4 font-sans font-bold text-[var(--crm-heading)] flex items-center gap-1.5">
                              <FiFileText className="text-indigo-400" size={13} /> {file.originalName}
                            </td>
                            <td className="py-3 px-4 font-sans">{file.sentBy?.name || 'Manager'}</td>
                            <td className="py-3 px-4 text-[var(--crm-ink-faint)]">
                              {new Date(file.createdAt).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="py-3 px-4 font-sans text-[var(--crm-ink-soft)] max-w-xs truncate italic">
                              {file.note ? `"${file.note}"` : <span className="text-[var(--crm-ink-faint)]">—</span>}
                            </td>
                            <td className="py-3 px-4 text-[var(--crm-ink-faint)]">
                              {Math.round(file.fileSize / 1024) > 1024
                                ? `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB`
                                : `${Math.round(file.fileSize / 1024)} KB`}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleDownloadSharedFile(file._id, file.originalName)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase tracking-wider py-1.5 px-3 rounded transition cursor-pointer flex items-center gap-1 mx-auto"
                              >
                                <FiDownload size={10} /> Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
