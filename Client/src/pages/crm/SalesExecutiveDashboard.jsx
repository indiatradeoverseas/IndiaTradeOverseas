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
  FiCheckSquare,
  FiSend,
  FiMic
} from 'react-icons/fi';
import CallRecordingModal from '../../components/crm/CallRecordingModal';
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
import { employeesApi } from '../../api/employees';
import { socketService } from '../../services/socket';

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
  
  // Chat States
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  
  // Gamification View States
  const [leaderboardTab, setLeaderboardTab] = useState('monthly');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [departmentRankings, setDepartmentRankings] = useState([]);
  const [lbLoading, setLbLoading] = useState(false);

  // Manager Tasks & Shared Files States
  const [managerTasks, setManagerTasks] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);

  // Task Completion states
  const [completionTaskId, setCompletionTaskId] = useState(null);
  const [completionFile, setCompletionFile] = useState(null);
  const [completionRemarks, setCompletionRemarks] = useState('');

  // File Upload states
  const [employeesList, setEmployeesList] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [recipientId, setRecipientId] = useState('');
  const [uploadNote, setUploadNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [myStatus, setMyStatus] = useState('IDLE');
  const [myActivity, setMyActivity] = useState('Available');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const [showCallModal, setShowCallModal] = useState(false);
  const [myCallRecordings, setMyCallRecordings] = useState([]);

  const handleStatusChange = async (newStatus, newActivity) => {
    setSubmittingStatus(true);
    try {
      const skt = socketService.getSocket();
      if (skt && skt.connected) {
        skt.emit('change_status', { status: newStatus, currentActivity: newActivity });
        setMyStatus(newStatus);
        setMyActivity(newActivity);
        toast.success(`Activity status updated to: ${newStatus.replace('_', ' ')}`);
      } else {
        // Fallback REST call
        const res = await employeesApi.updateEmployeeStatus(user._id, newStatus, newActivity);
        if (res.success) {
          setMyStatus(newStatus);
          setMyActivity(newActivity);
          toast.success(`Activity status updated successfully (REST)`);
        }
      }
    } catch (err) {
      console.error('Error changing status:', err);
      toast.error('Failed to update activity status');
    } finally {
      setSubmittingStatus(false);
    }
  };

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
        // Filter leads assigned to the logged-in user by email
        const myLeads = (leadsRes.data.leads || []).filter(lead => {
          const leadOwnerEmail = lead.assignedTo?.email;
          return leadOwnerEmail && String(leadOwnerEmail).toLowerCase() === String(user.email).toLowerCase();
        });
        setDeals(myLeads);

        // 3. Generate priority to-dos from active deal status
        generateToDos(myLeads);
      }

      // 4. Fetch initial leaderboard (monthly)
      await fetchLeaderboard('monthly');

      // 5. Fetch Manager's Tasks assigned to me
      try {
        const tasksRes = await taskApi.getTasks({ employeeId: user._id });
        if (tasksRes.success) {
          const allTasks = tasksRes.data?.tasks || [];
          setManagerTasks(allTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS'));
          setCompletedTasksCount(allTasks.filter(t => t.status === 'COMPLETED').length);
        }
      } catch (err) {
        console.error('Error fetching manager tasks:', err);
      }

      // 6. Fetch Shared Files
      try {
        const filesRes = await sharedFilesApi.getSharedFiles();
        if (filesRes.success) {
          setSharedFiles(filesRes.files || []);
        }
      } catch (err) {
        console.error('Error fetching shared files:', err);
      }

      // 7. Fetch active employees list for file sharing
      try {
        const empRes = await employeesApi.getEmployees();
        if (empRes.success) {
          setEmployeesList(empRes.data?.employees || empRes.employees || []);
        }
      } catch (err) {
        console.error('Error fetching employees list:', err);
      }

      // 8. Fetch own real-time status
      try {
        const statusRes = await employeesApi.getEmployeeStatus(user._id);
        if (statusRes.success && statusRes.data?.status) {
          setMyStatus(statusRes.data.status.status || 'IDLE');
          setMyActivity(statusRes.data.status.currentActivity || 'Available');
        }
      } catch (err) {
        console.error('Error fetching own status:', err);
      }

      // 9. Fetch own call recordings
      try {
        const recRes = await leadsApi.getCallRecordings();
        if (recRes.success) {
          setMyCallRecordings(recRes.data?.recordings || []);
        }
      } catch (err) {
        console.error('Error fetching call recordings:', err);
      }

    } catch (err) {
      console.error('Error fetching executive dashboard details:', err);
      toast.error('Could not load recent performance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchChatMessages = async () => {
    try {
      const res = await salesApi.getCoachingMessages();
      if (res.success) {
        setChatMessages(res.data?.messages || []);
      }
    } catch (e) {
      console.error('Error fetching chat messages:', e);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setSendingChat(true);
    try {
      const res = await salesApi.sendCoachingMessage({ content: chatInput });
      if (res.success) {
        setChatInput('');
        fetchChatMessages();
      }
    } catch (e) {
      toast.error('Failed to send message');
    } finally {
      setSendingChat(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  useEffect(() => {
    fetchChatMessages();
    const interval = setInterval(fetchChatMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle Leaderboard Tab Switching
  const fetchLeaderboard = async (period) => {
    setLbLoading(true);
    try {
      const lbRes = await salesApi.getLeaderboard({ period });
      if (lbRes.success) {
        setLeaderboardData(lbRes.data?.leaderboard || []);
        setDepartmentRankings(lbRes.data?.departmentRankings || []);
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
  const handleTaskStatusUpdate = async (taskId, newStatus, remarks = '', file = null) => {
    setUpdatingTaskId(taskId);
    try {
      let payload;
      if (file || remarks) {
        payload = new FormData();
        payload.append('status', newStatus);
        payload.append('remarks', remarks || 'Completed by executive');
        if (file) {
          payload.append('file', file);
        }
      } else {
        payload = { status: newStatus, remarks: 'Status updated by executive' };
      }

      const res = await taskApi.updateTaskStatus(taskId, payload);
      if (res.success) {
        toast.success(`Task status updated to ${newStatus}`);
        loadDashboardData();
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

  // Handle sharing of Excel / general files
  const handleUploadFileSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!recipientId) {
      toast.error('Please select a recipient employee');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('sentTo', recipientId);
      formData.append('note', uploadNote);
      formData.append('department', user?.department || 'GENERAL');

      const res = await sharedFilesApi.shareFile(formData);
      if (res.success) {
        toast.success('File uploaded and shared successfully!');
        setUploadFile(null);
        setUploadNote('');
        setRecipientId('');
        // Reload shared files list
        const filesRes = await sharedFilesApi.getSharedFiles();
        if (filesRes.success) {
          setSharedFiles(filesRes.files || []);
        }
      }
    } catch (err) {
      console.error('Error sharing file:', err);
      toast.error(err.response?.data?.message || 'Failed to upload and share file');
    } finally {
      setIsUploading(false);
    }
  };

  // Calculation for Targets
  const targetVal = performance?.target?.targetValue || 2500000; // default ₹25 Lakhs
  const wonRevenue = deals
    .filter(d => ['CLOSED_WON', 'DEAL_WON'].includes(d.stage))
    .reduce((sum, d) => sum + (d.leadValue || 0), 0);
  const achievedVal = performance?.revenue || wonRevenue || 0;
  const remainingVal = Math.max(0, targetVal - achievedVal);
  const targetProgressPercent = Math.min(100, Math.round((achievedVal / targetVal) * 100));

  // Lead Conversion Calculation (Leads -> Orders)
  const totalMyLeads = performance?.totalLeads !== undefined ? performance.totalLeads : (deals.length || 0);
  const wonMyDeals = performance?.dealsWon !== undefined ? performance.dealsWon : deals.filter(d => ['CLOSED_WON', 'DEAL_WON'].includes(d.stage)).length;
  const conversionRate = totalMyLeads > 0 ? Math.round((wonMyDeals / totalMyLeads) * 100) : 0;

  // Render circular progress path definitions
  const radius = 50;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (targetProgressPercent / 100) * circumference;

  // Format monetary value
  const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;



  // Map user rank status
  const myRankIndex = leaderboardData.findIndex(r => r.email?.toLowerCase() === user.email?.toLowerCase());
  const myRankNum = myRankIndex !== -1 ? myRankIndex + 1 : leaderboardData.length + 1;
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
            Role: <strong className="text-[var(--crm-heading)] font-semibold font-mono">{user?.position || String(user?.role || 'Sales Executive').replace('_', ' ')} ({user?.department || 'SALES'})</strong> &bull; Node Status: <span className="text-emerald-500 font-semibold font-mono">Live</span>
          </p>
        </div>
        <div className="flex gap-2 self-stretch md:self-auto font-mono">
          <button 
            onClick={() => setShowCallModal(true)}
            className="flex items-center gap-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/40 px-3.5 py-2 text-[10px] uppercase font-bold tracking-wider rounded transition shadow-sm cursor-pointer"
          >
            <FiMic className="animate-pulse text-rose-400" size={12} /> Upload Call Recording
          </button>
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
            { id: 'daily', label: 'Daily Action View', icon: FiClock },
            { id: 'leaderboard', label: 'Leaderboard & Gamification', icon: FiAward },
            { id: 'shared_files', label: 'Shared Files', icon: FiFolder }
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
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'COMPLETED') {
                                      setCompletionTaskId(task._id);
                                      setCompletionFile(null);
                                      setCompletionRemarks('');
                                    } else {
                                      handleTaskStatusUpdate(task._id, val);
                                    }
                                  }}
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
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fadeIn">
                    {[
                      { label: 'Assigned Leads', val: totalMyLeads, color: 'text-indigo-400 bg-indigo-950/20', icon: FiUsers },
                      { label: 'Won Leads', val: wonMyDeals, color: 'text-emerald-400 bg-emerald-950/20', icon: FiCheckCircle },
                      { label: 'Pending Leads', val: deals.filter(d => !['CLOSED_WON', 'DEAL_WON', 'CLOSED_LOST', 'DEAL_LOST'].includes(d.stage)).length, color: 'text-amber-400 bg-amber-950/20', icon: FiClock },
                      { label: 'Lost Leads', val: deals.filter(d => ['CLOSED_LOST', 'DEAL_LOST'].includes(d.stage)).length, color: 'text-rose-400 bg-rose-950/20', icon: FiAlertCircle },
                      { label: 'Total Revenue', val: currency(achievedVal), color: 'text-cyan-400 bg-cyan-950/20', icon: FiTrendingUp },
                      { label: 'Completed Tasks', val: completedTasksCount, color: 'text-teal-400 bg-teal-950/20', icon: FiCheckSquare }
                    ].map((kpi, idx) => (
                      <motion.div 
                        key={idx}
                        whileHover={{ y: -3 }}
                        className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-lg flex flex-col justify-between shadow-sm transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold font-mono">{kpi.label}</span>
                          <div className={`p-1.5 rounded-md ${kpi.color}`}>
                            <kpi.icon size={12} />
                          </div>
                        </div>
                        <div className="mt-3 text-left">
                          <p className="text-base font-semibold text-[var(--crm-heading)] leading-tight tracking-tight">{kpi.val}</p>
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

                  {/* Executive Activity KPI Cards (Call Recordings & Shared Files count) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[var(--crm-bg-raised)] border border-rose-900/40 p-4 rounded-lg flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-[9px] uppercase font-mono tracking-widest text-rose-400 font-bold block">
                          🎙️ Call Recordings Sent
                        </span>
                        <strong className="text-2xl font-serif text-[var(--crm-heading)] mt-1 block">
                          {myCallRecordings.length}
                        </strong>
                      </div>
                      <button
                        onClick={() => setShowCallModal(true)}
                        className="text-[9px] uppercase font-mono font-bold bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 px-2.5 py-1.5 rounded transition cursor-pointer"
                      >
                        + Upload Call
                      </button>
                    </div>

                    <div className="bg-[var(--crm-bg-raised)] border border-teal-900/40 p-4 rounded-lg flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-[9px] uppercase font-mono tracking-widest text-teal-400 font-bold block">
                          📁 Shared Files Sent
                        </span>
                        <strong className="text-2xl font-serif text-[var(--crm-heading)] mt-1 block">
                          {sharedFiles.length}
                        </strong>
                      </div>
                      <button
                        onClick={() => setActiveTab('shared_files')}
                        className="text-[9px] uppercase font-mono font-bold bg-teal-950/60 hover:bg-teal-900 text-teal-300 border border-teal-800/50 px-2.5 py-1.5 rounded transition cursor-pointer"
                      >
                        View Files
                      </button>
                    </div>
                  </div>

                  {/* Lead Performance & Distribution Charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Chart 1: Lead Pipeline Distribution */}
                    <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                      <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                        <span>Lead Status Distribution</span>
                        <span className="text-[8px] font-mono text-[var(--crm-ink-faint)] font-bold">Won vs Pending vs Lost</span>
                      </h3>
                      <div className="h-64 mt-6">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <BarChart data={[
                            { name: 'Won', count: wonMyDeals, fill: '#10b981' },
                            { name: 'Pending', count: deals.filter(d => !['CLOSED_WON', 'DEAL_WON', 'CLOSED_LOST', 'DEAL_LOST'].includes(d.stage)).length, fill: '#f59e0b' },
                            { name: 'Lost', count: deals.filter(d => ['CLOSED_LOST', 'DEAL_LOST'].includes(d.stage)).length, fill: '#f43f5e' }
                          ]} margin={{ left: -10, top: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.05} stroke="var(--crm-line)" />
                            <XAxis dataKey="name" stroke="var(--crm-ink-faint)" fontSize={10} tickLine={false} />
                            <YAxis stroke="var(--crm-ink-faint)" fontSize={10} tickLine={false} />
                            <Tooltip
                              contentStyle={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)', fontSize: 10, fontFamily: 'monospace', color: 'var(--crm-heading)' }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chart 2: Leads count by Product Category */}
                    <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                      <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                        <span>Leads by Product Category</span>
                        <span className="text-[8px] font-mono text-[var(--crm-ink-faint)] font-bold">Materials Breakdown</span>
                      </h3>
                      <div className="h-64 mt-6">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <BarChart data={['STONE', 'COAL', 'TEA', 'RICE', 'TRANSPORT'].map(cat => ({
                            name: cat,
                            leads: deals.filter(d => d.productCategory === cat).length
                          }))} margin={{ left: -10, top: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.05} stroke="var(--crm-line)" />
                            <XAxis dataKey="name" stroke="var(--crm-ink-faint)" fontSize={10} tickLine={false} />
                            <YAxis stroke="var(--crm-ink-faint)" fontSize={10} tickLine={false} />
                            <Tooltip
                              contentStyle={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)', fontSize: 10, fontFamily: 'monospace', color: 'var(--crm-heading)' }}
                            />
                            <Bar dataKey="leads" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Executive Call Recordings Hub Card */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span className="flex items-center gap-2 text-rose-400">
                        <FiMic className="animate-pulse" size={14} /> My Call Recordings ({myCallRecordings.length})
                      </span>
                      <button
                        onClick={() => setShowCallModal(true)}
                        className="text-[9px] uppercase font-mono font-bold bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 px-2.5 py-1 rounded transition cursor-pointer"
                      >
                        + Upload Call
                      </button>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 font-mono">
                      {myCallRecordings.length === 0 ? (
                        <div className="col-span-full py-8 text-center text-[10px] text-[var(--crm-ink-faint)] uppercase tracking-wider">
                          No call recordings uploaded yet. Click "+ Upload Call" above to save client call audio.
                        </div>
                      ) : (
                        myCallRecordings.map((rec) => (
                          <div key={rec._id} className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-md space-y-2 text-xs">
                            <div className="flex justify-between items-start">
                              <h4 className="font-serif font-bold text-[var(--crm-heading)] truncate text-xs">
                                {rec.customerName || 'Client Call'}
                              </h4>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                                rec.leadPriority === 'HOT' ? 'bg-rose-950/60 text-rose-400 border-rose-800/60' :
                                rec.leadPriority === 'WARM' ? 'bg-amber-950/60 text-amber-400 border-amber-800/60' :
                                'bg-cyan-950/60 text-cyan-400 border-cyan-800/60'
                              }`}>
                                {rec.leadPriority || 'WARM'}
                              </span>
                            </div>

                            {rec.notes && (
                              <p className="text-[10px] font-sans text-[var(--crm-ink-soft)] italic line-clamp-2 bg-[var(--crm-bg-raised)] p-2 rounded">
                                "{rec.notes}"
                              </p>
                            )}

                            <div className="space-y-1 pt-1 border-t border-[var(--crm-line)]/50">
                              <audio
                                controls
                                controlsList="nodownload"
                                className="w-full h-7 rounded accent-teal-500"
                                src={(() => {
                                  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                                  const baseUrl = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:5000/api' : 'https://indiatradeoverseas-1.onrender.com/api');
                                  return `${baseUrl}/leads/call-recordings/${rec._id}/stream`;
                                })()}
                              />
                              <div className="flex justify-between text-[8px] text-[var(--crm-ink-faint)] pt-1">
                                <span>📅 {new Date(rec.createdAt).toLocaleDateString()}</span>
                                {rec.duration && <span>⏱️ {rec.duration}</span>}
                              </div>

                              {rec.managerRemark && (
                                <div className="bg-teal-950/50 border border-teal-800/50 p-2 rounded text-[10px] text-teal-300">
                                  <span className="font-bold font-mono text-[8px] uppercase tracking-widest block text-teal-400 mb-0.5">
                                    💬 Manager Remark ({rec.managerRemarkBy || 'Manager'}):
                                  </span>
                                  <span className="font-sans italic">"{rec.managerRemark}"</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
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
                      <span>📋 My Assigned Leads</span>
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
                  {/* Status Selector Widget */}
                  <div className="bg-[var(--crm-bg-raised)] border border-teal-900/50 p-5 rounded-lg shadow-sm">
                    <h3 className="text-xs uppercase tracking-widest text-teal-400 font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>Live Activity Status</span>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </h3>
                    
                    <div className="mt-4 space-y-3.5 text-xs font-mono">
                      <div>
                        <label className="block text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">My Current Status</label>
                        <select
                          value={myStatus}
                          onChange={(e) => handleStatusChange(e.target.value, myActivity)}
                          disabled={submittingStatus}
                          className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-3 py-2 rounded outline-none focus:border-teal-500 transition cursor-pointer"
                        >
                          <option value="IDLE">🟢 Idle / Available</option>
                          <option value="ON_CALL">📞 On Call</option>
                          <option value="FOLLOWING_UP">📲 Following Up</option>
                          <option value="CONVERTING">🟣 Converting Lead</option>
                          <option value="PAYMENT">🟡 Handling Payment</option>
                          <option value="OFFLINE">🔴 Offline</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">What are you working on?</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={myActivity}
                            onChange={(e) => setMyActivity(e.target.value)}
                            disabled={submittingStatus}
                            placeholder="e.g. Calling SGS Iron Ore client"
                            className="flex-1 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-3 py-2 rounded outline-none focus:border-teal-500 transition"
                          />
                          <button
                            type="button"
                            onClick={() => handleStatusChange(myStatus, myActivity)}
                            disabled={submittingStatus}
                            className="bg-teal-700 hover:bg-teal-600 disabled:bg-teal-900 text-white px-3 py-2 text-[10px] rounded font-bold uppercase transition cursor-pointer"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

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

                  {/* Sales Team Chat Hub */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm flex flex-col h-[350px]">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center shrink-0">
                      <span>Sales Team Chat Hub</span>
                      <span className="text-[8px] font-mono text-emerald-400 animate-pulse">Live Connection</span>
                    </h3>
                    
                    {/* Chat Message List */}
                    <div className="flex-1 overflow-y-auto my-3 pr-1 space-y-2 custom-scrollbar text-[11px] font-sans">
                      {chatMessages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[var(--crm-ink-faint)] font-mono uppercase tracking-widest text-[9px] text-center">
                          No messages yet. Start the conversation!
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isMe = msg.senderId === user._id;
                          const isFounder = msg.senderRole === 'ADMIN';
                          return (
                            <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`max-w-[85%] rounded-lg p-2.5 ${
                                isMe 
                                  ? 'bg-teal-600 text-white' 
                                  : isFounder 
                                    ? 'bg-blue-950/60 border border-blue-900/40 text-[var(--crm-ink-soft)]' 
                                    : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)]'
                              }`}>
                                <div className="flex justify-between items-center gap-2 mb-1 text-[8px] font-semibold opacity-85">
                                  <span>{msg.senderName} ({msg.senderRole})</span>
                                </div>
                                <p className="leading-relaxed break-words">{msg.content}</p>
                              </div>
                              <span className="text-[8px] text-[var(--crm-ink-faint)] font-mono mt-0.5 px-1">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                        placeholder="Type a message to Sales team..."
                        className="flex-1 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3 py-2 rounded outline-none focus:border-teal-600 transition placeholder:text-[var(--crm-ink-faint)]"
                      />
                      <button 
                        type="submit" 
                        disabled={sendingChat || !chatInput.trim()}
                        className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded transition disabled:opacity-50 flex items-center justify-center cursor-pointer"
                      >
                        <FiSend size={14} />
                      </button>
                    </form>
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
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-line)]">
                            <th className="py-3 px-4">Rank</th>
                            <th className="py-3 px-4">Executive Name</th>
                            <th className="py-3 px-4">Deals Closed</th>
                            <th className="py-3 px-4">Revenue</th>
                            <th className="py-3 px-4">Target Achievement</th>
                            <th className="py-3 px-4">Activities</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                          {lbLoading ? (
                            <tr>
                              <td colSpan="6" className="text-center py-12 font-mono text-[var(--crm-ink-faint)] uppercase tracking-widest text-[10px]">
                                Loading Leaderboard Listings...
                              </td>
                            </tr>
                          ) : leaderboardData.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center py-12 font-mono text-[var(--crm-ink-faint)] uppercase tracking-widest text-[10px] opacity-40">
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
                                  <td className="py-3 px-4 font-mono">
                                    {row.targetValue > 0 ? (
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-sans ${
                                        row.isTargetAchieved 
                                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                                          : 'bg-rose-950/40 text-rose-400 border border-rose-900/30'
                                      }`}>
                                        {row.isTargetAchieved ? 'Target Achieved 🎉' : `Short (Target: ${currency(row.targetValue)})`}
                                      </span>
                                    ) : (
                                      <span className="text-[var(--crm-ink-faint)] italic text-[10px]">No Target Set</span>
                                    )}
                                  </td>
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
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={departmentRankings} margin={{ left: -10, top: 10 }}>
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
                    <FiFolder size={14} /> Shared Files Hub
                  </span>
                  <span className="bg-indigo-950/40 text-indigo-400 font-mono text-[9px] px-2 py-0.5 rounded-full font-bold border border-indigo-900/30">
                    {sharedFiles.length} Shared Files
                  </span>
                </h3>

                {/* File Upload Form */}
                <div className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] p-5 rounded-lg mb-6 mt-4">
                  <h4 className="text-xs uppercase tracking-wider text-[var(--crm-heading)] font-mono font-bold mb-4 flex items-center gap-2">
                    <FiPaperclip size={14} className="text-teal-400" /> Share / Upload New Excel File
                  </h4>
                  
                  <form onSubmit={handleUploadFileSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-xs">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-mono font-bold mb-1.5">
                        Select Recipient *
                      </label>
                      <select
                        required
                        value={recipientId}
                        onChange={(e) => setRecipientId(e.target.value)}
                        className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] font-mono text-xs px-3 py-2.5 rounded outline-none cursor-pointer focus:border-teal-500 transition"
                      >
                        <option value="">-- Choose Employee --</option>
                        {employeesList
                          .filter(emp => String(emp._id) !== String(user._id)) // don't list self
                          .filter(emp => emp.department && emp.department.toUpperCase() === 'SALES')
                          .map((emp) => (
                            <option key={emp._id} value={emp._id}>
                              {emp.name} ({emp.role} - {emp.department})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-mono font-bold mb-1.5">
                        Select Excel / general File *
                      </label>
                      <input
                        type="file"
                        required
                        accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv, .pdf, .docx, .doc"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] font-mono text-[10px] px-3 py-2 rounded outline-none focus:border-teal-500 transition file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9px] file:font-mono file:font-semibold file:bg-teal-950/40 file:text-teal-400 hover:file:bg-teal-900/60 file:cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-mono font-bold mb-1.5">
                        Note / Instructions
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Sales Report Q3"
                          value={uploadNote}
                          onChange={(e) => setUploadNote(e.target.value)}
                          className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3 py-2.5 rounded outline-none focus:border-teal-500 transition"
                        />
                        <button
                          type="submit"
                          disabled={isUploading}
                          className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-850 text-white font-mono font-bold uppercase tracking-wider py-2.5 px-4 rounded transition cursor-pointer text-[10px] shrink-0"
                        >
                          {isUploading ? 'Uploading...' : 'Share'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                <div className="overflow-x-auto mt-4">
                  {sharedFiles.length === 0 ? (
                    <div className="py-20 border border-dashed border-[var(--crm-line)] rounded flex flex-col items-center justify-center">
                      <FiFolder className="text-[var(--crm-ink-faint)]" size={32} />
                      <span className="text-[10px] font-mono text-[var(--crm-ink-faint)] uppercase mt-2">No shared files found</span>
                      <span className="text-[8px] text-[var(--crm-ink-faint)]/70 mt-1">Files uploaded by you or your manager will show up here.</span>
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
                            <td className="py-3 px-4 font-sans">
                              {String(file.sentBy?._id || file.sentBy) === String(user._id)
                                ? `You (to ${file.sentTo?.name || 'Employee'})`
                                : file.sentBy?.name || 'Manager'}
                            </td>
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
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleDownloadSharedFile(file._id, file.originalName)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase tracking-wider py-1.5 px-3 rounded transition cursor-pointer flex items-center gap-1 mx-auto"
                                  title="Download file"
                                >
                                  <FiDownload size={10} /> Download
                                </button>
                                {String(file.sentBy?._id || file.sentBy) === String(user._id) && (
                                  <button
                                    onClick={async () => {
                                      if (window.confirm('Are you sure you want to delete this shared file?')) {
                                        try {
                                          const res = await sharedFilesApi.deleteSharedFile(file._id);
                                          if (res.success) {
                                            toast.success('File deleted successfully');
                                            const filesRes = await sharedFilesApi.getSharedFiles();
                                            if (filesRes.success) {
                                              setSharedFiles(filesRes.files || []);
                                            }
                                          }
                                        } catch (err) {
                                          toast.error('Failed to delete file');
                                        }
                                      }
                                    }}
                                    className="bg-rose-900 hover:bg-rose-800 text-white font-bold text-[9px] uppercase tracking-wider py-1.5 px-3 rounded transition cursor-pointer"
                                    title="Delete shared file"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
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
      {/* TASK COMPLETION MODAL */}
      {completionTaskId && (
        <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-[var(--crm-bg-raised)] rounded-sm p-6 w-full max-w-md border border-[var(--crm-line)] shadow-2xl text-left font-mono">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--crm-line)]">
              <div>
                <h2 className="font-serif text-sm font-semibold text-[var(--crm-heading)] uppercase tracking-wide">Submit Task Completion File</h2>
                <p className="text-[9px] text-[var(--crm-ink-faint)] font-mono mt-0.5">Attach reports or files to verify work done.</p>
              </div>
              <button onClick={() => setCompletionTaskId(null)} className="text-[var(--crm-ink-faint)] hover:text-white font-mono cursor-pointer">✕</button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              await handleTaskStatusUpdate(completionTaskId, 'COMPLETED', completionRemarks, completionFile);
              setCompletionTaskId(null);
            }} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1.5 font-mono">Attach Verification File *</label>
                <input
                  type="file"
                  required
                  accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv, .pdf, .docx, .doc, image/*"
                  onChange={(e) => setCompletionFile(e.target.files[0])}
                  className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] font-mono text-[10px] px-3 py-2 rounded outline-none focus:border-teal-500 transition file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9px] file:font-mono file:font-semibold file:bg-teal-950/40 file:text-teal-400 hover:file:bg-teal-900/60 file:cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1.5 font-mono">Completion Remarks / Notes *</label>
                <textarea
                  required
                  rows={3}
                  value={completionRemarks}
                  onChange={(e) => setCompletionRemarks(e.target.value)}
                  placeholder="Describe what was completed..."
                  className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-teal-500 px-2 py-1.5 rounded-sm outline-none text-[var(--crm-heading)] resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-[var(--crm-line)]">
                <button
                  type="button"
                  onClick={() => setCompletionTaskId(null)}
                  className="flex-1 py-2 bg-transparent border border-[var(--crm-line)] text-[var(--crm-ink-soft)] text-[8px] font-bold uppercase rounded-sm transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-650 hover:bg-teal-600 text-white text-[8px] font-bold uppercase rounded-sm transition cursor-pointer text-center"
                >
                  Complete Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Call Recording Modal */}
      <CallRecordingModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        leads={deals}
        onSuccess={() => loadDashboardData()}
      />
    </motion.div>
  );
}
