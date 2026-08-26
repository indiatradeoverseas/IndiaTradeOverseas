import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiDollarSign, 
  FiTrendingUp, 
  FiPercent, 
  FiFileText, 
  FiUsers, 
  FiAlertCircle, 
  FiCheck, 
  FiX, 
  FiCalendar, 
  FiFilter, 
  FiCpu,
  FiPrinter,
  FiRotateCw,
  FiArrowUpRight,
  FiArrowDownRight,
  FiSend,
  FiPaperclip,
  FiCheckSquare,
  FiDownload,
  FiUpload,
  FiClock
} from 'react-icons/fi';
import { 
  ResponsiveContainer, 
  FunnelChart, 
  Funnel, 
  LabelList, 
  LineChart, 
  Line, 
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
import { documentsApi } from '../../api/documents';
import { taskApi } from '../../api/task';
import { sharedFilesApi } from '../../api/sharedFiles';
import { leaveApi } from '../../api/leave';
import { dashboardApi } from '../../api/dashboard';
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

export default function SalesManagerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('command');
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('THIS_MONTH');

  // Core Data States
  const [repsData, setRepsData] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  
  // Sorting for Team Table
  const [sortField, setSortField] = useState('revenue');
  const [sortDirection, setSortDirection] = useState('desc');

  // Action / Approval Modal states
  const [actioningDoc, setActioningDoc] = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [actionType, setActionType] = useState('APPROVE'); // 'APPROVE' or 'REJECT'
  const [submittingAction, setSubmittingAction] = useState(false);

  // Task Assignment states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', dueDate: '', priority: 'MEDIUM', category: 'GENERAL', leadId: '' });
  const [taskFile, setTaskFile] = useState(null);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [teamEmployees, setTeamEmployees] = useState([]);

  // File Sharing states
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileForm, setFileForm] = useState({ sentTo: '', note: '' });
  const [shareFile, setShareFile] = useState(null);
  const [submittingFile, setSubmittingFile] = useState(false);

  // Target Setting states
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedEmpName, setSelectedEmpName] = useState('');
  const [targetForm, setTargetForm] = useState({ employeeId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), targetValue: '', targetDeals: '' });
  const [submittingTarget, setSubmittingTarget] = useState(false);

  // Bulk Lead Assignment states
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [assigneeExecId, setAssigneeExecId] = useState('');
  const [submittingBulkAssign, setSubmittingBulkAssign] = useState(false);

  const [teamLeaves, setTeamLeaves] = useState([]);
  const [submittingLeaveReview, setSubmittingLeaveReview] = useState(null);

  // Strategic Insights & Chat States
  const [strategicInsights, setStrategicInsights] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const [metrics, setMetrics] = useState({
    totalTarget: 50000000,
    totalLeads: 0,
    totalRevenue: 0,
    wonLeads: 0,
    pendingLeads: 0,
    totalExecutives: 0
  });
  const [liveStatuses, setLiveStatuses] = useState({});

  useEffect(() => {
    const skt = socketService.connect(user);
    if (skt) {
      const handleStatusUpdate = (data) => {
        setLiveStatuses(prev => ({
          ...prev,
          [data.employeeId]: data
        }));
      };
      
      skt.on('employee_status_updated', handleStatusUpdate);
      
      return () => {
        skt.off('employee_status_updated', handleStatusUpdate);
      };
    }
  }, [user]);

  const getEmployeeLiveStatus = (emp) => {
    return liveStatuses[emp._id] || {
      status: emp.status || 'OFFLINE',
      currentActivity: emp.currentActivity || 'Offline',
      lastUpdated: emp.lastUpdated,
      duration: emp.duration || '00:00:00'
    };
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Rep Leaderboard / Performance metrics
      try {
        let periodVal = 'monthly';
        if (dateFilter === 'TODAY') periodVal = 'daily';
        else if (dateFilter === 'THIS_WEEK') periodVal = 'weekly';
        const leaderboardRes = await salesApi.getLeaderboard({ period: periodVal });
        if (leaderboardRes.success) {
          setRepsData(leaderboardRes.data?.leaderboard || []);
        }
      } catch (e) { console.error('Leaderboard fetch error:', e); }

      // 2. Fetch All Leads to compile pipeline funnel and stats
      try {
        const leadsRes = await leadsApi.getLeads({ limit: 500 });
        if (leadsRes.success) {
          setAllLeads(leadsRes.data.leads || []);
        }
      } catch (e) { console.error('Leads fetch error:', e); }

      // 3. Fetch Pending Documents for approval
      try {
        const docsRes = await documentsApi.getDocuments();
        if (docsRes.success) {
          // Filter documents pending approval
          const filteredDocs = (docsRes.documents || []).filter(doc => doc.approvalStatus === 'PENDING');
          setPendingDocs(filteredDocs);
        }
      } catch (e) { console.error('Documents fetch error:', e); }

      // 4. Fetch tasks assigned by this manager
      try {
        const tasksRes = await taskApi.getTasks();
        if (tasksRes.success) {
          setAssignedTasks(tasksRes.data?.tasks || []);
        }
      } catch (e) { console.error('Tasks fetch error:', e); }

      // 5. Fetch SALES department employees with live status and pending tasks count
      try {
        const empRes = await employeesApi.getEmployees({ department: 'sales' });
        if (empRes.success && empRes.data?.employees && empRes.data.employees.length > 0) {
          setTeamEmployees(empRes.data.employees);
        } else {
          // Fallback to taskApi
          const fallbackRes = await taskApi.getEmployeesByDepartment('SALES');
          if (fallbackRes.success && fallbackRes.data?.employees) {
            setTeamEmployees(fallbackRes.data.employees);
          }
        }
      } catch (e) {
        console.error('Team employees fetch error, trying fallback:', e);
        try {
          const fallbackRes = await taskApi.getEmployeesByDepartment('SALES');
          if (fallbackRes.success && fallbackRes.data?.employees) {
            setTeamEmployees(fallbackRes.data.employees);
          }
        } catch (err) {
          console.error('Fallback employees fetch error:', err);
        }
      }

      // 6. Fetch Team Leaves list
      try {
        const leavesRes = await leaveApi.getLeaves();
        if (leavesRes.success) {
          setTeamLeaves(leavesRes.data?.leaves || []);
        }
      } catch (e) { console.error('Leaves fetch error:', e); }

      // 7. Fetch dashboard metrics
      try {
        const metricsRes = await dashboardApi.getMetrics();
        if (metricsRes.success && metricsRes.data?.metrics) {
          setMetrics(metricsRes.data.metrics);
        }
      } catch (e) { console.error('Metrics fetch error:', e); }

    } catch (err) {
      console.error('Error loading manager dashboard details:', err);
      toast.error('Unable to fetch latest team metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleSetTargetSubmit = async (e) => {
    e.preventDefault();
    if (!targetForm.employeeId || !targetForm.targetValue) {
      return toast.error("Employee ID and Target Value are required.");
    }

    setSubmittingTarget(true);
    try {
      const res = await salesApi.setTarget({
        employeeId: targetForm.employeeId,
        month: Number(targetForm.month),
        year: Number(targetForm.year),
        targetValue: Number(targetForm.targetValue),
        targetDeals: targetForm.targetDeals ? Number(targetForm.targetDeals) : null
      });
      if (res.success) {
        toast.success("Sales target configured successfully! 🎯");
        setShowTargetModal(false);
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to set sales target.");
    } finally {
      setSubmittingTarget(false);
    }
  };

  const fetchStrategicInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await salesApi.getStrategicInsights();
      if (res.success) {
        setStrategicInsights(res.data);
      }
    } catch (e) {
      console.error('Error fetching strategic insights:', e);
    } finally {
      setLoadingInsights(false);
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
  }, [user, dateFilter]);

  useEffect(() => {
    if (activeTab === 'strategic') {
      fetchStrategicInsights();
      fetchChatMessages();
      const interval = setInterval(fetchChatMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Handle Sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort function for team performance table
  const getSortedReps = () => {
    return [...repsData].sort((a, b) => {
      let valA = a[sortField] || 0;
      let valB = b[sortField] || 0;

      if (sortField === 'fullName') {
        valA = a.fullName.toLowerCase();
        valB = b.fullName.toLowerCase();
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      // Calculate conversion rate dynamically for sorting if selected
      if (sortField === 'conversionRate') {
        const rateA = a.totalLeads > 0 ? (a.dealsWon / a.totalLeads) : 0;
        const rateB = b.totalLeads > 0 ? (b.dealsWon / b.totalLeads) : 0;
        return sortDirection === 'asc' ? rateA - rateB : rateB - rateA;
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  };

  // Document approval/rejection handler
  const handleDocActionSubmit = async (e) => {
    e.preventDefault();
    if (!actioningDoc) return;
    if (actionType === 'REJECT' && !actionNote.trim()) {
      toast.error('A rejection reason note is required.');
      return;
    }

    setSubmittingAction(true);
    try {
      let res;
      if (actionType === 'APPROVE') {
        res = await documentsApi.approveDocument(actioningDoc._id, actionNote);
      } else {
        res = await documentsApi.rejectDocument(actioningDoc._id, actionNote);
      }

      if (res.success) {
        toast.success(`Document ${actionType === 'APPROVE' ? 'approved' : 'rejected'} successfully!`);
        // Refresh documents lists
        setPendingDocs(prev => prev.filter(d => d._id !== actioningDoc._id));
        setActioningDoc(null);
        setActionNote('');
      }
    } catch (err) {
      console.error('Error responding to document status:', err);
      toast.error(err.response?.data?.message || 'Action execution failed');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Review Leave requests (Approve/Reject)
  const handleReviewLeave = async (id, status) => {
    let reviewNote = '';
    if (status === 'REJECTED') {
      reviewNote = window.prompt('Reason for rejecting this leave request (optional):') || '';
    }
    setSubmittingLeaveReview(id);
    try {
      const response = await leaveApi.reviewLeave(id, status, reviewNote);
      if (response.success) {
        toast.success(`Leave request ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully!`);
        // Refresh leaves list
        const leavesRes = await leaveApi.getLeaves();
        if (leavesRes.success) {
          setTeamLeaves(leavesRes.data?.leaves || []);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to review leave request');
    } finally {
      setSubmittingLeaveReview(null);
    }
  };

  // Calculate high-level KPIs
  const totalPipelineVal = allLeads
    .filter(l => !['CLOSED_WON', 'DEAL_WON', 'CLOSED_LOST', 'DEAL_LOST'].includes(l.stage))
    .reduce((sum, l) => sum + (l.leadValue || 0), 0);

  // Weighted Forecast (Standard commodity probabilities based on stages)
  const weightedForecastVal = allLeads.reduce((sum, l) => {
    let probability = 0.1; // default NEW
    if (l.stage === 'NEGOTIATION') probability = 0.7;
    else if (['QUOTATION_SHARED', 'QUOTATION_SENT'].includes(l.stage)) probability = 0.5;
    else if (['LOI_PO_PENDING', 'PO_RECEIVED'].includes(l.stage)) probability = 0.8;
    else if (l.stage === 'DOCUMENT_PENDING') probability = 0.9;
    else if (['CLOSED_WON', 'DEAL_WON'].includes(l.stage)) probability = 1.0;
    else if (['CLOSED_LOST', 'DEAL_LOST'].includes(l.stage)) probability = 0.0;
    
    return sum + (l.leadValue || 0) * probability;
  }, 0);

  // Win Rate
  const totalClosedDeals = allLeads.filter(l => ['CLOSED_WON', 'DEAL_WON', 'CLOSED_LOST', 'DEAL_LOST'].includes(l.stage)).length;
  const wonDeals = allLeads.filter(l => ['CLOSED_WON', 'DEAL_WON'].includes(l.stage)).length;
  const winRatePercent = totalClosedDeals > 0 ? Math.round((wonDeals / totalClosedDeals) * 100) : 68; // fallback to 68% default if dry

  const dealsInDocStageCount = allLeads.filter(l => ['DOCUMENT_PENDING', 'PAYMENT_PENDING'].includes(l.stage)).length;
  const pendingApprovalsCount = pendingDocs.length;

  // Format currency
  const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  // Funnel chart calculation
  const funnelStagesMap = [
    { value: 'Lead', label: 'Lead', count: allLeads.filter(l => ['NEW_LEAD', 'ASSIGNED', 'CONTACTED', 'LEAD_QUALIFICATION'].includes(l.stage)).length },
    { value: 'Quote', label: 'Quote Shared', count: allLeads.filter(l => ['QUOTATION_REQUIRED', 'QUOTATION_SHARED', 'QUOTATION_SENT'].includes(l.stage)).length },
    { value: 'ICPO', label: 'ICPO Pending', count: allLeads.filter(l => ['LOI_PO_PENDING', 'PO_RECEIVED', 'NEGOTIATION'].includes(l.stage)).length },
    { value: 'Doc', label: 'Documentation', count: allLeads.filter(l => ['DOCUMENT_PENDING', 'PAYMENT_PENDING'].includes(l.stage)).length },
    { value: 'Closed', label: 'Closed Won', count: wonDeals }
  ];

  // Map Recharts Funnel Dataset
  const funnelData = funnelStagesMap.map((stage, idx, arr) => {
    const parentCount = idx === 0 ? stage.count : arr[idx-1].count;
    const conversion = parentCount > 0 ? Math.round((stage.count / parentCount) * 100) : 100;
    return {
      value: stage.count || 2,
      name: stage.label,
      fill: ['#0f766e', '#0d9488', '#0284c7', '#0369a1', '#047857'][idx],
      rate: `${stage.count} (${conversion}%)`
    };
  });

  // Dynamic coaching suggestions (AI insights generation)
  const getAISuggestions = () => {
    const suggestions = [];
    
    // Sort reps by revenue to identify top and bottom performers
    const sortedReps = [...repsData].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
    
    sortedReps.forEach((rep) => {
      // 1. Target Achievement Suggestions
      if (rep.targetValue > 0) {
        if (rep.achievedTarget) {
          suggestions.push({
            repName: rep.fullName,
            msg: `Excellent performance! ${rep.fullName} has achieved the monthly sales target of ${currency(rep.targetValue)}, generating a total of ${currency(rep.revenue)} in closed deals. Have them share negotiation tips with the team.`
          });
        } else {
          const gap = rep.targetValue - (rep.revenue || 0);
          suggestions.push({
            repName: rep.fullName,
            msg: `Performance alert: ${rep.fullName} is currently short of the monthly target of ${currency(rep.targetValue)} by ${currency(gap)}. Review active negotiations in their pipeline to close the gap.`
          });
        }
      }

      // 2. High Activity vs Low Conversion Suggestions
      const convRate = rep.activityCount > 0 ? Math.round((rep.dealsWon / rep.activityCount) * 100) : 0;
      if (rep.dealsWon === 0 && rep.activityCount > 20) {
        suggestions.push({
          repName: rep.fullName,
          msg: `Coaching opportunity for ${rep.fullName}: High activity volume (${rep.activityCount} calls/emails logged) but 0 deals closed. Review client engagement details and price quotes shared.`
        });
      } else if (rep.activityCount > 0 && rep.activityCount < 10) {
        suggestions.push({
          repName: rep.fullName,
          msg: `Activity warning for ${rep.fullName}: Low monthly activity level (${rep.activityCount} total outreach actions logged). Host a quick alignment session to establish daily targets.`
        });
      }
    });

    // Final fallback ONLY if there is no data in repsData at all
    if (suggestions.length === 0) {
      suggestions.push(
        { repName: 'Sales Reps', msg: 'No active sales reps performance data found. Configure monthly targets to generate coaching insights.' }
      );
    }
    
    return suggestions.slice(0, 5); // Limit to top 5 dynamic suggestions
  };



  // Print/Export to PDF handler
  const handlePrintPDF = () => {
    window.print();
  };

  // Handle Task Assignment Submit
  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.assignedTo || !taskForm.dueDate) {
      toast.error('Title, Assignee, and Due Date are required');
      return;
    }
    setSubmittingTask(true);
    try {
      const formData = new FormData();
      formData.append('title', taskForm.title);
      formData.append('description', taskForm.description);
      formData.append('assignedTo', taskForm.assignedTo);
      formData.append('dueDate', taskForm.dueDate);
      formData.append('priority', taskForm.priority);
      formData.append('category', taskForm.category);
      formData.append('department', 'SALES');
      if (taskForm.leadId) formData.append('leadId', taskForm.leadId);
      if (taskFile) formData.append('file', taskFile);

      const res = await taskApi.createTask(formData);
      if (res.success) {
        toast.success('Task assigned successfully!');
        setAssignedTasks(prev => [res.data.task, ...prev]);
        setShowTaskModal(false);
        setTaskForm({ title: '', description: '', assignedTo: '', dueDate: '', priority: 'MEDIUM', category: 'GENERAL', leadId: '' });
        setTaskFile(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign task');
    } finally {
      setSubmittingTask(false);
    }
  };

  // Handle File Share Submit
  const handleFileShareSubmit = async (e) => {
    e.preventDefault();
    if (!fileForm.sentTo || !shareFile) {
      toast.error('Recipient and File are required');
      return;
    }
    setSubmittingFile(true);
    try {
      const formData = new FormData();
      formData.append('sentTo', fileForm.sentTo);
      formData.append('note', fileForm.note);
      formData.append('department', 'SALES');
      formData.append('file', shareFile);

      const res = await sharedFilesApi.shareFile(formData);
      if (res.success) {
        toast.success('File shared successfully!');
        setShowFileModal(false);
        setFileForm({ sentTo: '', note: '' });
        setShareFile(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to share file');
    } finally {
      setSubmittingFile(false);
    }
  };

  // Handle Bulk Lead Assignment Submit
  const handleBulkAssignLeads = async (e) => {
    e.preventDefault();
    if (!selectedLeads.length) {
      toast.error('Please select at least one lead to assign');
      return;
    }
    if (!assigneeExecId) {
      toast.error('Please select a Sales Executive');
      return;
    }

    setSubmittingBulkAssign(true);
    try {
      const res = await leadsApi.assignLeadsBulk({
        leadIds: selectedLeads,
        assignedTo: assigneeExecId
      });
      if (res.success) {
        toast.success(`Successfully assigned ${selectedLeads.length} leads!`);
        setSelectedLeads([]);
        setAssigneeExecId('');
        // Refresh leads list to show new owners
        loadDashboardData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk assignment failed');
    } finally {
      setSubmittingBulkAssign(false);
    }
  };

  const handleSelectAllLeads = (e) => {
    if (e.target.checked) {
      setSelectedLeads(allLeads.map(l => l._id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId, checked) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="space-y-6 block pb-12 w-full max-w-full font-sans antialiased text-[var(--crm-ink-soft)] bg-[var(--crm-bg)] print:bg-white print:p-0"
    >
      {/* Header Bar */}
      <motion.div variants={itemVariants} className="w-full bg-[var(--crm-bg-raised)] border-b border-[var(--crm-line)] px-6 py-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shadow-sm rounded-b-md print:shadow-none print:border-none print:pb-2">
        <div className="space-y-1 text-left flex-1 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.25em] text-teal-500 font-bold block font-mono">Operations Management Console</span>
          <h1 className="text-2xl sm:text-3xl font-normal text-[var(--crm-heading)] tracking-tight">Sales Team Command Center</h1>
          <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-0.5">
            Manager: <strong className="text-[var(--crm-heading)] font-semibold font-mono">{user?.name || user?.fullName || 'Sales Manager'}</strong> &bull; Region: <span className="text-[var(--crm-heading)] font-semibold font-mono">Global Operations</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-stretch md:self-auto font-mono print:hidden">
          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3.5 py-2 text-[10px] uppercase font-bold tracking-wider rounded shadow-sm">
            <FiFilter className="text-[var(--crm-ink-faint)]" size={12} />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-[var(--crm-ink-soft)] cursor-pointer"
            >
              <option value="TODAY" className="bg-[var(--crm-bg-raised)]">Today</option>
              <option value="THIS_WEEK" className="bg-[var(--crm-bg-raised)]">This Week</option>
              <option value="THIS_MONTH" className="bg-[var(--crm-bg-raised)]">This Month</option>
            </select>
          </div>

          <button 
            onClick={loadDashboardData}
            className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border border-[var(--crm-line)] px-3.5 py-2 text-[10px] uppercase font-bold tracking-wider rounded transition shadow-sm cursor-pointer"
          >
            <FiRotateCw className={`${loading ? 'animate-spin' : ''}`} size={12} /> Refresh
          </button>

          <button 
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-950 px-3.5 py-2 text-[10px] uppercase font-bold tracking-wider rounded transition shadow-sm cursor-pointer"
          >
            <FiPrinter size={12} /> Export to PDF
          </button>

          <button 
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-600 text-white border border-teal-800 px-3.5 py-2 text-[10px] uppercase font-bold tracking-wider rounded transition shadow-sm cursor-pointer"
          >
            <FiCheckSquare size={12} /> Assign Task
          </button>

          <button 
            onClick={() => setShowFileModal(true)}
            className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-600 text-white border border-indigo-800 px-3.5 py-2 text-[10px] uppercase font-bold tracking-wider rounded transition shadow-sm cursor-pointer"
          >
            <FiUpload size={12} /> Send File
          </button>
        </div>
      </motion.div>

      {/* Tabs navigation */}
      <motion.div variants={itemVariants} className="bg-[var(--crm-bg-raised)] border-y border-[var(--crm-line)] px-6 py-1 flex overflow-x-auto scrollbar-none shadow-sm print:hidden">
        <nav className="flex space-x-8 min-w-max">
          {[
            { id: 'command', label: 'Team Command Center', icon: FiUsers },
            { id: 'strategic', label: 'Strategic Analytics & Coaching', icon: FiCpu },
            { id: 'leaves_mgmt', label: 'Team Leave Requests', icon: FiCalendar }
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
          <div className="flex flex-col items-center justify-center py-32 space-y-3 print:hidden">
            <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono tracking-widest uppercase text-[var(--crm-ink-faint)]">Compiling Team Analytics...</p>
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
            {/* TAB 1: TEAM COMMAND CENTER */}
            {activeTab === 'command' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left/Middle Column */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Headline KPIs Row (6 Metrics) */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                    {[
                      { label: 'TOTAL TARGET', val: currency(metrics.totalTarget), sub: 'Monthly Goal', icon: FiTrendingUp, color: 'text-indigo-400 bg-indigo-950/20 border-indigo-900/30' },
                      { label: 'TOTAL LEADS', val: metrics.totalLeads, sub: 'All Sources', icon: FiUsers, color: 'text-teal-400 bg-teal-950/20 border-teal-900/30' },
                      { label: 'TOTAL REVENUE', val: currency(metrics.totalRevenue), sub: 'Closed Deal Value', icon: FiDollarSign, color: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30' },
                      { label: 'WON LEADS', val: metrics.wonLeads, sub: 'Closed Won Stage', icon: FiCheck, color: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30' },
                      { label: 'PENDING LEADS', val: metrics.pendingLeads, sub: 'Active Pipeline', icon: FiAlertCircle, color: 'text-amber-400 bg-amber-950/20 border-amber-900/30' },
                      { label: 'TOTAL EXECUTIVES', val: metrics.totalExecutives, sub: 'Sales Department', icon: FiCpu, color: 'text-cyan-400 bg-cyan-950/20 border-cyan-900/30' }
                    ].map((kpi, idx) => (
                      <motion.div 
                        key={idx}
                        whileHover={{ y: -3 }}
                        className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-lg flex flex-col justify-between shadow-sm transition-all text-left"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold font-mono leading-none">{kpi.label}</span>
                          <div className={`p-1.5 rounded-md ${kpi.color}`}>
                            <kpi.icon size={12} />
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-base font-bold text-[var(--crm-heading)] leading-tight truncate tracking-tight">{kpi.val}</p>
                          <span className="text-[8px] font-mono text-[var(--crm-ink-faint)] block mt-0.5">{kpi.sub}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Team Performance Table */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>Team Performance Status</span>
                      <span className="text-[8px] font-mono text-[var(--crm-ink-faint)]">Click headers to sort</span>
                    </h3>
                    
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-soft)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-line)] select-none">
                            <th onClick={() => handleSort('fullName')} className="py-3 px-4 cursor-pointer hover:text-[var(--crm-heading)] transition">Rep Name {sortField === 'fullName' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('totalLeads')} className="py-3 px-4 cursor-pointer hover:text-[var(--crm-heading)] transition">Leads Received {sortField === 'totalLeads' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('dealsWon')} className="py-3 px-4 cursor-pointer hover:text-[var(--crm-heading)] transition">Leads Completed {sortField === 'dealsWon' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('completedTasksCount')} className="py-3 px-4 cursor-pointer hover:text-[var(--crm-heading)] transition">Completed Tasks {sortField === 'completedTasksCount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('revenue')} className="py-3 px-4 cursor-pointer hover:text-[var(--crm-heading)] transition">Revenue Generated {sortField === 'revenue' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('activityCount')} className="py-3 px-4 cursor-pointer hover:text-[var(--crm-heading)] transition">Activities {sortField === 'activityCount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('conversionRate')} className="py-3 px-4 cursor-pointer hover:text-[var(--crm-heading)] transition">Conversion Rate {sortField === 'conversionRate' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                          {getSortedReps().map((rep) => {
                            // Color coding target: Green = 5+ Won, Yellow = 2-4 Won, Red = <2 Won (Within target window)
                            let rowBg = 'border-l-4 border-l-emerald-500';
                            if (rep.dealsWon < 2) rowBg = 'border-l-4 border-l-rose-500 bg-rose-950/10';
                            else if (rep.dealsWon < 5) rowBg = 'border-l-4 border-l-amber-500 bg-amber-950/5';
                            
                            const convRate = rep.totalLeads > 0 ? Math.round((rep.dealsWon / rep.totalLeads) * 100) : 0;

                            return (
                              <tr key={rep.employeeId} className={`hover:bg-[var(--crm-bg-sunken)]/60 transition ${rowBg}`}>
                                <td className="py-3 px-4 font-semibold text-[var(--crm-heading)]">{rep.fullName}</td>
                                <td className="py-3 px-4 font-mono font-medium text-[var(--crm-ink-soft)]">{rep.totalLeads} leads</td>
                                <td className="py-3 px-4 font-mono font-medium text-[var(--crm-ink-soft)]">{rep.dealsWon} Won</td>
                                <td className="py-3 px-4 font-mono font-medium text-[var(--crm-ink-soft)]">{rep.completedTasksCount || 0} tasks</td>
                                <td className="py-3 px-4 font-mono font-semibold text-teal-400">{currency(rep.revenue)}</td>
                                <td className="py-3 px-4 font-mono text-[var(--crm-ink-soft)]">{rep.activityCount} logs</td>
                                <td className="py-3 px-4 font-mono font-medium text-[var(--crm-ink-soft)]">
                                  {convRate}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Funnel Chart & Approval Queue */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Funnel Chart */}
                    <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                      <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                        <span>Pipeline Funnel</span>
                        <span className="text-[8px] font-mono text-[var(--crm-ink-faint)]">Total conversion path</span>
                      </h3>

                      <div className="h-64 mt-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <FunnelChart>
                            <Tooltip 
                              contentStyle={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)', fontSize: 10, fontFamily: 'monospace', color: 'var(--crm-heading)' }}
                              formatter={(v, n, p) => [p.payload.rate, 'Conversion']}
                            />
                            <Funnel
                              dataKey="value"
                              data={funnelData}
                              isAnimationActive
                            >
                              <LabelList position="right" fill="var(--crm-ink-soft)" stroke="none" dataKey="name" fontSize={9} />
                            </Funnel>
                          </FunnelChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Approval Queue */}
                    <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                          <span>Document Approval Queue</span>
                          <span className="bg-rose-950/40 text-rose-400 font-mono text-[9px] px-2 py-0.5 rounded-full font-bold border border-rose-900/30">
                            {pendingDocs.length} Pending
                          </span>
                        </h3>

                        <div className="mt-4 space-y-3 overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
                          {pendingDocs.length === 0 ? (
                            <div className="py-12 border border-dashed border-[var(--crm-line)] rounded flex flex-col items-center justify-center">
                              <span className="text-[10px] font-mono text-[var(--crm-ink-faint)] uppercase">Approval queue empty</span>
                              <span className="text-[8px] text-[var(--crm-ink-faint)]/70 mt-1">No documents require manager override.</span>
                            </div>
                          ) : (
                            pendingDocs.map((doc) => (
                              <div key={doc._id} className="p-3 border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)]/50 hover:bg-[var(--crm-bg-sunken)] rounded-md transition text-xs font-mono space-y-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="bg-slate-900 text-teal-400 font-mono font-bold text-[8px] px-1.5 py-0.5 rounded uppercase border border-slate-800">
                                      {doc.exportDocType || 'DOCUMENT'}
                                    </span>
                                    <h5 className="font-sans font-bold text-[var(--crm-heading)] mt-1.5 truncate max-w-[150px]">
                                      {doc.fileName}
                                    </h5>
                                  </div>
                                  <span className="text-[7px] text-[var(--crm-ink-faint)] font-light mt-0.5">
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                  </span>
                                </div>

                                <div className="text-[9px] text-[var(--crm-ink-soft)] space-y-0.5">
                                  <p>Deal: <strong className="text-[var(--crm-heading)]">{doc.ownerId?.customerName || 'Direct Trading'}</strong></p>
                                  <p>By: <strong className="text-[var(--crm-heading)]">{doc.uploadedBy?.fullName || 'Trading Executive'}</strong></p>
                                </div>

                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={() => {
                                      setActionType('APPROVE');
                                      setActioningDoc(doc);
                                    }}
                                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-[8px] font-bold uppercase tracking-wider py-1.5 rounded transition cursor-pointer flex items-center justify-center gap-0.5"
                                  >
                                    <FiCheck size={10} /> Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActionType('REJECT');
                                      setActioningDoc(doc);
                                    }}
                                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-[8px] font-bold uppercase tracking-wider py-1.5 rounded transition cursor-pointer flex items-center justify-center gap-0.5"
                                  >
                                    <FiX size={10} /> Reject
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Assigned Tasks Table */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>📋 Assigned Tasks</span>
                      <span className="bg-teal-950/40 text-teal-400 font-mono text-[9px] px-2 py-0.5 rounded-full font-bold border border-teal-900/30">
                        {assignedTasks.length} Tasks
                      </span>
                    </h3>

                    <div className="overflow-x-auto mt-4">
                      {assignedTasks.length === 0 ? (
                        <div className="py-12 border border-dashed border-[var(--crm-line)] rounded flex flex-col items-center justify-center">
                          <FiCheckSquare className="text-[var(--crm-ink-faint)]" size={24} />
                          <span className="text-[10px] font-mono text-[var(--crm-ink-faint)] uppercase mt-2">No tasks assigned yet</span>
                          <button onClick={() => setShowTaskModal(true)} className="mt-3 text-[9px] font-bold uppercase tracking-wider text-teal-400 hover:text-teal-300 transition cursor-pointer">
                            + Assign First Task
                          </button>
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse min-w-[650px]">
                          <thead>
                            <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-line)]">
                              <th className="py-3 px-4">Title</th>
                              <th className="py-3 px-4">Assigned To</th>
                              <th className="py-3 px-4">Due Date</th>
                              <th className="py-3 px-4">Priority</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4">Initial File</th>
                              <th className="py-3 px-4">Fulfillment Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                            {assignedTasks.map((task) => (
                              <tr key={task._id} className="hover:bg-[var(--crm-bg-sunken)]/40 transition">
                                <td className="py-3 px-4 font-semibold text-[var(--crm-heading)]">{task.title}</td>
                                <td className="py-3 px-4 text-[var(--crm-ink-soft)]">{task.assignedTo?.name || 'Employee'}</td>
                                <td className="py-3 px-4 font-mono text-[var(--crm-ink-faint)]">{new Date(task.dueDate).toLocaleDateString('en-IN')}</td>
                                <td className="py-3 px-4">
                                  <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                                    task.priority === 'HIGH' ? 'bg-rose-950/40 text-rose-400 border border-rose-900/30' :
                                    task.priority === 'MEDIUM' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' :
                                    'bg-slate-800/40 text-slate-400 border border-slate-700/30'
                                  }`}>{task.priority}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                                    task.status === 'COMPLETED' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' :
                                    task.status === 'IN_PROGRESS' ? 'bg-blue-950/40 text-blue-400 border border-blue-900/30' :
                                    'bg-amber-950/40 text-amber-400 border border-amber-900/30'
                                  }`}>{task.status?.replace('_', ' ')}</span>
                                </td>
                                <td className="py-3 px-4">
                                  {task.fileOriginalName ? (
                                    <span className="text-[var(--crm-ink-soft)] text-[9px] flex items-center gap-1"><FiPaperclip size={10} /> {task.fileOriginalName}</span>
                                  ) : (
                                    <span className="text-[var(--crm-ink-faint)] text-[9px]">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 space-y-1 text-left">
                                  {task.status === 'COMPLETED' ? (
                                    <>
                                      {task.completionFileOriginalName ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const baseUrl = 'http://localhost:5000/';
                                            const absoluteUrl = task.completionFileUrl.startsWith('http') ? task.completionFileUrl : `${baseUrl}${task.completionFileUrl}`;
                                            const link = document.createElement('a');
                                            link.href = absoluteUrl;
                                            link.setAttribute('download', task.completionFileOriginalName);
                                            link.setAttribute('target', '_blank');
                                            document.body.appendChild(link);
                                            link.click();
                                            link.remove();
                                          }}
                                          className="text-teal-400 hover:text-teal-300 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                        >
                                          <FiDownload size={10} /> {task.completionFileOriginalName}
                                        </button>
                                      ) : (
                                        <span className="text-[var(--crm-ink-faint)] text-[9px]">No file attached</span>
                                      )}
                                      {task.remarks && (
                                        <p className="text-[9px] text-[var(--crm-ink-soft)] italic leading-tight">
                                          "{task.remarks}"
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-[var(--crm-ink-faint)] text-[9px]">Awaiting completion</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                </div>

                {/* Right Sidebar (Employee Management Card) */}
                <div className="lg:col-span-4 space-y-6 text-left print:hidden">
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3">
                      <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold flex items-center gap-1.5">
                        <FiUsers className="text-teal-500" size={14} />
                        <span>Sales Team Members</span>
                      </h3>
                      <button
                        onClick={() => {
                          setTaskForm({ title: '', description: '', assignedTo: '', dueDate: '', priority: 'MEDIUM', category: 'GENERAL', leadId: '' });
                          setShowTaskModal(true);
                        }}
                        className="bg-teal-700 hover:bg-teal-600 text-white font-mono font-bold text-[9px] uppercase tracking-wider py-1 px-2.5 rounded transition shadow-sm cursor-pointer"
                      >
                        + Assign Task
                      </button>
                    </div>

                    <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                      {teamEmployees.length === 0 ? (
                        <div className="py-12 border border-dashed border-[var(--crm-line)] rounded flex flex-col items-center justify-center">
                          <span className="text-[10px] font-mono text-[var(--crm-ink-faint)] uppercase">No team members</span>
                        </div>
                      ) : (
                        teamEmployees.map((emp) => {
                          const liveStatus = getEmployeeLiveStatus(emp);
                          
                          // Map status type to aesthetic representation
                          const statusMap = {
                            ON_CALL: { label: 'On Call', color: 'bg-emerald-500', pulse: true, text: 'text-emerald-400' },
                            FOLLOWING_UP: { label: 'Following Up', color: 'bg-sky-500', pulse: true, text: 'text-sky-400' },
                            CONVERTING: { label: 'Converting', color: 'bg-violet-500', pulse: true, text: 'text-violet-400' },
                            PAYMENT: { label: 'Payment', color: 'bg-amber-500', pulse: true, text: 'text-amber-400' },
                            IDLE: { label: 'Online / Available', color: 'bg-emerald-500', pulse: false, text: 'text-emerald-400' },
                            OFFLINE: { label: 'Offline', color: 'bg-rose-500', pulse: false, text: 'text-rose-400' }
                          };
                          
                          const statusConfig = statusMap[liveStatus.status] || statusMap.OFFLINE;

                          return (
                            <div 
                              key={emp._id} 
                              className="p-3 border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)]/40 hover:bg-[var(--crm-bg-sunken)] rounded-md transition text-xs font-mono space-y-3"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-sans font-bold text-[var(--crm-heading)] text-sm">
                                    {emp.name}
                                  </h4>
                                  <span className="text-[9px] text-[var(--crm-ink-faint)] font-mono uppercase">
                                    {emp.position || emp.role || 'Executive'}
                                  </span>
                                </div>
                                
                                {/* Status indicator with animation */}
                                <div className="flex items-center gap-1.5">
                                  <span className="relative flex h-2 w-2">
                                    {statusConfig.pulse && (
                                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusConfig.color} opacity-75`}></span>
                                    )}
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.color}`}></span>
                                  </span>
                                  <span className={`text-[9px] font-bold uppercase tracking-wider ${statusConfig.text}`}>
                                    {statusConfig.label}
                                  </span>
                                </div>
                              </div>

                              <div className="flex justify-between items-center text-[10px] text-[var(--crm-ink-soft)] border-t border-[var(--crm-line)]/50 pt-2">
                                <div className="truncate max-w-[150px]">
                                  Activity: <strong className="text-[var(--crm-heading)]">{liveStatus.currentActivity || 'No active task'}</strong>
                                </div>
                                <div>
                                  Pending: <strong className="text-teal-400">{emp.tasksCount || 0} Tasks</strong>
                                </div>
                              </div>

                              <div className="flex justify-between items-center pt-1 font-sans">
                                <span className="text-[8px] font-mono text-[var(--crm-ink-faint)]">
                                  {liveStatus.lastUpdated ? `Since: ${new Date(liveStatus.lastUpdated).toLocaleTimeString()}` : ''}
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setTaskForm(prev => ({ ...prev, assignedTo: emp._id }));
                                      setShowTaskModal(true);
                                    }}
                                    className="flex-1 bg-teal-700/25 hover:bg-teal-700/40 text-teal-400 font-bold text-[9px] uppercase tracking-wider py-1 px-2.5 rounded transition cursor-pointer"
                                  >
                                    Assign Task
                                  </button>
                                  <button
                                    onClick={() => {
                                      setTargetForm({
                                        employeeId: emp._id,
                                        month: new Date().getMonth() + 1,
                                        year: new Date().getFullYear(),
                                        targetValue: '',
                                        targetDeals: ''
                                      });
                                      setSelectedEmpName(emp.name);
                                      setShowTargetModal(true);
                                    }}
                                    className="flex-1 bg-sky-700/25 hover:bg-sky-700/40 text-sky-400 font-bold text-[9px] uppercase tracking-wider py-1 px-2.5 rounded transition cursor-pointer"
                                  >
                                    Set Target
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: STRATEGIC & COACHING */}
            {activeTab === 'strategic' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left/Middle Column */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Forecast Accuracy Line Chart */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>Forecast Accuracy (Past 6 Months)</span>
                      <span className="text-[10px] font-bold text-teal-400 bg-teal-950/40 border border-teal-900/30 px-3 py-0.5 rounded-full">
                        Total Revenue Generated: {currency(strategicInsights?.totalActualRevenue || 0)}
                      </span>
                    </h3>
                    
                    <div className="h-64 mt-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={strategicInsights?.forecastHistory || []} margin={{ left: -10, top: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.05} stroke="var(--crm-line)" />
                          <XAxis dataKey="month" stroke="var(--crm-ink-faint)" fontSize={9} tickLine={false} />
                          <YAxis stroke="var(--crm-ink-faint)" fontSize={9} tickLine={false} tickFormatter={(v) => `₹${v/10000000}Cr`} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)', fontSize: 10, fontFamily: 'monospace', color: 'var(--crm-heading)' }}
                            formatter={(v) => currency(v)}
                          />
                          <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--crm-ink-soft)' }} />
                          <Line type="monotone" dataKey="Forecasted" stroke="var(--crm-ink-faint)" strokeDasharray="4 4" activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="Actual" stroke="#0f766e" strokeWidth={2} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Rep performance gap analysis */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>Performance Gap Analysis</span>
                      <span className="text-[8px] font-mono text-[var(--crm-ink-faint)]">Top 3 vs Bottom 3 averages</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                      {/* Metric Side by Side */}
                      <div className="space-y-4">
                        {[
                          { metric: 'Avg Outreach Volume / Month', top: strategicInsights?.performanceGap?.activity?.top || '—', bottom: strategicInsights?.performanceGap?.activity?.bottom || '—', ratio: strategicInsights?.performanceGap?.activity?.ratio || '0%' },
                          { metric: 'Avg Deal Size Closed', top: strategicInsights?.performanceGap?.dealSize?.top || '—', bottom: strategicInsights?.performanceGap?.dealSize?.bottom || '—', ratio: strategicInsights?.performanceGap?.dealSize?.ratio || '0%' },
                          { metric: 'Average Conversion Rate', top: strategicInsights?.performanceGap?.conversion?.top || '—', bottom: strategicInsights?.performanceGap?.conversion?.bottom || '—', ratio: strategicInsights?.performanceGap?.conversion?.ratio || '0%' }
                        ].map((m, idx) => (
                          <div key={idx} className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-md font-mono text-[10px] space-y-1.5">
                            <span className="text-[var(--crm-ink-faint)] uppercase tracking-wide block font-sans font-bold">{m.metric}</span>
                            <div className="flex justify-between items-center font-sans">
                              <div>
                                <span className="text-emerald-500 font-bold">Top 3: {m.top}</span>
                              </div>
                              <div>
                                <span className="text-rose-500 font-bold">Bottom 3: {m.bottom}</span>
                              </div>
                            </div>
                            <div className="text-[8px] text-rose-400 text-right font-bold uppercase block mt-1">
                              Gap: {m.ratio}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* AI Generated Text Insight */}
                      <div className="p-5 border border-teal-800/40 bg-teal-950/20 rounded-lg flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-teal-400 tracking-[0.2em] font-mono flex items-center gap-1.5">
                            <FiCpu size={12} className="text-teal-400 animate-pulse" /> Strategic Insight
                          </span>
                          <p className="text-xs text-teal-100 mt-3.5 font-light leading-relaxed">
                            Underperforming reps are making <strong>30% to 65% fewer calls</strong> per day than the top performers. 
                            There is a direct correlation between dial volume and closed deals this month.
                          </p>
                          <p className="text-xs text-teal-100 mt-2 font-light leading-relaxed">
                            <strong>Recommendation:</strong> Host a dedicated call-coaching session for underperforming representatives and set daily outreach thresholds to restore conversion pipelines.
                          </p>
                        </div>
                        <div className="border-t border-teal-900/20 pt-3 mt-4 text-right">
                          <span className="text-[8px] font-mono text-teal-500/70 font-semibold uppercase">Engine: Llama-3-Crm-Coacher // OK</span>
                        </div>
                      </div>
                    </div>

                    {/* Live Team Activity Tracker */}
                    <div className="border-t border-[var(--crm-line)] pt-5 mt-6">
                      <h4 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>Live Employee Activity Status</span>
                        </span>
                        <span className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest animate-pulse">Live Status updates</span>
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
                        {teamEmployees.length === 0 ? (
                          <div className="col-span-full py-6 border border-dashed border-[var(--crm-line)] rounded flex flex-col items-center justify-center">
                            <span className="text-[9px] font-mono text-[var(--crm-ink-faint)] uppercase">No team members active</span>
                          </div>
                        ) : (
                          teamEmployees.map((emp) => {
                            const liveStatus = getEmployeeLiveStatus(emp);
                            
                            // Map status type to aesthetic representation
                            const statusMap = {
                              ON_CALL: { label: 'On Call', color: 'bg-emerald-500', pulse: true, text: 'text-emerald-400', border: 'border-emerald-900/20 bg-emerald-950/20' },
                              FOLLOWING_UP: { label: 'Following Up', color: 'bg-sky-500', pulse: true, text: 'text-sky-400', border: 'border-sky-900/20 bg-sky-950/20' },
                              CONVERTING: { label: 'Converting', color: 'bg-violet-500', pulse: true, text: 'text-violet-400', border: 'border-violet-900/20 bg-violet-950/20' },
                              PAYMENT: { label: 'Payment', color: 'bg-amber-500', pulse: true, text: 'text-amber-400', border: 'border-amber-900/20 bg-amber-950/20' },
                              IDLE: { label: 'Online / Available', color: 'bg-emerald-500', pulse: false, text: 'text-emerald-400', border: 'border-emerald-900/20 bg-emerald-950/20' },
                              OFFLINE: { label: 'Offline', color: 'bg-rose-500', pulse: false, text: 'text-rose-400', border: 'border-rose-900/20 bg-rose-950/20' }
                            };
                            
                            const statusConfig = statusMap[liveStatus.status] || statusMap.OFFLINE;

                            return (
                              <div 
                                key={emp._id} 
                                className={`p-3.5 border rounded-lg transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between ${statusConfig.border}`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h5 className="font-sans font-bold text-[var(--crm-heading)] text-xs">
                                      {emp.name}
                                    </h5>
                                    <span className="text-[8px] text-[var(--crm-ink-faint)] font-mono uppercase tracking-wider block mt-0.5">
                                      {emp.position || emp.role || 'Executive'}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5">
                                    <span className="relative flex h-2 w-2">
                                      {statusConfig.pulse && (
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusConfig.color} opacity-75`}></span>
                                      )}
                                      <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.color}`}></span>
                                    </span>
                                    <span className={`text-[8px] font-mono font-bold uppercase tracking-wider ${statusConfig.text}`}>
                                      {statusConfig.label}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="mt-3 pt-2.5 border-t border-[var(--crm-line)]/30 flex flex-col gap-1.5">
                                  <div className="text-[10px] text-[var(--crm-ink-soft)] font-mono leading-relaxed">
                                    Activity: <strong className="text-[var(--crm-heading)] font-sans font-medium">{liveStatus.currentActivity || 'No active task'}</strong>
                                  </div>
                                  <div className="flex justify-between items-center text-[8px] text-[var(--crm-ink-faint)] font-mono pt-1">
                                    <span className="flex items-center gap-1">
                                      <FiClock size={10} />
                                      {liveStatus.lastUpdated ? new Date(liveStatus.lastUpdated).toLocaleTimeString() : 'N/A'}
                                    </span>
                                    <span>
                                      {emp.tasksCount || 0} Pending Tasks
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Department Activity Heatmap */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>Team Activity Heatmap</span>
                      <span className="text-[8px] font-mono text-[var(--crm-ink-faint)]">Total activities (calls+emails) per day</span>
                    </h3>

                    {/* Matrix Grid */}
                    <div className="grid grid-cols-7 gap-2 mt-5 max-w-lg">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className="text-center font-mono text-[9px] text-[var(--crm-ink-faint)] font-bold uppercase">{day}</div>
                      ))}
                      {(strategicInsights?.heatmapData || []).map((cell, idx) => (
                        <div 
                          key={idx} 
                          title={`${cell.val} Activities`}
                          className={`aspect-square rounded flex flex-col justify-between p-1.5 ${cell.fill} hover:scale-105 transition cursor-default`}
                        >
                          <span className="text-[7px] font-bold block">{cell.day}</span>
                          <span className="text-[9px] font-mono font-bold block text-right">{cell.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Right Sidebar (1-on-1 Meeting suggestions & Chat Box) */}
                <div className="lg:col-span-4 space-y-6 text-left">
                  
                  {/* 1-on-1 Coaching Talking Points */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>1-on-1 Coaching Talking Points</span>
                      <FiCpu className="text-teal-600" size={14} />
                    </h3>
                    <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1.5 font-light leading-relaxed">
                      Founder directive and AI-generated discussion guidelines based on representative conversion variance.
                    </p>

                    <div className="mt-5 space-y-4">
                      {/* Founder/Manager/HR Broadcast Message */}
                      {strategicInsights?.founderMessage && (
                        <div className="p-3 border border-blue-900/30 bg-blue-950/40 rounded-lg space-y-2 text-[10px] mb-2 font-mono">
                          <div className="flex justify-between items-center font-sans">
                            <span className="font-bold text-blue-400">
                              {strategicInsights.founderMessage.senderRole === 'ADMIN' ? "Founder's Broadcast" :
                               strategicInsights.founderMessage.senderRole === 'HR' ? "HR Announcement" :
                               "Manager's Directive"}
                            </span>
                            <span className="text-[8px] text-[var(--crm-ink-faint)]">{new Date(strategicInsights.founderMessage.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[var(--crm-ink-soft)] leading-relaxed italic font-sans">
                            "{strategicInsights.founderMessage.content}"
                          </p>
                          <div className="text-right text-[8px] text-[var(--crm-ink-faint)] font-sans">
                            — Posted by {strategicInsights.founderMessage.senderName} ({strategicInsights.founderMessage.senderRole})
                          </div>
                        </div>
                      )}

                      {getAISuggestions().map((sug, idx) => (
                        <div key={idx} className="p-3 border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)]/50 hover:bg-[var(--crm-bg-sunken)] rounded-lg transition duration-150 font-mono text-[10px] space-y-2">
                          <span className="text-[8px] uppercase tracking-wide font-sans font-bold bg-teal-950/40 text-teal-400 border border-teal-900/30 px-2 py-0.5 rounded inline-block">
                            Discuss with {sug.repName}
                          </span>
                          <p className="text-[var(--crm-ink-soft)] font-sans leading-relaxed italic">
                            "{sug.msg}"
                          </p>
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

            {/* TAB 3: TEAM LEAVE REQUESTS */}
            {activeTab === 'leaves_mgmt' && (
              <div className="space-y-6 text-left">
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--crm-line)] pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--crm-heading)] flex items-center gap-2">
                        <FiCalendar className="text-teal-500" size={16} /> Team Leave Applications Desk 
                      </h3>
                      <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1">
                        Review, approve, or reject leave requests submitted by the Sales Execs of your department.
                      </p>
                    </div>
                    <div className="text-[10px] font-mono bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-1.5 rounded text-[var(--crm-ink-soft)]">
                      Total Requests: <strong>{teamLeaves.length}</strong>
                    </div>
                  </div>

                  <div className="overflow-x-auto mt-6">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-soft)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-line)]">
                          <th className="py-3.5 px-4">Employee</th>
                          <th className="py-3.5 px-4">Leave Type</th>
                          <th className="py-3.5 px-4">Dates</th>
                          <th className="py-3.5 px-4">Days</th>
                          <th className="py-3.5 px-4">Reason</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                        {teamLeaves.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center py-16 text-[var(--crm-ink-faint)] font-mono uppercase tracking-widest text-[10px]">
                              No leave requests submitted by your team members.
                            </td>
                          </tr>
                        ) : (
                          teamLeaves.map((lv) => {
                            const isPending = lv.status === 'PENDING' || lv.status === 'PENDING_HR_APPROVAL';
                            
                            // Check if Manager is allowed to review this request
                            // Sales Manager can approve:
                            // - Executives under his department (SALES)
                            // - Cannot approve other managers or own requests
                            const isApplicantManager = lv.employeeId?.role === 'MANAGER';
                            const isSelfRequest = lv.employeeId?._id === user?._id;
                            const canReview = !isApplicantManager && !isSelfRequest && isPending;

                            const statusColors = {
                              PENDING: 'bg-amber-950/40 text-amber-400 border-amber-900/30',
                              PENDING_HR_APPROVAL: 'bg-orange-950/40 text-orange-400 border-orange-900/30',
                              APPROVED: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30',
                              HR_APPROVED_EXTRA: 'bg-teal-950/40 text-teal-400 border-teal-900/30',
                              REJECTED: 'bg-rose-950/40 text-rose-400 border-rose-900/30',
                            };
                            const statusColorClass = statusColors[lv.status] || 'bg-slate-900 text-slate-400 border-slate-800';

                            return (
                              <tr key={lv._id} className="hover:bg-[var(--crm-bg-sunken)]/40 transition">
                                <td className="py-3.5 px-4 font-semibold text-[var(--crm-heading)]">
                                  <div className="flex flex-col">
                                    <span>{lv.employeeId?.fullName || lv.employeeId?.name || 'Unknown'}</span>
                                    <span className="text-[9px] text-[var(--crm-ink-faint)] font-mono uppercase">
                                      {lv.employeeId?.role || 'Executive'} &bull; {lv.employeeId?.department || 'Sales'}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="px-2 py-0.5 bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-soft)] font-mono text-[9px] font-bold rounded border border-[var(--crm-line)] uppercase">
                                    {lv.leaveType}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[var(--crm-ink-soft)]">
                                  {new Date(lv.fromDate).toLocaleDateString()} &mdash; {new Date(lv.toDate).toLocaleDateString()}
                                </td>
                                <td className="py-3.5 px-4 font-mono font-medium text-[var(--crm-ink-soft)]">
                                  {lv.numberOfDays} {lv.numberOfDays === 1 ? 'day' : 'days'}
                                </td>
                                <td className="py-3.5 px-4 text-[var(--crm-ink-soft)] font-light max-w-[200px] truncate" title={lv.reason}>
                                  {lv.reason}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2 py-0.5 font-mono text-[9px] font-bold rounded border uppercase ${statusColorClass}`}>
                                    {lv.status.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  {canReview ? (
                                    <div className="inline-flex gap-2">
                                      <button
                                        onClick={() => handleReviewLeave(lv._id, 'APPROVED')}
                                        disabled={submittingLeaveReview === lv._id}
                                        className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold uppercase text-[9px] tracking-wider py-1 px-2.5 rounded transition disabled:opacity-50 cursor-pointer"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleReviewLeave(lv._id, 'REJECTED')}
                                        disabled={submittingLeaveReview === lv._id}
                                        className="bg-rose-800 hover:bg-rose-700 text-white font-bold uppercase text-[9px] tracking-wider py-1 px-2.5 rounded transition disabled:opacity-50 cursor-pointer"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-[var(--crm-ink-faint)] italic">
                                      {isSelfRequest ? 'Own request' : isApplicantManager ? 'HR review only' : 'Reviewed'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DOCUMENT APPROVAL DIALOG MODAL */}
      {actioningDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.97, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-lg p-6 w-full max-w-md relative text-left shadow-xl"
          >
            <h3 className="text-sm uppercase tracking-wide font-bold font-sans text-[var(--crm-heading)] border-b border-[var(--crm-line)] pb-3">
              Confirm Document {actionType === 'APPROVE' ? 'Approval' : 'Rejection'}
            </h3>
            
            <div className="mt-4 text-xs font-mono text-[var(--crm-ink-soft)] space-y-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] p-3 rounded">
              <p>Document: <strong className="text-[var(--crm-heading)]">{actioningDoc.fileName}</strong></p>
              <p>Type: <strong className="text-[var(--crm-heading)]">{actioningDoc.exportDocType || 'Other'}</strong></p>
              <p>Deal Name: <strong className="text-[var(--crm-heading)]">{actioningDoc.ownerId?.customerName || 'Direct Trade'}</strong></p>
              <p>Uploader: <strong className="text-[var(--crm-heading)]">{actioningDoc.uploadedBy?.fullName || 'Rep'}</strong></p>
            </div>

            <form onSubmit={handleDocActionSubmit} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1">
                  Manager Review Notes {actionType === 'REJECT' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  required={actionType === 'REJECT'}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={
                    actionType === 'APPROVE' 
                      ? 'Add any comments for the uploader (e.g. Approved for dispatch)' 
                      : 'Provide a reason for rejection (Mandatory)...'
                  }
                  className="w-full p-2.5 border border-[var(--crm-line)] bg-[var(--crm-bg)] text-[var(--crm-heading)] rounded outline-none resize-none focus:border-teal-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  disabled={submittingAction} 
                  className={`flex-1 text-white py-2.5 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer transition disabled:opacity-50 ${
                    actionType === 'APPROVE' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submittingAction ? 'Processing...' : `Confirm ${actionType === 'APPROVE' ? 'Approval' : 'Rejection'}`}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setActioningDoc(null);
                    setActionNote('');
                  }} 
                  className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] py-2.5 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer hover:bg-[var(--crm-bg-raised)] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ─── ASSIGN TASK MODAL ─── */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowTaskModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-xl shadow-xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[var(--crm-line)]">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--crm-heading)] flex items-center gap-2">
                <FiCheckSquare className="text-teal-500" size={16} /> Assign Task to Executive
              </h2>
            </div>

            <form onSubmit={handleTaskSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Task Title *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({...prev, title: e.target.value}))}
                  placeholder="e.g. Follow up with ABC Buyer"
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-4 py-2.5 rounded outline-none focus:border-teal-600 transition placeholder:text-[var(--crm-ink-faint)]"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({...prev, description: e.target.value}))}
                  placeholder="Task details..."
                  rows={3}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-4 py-2.5 rounded outline-none focus:border-teal-600 transition resize-none placeholder:text-[var(--crm-ink-faint)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Assign To *</label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm(prev => ({...prev, assignedTo: e.target.value}))}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-4 py-2.5 rounded outline-none focus:border-teal-600 transition cursor-pointer"
                    required
                  >
                    <option value="">Select Executive</option>
                    {teamEmployees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.position || emp.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Due Date *</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm(prev => ({...prev, dueDate: e.target.value}))}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-4 py-2.5 rounded outline-none focus:border-teal-600 transition cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm(prev => ({...prev, priority: e.target.value}))}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-4 py-2.5 rounded outline-none focus:border-teal-600 transition cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Category</label>
                  <select
                    value={taskForm.category}
                    onChange={(e) => setTaskForm(prev => ({...prev, category: e.target.value}))}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-4 py-2.5 rounded outline-none focus:border-teal-600 transition cursor-pointer"
                  >
                    <option value="GENERAL">General</option>
                    <option value="FOLLOW_UP">Follow Up</option>
                    <option value="CALL">Call</option>
                    <option value="MEETING">Meeting</option>
                    <option value="DOCUMENT">Document</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5 font-mono">Link to Lead (Optional)</label>
                <select
                  value={taskForm.leadId}
                  onChange={(e) => setTaskForm(prev => ({...prev, leadId: e.target.value}))}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-4 py-2.5 rounded outline-none focus:border-teal-600 transition cursor-pointer"
                >
                  <option value="">None / General Task</option>
                  {allLeads.map(lead => (
                    <option key={lead._id} value={lead._id}>
                      {lead.leadCode || 'No Code'} - {lead.customerName} ({lead.productCategory})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Attach File (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setTaskFile(e.target.files[0])}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] text-xs px-4 py-2 rounded file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-teal-800 file:text-white cursor-pointer"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submittingTask ? 'Assigning...' : <><FiSend size={11} /> Assign Task</>}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] py-2.5 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer hover:bg-[var(--crm-bg-raised)] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ─── SEND FILE MODAL ─── */}
      {showFileModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowFileModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[var(--crm-line)]">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--crm-heading)] flex items-center gap-2">
                <FiUpload className="text-indigo-500" size={16} /> Send File to Executive
              </h2>
            </div>

            <form onSubmit={handleFileShareSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Send To *</label>
                <select
                  value={fileForm.sentTo}
                  onChange={(e) => setFileForm(prev => ({...prev, sentTo: e.target.value}))}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-4 py-2.5 rounded outline-none focus:border-indigo-600 transition cursor-pointer"
                  required
                >
                  <option value="">Select Executive</option>
                  {teamEmployees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name} ({emp.position || emp.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">File *</label>
                <input
                  type="file"
                  onChange={(e) => setShareFile(e.target.files[0])}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] text-xs px-4 py-2 rounded file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-indigo-800 file:text-white cursor-pointer"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Note (Optional)</label>
                <textarea
                  value={fileForm.note}
                  onChange={(e) => setFileForm(prev => ({...prev, note: e.target.value}))}
                  placeholder="Instructions or notes for the executive..."
                  rows={3}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-4 py-2.5 rounded outline-none focus:border-indigo-600 transition resize-none placeholder:text-[var(--crm-ink-faint)]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submittingFile}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submittingFile ? 'Sending...' : <><FiSend size={11} /> Send File</>}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFileModal(false)}
                  className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] py-2.5 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer hover:bg-[var(--crm-bg-raised)] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* ─── SET MONTHLY TARGET MODAL ─── */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowTargetModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[var(--crm-line)] text-left font-sans">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--crm-heading)] flex items-center gap-2">
                🎯 Configure Monthly Sales Target
              </h2>
              <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1 uppercase font-mono">For {selectedEmpName}</p>
            </div>

            <form onSubmit={handleSetTargetSubmit} className="p-6 space-y-4 text-left font-sans">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5 font-mono">Target Value (INR) *</label>
                <input
                  type="number"
                  value={targetForm.targetValue}
                  onChange={(e) => setTargetForm(prev => ({...prev, targetValue: e.target.value}))}
                  placeholder="e.g. 5000000"
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-4 py-2.5 rounded outline-none focus:border-teal-600 transition placeholder:text-[var(--crm-ink-faint)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5 font-mono">Month *</label>
                  <select
                    value={targetForm.month}
                    onChange={(e) => setTargetForm(prev => ({...prev, month: e.target.value}))}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-4 py-2.5 rounded outline-none focus:border-teal-600 transition cursor-pointer"
                    required
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>
                        {new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5 font-mono">Year *</label>
                  <input
                    type="number"
                    value={targetForm.year}
                    onChange={(e) => setTargetForm(prev => ({...prev, year: e.target.value}))}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-4 py-2.5 rounded outline-none focus:border-teal-600 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5 font-mono">Deals Count Target (Optional)</label>
                <input
                  type="number"
                  value={targetForm.targetDeals}
                  onChange={(e) => setTargetForm(prev => ({...prev, targetDeals: e.target.value}))}
                  placeholder="e.g. 10"
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-4 py-2.5 rounded outline-none focus:border-teal-600 transition placeholder:text-[var(--crm-ink-faint)]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submittingTarget}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer transition flex items-center justify-center gap-1.5 disabled:opacity-50 font-mono"
                >
                  {submittingTarget ? 'Saving...' : 'Set Target'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] py-2.5 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer hover:bg-[var(--crm-bg-raised)] transition font-mono"
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
