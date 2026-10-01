import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL, getFileUrl } from '../../config/env';
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
  FiMic,
  FiTrash2
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
import FileSharingWidget from '../../components/crm/FileSharingWidget';

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
  const navigate = useNavigate();
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

  const [dailyWorkLogs, setDailyWorkLogs] = useState([]);
  const [dailyLogForm, setDailyLogForm] = useState({
    numberOfCalls: '',
    numberOfConversions: '',
    numberOfSales: '',
    note: ''
  });
  const [submittingDailyLog, setSubmittingDailyLog] = useState(false);

  const handleDailyWorkLogSubmit = async (e) => {
    e.preventDefault();
    const calls = Number(dailyLogForm.numberOfCalls || 0);
    const conversions = Number(dailyLogForm.numberOfConversions || 0);
    const sales = Number(dailyLogForm.numberOfSales || 0);

    if (calls <= 0 && conversions <= 0 && sales <= 0) {
      return toast.error('Please enter at least one valid metric (Calls, Conversions, or Sales)');
    }

    setSubmittingDailyLog(true);
    try {
      const res = await salesApi.submitDailyWorkLog({
        numberOfCalls: calls,
        numberOfConversions: conversions,
        numberOfSales: sales,
        note: (dailyLogForm.note || '').trim()
      });
      if (res && res.success) {
        toast.success("Daily work log submitted to Sales Manager! 📊");
        setDailyLogForm({ numberOfCalls: '', numberOfConversions: '', numberOfSales: '', note: '' });
        if (res.data?.log) {
          const newLog = res.data.log;
          setDailyWorkLogs(prev => [newLog, ...prev.filter(l => String(l._id) !== String(newLog._id))]);
        }
      } else {
        toast.error(res?.message || "Failed to submit daily work log");
      }
    } catch (err) {
      console.error('Work log submission error:', err);
      toast.error(err.response?.data?.message || "Failed to submit daily work log");
    } finally {
      setSubmittingDailyLog(false);
    }
  };

  const resolveLeadForTask = (task) => {
    if (!task) return null;
    // 1. Direct leadId on task
    if (task.leadId) {
      if (typeof task.leadId === 'object' && task.leadId._id) {
        return { id: task.leadId._id, code: task.leadId.leadCode || task.leadId.customerName };
      }
      if (typeof task.leadId === 'string') {
        const found = (deals || []).find(d => String(d._id) === task.leadId);
        return { id: task.leadId, code: found ? found.leadCode : task.leadId };
      }
    }

    // 2. Search title or description for leadCode or customerName
    const combinedText = `${task.title || ''} ${task.description || ''}`;

    // Check regex pattern for Lead Code (e.g. LD-1788620082426-3684)
    const codeMatch = combinedText.match(/\b(?:LD|LEAD)-[A-Za-z0-9-]+\b/i);
    if (codeMatch) {
      const codeStr = codeMatch[0];
      const matchedByCode = (deals || []).find(d => d.leadCode && d.leadCode.toLowerCase() === codeStr.toLowerCase());
      if (matchedByCode) {
        return { id: matchedByCode._id, code: matchedByCode.leadCode };
      }
    }

    // Check MongoDB ObjectId pattern
    const idMatch = combinedText.match(/\b[0-9a-fA-F]{24}\b/);
    if (idMatch) {
      const matchedById = (deals || []).find(d => String(d._id) === idMatch[0]);
      if (matchedById) {
        return { id: matchedById._id, code: matchedById.leadCode };
      }
      return { id: idMatch[0], code: idMatch[0] };
    }

    // Check customer name matching in deals
    if (deals && deals.length > 0) {
      const matchedByName = deals.find(d => d.customerName && d.customerName.length > 2 && combinedText.toLowerCase().includes(d.customerName.toLowerCase()));
      if (matchedByName) {
        return { id: matchedByName._id, code: matchedByName.leadCode || matchedByName.customerName };
      }
    }

    return null;
  };

  const handleTaskClick = (task) => {
    const lead = resolveLeadForTask(task);
    if (lead && lead.id) {
      navigate(`/crm/leads/${lead.id}`);
    } else {
      toast.error('No lead manifest record linked to this task.');
    }
  };

  const [showCallModal, setShowCallModal] = useState(false);
  const [myCallRecordings, setMyCallRecordings] = useState([]);

  // Date Filter & LOI Modal State
  const [dateFilterMode, setDateFilterMode] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'PICK_DATE'
  const [selectedDate, setSelectedDate] = useState('');

  const [showLOIModal, setShowLOIModal] = useState(false);
  const [loiTargetLeadId, setLoiTargetLeadId] = useState('');
  const [loiFile, setLoiFile] = useState(null);
  const [loiNotes, setLoiNotes] = useState('');
  const [uploadingLOI, setUploadingLOI] = useState(false);

  const toLocalDateStr = (d) => {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFilteredByDate = (items = []) => {
    if (dateFilterMode === 'ALL') return items;

    const todayStr = toLocalDateStr(new Date());
    const yestDate = new Date();
    yestDate.setDate(yestDate.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yestDate);

    let targetDateStr = '';
    if (dateFilterMode === 'TODAY') targetDateStr = todayStr;
    else if (dateFilterMode === 'YESTERDAY') targetDateStr = yesterdayStr;
    else if (dateFilterMode === 'PICK_DATE' && selectedDate) targetDateStr = selectedDate;

    if (!targetDateStr) return items;

    return items.filter(item => {
      const createdStr = toLocalDateStr(item.createdAt || item.date || item.uploadedAt);
      const updatedStr = toLocalDateStr(item.updatedAt || item.assignedAt);
      const targetStr = toLocalDateStr(item.targetDate);
      const followupStr = toLocalDateStr(item.nextFollowupAt);

      return (
        createdStr === targetDateStr ||
        updatedStr === targetDateStr ||
        targetStr === targetDateStr ||
        followupStr === targetDateStr
      );
    });
  };

  const handleLOISubmit = async (e) => {
    e.preventDefault();
    if (!loiTargetLeadId) {
      toast.error('Please select a lead for the LOI document');
      return;
    }
    if (!loiFile) {
      toast.error('Please select an LOI document file');
      return;
    }

    setUploadingLOI(true);
    try {
      const formData = new FormData();
      formData.append('file', loiFile);
      if (loiNotes) formData.append('notes', loiNotes);

      const res = await leadsApi.uploadLOIDocument(loiTargetLeadId, formData);
      if (res.success) {
        toast.success('LOI Document uploaded & saved to Google Drive!');
        setShowLOIModal(false);
        setLoiFile(null);
        setLoiNotes('');
        setLoiTargetLeadId('');
        loadDashboardData();
      } else {
        toast.error(res.message || 'LOI upload failed');
      }
    } catch (err) {
      console.error('LOI upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload LOI document');
    } finally {
      setUploadingLOI(false);
    }
  };

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

      // 2. Fetch User's Deals & All System Leads for LOI Ingestion
      const leadsRes = await leadsApi.getLeads({ limit: 100 });
      if (leadsRes.success || leadsRes.data) {
        const fetchedLeads = leadsRes.data?.leads || leadsRes.leads || [];
        const myLeads = fetchedLeads.filter(lead => {
          if (!user || !lead) return false;
          if (!lead.assignedTo) return true;
          const assigned = lead.assignedTo;
          const myUserId = String(user._id || user.id || '');
          const myEmpId = user.employeeDbId ? String(user.employeeDbId) : '';
          const myEmail = user.email ? String(user.email).toLowerCase().trim() : '';

          if (typeof assigned === 'object' && assigned !== null) {
            const assignedId = String(assigned._id || assigned.id || '');
            const assignedEmail = assigned.email ? String(assigned.email).toLowerCase().trim() : '';
            if (myEmail && assignedEmail && assignedEmail === myEmail) return true;
            if (assignedId && (assignedId === myUserId || (myEmpId && assignedId === myEmpId))) return true;
          } else {
            const assignedId = String(assigned);
            if (assignedId && (assignedId === myUserId || (myEmpId && assignedId === myEmpId))) return true;
          }
          return false;
        });

        const activeDeals = myLeads.length > 0 ? myLeads : fetchedLeads;
        setDeals(activeDeals);

        // 3. Generate priority to-dos from active deal status
        generateToDos(activeDeals);
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
          setSharedFiles(filesRes.data?.files || filesRes.files || []);
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

      // 10. Fetch own daily work logs
      try {
        const logsRes = await salesApi.getDailyWorkLogs();
        if (logsRes.success) {
          setDailyWorkLogs(logsRes.data?.logs || logsRes.logs || []);
        }
      } catch (err) {
        console.error('Error fetching daily work logs:', err);
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

  // Listen for real-time work log socket broadcasts
  useEffect(() => {
    const skt = socketService.getSocket();
    if (skt) {
      const handleWorkLog = (newLog) => {
        if (newLog && (String(newLog.employeeId) === String(user?._id) || user?.role === 'ADMIN' || user?.role?.includes('MANAGER'))) {
          setDailyWorkLogs(prev => [newLog, ...prev.filter(l => String(l._id) !== String(newLog._id))]);
        }
      };
      skt.on('work_log_submitted', handleWorkLog);
      return () => {
        skt.off('work_log_submitted', handleWorkLog);
      };
    }
  }, [user]);

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
    const absoluteUrl = getFileUrl(fileUrl);

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
          setSharedFiles(filesRes.data?.files || filesRes.files || []);
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
    .filter(d => ['ORDER_CONFIRMED', 'DISPATCH_PENDING', 'DISPATCH_PLANNED', 'PAYMENT_PENDING', 'DOCUMENT_PENDING', 'CLOSED_WON', 'DEAL_WON'].includes((d.stage || '').toUpperCase()))
    .reduce((sum, d) => sum + (d.leadValue || 0), 0);
  const achievedVal = performance?.revenue || wonRevenue || 0;
  const remainingVal = Math.max(0, targetVal - achievedVal);
  const targetProgressPercent = Math.min(100, Math.round((achievedVal / targetVal) * 100));

  // Lead Conversion Calculation (Leads -> Orders)
  const totalMyLeads = performance?.totalLeads !== undefined ? performance.totalLeads : (deals.length || 0);
  const wonMyDeals = performance?.dealsWon !== undefined ? performance.dealsWon : deals.filter(d => ['ORDER_CONFIRMED', 'DISPATCH_PENDING', 'DISPATCH_PLANNED', 'PAYMENT_PENDING', 'DOCUMENT_PENDING', 'CLOSED_WON', 'DEAL_WON'].includes((d.stage || '').toUpperCase())).length;
  const conversionRate = totalMyLeads > 0 ? Math.round((wonMyDeals / totalMyLeads) * 100) : 0;

  // Render circular progress path definitions
  const radius = 50;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (targetProgressPercent / 100) * circumference;

  // Dynamic metrics for TODAY'S PERFORMANCE TARGET based on assigned leads (totalMyLeads)
  const assignedLeadsDenominator = totalMyLeads || 0;

  // Calls Done: from dailyWorkLogs or contacted deals
  const callsDoneFromLogs = (dailyWorkLogs || []).reduce((sum, log) => sum + (Number(log.numberOfCalls) || 0), 0);
  const contactedDealsCount = (deals || []).filter(d => ['CONTACTED', 'LEAD_QUALIFICATION', 'FOLLOW_UP', 'REQUIREMENT_CAPTURED', 'QUOTATION_SHARED', 'CLOSED_WON', 'DEAL_WON'].includes((d.stage || '').toUpperCase())).length;
  const callsDoneCount = Math.max(callsDoneFromLogs, contactedDealsCount);

  // Follow Ups: from deals currently in follow up stages or work log conversions
  const followUpsFromLogs = (dailyWorkLogs || []).reduce((sum, log) => sum + (Number(log.numberOfConversions) || 0), 0);
  const followUpDealsCount = (deals || []).filter(d => ['FOLLOW_UP', 'REQUIREMENT_CAPTURED', 'QUOTATION_REQUIRED', 'QUOTATION_PENDING_APPROVAL', 'QUOTATION_SHARED', 'QUOTATION_SENT'].includes((d.stage || '').toUpperCase())).length;
  const followUpsCount = Math.max(followUpsFromLogs, followUpDealsCount);

  // Meetings: from deals in negotiation, ICPO, or sales stages
  const meetingsFromLogs = (dailyWorkLogs || []).reduce((sum, log) => sum + (Number(log.numberOfSales) || 0), 0);
  const meetingDealsCount = (deals || []).filter(d => ['PRICE_DISCUSSION', 'NEGOTIATION', 'LOI_PO_PENDING', 'PO_RECEIVED', 'DOCUMENT_PENDING', 'PAYMENT_PENDING', 'ORDER_CONFIRMED'].includes((d.stage || '').toUpperCase())).length;
  const meetingsCount = Math.max(meetingsFromLogs, meetingDealsCount);

  // Gauge percentage calculation for Today's Target Card
  const todayActionsTotal = callsDoneCount + followUpsCount + meetingsCount;
  const todayTargetPercent = assignedLeadsDenominator > 0 ? Math.min(100, Math.round((todayActionsTotal / assignedLeadsDenominator) * 100)) : 0;
  const todayGaugeDashOffset = circumference - (todayTargetPercent / 100) * circumference;

  // Format monetary value
  const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;



  // Map user rank status
  const myRankIndex = leaderboardData.findIndex(r => r.email?.toLowerCase() === user.email?.toLowerCase());
  const myRankNum = myRankIndex !== -1 ? myRankIndex + 1 : leaderboardData.length + 1;
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto w-full min-w-0"
    >
      {/* Executive Portal Header (Matching Reference UI Screenshot) */}
      <motion.div variants={itemVariants} className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 sm:p-5 rounded-xl shadow-xs text-left">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-[var(--crm-ink-faint)]">
              INDIA TRADE CENTER &gt; SALES &gt; DASHBOARD
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--crm-heading)] font-sans tracking-tight flex items-center gap-2">
              👋 {greeting}, {user?.fullName || user?.name || 'Sales Executive'}
            </h1>
            <p className="text-xs text-[var(--crm-ink-faint)] font-medium">
              Track your sales team performance, leads, follow-ups and achieve targets.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto font-sans">
            <button
              onClick={() => setShowLOIModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wide rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-600"
            >
              <span>UPLOAD LOI</span>
            </button>
            <button
              onClick={() => setShowCallModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wide rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-rose-600"
            >
              <span>UPLOAD RECORDING</span>
            </button>
            <button
              onClick={loadDashboardData}
              className="w-full sm:w-auto px-4 py-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] hover:bg-[var(--crm-bg-raised)] font-extrabold text-xs uppercase tracking-wide rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <FiRotateCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>SYNC DATA</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Date & Calendar Filter Bar */}
      <motion.div variants={itemVariants} className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-3.5 sm:p-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-left font-sans">
        <div className="flex items-center gap-2 text-[var(--crm-heading)] font-extrabold text-xs uppercase tracking-wider shrink-0">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <FiCalendar size={14} />
          </span>
          <span>DATE & CALENDAR FILTER:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full md:w-auto">
          <button
            onClick={() => { setDateFilterMode('ALL'); setSelectedDate(''); }}
            className={`flex-1 sm:flex-none text-center px-3 sm:px-4 py-2 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold uppercase tracking-wide transition cursor-pointer ${
              dateFilterMode === 'ALL'
                ? 'bg-blue-600 text-white border border-blue-600 shadow-xs'
                : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] hover:bg-[var(--crm-bg-raised)]'
            }`}
          >
            ALL DATES
          </button>
          <button
            onClick={() => { setDateFilterMode('TODAY'); setSelectedDate(''); }}
            className={`flex-1 sm:flex-none text-center px-3 sm:px-4 py-2 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold uppercase tracking-wide transition cursor-pointer ${
              dateFilterMode === 'TODAY'
                ? 'bg-blue-600 text-white border border-blue-600 shadow-xs'
                : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] hover:bg-[var(--crm-bg-raised)]'
            }`}
          >
            TODAY
          </button>
          <button
            onClick={() => { setDateFilterMode('YESTERDAY'); setSelectedDate(''); }}
            className={`flex-1 sm:flex-none text-center px-3 sm:px-4 py-2 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold uppercase tracking-wide transition cursor-pointer ${
              dateFilterMode === 'YESTERDAY'
                ? 'bg-blue-600 text-white border border-blue-600 shadow-xs'
                : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] hover:bg-[var(--crm-bg-raised)]'
            }`}
          >
            YESTERDAY
          </button>

          <div className="flex-1 sm:flex-none flex items-center justify-between sm:justify-start gap-1.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-1.5 rounded-xl min-w-[150px]">
            <span className="text-[10px] text-[var(--crm-ink-faint)] font-bold uppercase whitespace-nowrap">PICK DATE</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDateFilterMode(e.target.value ? 'PICK_DATE' : 'ALL');
              }}
              className="bg-transparent text-[var(--crm-heading)] text-xs outline-none cursor-pointer font-sans"
            />
          </div>
        </div>

        <div className="text-xs text-[var(--crm-ink-faint)] shrink-0 font-sans">
          Showing: <strong className="text-blue-500 font-extrabold">All Teams</strong> | <strong className="text-[var(--crm-heading)]">{deals.length || 1124} Leads</strong>
        </div>
      </motion.div>

      {/* Tabs Navigation Bar */}
      <motion.div variants={itemVariants} className="bg-[var(--crm-bg-raised)] border-y border-[var(--crm-line)] px-3 sm:px-6 py-2 flex overflow-x-auto custom-scrollbar shadow-xs min-w-0 w-full">
        <nav className="flex space-x-2 min-w-max px-1">
          {[
            { id: 'daily', label: 'ONLY ACTIONS NOW', icon: FiZap },
            { id: 'leaderboard', label: 'LEADS PERFORMANCE & CONVERSION', icon: FiTrendingUp },
            { id: 'shared_files', label: 'SHARED FILES', icon: FiFolder },
            { id: 'assigned_leads', label: `ASSIGNED LEADS (${deals.length})`, icon: FiUsers },
            { id: 'assembly_tasks', label: `ASSEMBLY TASKS (${managerTasks.length})`, icon: FiCheckSquare }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs uppercase font-sans font-extrabold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white border border-blue-600 shadow-md'
                  : 'bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] border border-[var(--crm-line)] hover:text-[var(--crm-heading)] hover:bg-[var(--crm-bg-raised)]'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </nav>
      </motion.div>

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3">
            <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono tracking-widest uppercase text-[var(--crm-ink-faint)]">Loading Sales Executive Dashboard...</p>
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-5 w-full min-w-0"
          >
            {/* TAB: DAILY ACTION VIEW */}
            {activeTab === 'daily' && (
              <>
                <div className="space-y-5 text-left">
                {/* 6 Stat KPI Cards Row (Image 2 style) */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-xl flex flex-col justify-between shadow-xs transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-extrabold font-mono leading-tight">ASSIGNED LEADS</span>
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <FiUsers size={13} />
                      </div>
                    </div>
                    <div className="mt-3 text-left">
                      <p className="text-xl sm:text-2xl font-bold text-[var(--crm-heading)] font-mono leading-none">{totalMyLeads || 0}</p>
                    </div>
                  </div>

                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-xl flex flex-col justify-between shadow-xs transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-extrabold font-mono leading-tight">WON LEADS</span>
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <FiCheckCircle size={13} />
                      </div>
                    </div>
                    <div className="mt-3 text-left">
                      <p className="text-xl sm:text-2xl font-bold text-[var(--crm-heading)] font-mono leading-none">{wonMyDeals || 0}</p>
                    </div>
                  </div>

                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-xl flex flex-col justify-between shadow-xs transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-extrabold font-mono leading-tight">PENDING LEADS</span>
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <FiClock size={13} />
                      </div>
                    </div>
                    <div className="mt-3 text-left">
                      <p className="text-xl sm:text-2xl font-bold text-[var(--crm-heading)] font-mono leading-none">{deals.filter(d => !['ORDER_CONFIRMED', 'DISPATCH_PENDING', 'DISPATCH_PLANNED', 'PAYMENT_PENDING', 'DOCUMENT_PENDING', 'CLOSED_WON', 'DEAL_WON', 'CLOSED_LOST', 'DEAL_LOST'].includes((d.stage || '').toUpperCase())).length || 0}</p>
                    </div>
                  </div>

                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-xl flex flex-col justify-between shadow-xs transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-extrabold font-mono leading-tight">LOST LEADS</span>
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0">
                        <FiAlertCircle size={13} />
                      </div>
                    </div>
                    <div className="mt-3 text-left">
                      <p className="text-xl sm:text-2xl font-bold text-[var(--crm-heading)] font-mono leading-none">{deals.filter(d => ['CLOSED_LOST', 'DEAL_LOST'].includes((d.stage || '').toUpperCase())).length || 0}</p>
                    </div>
                  </div>

                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-xl flex flex-col justify-between shadow-xs transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-extrabold font-mono leading-tight">TOTAL REVENUE</span>
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 flex items-center justify-center shrink-0">
                        <FiTrendingUp size={13} />
                      </div>
                    </div>
                    <div className="mt-3 text-left">
                      <p className="text-xl sm:text-2xl font-bold text-[var(--crm-heading)] font-mono leading-none">{currency(achievedVal)}</p>
                    </div>
                  </div>

                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-xl flex flex-col justify-between shadow-xs transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-extrabold font-mono leading-tight">COMPLETED TASKS</span>
                      <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-500 border border-teal-500/20 flex items-center justify-center shrink-0">
                        <FiCheckSquare size={13} />
                      </div>
                    </div>
                    <div className="mt-3 text-left">
                      <p className="text-xl sm:text-2xl font-bold text-[var(--crm-heading)] font-mono leading-none">{completedTasksCount || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Middle Row: Today's Performance Target & Live Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">
                  {/* Today's Performance Target Card */}
                  <div className="lg:col-span-6 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-2xl shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-[var(--crm-line)] pb-3">
                      <span className="text-amber-500 font-extrabold">🎯</span>
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[var(--crm-heading)] font-sans">
                        TODAY'S PERFORMANCE TARGET
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                      {/* Gauge */}
                      <div className="sm:col-span-5 flex flex-col items-center justify-center">
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle className="text-[var(--crm-bg-sunken)]" strokeWidth={strokeWidth} stroke="currentColor" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
                            <circle className="text-[#0ea5e9] transition-all duration-700 ease-out" strokeWidth={strokeWidth} strokeDasharray={`${circumference} ${circumference}`} style={{ strokeDashoffset: todayGaugeDashOffset }} strokeLinecap="round" stroke="currentColor" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
                          </svg>
                          <div className="absolute text-center font-mono">
                            <span className="text-xl font-extrabold text-[var(--crm-heading)] leading-none">{todayTargetPercent}%</span>
                            <span className="text-[8px] uppercase block text-[var(--crm-ink-faint)] font-bold mt-0.5">{todayActionsTotal} / {assignedLeadsDenominator}</span>
                          </div>
                        </div>
                      </div>

                      {/* 3 Mini Stat Cards */}
                      <div className="sm:col-span-7 space-y-2 font-mono">
                        <div className="p-2.5 rounded-xl border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>📞</span>
                            <span className="text-[10px] uppercase font-bold text-[var(--crm-heading)]">CALLS DONE</span>
                          </div>
                          <span className="text-xs font-extrabold text-[var(--crm-heading)]">{callsDoneCount} / {assignedLeadsDenominator}</span>
                        </div>

                        <div className="p-2.5 rounded-xl border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>📞</span>
                            <span className="text-[10px] uppercase font-bold text-[var(--crm-heading)]">FOLLOW UPS</span>
                          </div>
                          <span className="text-xs font-extrabold text-[var(--crm-heading)]">{followUpsCount} / {assignedLeadsDenominator}</span>
                        </div>

                        <div className="p-2.5 rounded-xl border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>📅</span>
                            <span className="text-[10px] uppercase font-bold text-[var(--crm-heading)]">MEETINGS</span>
                          </div>
                          <span className="text-xs font-extrabold text-[var(--crm-heading)]">{meetingsCount} / {assignedLeadsDenominator}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[var(--crm-line)] pt-3 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-sans">
                      <span className="text-[var(--crm-ink-faint)] font-medium">Reach Today's Sales Conversion Goals. Make calls, follow up and schedule meetings.</span>
                      <span className="font-mono font-bold text-[var(--crm-heading)]">{todayTargetPercent}%</span>
                    </div>
                  </div>

                  {/* Monthly Performance Target Card (Image 2 style) */}
                  <div className="lg:col-span-6 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-2xl shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-3">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[var(--crm-heading)] font-sans">
                        MONTHLY PERFORMANCE TARGET
                      </h3>
                      <FiTrendingUp className="text-emerald-500" size={16} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                      {/* Gauge */}
                      <div className="sm:col-span-4 flex flex-col items-center justify-center">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle className="text-[var(--crm-bg-sunken)]" strokeWidth={strokeWidth} stroke="currentColor" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
                            <circle className="text-emerald-500 transition-all duration-700 ease-out" strokeWidth={strokeWidth} strokeDasharray={`${circumference} ${circumference}`} style={{ strokeDashoffset }} strokeLinecap="round" stroke="currentColor" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
                          </svg>
                          <div className="absolute text-center font-mono">
                            <span className="text-lg font-black text-[var(--crm-heading)] leading-none">{targetProgressPercent}%</span>
                            <span className="text-[7px] uppercase block text-[var(--crm-ink-faint)] font-bold mt-0.5">ACHIEVED</span>
                          </div>
                        </div>
                      </div>

                      {/* 3 Target Stat Boxes */}
                      <div className="sm:col-span-8 space-y-3 font-mono">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="p-2.5 rounded-xl border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-left">
                            <span className="text-[8px] uppercase font-bold text-[var(--crm-ink-faint)] block leading-tight">MONTHLY TARGET</span>
                            <strong className="text-xs font-black text-[var(--crm-heading)] block mt-1 leading-none">{currency(targetVal)}</strong>
                          </div>
                          <div className="p-2.5 rounded-xl border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-left">
                            <span className="text-[8px] uppercase font-bold text-[var(--crm-heading)] block leading-tight">ACHIEVED</span>
                            <strong className="text-xs font-black text-[var(--crm-heading)] block mt-1 leading-none">{currency(achievedVal)}</strong>
                          </div>
                          <div className="p-2.5 rounded-xl border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-left">
                            <span className="text-[8px] uppercase font-bold text-[var(--crm-heading)] block leading-tight">REMAINING</span>
                            <strong className="text-xs font-black text-[var(--crm-heading)] block mt-1 leading-none">{currency(remainingVal)}</strong>
                          </div>
                        </div>

                        {/* Conversion Rate Bar */}
                        <div className="border-t border-[var(--crm-line)] pt-3 flex items-center justify-between text-left">
                          <div>
                            <span className="text-[11px] font-bold text-[var(--crm-heading)] block font-sans">Lead-to-Order Conversion Rate</span>
                            <span className="text-[9px] text-[var(--crm-ink-faint)] block font-sans">Total won deals divided by assigned leads</span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="text-base font-black text-[var(--crm-heading)] font-mono">{conversionRate}%</span>
                            <div className="w-20 bg-[var(--crm-bg-sunken)] h-1.5 rounded-full overflow-hidden mt-0.5 border border-[var(--crm-line)]">
                              <div className="bg-emerald-500 h-full" style={{ width: `${conversionRate}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lower Row: Add Today's Activity & Recent Activity Table */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">
                  {/* Left Form: Add Today's Sales Activity */}
                  <div className="lg:col-span-6 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-2xl shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--crm-line)] pb-3 gap-2">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[var(--crm-heading)] font-sans flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        ADD TODAY'S SALES ACTIVITY
                      </h3>
                      <button className="self-start sm:self-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-sans font-extrabold uppercase rounded-xl transition cursor-pointer shadow-xs border border-emerald-600 flex items-center gap-1 shrink-0">
                        <span>⚡ QUICK ADD</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-[var(--crm-ink-faint)] font-sans">
                      Log your calls, follow-ups, meetings and activities to keep track of your daily progress.
                    </p>

                    <form onSubmit={handleDailyWorkLogSubmit} className="space-y-3 font-mono text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">📞 ACTIVITY TYPE</label>
                          <select
                            value={dailyLogForm.activityType || 'CALL'}
                            onChange={(e) => setDailyLogForm(prev => ({ ...prev, activityType: e.target.value }))}
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded-xl outline-none cursor-pointer"
                          >
                            <option value="CALL">Select Activity Type</option>
                            <option value="CALL">📞 Phone Call</option>
                            <option value="FOLLOW_UP">🔄 Follow Up</option>
                            <option value="MEETING">📅 Meeting</option>
                            <option value="NOTE">📝 Note / Discussion</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">LEAD NAME / NUMBER</label>
                          <input
                            type="text"
                            placeholder="Lead Name / Number"
                            value={dailyLogForm.leadName || ''}
                            onChange={(e) => setDailyLogForm(prev => ({ ...prev, leadName: e.target.value }))}
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded-xl outline-none font-sans"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">📅 DATE</label>
                          <input
                            type="date"
                            value={dailyLogForm.date || new Date().toISOString().split('T')[0]}
                            onChange={(e) => setDailyLogForm(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded-xl outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">⏰ TIME</label>
                          <input
                            type="time"
                            value={dailyLogForm.time || '12:00'}
                            onChange={(e) => setDailyLogForm(prev => ({ ...prev, time: e.target.value }))}
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded-xl outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">REMARKS & NOTES</label>
                        <textarea
                          rows="2"
                          placeholder="Add notes about the call, discussion or next steps..."
                          value={dailyLogForm.note}
                          onChange={(e) => setDailyLogForm(prev => ({ ...prev, note: e.target.value }))}
                          className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded-xl outline-none font-sans resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingDailyLog}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-sans font-extrabold text-xs uppercase py-3 rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2 border border-emerald-600"
                      >
                        <span>+ ADD ACTIVITY</span>
                      </button>
                    </form>
                  </div>

                  {/* Right Table: Recent Sales Activity & Quick View */}
                  <div className="lg:col-span-6 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--crm-line)] pb-3 mb-3 gap-2">
                        <h3 className="text-xs uppercase font-extrabold tracking-widest text-[var(--crm-heading)] font-sans flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          RECENT SALES ACTIVITY & QUICK VIEW
                        </h3>
                        <button className="self-start sm:self-auto text-[10px] font-bold text-blue-500 hover:underline cursor-pointer shrink-0">
                          View All Activities
                        </button>
                      </div>

                      <p className="text-[11px] text-[var(--crm-ink-faint)] font-sans mb-3">
                        Track latest calls, follow-ups, meetings and notes from your team.
                      </p>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[550px]">
                          <thead>
                            <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-line)]">
                              <th className="py-2.5 px-3">DATE & TIME</th>
                              <th className="py-2.5 px-3">EMPLOYEE</th>
                              <th className="py-2.5 px-3">LEAD / CUSTOMER</th>
                              <th className="py-2.5 px-3">ACTIVITY TYPE</th>
                              <th className="py-2.5 px-3">NOTES</th>
                              <th className="py-2.5 px-3">NEXT STEP</th>
                              <th className="py-2.5 px-3">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--crm-line)] text-xs font-mono">
                            {dailyWorkLogs.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="py-12 text-center text-[var(--crm-ink-faint)] space-y-2">
                                  <div className="text-2xl">📥</div>
                                  <div className="font-extrabold text-xs text-[var(--crm-heading)]">No recent sales activities found.</div>
                                  <div className="text-[10px]">Start by adding today's first activity.</div>
                                </td>
                              </tr>
                            ) : (
                              dailyWorkLogs.map((log) => (
                                <tr key={log._id || log.id} className="hover:bg-[var(--crm-bg-sunken)]/50 transition">
                                  <td className="py-2.5 px-3 text-[10px] text-[var(--crm-ink-faint)]">
                                    {new Date(log.createdAt || log.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-[var(--crm-heading)]">
                                    {log.employeeName || user?.fullName || 'Me'}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-blue-500">
                                    {log.leadName || 'Direct Call'}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold text-[9px] uppercase border border-blue-500/20">
                                      {log.activityType || 'CALL'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-sans italic text-[var(--crm-ink-soft)] truncate max-w-[120px]">
                                    {log.note || '—'}
                                  </td>
                                  <td className="py-2.5 px-3 text-[10px]">Followup</td>
                                  <td className="py-2.5 px-3 text-emerald-500 font-bold text-[10px]">Done</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">
                  {/* Left Chart: Leads Status Distribution */}
                  <div className="lg:col-span-6 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-2xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-3">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[var(--crm-heading)] font-sans flex items-center gap-2">
                        <span className="text-orange-500">📊</span> LEADS STATUS DISTRIBUTION
                      </h3>
                      <select className="px-3 py-1 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[9px] font-mono font-bold uppercase rounded-lg text-[var(--crm-heading)] outline-none cursor-pointer">
                        <option value="THIS_MONTH">This Month</option>
                        <option value="ALL">All Time</option>
                      </select>
                    </div>

                    <div className="h-56 mt-4">
                      <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
                        <BarChart data={[
                          { name: 'New', count: deals.filter(d => ['NEW_LEAD', 'ASSIGNED'].includes((d.stage || '').toUpperCase())).length || 1, fill: '#3b82f6' },
                          { name: 'In Discussion', count: deals.filter(d => ['CONTACTED', 'REQUIREMENT_CAPTURED'].includes((d.stage || '').toUpperCase())).length || 0, fill: '#f97316' },
                          { name: 'Follow Up', count: deals.filter(d => (d.stage || '').toUpperCase().includes('FOLLOW')).length || 0, fill: '#10b981' },
                          { name: 'Meeting', count: deals.filter(d => (d.stage || '').toUpperCase().includes('MEETING')).length || 0, fill: '#8b5cf6' },
                          { name: 'Closed Won', count: wonMyDeals || 0, fill: '#ef4444' },
                          { name: 'Lost/Dead', count: deals.filter(d => ['CLOSED_LOST', 'DEAL_LOST'].includes((d.stage || '').toUpperCase())).length || 0, fill: '#64748b' }
                        ]} margin={{ left: -20, top: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.08} stroke="var(--crm-line)" />
                          <XAxis dataKey="name" stroke="var(--crm-ink-faint)" fontSize={10} tickLine={false} />
                          <YAxis stroke="var(--crm-ink-faint)" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)', fontSize: 10, fontFamily: 'monospace', color: 'var(--crm-heading)' }} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Right Chart: Calls & Meetings Overview */}
                  <div className="lg:col-span-6 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-2xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-3">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[var(--crm-heading)] font-sans flex items-center gap-2">
                        <span className="text-purple-500">📊</span> CALLS & MEETINGS OVERVIEW
                      </h3>
                      <select className="px-3 py-1 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[9px] font-mono font-bold uppercase rounded-lg text-[var(--crm-heading)] outline-none cursor-pointer">
                        <option value="THIS_MONTH">This Month</option>
                        <option value="ALL">All Time</option>
                      </select>
                    </div>

                    <div className="h-56 mt-4">
                      <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
                        <BarChart data={[
                          { name: 'Calls Done', count: myCallRecordings.length || 0, fill: '#3b82f6' },
                          { name: 'Follow Ups', count: deals.filter(d => (d.stage || '').toUpperCase().includes('FOLLOW')).length || 0, fill: '#10b981' },
                          { name: 'Meetings', count: 0, fill: '#8b5cf6' },
                          { name: 'Conversions', count: wonMyDeals || 0, fill: '#f97316' }
                        ]} margin={{ left: -20, top: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.08} stroke="var(--crm-line)" />
                          <XAxis dataKey="name" stroke="var(--crm-ink-faint)" fontSize={10} tickLine={false} />
                          <YAxis stroke="var(--crm-ink-faint)" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)', fontSize: 10, fontFamily: 'monospace', color: 'var(--crm-heading)' }} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
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
                        {managerTasks.map((task) => {
                          const resolvedLead = resolveLeadForTask(task);
                          return (
                            <div
                              key={task._id}
                              className="p-4 border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)]/40 hover:bg-[var(--crm-bg-sunken)] rounded-md transition text-xs font-mono space-y-3 flex flex-col justify-between group hover:border-teal-600/50 shadow-sm"
                            >
                              <div className="space-y-1">
                                <div className="flex justify-between items-start gap-2">
                                  <span className={`text-[8px] font-mono font-black px-2.5 py-1 rounded uppercase shadow-xs ${task.priority === 'HIGH' ? 'bg-rose-600 text-white border border-rose-700' :
                                      task.priority === 'MEDIUM' ? 'bg-amber-500 text-white border border-amber-600' :
                                        'bg-slate-700 text-white border border-slate-600'
                                    }`}>
                                    {task.priority}
                                  </span>
                                  <span className="text-[8px] text-[var(--crm-ink-faint)] font-light">
                                    Due: {new Date(task.dueDate).toLocaleDateString('en-IN')}
                                  </span>
                                </div>

                                <div
                                  onClick={() => handleTaskClick(task)}
                                  className="cursor-pointer group/taskitem pt-1"
                                  title={resolvedLead ? `Click to open lead (${resolvedLead.code})` : 'Click to open associated lead'}
                                >
                                  <h4 className="font-sans font-bold text-sm text-[var(--crm-heading)] group-hover/taskitem:text-teal-400 transition-colors flex items-center justify-between">
                                    <span className="group-hover/taskitem:underline">{task.title}</span>
                                    <span className="text-[10px] text-teal-400 font-mono font-normal opacity-80 group-hover/taskitem:opacity-100 transition-opacity flex items-center gap-0.5 ml-2 shrink-0 bg-teal-950/60 border border-teal-800/40 px-1.5 py-0.5 rounded">
                                      View Lead ↗
                                    </span>
                                  </h4>
                                  {task.description && (
                                    <p className="font-sans text-[var(--crm-ink-soft)] text-[11px] leading-relaxed pt-1 whitespace-pre-wrap group-hover/taskitem:text-[var(--crm-heading)] transition-colors">
                                      {task.description}
                                    </p>
                                  )}
                                </div>

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
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* KPI Cards Row (6 in a row) */}
                 



                  {/* Executive Activity KPI Cards (Call Recordings & Shared Files count) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-[var(--crm-bg-raised)] border border-rose-500/30 p-4 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-sans tracking-widest text-rose-500 font-extrabold block truncate">
                          🎙️ CALL RECORDINGS SENT
                        </span>
                        <strong className="text-2xl font-bold text-[var(--crm-heading)] mt-1 block font-mono">
                          {myCallRecordings.length}
                        </strong>
                      </div>
                      <button
                        onClick={() => setShowCallModal(true)}
                        className="shrink-0 text-[10px] uppercase font-sans font-extrabold bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-xl transition cursor-pointer shadow-xs border border-rose-600 whitespace-nowrap"
                      >
                        + UPLOAD CALL
                      </button>
                    </div>

                    <div className="bg-[var(--crm-bg-raised)] border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-sans tracking-widest text-emerald-500 font-extrabold block truncate">
                          📁 SHARED FILES SENT
                        </span>
                        <strong className="text-2xl font-bold text-[var(--crm-heading)] mt-1 block font-mono">
                          {sharedFiles.length}
                        </strong>
                      </div>
                      <button
                        onClick={() => setActiveTab('shared_files')}
                        className="shrink-0 text-[10px] uppercase font-sans font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl transition cursor-pointer shadow-xs border border-emerald-600 whitespace-nowrap"
                      >
                        VIEW FILES
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
                        <ResponsiveContainer width="100%" height={240} minWidth={0} minHeight={0}>
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
                        <ResponsiveContainer width="100%" height={240} minWidth={0} minHeight={0}>
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
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-sans font-extrabold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span className="flex items-center gap-2 text-rose-500">
                        <FiMic className="animate-pulse" size={14} /> MY CALL RECORDINGS ({getFilteredByDate(myCallRecordings).length})
                      </span>
                      <button
                        onClick={() => setShowCallModal(true)}
                        className="text-[10px] uppercase font-sans font-extrabold bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl transition cursor-pointer shadow-xs border border-rose-600"
                      >
                        + UPLOAD CALL
                      </button>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 font-mono">
                      {getFilteredByDate(myCallRecordings).length === 0 ? (
                        <div className="col-span-full py-8 text-center text-[10px] text-[var(--crm-ink-faint)] uppercase tracking-wider">
                          No call recordings found for the selected date filter.
                        </div>
                      ) : (
                        getFilteredByDate(myCallRecordings).map((rec) => (
                          <div key={rec._id} className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-md space-y-2 text-xs">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-serif font-bold text-[var(--crm-heading)] truncate text-xs">
                                  {rec.customerName || 'Client Call'}
                                </h4>
                                {rec.mobileNumber && (
                                  <span className="text-[9px] text-[var(--crm-ink-faint)] block">
                                    📱 {rec.mobileNumber} ({rec.contactRole || 'Contact'})
                                  </span>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase shadow-xs ${
                                  (rec.leadPriority || 'HOT') === 'HOT' ? 'bg-rose-600 text-white border border-rose-700' :
                                  rec.leadPriority === 'WARM' ? 'bg-amber-500 text-white border border-amber-600' :
                                    'bg-blue-600 text-white border border-blue-700'
                                }`}>
                                {rec.leadPriority || 'HOT'}
                              </span>
                            </div>

                            {(rec.material || rec.location || rec.quantity) && (
                              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-2.5 rounded-lg text-[10px] space-y-1 shadow-xs text-[var(--crm-heading)]">
                                {rec.material && (
                                  <div>
                                    <span className="text-[var(--crm-ink-faint)] font-medium">📦 Material: </span>
                                    <strong className="text-teal-600 dark:text-teal-400 font-extrabold">{rec.material}</strong>
                                    {rec.quantity ? <span className="text-[var(--crm-ink-faint)] font-bold"> ({rec.quantity})</span> : ''}
                                  </div>
                                )}
                                {rec.location && (
                                  <div>
                                    <span className="text-[var(--crm-ink-faint)] font-medium">📍 Location: </span>
                                    <strong className="text-amber-600 dark:text-amber-400 font-extrabold">{rec.location}</strong>
                                  </div>
                                )}
                              </div>
                            )}

                            {rec.notes && (
                              <p className="text-[11px] font-sans text-[var(--crm-heading)] bg-[var(--crm-bg-raised)] p-2.5 rounded-lg border border-[var(--crm-line)] italic line-clamp-3 break-words shadow-xs font-semibold">
                                "{rec.notes}"
                              </p>
                            )}

                            <div className="space-y-1 pt-1 border-t border-[var(--crm-line)]/50">
                              <audio
                                controls
                                controlsList="nodownload"
                                preload="metadata"
                                className="w-full h-7 rounded accent-teal-500"
                                src={`${API_URL}/leads/call-recordings/${rec._id}/stream${localStorage.getItem('token') ? `?token=${encodeURIComponent(localStorage.getItem('token'))}` : ''}`}
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

                {/* Daily Work Activity Reporting Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">

                  {/* Left Column (4 Cols): LOG TODAY'S WORK ACTIVITY Form */}
                  <div className="lg:col-span-4 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-2xl shadow-xs text-left space-y-4">
                    <div className="border-b border-[var(--crm-line)] pb-3 flex flex-wrap justify-between items-center gap-2">
                      <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-sans font-extrabold flex items-center gap-2">
                        <FiCheckSquare className="text-emerald-500" size={15} />
                        <span>LOG TODAY'S WORK ACTIVITY</span>
                      </h3>
                      <span className="bg-blue-600 text-white border border-blue-600 font-sans text-[9px] px-2.5 py-1 rounded-xl font-extrabold uppercase tracking-wider shadow-xs">
                        DAILY MANAGER REPORTING
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--crm-ink-faint)] font-sans leading-relaxed">
                      Enter your daily calls count, conversions, and closed sales for Manager dashboard tracking.
                    </p>

                    <form onSubmit={handleDailyWorkLogSubmit} className="space-y-3 font-sans text-xs">
                      <div>
                        <label className="block text-[10px] uppercase font-extrabold text-[var(--crm-heading)] mb-1">
                          📞 NUMBER OF CALLS *
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={dailyLogForm.numberOfCalls}
                          onChange={(e) => setDailyLogForm(prev => ({ ...prev, numberOfCalls: e.target.value }))}
                          placeholder="e.g. 45"
                          className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs p-3 rounded-xl outline-none focus:border-emerald-500 transition font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-extrabold text-[var(--crm-heading)] mb-1">
                            🎯 CONVERSIONS *
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={dailyLogForm.numberOfConversions}
                            onChange={(e) => setDailyLogForm(prev => ({ ...prev, numberOfConversions: e.target.value }))}
                            placeholder="e.g. 5"
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs p-3 rounded-xl outline-none focus:border-emerald-500 transition font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-extrabold text-[var(--crm-heading)] mb-1">
                            💰 SALES *
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={dailyLogForm.numberOfSales}
                            onChange={(e) => setDailyLogForm(prev => ({ ...prev, numberOfSales: e.target.value }))}
                            placeholder="e.g. 2"
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs p-3 rounded-xl outline-none focus:border-emerald-500 transition font-sans"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-extrabold text-[var(--crm-heading)] mb-1">
                          📝 NOTES / REMARKS
                        </label>
                        <textarea
                          rows="2"
                          value={dailyLogForm.note}
                          onChange={(e) => setDailyLogForm(prev => ({ ...prev, note: e.target.value }))}
                          placeholder="e.g. Closed 2 deals with SGS Iron Ore client"
                          className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs p-3 rounded-xl outline-none focus:border-emerald-500 transition font-sans resize-none"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingDailyLog}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-sans font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2 border border-emerald-600"
                      >
                        {submittingDailyLog ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>SUBMITTING...</span>
                          </>
                        ) : (
                          <span>SUBMIT WORK LOG TO MANAGER</span>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Right Column (8 Cols): EXECUTIVE DAILY ACTIVITY & SALES LOGS Table */}
                  <div className="lg:col-span-8 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-2xl shadow-xs text-left font-sans flex flex-col justify-between">
                    <div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--crm-line)] pb-3 mb-4 gap-2">
                        <div>
                          <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-sans font-extrabold flex items-center gap-1.5">
                            <FiCheckSquare size={14} className="text-emerald-500" /> EXECUTIVE DAILY ACTIVITY & SALES LOGS
                          </h3>
                          <p className="text-[10px] text-[var(--crm-ink-faint)] font-sans mt-0.5">
                            Real-time daily work entries submitted by you for Manager tracking (Calls, Conversions & Closed Sales).
                          </p>
                        </div>
                        <span className="bg-emerald-600 text-white border border-emerald-600 font-sans text-[10px] px-3 py-1 rounded-xl font-extrabold uppercase shrink-0 shadow-xs">
                          {getFilteredByDate(dailyWorkLogs).length} ENTRIES LOGGED
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[650px]">
                          <thead>
                            <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] text-[10px] uppercase tracking-widest font-sans font-extrabold border-b border-[var(--crm-line)]">
                              <th className="py-3 px-3">EMPLOYEE NAME</th>
                              <th className="py-3 px-3">DEPT</th>
                              <th className="py-3 px-3 text-[var(--crm-heading)]">📞 CALLS MADE</th>
                              <th className="py-3 px-3 text-[var(--crm-heading)]">🎯 CONVERSIONS</th>
                              <th className="py-3 px-3 text-[var(--crm-heading)]">💰 SALES COUNT</th>
                              <th className="py-3 px-3">DATE & TIME</th>
                              <th className="py-3 px-3">NOTES</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--crm-line)] text-xs font-sans">
                            {getFilteredByDate(dailyWorkLogs).length === 0 ? (
                              <tr>
                                <td colSpan="7" className="text-center py-12 text-[var(--crm-ink-faint)] uppercase tracking-widest text-[11px] font-semibold">
                                  No daily work logs submitted yet for this date filter.
                                </td>
                              </tr>
                            ) : (
                              getFilteredByDate(dailyWorkLogs).map((log) => (
                                <tr key={log._id || log.id} className="hover:bg-[var(--crm-bg-sunken)]/40 transition">
                                  <td className="py-3 px-3 font-extrabold text-[var(--crm-heading)]">
                                    {log.employeeName || user?.fullName || user?.name || 'Sales Executive'}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="bg-blue-600 text-white border border-blue-600 px-2.5 py-0.5 rounded-lg text-[9px] uppercase font-extrabold">
                                      {log.department || user?.department || 'SALES'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-[var(--crm-heading)] font-extrabold">
                                    {log.numberOfCalls} Calls
                                  </td>
                                  <td className="py-3 px-3 text-[var(--crm-heading)] font-extrabold">
                                    {log.numberOfConversions} Conversions
                                  </td>
                                  <td className="py-3 px-3 text-[var(--crm-heading)] font-extrabold">
                                    {log.numberOfSales} Sales
                                  </td>
                                  <td className="py-3 px-3 text-[var(--crm-ink-faint)] text-[10px] whitespace-nowrap font-mono font-medium">
                                    {new Date(log.createdAt || log.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                  </td>
                                  <td className="py-3 px-3 text-[11px] text-[var(--crm-ink-soft)] italic truncate max-w-[160px]" title={log.note}>
                                    {log.note ? `"${log.note}"` : '—'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
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
                        const stageDeals = getFilteredByDate(deals).filter(lead => stage.dbStages.includes(lead.stage));
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
                                      <span className={`text-[6px] font-bold font-mono px-1 rounded-sm uppercase ${deal.priority === 'HOT' ? 'bg-rose-950/40 text-rose-400 border border-rose-900/50' : 'bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-soft)] border border-[var(--crm-line)]'
                                        }`}>
                                        {deal.priority}
                                      </span>
                                    </div>
                                    <p className="text-[8px] text-[var(--crm-ink-faint)] truncate">{deal.companyName || 'Private Buyer'}</p>
                                    <div className="flex justify-between items-center pt-1.5 border-t border-[var(--crm-line)] mt-1">
                                      <span className="text-[7px] font-mono text-[var(--crm-ink-faint)] uppercase">{deal.productCategory}</span>
                                      <span className="text-[9px] font-mono font-bold text-teal-400">{currency(deal.leadValue)}</span>
                                    </div>
                                    {deal.loiDocuments && deal.loiDocuments.length > 0 && (
                                      <div className="pt-1">
                                        <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[7px] px-1.5 py-0.5 rounded font-bold uppercase inline-block">
                                          📄 LOI Attached ({deal.loiDocuments.length})
                                        </span>
                                      </div>
                                    )}
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
                        {getFilteredByDate(deals).length} Active
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
                            <th className="py-3 px-4">LOI Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--crm-line)] text-xs font-mono text-[var(--crm-ink-soft)]">
                          {getFilteredByDate(deals).length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center font-sans text-[10px] text-[var(--crm-ink-faint)] uppercase tracking-wider">
                                No assigned leads found for the selected date filter.
                              </td>
                            </tr>
                          ) : (
                            getFilteredByDate(deals).map((deal) => (
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
                                <td className="py-3 px-4">
                                  {deal.loiDocuments && deal.loiDocuments.length > 0 ? (
                                    <div className="space-y-1">
                                      <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800 text-[8px] px-2 py-0.5 rounded font-bold uppercase inline-block">
                                        ✓ LOI Uploaded ({deal.loiDocuments.length})
                                      </span>
                                      {deal.loiDocuments.map((loi, i) => (
                                        <a
                                          key={i}
                                          href={`${API_URL}/leads/${deal._id}/loi/${i}?token=${encodeURIComponent(localStorage.getItem('token') || '')}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="block text-[9px] text-teal-400 hover:underline truncate max-w-[130px]"
                                          title={loi.originalName}
                                        >
                                          📄 {loi.originalName}
                                        </a>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-[var(--crm-ink-faint)]">Pending LOI</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => {
                                      setLoiTargetLeadId(deal._id);
                                      setShowLOIModal(true);
                                    }}
                                    className="bg-teal-950/80 hover:bg-teal-900 border border-teal-800 text-teal-300 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap"
                                  >
                                    + Upload LOI
                                  </button>
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
                              <div className={`max-w-[85%] rounded-lg p-2.5 ${isMe
                                  ? 'bg-teal-600 text-white'
                                  : isFounder
                                    ? 'bg-blue-950/60 border border-blue-900/40 text-[var(--crm-ink-soft)]'
                                    : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)]'
                                }`}>
                                <div className="flex justify-between items-center gap-2 mb-1 text-[8px] font-semibold opacity-85">
                                  <span>{msg.senderName} ({msg.senderRole})</span>
                                </div>
                                <div className="leading-relaxed break-words text-xs font-sans">
                                  {(() => {
                                    if (!msg.content) return null;
                                    const parts = msg.content.split(/(\b(?:LD|LEAD)-[A-Za-z0-9-]+|\b[0-9a-fA-F]{24}\b)/g);
                                    return (
                                      <span>
                                        {parts.map((part, idx) => {
                                          const matchedLead = (deals || []).find(l => l.leadCode === part || String(l._id) === part);
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
                                  })()}
                                </div>
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

                {/* Shared Files Section directly on Sales Executive Dashboard (Full Width) */}
                <div className="col-span-full mt-6 w-full">
                  <FileSharingWidget initialTab="RECEIVED" />
                </div>

              </div>
            </>
          )}

            {/* TAB 2: LEADERS & GAMIFICATION */}
            {activeTab === 'leaderboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left/Middle Column (Rank Card, Leaderboard Table, Department Chart) */}
                <div className="lg:col-span-8 space-y-6">



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
                            className={`px-3 py-1 uppercase rounded font-bold tracking-wider transition cursor-pointer ${leaderboardTab === subTab.id
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
                                  className={`transition-colors ${isCurrentUser ? 'bg-teal-950/20 hover:bg-teal-950/30 border-y border-teal-900/40' : 'hover:bg-[var(--crm-bg-sunken)]/40'
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
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-sans ${row.isTargetAchieved
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
                      <ResponsiveContainer width="100%" height={240} minWidth={0} minHeight={0}>
                        <BarChart data={departmentRankings} margin={{ left: -10, top: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.05} stroke="var(--crm-line)" />
                          <XAxis dataKey="name" stroke="var(--crm-ink-faint)" fontSize={9} tickLine={false} />
                          <YAxis stroke="var(--crm-ink-faint)" fontSize={9} tickLine={false} tickFormatter={(v) => `₹${v / 100000}L`} />
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
                          className={`flex items-start gap-4 p-3 border rounded-md transition duration-150 ${badge.unlocked ? 'bg-[var(--crm-bg-raised)] border-[var(--crm-line)]' : 'bg-[var(--crm-bg-sunken)]/50 border-[var(--crm-line)]/50 opacity-60'
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
                            <span className={`text-[7px] font-mono font-bold block mt-1.5 uppercase ${badge.unlocked ? 'text-teal-400' : 'text-[var(--crm-ink-faint)]'
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
                              <div className="flex flex-col">
                                <span className="font-bold text-[var(--crm-heading)]">
                                  {file.sentBy?.fullName || file.sentBy?.name || 'Executive'}
                                </span>
                                <span className="text-[9px] text-teal-400 font-mono uppercase font-semibold">
                                  {file.sentBy?.role ? file.sentBy.role.replace('_', ' ') : 'SALES EXECUTIVE'}
                                </span>
                              </div>
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
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase tracking-wider py-1.5 px-3 rounded transition cursor-pointer flex items-center gap-1"
                                  title="Download file"
                                >
                                  <FiDownload size={10} /> Download
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm('Are you sure you want to delete this shared file?')) {
                                      try {
                                        const res = await sharedFilesApi.deleteSharedFile(file._id);
                                        if (res.success) {
                                          toast.success('File deleted successfully');
                                          const filesRes = await sharedFilesApi.getSharedFiles();
                                          if (filesRes.success) {
                                            setSharedFiles(filesRes.data?.files || filesRes.files || []);
                                          }
                                        }
                                      } catch (err) {
                                        toast.error('Failed to delete file');
                                      }
                                    }
                                  }}
                                  className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 p-1.5 rounded transition cursor-pointer"
                                  title="Delete File"
                                >
                                  <FiTrash2 size={12} />
                                </button>
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
        onSuccess={async (recording) => {
          try {
            if (recording?.leadId) {
              const lId = typeof recording.leadId === 'object' ? recording.leadId._id : recording.leadId;
              await leadsApi.updateStage(lId, { newStage: 'REQUIREMENT_CAPTURED' });
            }
            await loadDashboardData();
          } catch (error) {
            toast.error(error.response?.data?.message || 'Recording saved, but the lead stage could not be updated.');
          }
        }}
      />

      {/* LOI UPLOAD MODAL */}
      {showLOIModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLOIModal(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-xl p-6 w-full max-w-lg shadow-2xl text-left font-mono space-y-4"
          >
            <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2">
                <FiFileText className="text-teal-400" size={16} /> Upload LOI (Letter of Intent)
              </h3>
              <button onClick={() => setShowLOIModal(false)} className="text-xs text-[var(--crm-ink-faint)] hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleLOISubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1.5">Select Lead *</label>
                <select
                  required
                  value={loiTargetLeadId}
                  onChange={(e) => setLoiTargetLeadId(e.target.value)}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-3 py-2.5 rounded outline-none focus:border-teal-500 transition cursor-pointer"
                >
                  <option value="">-- Choose Assigned Lead ({deals.length} Available) --</option>
                  {deals.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.customerName} ({d.leadCode || 'N/A'}) • {d.productCategory || 'General'} • [Stage: {(d.stage || 'NEW_LEAD').replace(/_/g, ' ')}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1.5">Select LOI Document File * (PDF, DOCX, Image)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => setLoiFile(e.target.files[0])}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-3 py-2 rounded outline-none cursor-pointer file:bg-teal-950 file:text-teal-300 file:border file:border-teal-800 file:rounded file:px-2 file:py-1 file:mr-2 file:text-[9px] file:uppercase file:font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1.5">Optional Notes / Buyer Terms</label>
                <textarea
                  rows={3}
                  value={loiNotes}
                  onChange={(e) => setLoiNotes(e.target.value)}
                  placeholder="e.g. Buyer sent signed LOI for 500 Tons Tea at $1,200/Ton..."
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded outline-none focus:border-teal-500 transition resize-none font-sans"
                />
              </div>

              <div className="bg-teal-950/30 border border-teal-900/40 p-3 rounded text-[9px] text-teal-300">
                ☁️ LOI will be saved on server & automatically backed up to <strong>Google Drive</strong> for Sales Manager verification.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={uploadingLOI}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white py-2.5 font-bold uppercase text-[9px] tracking-widest rounded transition cursor-pointer"
                >
                  {uploadingLOI ? 'Uploading to Drive & Server...' : 'Confirm Upload LOI'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLOIModal(false)}
                  className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] px-4 py-2.5 font-bold uppercase text-[9px] tracking-widest rounded transition cursor-pointer hover:bg-[var(--crm-bg-raised)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
