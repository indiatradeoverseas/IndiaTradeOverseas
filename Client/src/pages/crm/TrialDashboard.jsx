import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL, getFileUrl } from '../../config/env';
import {
  FiGrid, FiBell, FiCheckSquare, FiUsers, FiMessageSquare,
  FiSend, FiCheck, FiClock, FiPlus, FiUpload, FiFileText,
  FiSearch, FiFilter, FiPhone, FiAlertCircle, FiTrendingUp, FiZap, FiDownload, FiMic,
  FiStar, FiCheckCircle, FiAlertTriangle, FiXCircle, FiCompass, FiArrowLeft, FiAward, FiEye, FiX,
  FiRotateCw, FiPaperclip, FiFolder, FiMail, FiCalendar, FiUserPlus
} from 'react-icons/fi';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import toast from 'react-hot-toast';
import { leadsApi } from '../../api/leads';
import { taskApi } from '../../api/task';
import { quotationsApi } from '../../api/quotations';
import { notificationsApi } from '../../api/notifications';
import { salesTrialApi } from '../../api/salesTrialApi';
import { salesApi } from '../../api/sales';
import { sharedFilesApi } from '../../api/sharedFiles';
import { employeesApi } from '../../api/employees';
import { useAuth } from '../../hooks/useAuth';
import { socketService } from '../../services/socket';
import CallRecordingModal from '../../components/crm/CallRecordingModal';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.05 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20 } }
};

const activePipelineStages = [
  'LEAD_QUALIFICATION', 'FOLLOW_UP', 'REQUIREMENT_CAPTURED', 
  'QUOTATION_REQUIRED', 'QUOTATION_PENDING_APPROVAL', 'QUOTATION_APPROVED', 
  'NEGOTIATION', 'LOI_PO_PENDING', 'ORDER_CONFIRMED', 'DISPATCH_PENDING'
];

const stagePipelineDetails = {
  LEAD_QUALIFICATION: { label: 'QUALIFICATION', icon: FiUsers },
  FOLLOW_UP: { label: 'FOLLOW UP', icon: FiPhone },
  REQUIREMENT_CAPTURED: { label: 'REQ. CAPTURED', icon: FiZap },
  QUOTATION_REQUIRED: { label: 'QUOTE REQ.', icon: FiFileText },
  QUOTATION_PENDING_APPROVAL: { label: 'QUOTE PENDING', icon: FiSend },
  QUOTATION_APPROVED: { label: 'QUOTE APPROVED', icon: FiCheckCircle },
  NEGOTIATION: { label: 'NEGOTIATION', icon: FiTrendingUp },
  LOI_PO_PENDING: { label: 'LOI/PO PENDING', icon: FiFileText },
  ORDER_CONFIRMED: { label: 'ORDER CONFIRMED', icon: FiCheck },
  DISPATCH_PENDING: { label: 'DISPATCH', icon: FiClock }
};

const calculateLeadScore = (l) => {
  if (!l) return 0;
  const st = String(l.stage || '').toUpperCase();
  if (st === 'CLOSED_LOST' || st === 'DEAL_LOST') return 0;

  let score = 0;
  const qualStages = ['LEAD_QUALIFICATION', 'FOLLOW_UP', 'REQUIREMENT_CAPTURED', 'REQUIREMENT_RECEIVED', 'QUOTATION_REQUIRED', 'QUOTATION_PENDING_APPROVAL', 'QUOTATION_APPROVED', 'NEGOTIATION', 'LOI_PO_PENDING', 'ORDER_CONFIRMED', 'DISPATCH_PENDING', 'PAYMENT_PENDING', 'CLOSED_WON', 'DEAL_WON'];
  if (qualStages.includes(st)) score += 5;

  const followStages = ['FOLLOW_UP', 'REQUIREMENT_CAPTURED', 'REQUIREMENT_RECEIVED', 'QUOTATION_REQUIRED', 'QUOTATION_PENDING_APPROVAL', 'QUOTATION_APPROVED', 'NEGOTIATION', 'LOI_PO_PENDING', 'ORDER_CONFIRMED', 'DISPATCH_PENDING', 'PAYMENT_PENDING', 'CLOSED_WON', 'DEAL_WON'];
  if (followStages.includes(st)) score += 15;

  const quoteApprovedStages = ['QUOTATION_APPROVED', 'NEGOTIATION', 'LOI_PO_PENDING', 'ORDER_CONFIRMED', 'DISPATCH_PENDING', 'PAYMENT_PENDING', 'CLOSED_WON', 'DEAL_WON'];
  if (quoteApprovedStages.includes(st) || l.quotationStatus === 'APPROVED') score += 40;

  const negoStages = ['NEGOTIATION', 'LOI_PO_PENDING', 'ORDER_CONFIRMED', 'DISPATCH_PENDING', 'PAYMENT_PENDING', 'CLOSED_WON', 'DEAL_WON'];
  if (negoStages.includes(st)) score += 15;

  const loiStages = ['LOI_PO_PENDING', 'ORDER_CONFIRMED', 'DISPATCH_PENDING', 'PAYMENT_PENDING', 'CLOSED_WON', 'DEAL_WON'];
  if (loiStages.includes(st) || (Array.isArray(l.loiDocuments) && l.loiDocuments.length > 0)) score += 20;

  const orderStages = ['ORDER_CONFIRMED', 'DISPATCH_PENDING', 'PAYMENT_PENDING', 'CLOSED_WON', 'DEAL_WON'];
  if (orderStages.includes(st)) score += 5;

  return Math.min(100, Math.max(0, score));
};

export default function TrialDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'leads' | 'tasks' | 'chat' | 'leaderboard' | 'shared_files' | 'notifications'

  // Data States
  const [myLeads, setMyLeads] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [loading, setLoading] = useState(true);

  // Performance & Extra States (Sales Executive Match)
  const [performance, setPerformance] = useState(null);
  const [myCallRecordings, setMyCallRecordings] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardTab, setLeaderboardTab] = useState('monthly');
  const [lbLoading, setLbLoading] = useState(false);

  // Date Filter State
  const [dateFilterMode, setDateFilterMode] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'PICK_DATE'
  const [selectedDate, setSelectedDate] = useState('');

  // Activity Status State
  const [myStatus, setMyStatus] = useState('IDLE');
  const [myActivity, setMyActivity] = useState('Available');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Shared File Upload state
  const [employeesList, setEmployeesList] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [recipientId, setRecipientId] = useState('');
  const [uploadNote, setUploadNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Leads Filter States
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [leadStageFilter, setLeadStageFilter] = useState('ALL');
  const [leadPriorityFilter, setLeadPriorityFilter] = useState('ALL');

  // Task Completion Modal State
  const [completionTaskId, setCompletionTaskId] = useState(null);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [completionFile, setCompletionFile] = useState(null);
  const [submittingCompletion, setSubmittingCompletion] = useState(false);

  // Call Recording Modal State
  const [showCallModal, setShowCallModal] = useState(false);

  // LOI Upload Modal State
  const [showLOIModal, setShowLOIModal] = useState(false);
  const [loiTargetLeadId, setLoiTargetLeadId] = useState('');
  const [loiFile, setLoiFile] = useState(null);
  const [loiNotes, setLoiNotes] = useState('');
  const [uploadingLOI, setUploadingLOI] = useState(false);

  // Quotation Request Modal State
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quoteTargetLeadId, setQuoteTargetLeadId] = useState('');
  const [employeeRequestedPrice, setEmployeeRequestedPrice] = useState('');
  const [quotationTerms, setQuotationTerms] = useState('');
  const [marginNote, setMarginNote] = useState('');
  const [submittingQuotation, setSubmittingQuotation] = useState(false);

  // Lead Stage Update State
  const [showStageModal, setShowStageModal] = useState(false);
  const [stageTargetLeadId, setStageTargetLeadId] = useState('');
  const [newStageValue, setNewStageValue] = useState('REQUIREMENT_CAPTURED');
  const [stageRemark, setStageRemark] = useState('');
  const [submittingStage, setSubmittingStage] = useState(false);

  // Lead Detail View Modal State (Image 1 Pipeline)
  const [selectedDetailLead, setSelectedDetailLead] = useState(null);

  // Dynamic Greeting based on time
  const [greeting, setGreeting] = useState('Good Afternoon');
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting('Good Morning');
    else if (hr < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

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

  const handleStatusChange = async (newStatus, newActivity) => {
    setSubmittingStatus(true);
    try {
      const skt = socketService.getSocket();
      if (skt && skt.connected) {
        skt.emit('change_status', { status: newStatus, currentActivity: newActivity });
        setMyStatus(newStatus);
        setMyActivity(newActivity);
        toast.success(`Activity status updated to: ${newStatus.replace('_', ' ')}`);
      } else if (user?._id) {
        const res = await employeesApi.updateEmployeeStatus(user._id, newStatus, newActivity);
        if (res?.success) {
          setMyStatus(newStatus);
          setMyActivity(newActivity);
          toast.success(`Activity status updated successfully`);
        }
      }
    } catch (err) {
      console.error('Error changing status:', err);
      toast.error('Failed to update activity status');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const fetchLeaderboard = async (period = 'monthly') => {
    setLbLoading(true);
    try {
      const lbRes = await salesApi.getLeaderboard({ period }).catch(() => ({ success: false }));
      if (lbRes.success) {
        setLeaderboardData(lbRes.data?.leaderboard || []);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLbLoading(false);
    }
  };

  const handleUploadFileSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) return toast.error('Please select a file');
    if (!recipientId) return toast.error('Please select a recipient employee');

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('sentTo', recipientId);
      formData.append('note', uploadNote);
      formData.append('department', user?.department || 'SALES_TRIAL');

      const res = await sharedFilesApi.shareFile(formData);
      if (res.success) {
        toast.success('File uploaded & shared successfully! 📁');
        setUploadFile(null);
        setUploadNote('');
        setRecipientId('');
        const filesRes = await sharedFilesApi.getSharedFiles();
        if (filesRes.success) setSharedFiles(filesRes.data?.files || filesRes.files || []);
      }
    } catch (err) {
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLOISubmit = async (e) => {
    e.preventDefault();
    if (!loiTargetLeadId) return toast.error('Please select a lead for the LOI document');
    if (!loiFile) return toast.error('Please select an LOI document file');

    setUploadingLOI(true);
    try {
      const formData = new FormData();
      formData.append('file', loiFile);
      if (loiNotes) formData.append('notes', loiNotes);

      const res = await leadsApi.uploadLOIDocument(loiTargetLeadId, formData);
      if (res && res.success) {
        toast.success('LOI Document uploaded successfully! 🎉');
        setShowLOIModal(false);
        setLoiFile(null);
        setLoiNotes('');
        setLoiTargetLeadId('');
        loadTrialDashboardData();
      } else {
        toast.error(res?.message || 'LOI upload failed');
      }
    } catch (err) {
      console.error('LOI upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload LOI document');
    } finally {
      setUploadingLOI(false);
    }
  };

  const handleQuotationSubmit = async (e) => {
    e.preventDefault();
    if (!quoteTargetLeadId) return toast.error('Please select a lead');
    if (!employeeRequestedPrice || Number(employeeRequestedPrice) <= 0) return toast.error('Please enter a valid requested valuation/price');

    setSubmittingQuotation(true);
    try {
      const payload = {
        leadId: quoteTargetLeadId,
        employeeRequestedPrice: Number(employeeRequestedPrice),
        paymentTerms: quotationTerms || 'Standard Payment Terms',
        marginNote: marginNote || 'Quotation requested by Sales Trial Executive'
      };

      const res = await quotationsApi.requestQuotation(payload);
      if (res && res.success) {
        toast.success('Quotation request submitted to Sales Manager! 💬');
        setShowQuotationModal(false);
        setQuoteTargetLeadId('');
        setEmployeeRequestedPrice('');
        setQuotationTerms('');
        setMarginNote('');
        loadTrialDashboardData();
      } else {
        toast.error(res?.message || 'Failed to submit quotation request');
      }
    } catch (err) {
      console.error('Quotation request error:', err);
      toast.error(err.response?.data?.message || 'Failed to request quotation');
    } finally {
      setSubmittingQuotation(false);
    }
  };

  const handleStageUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!stageTargetLeadId) return toast.error('Please select a lead');
    if (!newStageValue) return toast.error('Please select a stage');

    setSubmittingStage(true);
    try {
      const res = await leadsApi.updateStage(stageTargetLeadId, {
        newStage: newStageValue,
        remark: stageRemark || 'Stage updated by Sales Trial Executive'
      });
      if (res && res.success) {
        toast.success(`Lead stage updated to ${newStageValue.replace(/_/g, ' ')}! ⚡`);
        setShowStageModal(false);
        setStageTargetLeadId('');
        setNewStageValue('REQUIREMENT_CAPTURED');
        setStageRemark('');
        loadTrialDashboardData();
      } else {
        toast.error(res?.message || 'Failed to update lead stage');
      }
    } catch (err) {
      console.error('Stage update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update lead stage');
    } finally {
      setSubmittingStage(false);
    }
  };

  const handleDirectStageUpdate = async (leadId, newStage) => {
    try {
      const res = await leadsApi.updateStage(leadId, {
        newStage,
        remark: `Stage updated to ${newStage.replace(/_/g, ' ')} via Lead Progression Pipeline`
      });
      if (res && res.success) {
        toast.success(`Lead stage updated to ${newStage.replace(/_/g, ' ')}! ⚡`);
        if (selectedDetailLead && selectedDetailLead._id === leadId) {
          setSelectedDetailLead(prev => prev ? { ...prev, stage: newStage } : null);
        }
        loadTrialDashboardData();
      } else {
        toast.error(res?.message || 'Failed to update lead stage');
      }
    } catch (err) {
      console.error('Direct stage update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update stage');
    }
  };

  useEffect(() => {
    loadTrialDashboardData();
  }, [user]);

  useEffect(() => {
    const skt = socketService.connect(user);
    if (skt) {
      const handleBroadcast = (msg) => {
        if (msg) {
          setChatMessages(prev => {
            const msgIdStr = String(msg._id || msg.id || '');
            const msgText = (msg.message || msg.content || '').trim();
            const isDuplicate = prev.some(m => {
              const mIdStr = String(m._id || m.id || '');
              if (msgIdStr && mIdStr === msgIdStr) return true;
              const mText = (m.message || m.content || '').trim();
              const mSender = String(m.senderId || '');
              const msgSender = String(msg.senderId || '');
              return mText === msgText && mSender === msgSender && Math.abs(new Date(m.createdAt || Date.now()) - new Date(msg.createdAt || Date.now())) < 5000;
            });
            if (isDuplicate) return prev;
            return [...prev, msg];
          });
        }
      };
      skt.on('sales_trial_chat_receive', handleBroadcast);
      skt.on('sales_chat_message', handleBroadcast);
      return () => {
        skt.off('sales_trial_chat_receive', handleBroadcast);
        skt.off('sales_chat_message', handleBroadcast);
      };
    }
  }, [user]);

  const loadTrialDashboardData = async () => {
    setLoading(true);
    try {
      const currentTrialId = user?._id || user?.id || user?.trialId || user?.employeeId;

      const [leadsRes, tasksRes, notifRes, chatRes, perfRes, sharedRes, recRes, empRes] = await Promise.all([
        leadsApi.getLeads({ myLeadsOnly: 'true' }).catch(() => ({ success: false })),
        taskApi.getTasks().catch(() => ({ success: false })),
        notificationsApi.getNotifications().catch(() => ({ success: false })),
        salesTrialApi.getTrialChatHistory(currentTrialId).catch(() => ({ success: false })),
        salesApi.getMyPerformance().catch(() => ({ success: false })),
        sharedFilesApi.getSharedFiles().catch(() => ({ success: false })),
        leadsApi.getCallRecordings().catch(() => ({ success: false })),
        employeesApi.getEmployees().catch(() => ({ success: false }))
      ]);

      if (leadsRes.success) setMyLeads(leadsRes.data?.leads || []);
      if (tasksRes.success) setMyTasks(tasksRes.data?.tasks || []);
      if (notifRes.success) setNotifications(notifRes.data?.notifications || notifRes.notifications || []);
      if (perfRes.success) setPerformance(perfRes.data?.performance || null);
      if (sharedRes.success) setSharedFiles(sharedRes.data?.files || sharedRes.files || []);
      if (recRes.success) setMyCallRecordings(recRes.data?.recordings || []);
      if (empRes.success) setEmployeesList(empRes.data?.employees || empRes.employees || []);
      
      if (chatRes && chatRes.success && chatRes.data?.messages) {
        setChatMessages(chatRes.data.messages);
      }

      fetchLeaderboard('monthly');
    } catch (err) {
      console.error('Trial dashboard load error:', err);
      toast.error('Failed to load Sales Trial Executive data');
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
      const currentTrialId = String(user?._id || user?.id || user?.trialId || user?.employeeId || '');

      const leadMatch = text.match(/\b(?:LD|LEAD)-[A-Za-z0-9-]+\b/i);
      const leadCode = leadMatch ? leadMatch[0] : '';

      const payload = {
        trialUserId: currentTrialId,
        managerId: user?.assignedManager || 'SALES_MANAGER',
        message: text,
        leadCode
      };

      const res = await salesTrialApi.sendTrialChatMessage(payload);
      if (res && res.success) {
        const chatDoc = res.data?.chat || {
          _id: `msg_${Date.now()}`,
          senderId: currentTrialId,
          senderName: user?.fullName || user?.name || 'Trial Executive',
          senderRole: user?.role || 'SALES_TRIAL',
          message: text,
          createdAt: new Date()
        };

        setChatMessages(prev => {
          const msgIdStr = String(chatDoc._id || chatDoc.id || '');
          const msgText = (chatDoc.message || '').trim();
          const isDuplicate = prev.some(m => {
            const mIdStr = String(m._id || m.id || '');
            if (msgIdStr && mIdStr === msgIdStr) return true;
            return (m.message || '').trim() === msgText && Math.abs(new Date(m.createdAt || Date.now()) - new Date(chatDoc.createdAt || Date.now())) < 5000;
          });
          if (isDuplicate) return prev;
          return [...prev, chatDoc];
        });
        setChatInput('');
      }
    } catch (err) {
      toast.error('Failed to send chat message to Manager');
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
        toast.success('Task completion file submitted to Sales Manager! 🎉');
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

  const renderMessageContent = (content, leadList = []) => {
    if (!content) return null;
    const parts = content.split(/(\b(?:LD|LEAD)-[A-Za-z0-9-]+|\b[0-9a-fA-F]{24}\b)/g);
    return (
      <span>
        {parts.map((part, idx) => {
          const matchedLead = leadList.find(l => 
            l.leadCode === part || String(l._id) === part
          );
          if (matchedLead || /^(?:LD|LEAD)-/i.test(part)) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  const targetId = matchedLead ? (matchedLead._id || matchedLead.leadCode) : part;
                  navigate(`/crm/leads/${targetId}`);
                }}
                className="bg-teal-950/80 hover:bg-teal-900 border border-teal-700/60 text-teal-300 font-mono font-bold text-[10px] px-1.5 py-0.5 rounded mx-0.5 inline-flex items-center gap-1 transition underline cursor-pointer"
                title="Click to view Lead Pipeline & Manifest Details"
              >
                📄 {matchedLead ? matchedLead.leadCode : part}
              </button>
            );
          }
          return part;
        })}
      </span>
    );
  };

  // Target Metrics Calculations (Sales Executive Style)
  const targetVal = performance?.target?.targetValue || 2500000; // Default ₹25 Lakhs
  const wonRevenue = myLeads
    .filter(d => ['CLOSED_WON', 'DEAL_WON'].includes((d.stage || '').toUpperCase()))
    .reduce((sum, d) => sum + (Number(d.leadValue) || 0), 0);
  const achievedVal = performance?.revenue || wonRevenue || 0;
  const remainingVal = Math.max(0, targetVal - achievedVal);
  const targetProgressPercent = Math.min(100, Math.round((achievedVal / targetVal) * 100));

  const totalMyLeads = myLeads.length;
  const wonMyDeals = myLeads.filter(d => ['CLOSED_WON', 'DEAL_WON'].includes((d.stage || '').toUpperCase())).length;
  const conversionRate = totalMyLeads > 0 ? Math.round((wonMyDeals / totalMyLeads) * 100) : 0;

  const radius = 50;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (targetProgressPercent / 100) * circumference;

  const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  // Filtering Metrics
  const newLeadsCount = myLeads.filter(l => ['NEW', 'QUALIFICATION', 'UNCONTACTED', 'LEAD_QUALIFICATION'].includes((l.stage || '').toUpperCase())).length;
  const pendingLeadsCount = myLeads.filter(l => !['CLOSED_WON', 'DEAL_WON', 'CLOSED_LOST', 'DEAL_LOST'].includes((l.stage || '').toUpperCase())).length;
  const lostLeadsCount = myLeads.filter(l => ['CLOSED_LOST', 'DEAL_LOST'].includes((l.stage || '').toUpperCase())).length;
  const pendingTasksCount = myTasks.filter(t => t.status !== 'COMPLETED').length;
  const completedTasksCount = myTasks.filter(t => t.status === 'COMPLETED').length;

  // Filtered Leads by Search & Stage & Date
  const filteredLeads = getFilteredByDate(myLeads.filter(l => {
    const q = leadSearchQuery.toLowerCase().trim();
    const matchesQuery = !q || 
      (l.leadCode && l.leadCode.toLowerCase().includes(q)) ||
      (l.customerName && l.customerName.toLowerCase().includes(q)) ||
      (l.phone && l.phone.includes(q)) ||
      (l.companyName && l.companyName.toLowerCase().includes(q));

    const stageMatch = leadStageFilter === 'ALL' || (l.stage || '').toUpperCase() === leadStageFilter.toUpperCase();
    const priorityMatch = leadPriorityFilter === 'ALL' || (l.priority || '').toUpperCase() === leadPriorityFilter.toUpperCase();

    return matchesQuery && stageMatch && priorityMatch;
  }));

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto w-full min-w-0 font-sans antialiased text-[var(--crm-ink-soft)] bg-[var(--crm-bg)] pb-16">
      
      {/* Executive Portal Header Banner (Sales Executive Layout) */}
      <motion.div variants={blockVariants} className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 sm:p-5 rounded-lg shadow-sm text-left">
        <div className="space-y-1 flex-1 min-w-0 pr-2">
          <span className="text-[10px] uppercase tracking-[0.25em] text-teal-400 font-bold block font-mono">COMMODITY TRADING PORTAL</span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-normal text-[var(--crm-heading)] tracking-tight">
            {greeting}, {user?.fullName || user?.name || 'Sales Trial Executive'}
          </h1>
          <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-0.5">
            Role: <strong className="text-[var(--crm-heading)] font-semibold font-mono">Sales Trial Executive (SALES_TRIAL) &bull; Node ID: {user?.trialId || user?.employeeId || 'TRL-NODE'}</strong> &bull; Node Status: <span className="text-emerald-400 font-semibold font-mono">Live</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto self-stretch xl:self-auto font-mono shrink-0">
          <button 
            onClick={() => setShowLOIModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-800/50 px-3 py-2 text-[10px] uppercase font-bold tracking-wider rounded transition shadow-sm cursor-pointer whitespace-nowrap"
          >
            <FiFileText className="text-teal-400" size={12} /> Upload LOI Document
          </button>
          <button 
            onClick={() => setShowCallModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/40 px-3 py-2 text-[10px] uppercase font-bold tracking-wider rounded transition shadow-sm cursor-pointer whitespace-nowrap"
          >
            <FiMic className="animate-pulse text-rose-400" size={12} /> Upload Call Recording
          </button>
          <button 
            onClick={loadTrialDashboardData}
            className="flex items-center justify-center gap-1.5 bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border border-[var(--crm-line)] px-3 py-2 text-[10px] uppercase font-bold tracking-wider rounded transition shadow-sm cursor-pointer whitespace-nowrap"
          >
            <FiRotateCw className={`${loading ? 'animate-spin' : ''}`} size={12} /> Sync Data
          </button>
          <div className="bg-[var(--crm-bg-sunken)] text-teal-400 border border-[var(--crm-line)] px-3 py-2 text-[10px] font-bold tracking-widest uppercase rounded flex items-center justify-center select-none shadow-sm whitespace-nowrap">
            DESK MODE // ACTIVE
          </div>
        </div>
      </motion.div>

      {/* Date & Calendar Filter Bar */}
      <motion.div variants={blockVariants} className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-3 sm:p-4 rounded-lg shadow-sm font-mono text-xs flex flex-wrap justify-between items-center gap-3 text-left">
        <div className="flex items-center gap-2 text-[var(--crm-heading)] font-bold">
          <FiCalendar className="text-teal-400 animate-pulse" size={16} />
          <span className="text-[11px] uppercase tracking-wider">Date & Calendar Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setDateFilterMode('ALL'); setSelectedDate(''); }}
            className={`px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
              dateFilterMode === 'ALL'
                ? 'bg-teal-600 text-white font-black shadow'
                : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
            }`}
          >
            All Dates
          </button>
          <button
            onClick={() => { setDateFilterMode('TODAY'); setSelectedDate(''); }}
            className={`px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
              dateFilterMode === 'TODAY'
                ? 'bg-teal-600 text-white font-black shadow'
                : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => { setDateFilterMode('YESTERDAY'); setSelectedDate(''); }}
            className={`px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
              dateFilterMode === 'YESTERDAY'
                ? 'bg-teal-600 text-white font-black shadow'
                : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
            }`}
          >
            Yesterday
          </button>

          <div className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-2.5 py-1 rounded">
            <span className="text-[9px] uppercase text-[var(--crm-ink-faint)] font-bold">Pick Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDateFilterMode(e.target.value ? 'PICK_DATE' : 'ALL');
              }}
              className="bg-transparent text-[var(--crm-heading)] text-[10px] outline-none font-mono cursor-pointer"
            />
          </div>

          {dateFilterMode !== 'ALL' && (
            <button
              onClick={() => { setDateFilterMode('ALL'); setSelectedDate(''); }}
              className="text-[9px] uppercase font-bold text-rose-400 hover:text-rose-300 underline ml-1 cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="text-[10px] text-[var(--crm-ink-faint)] font-mono">
          Showing: <strong className="text-teal-400 font-bold">{dateFilterMode === 'ALL' ? 'All Time' : dateFilterMode === 'TODAY' ? 'Today' : dateFilterMode === 'YESTERDAY' ? 'Yesterday' : selectedDate}</strong> 
          &bull; ({getFilteredByDate(myLeads).length} Leads, {getFilteredByDate(myCallRecordings).length} Recordings)
        </div>
      </motion.div>

      {/* Tabs Navigation (Sales Executive Style) */}
      <motion.div variants={blockVariants} className="bg-[var(--crm-bg-raised)] border-y border-[var(--crm-line)] px-3 sm:px-6 py-1 flex overflow-x-auto custom-scrollbar shadow-sm min-w-0 w-full">
        <nav className="flex space-x-4 sm:space-x-8 min-w-max px-1">
          {[
            { id: 'daily', label: 'Daily Action View', icon: FiClock },
            { id: 'leaderboard', label: 'Leaderboard & Gamification', icon: FiAward },
            { id: 'shared_files', label: 'Shared Files', icon: FiFolder },
            { id: 'leads', label: `Assigned Leads (${myLeads.length})`, icon: FiUsers },
            { id: 'tasks', label: `Assigned Tasks (${pendingTasksCount})`, icon: FiCheckSquare },
            { id: 'chat', label: 'Manager Chat Support', icon: FiMessageSquare }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3.5 px-1 border-b-2 text-[11px] uppercase tracking-widest font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-400'
                  : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
              }`}
            >
              <tab.icon size={13} className={activeTab === tab.id ? 'text-teal-400' : 'text-inherit'} />
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
            <p className="text-xs tracking-widest uppercase text-[var(--crm-ink-faint)]">Syncing Sales Trial Executive Data...</p>
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
            {/* TAB 1: DAILY ACTION VIEW */}
            {activeTab === 'daily' && (
              <div className="space-y-6">
                
                {/* 6 KPI Stats Cards Row */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 font-mono">
                  {[
                    { label: 'Assigned Leads', val: totalMyLeads, color: 'text-indigo-400 bg-indigo-950/30', icon: FiUsers },
                    { label: 'Won Leads', val: wonMyDeals, color: 'text-emerald-400 bg-emerald-950/30', icon: FiCheckCircle },
                    { label: 'Pending Leads', val: pendingLeadsCount, color: 'text-amber-400 bg-amber-950/30', icon: FiClock },
                    { label: 'Lost Leads', val: lostLeadsCount, color: 'text-rose-400 bg-rose-950/30', icon: FiAlertCircle },
                    { label: 'Total Revenue', val: currency(achievedVal), color: 'text-cyan-400 bg-cyan-950/30', icon: FiTrendingUp },
                    { label: 'Completed Tasks', val: completedTasksCount, color: 'text-teal-400 bg-teal-950/30', icon: FiCheckSquare }
                  ].map((kpi, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ y: -2 }}
                      className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-lg flex flex-col justify-between shadow-sm transition-all text-left"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold">{kpi.label}</span>
                        <div className={`p-1.5 rounded-md ${kpi.color}`}>
                          <kpi.icon size={12} />
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-lg font-bold text-[var(--crm-heading)] leading-tight tracking-tight">{kpi.val}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Target Progress & Live Activity Status Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left (8 Cols): Monthly Performance Target */}
                  <div className="lg:col-span-8 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left font-mono">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>Monthly Performance Target</span>
                      <FiTrendingUp className="text-teal-400" size={14} />
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center mt-5">
                      
                      {/* Circular Gauge */}
                      <div className="md:col-span-4 flex flex-col items-center justify-center py-2">
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              className="text-zinc-900"
                              strokeWidth={strokeWidth}
                              stroke="currentColor"
                              fill="transparent"
                              r={normalizedRadius}
                              cx={radius}
                              cy={radius}
                            />
                            <circle
                              className="text-teal-400 transition-all duration-700 ease-out"
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
                            <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] block">Monthly Target</span>
                            <strong className="text-sm font-semibold text-[var(--crm-ink-soft)] block mt-1">{currency(targetVal)}</strong>
                          </div>
                          <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-md">
                            <span className="text-[9px] uppercase tracking-wider text-emerald-400 block">Achieved</span>
                            <strong className="text-sm font-semibold text-emerald-300 block mt-1">{currency(achievedVal)}</strong>
                          </div>
                          <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-md">
                            <span className="text-[9px] uppercase tracking-wider text-amber-400 block">Remaining</span>
                            <strong className="text-sm font-semibold text-amber-300 block mt-1">{currency(remainingVal)}</strong>
                          </div>
                        </div>

                        {/* Conversion Rate */}
                        <div className="flex items-center justify-between border-t border-[var(--crm-line)] pt-4">
                          <div>
                            <span className="text-xs font-semibold text-[var(--crm-heading)] block font-sans">Lead-to-Order Conversion Rate</span>
                            <span className="text-[10px] text-[var(--crm-ink-faint)]">Total won deals divided by assigned leads</span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-normal text-teal-400 tracking-tight font-mono">{conversionRate}%</span>
                            <div className="w-24 bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-1 border border-zinc-700">
                              <div className="bg-teal-400 h-full" style={{ width: `${conversionRate}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Right (4 Cols): Live Activity Status Sidebar Widget (Exact Match) */}
                  <div className="lg:col-span-4 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left font-mono space-y-4">
                    <div className="border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold flex items-center gap-2">
                        LIVE ACTIVITY STATUS
                      </h3>
                      <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">MY CURRENT STATUS</label>
                        <select
                          value={myStatus}
                          onChange={(e) => handleStatusChange(e.target.value, myActivity)}
                          disabled={submittingStatus}
                          className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-emerald-400 font-bold text-xs p-2.5 rounded outline-none cursor-pointer"
                        >
                          <option value="IDLE">🟢 Idle / Available</option>
                          <option value="IN_CALL">📞 In a Call</option>
                          <option value="MEETING">👥 In a Meeting</option>
                          <option value="ON_BREAK">☕ On Break</option>
                          <option value="OFFLINE">🔴 Offline</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">WHAT ARE YOU WORKING ON?</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={myActivity}
                            onChange={(e) => setMyActivity(e.target.value)}
                            placeholder="e.g. Calling leads, LOI terms..."
                            className="flex-1 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3 py-2 rounded outline-none font-sans"
                          />
                          <button
                            type="button"
                            onClick={() => handleStatusChange(myStatus, myActivity)}
                            disabled={submittingStatus}
                            className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-[10px] uppercase px-3 py-2 rounded transition cursor-pointer"
                          >
                            UPDATE
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Lead Distribution Charts & Call Recordings Hub */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lead Status Bar Chart */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left font-mono">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>Lead Status Distribution</span>
                      <span className="text-[8px] text-[var(--crm-ink-faint)]">Won vs Pending vs Lost</span>
                    </h3>
                    <div className="h-64 mt-4">
                      <ResponsiveContainer width="100%" height={230} minWidth={0} minHeight={0}>
                        <BarChart data={[
                          { name: 'Won', count: wonMyDeals, fill: '#10b981' },
                          { name: 'Pending', count: pendingLeadsCount, fill: '#f59e0b' },
                          { name: 'Lost', count: lostLeadsCount, fill: '#f43f5e' }
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

                  {/* Leads by Product Category */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left font-mono">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>Leads by Product Category</span>
                      <span className="text-[8px] text-[var(--crm-ink-faint)]">Materials Breakdown</span>
                    </h3>
                    <div className="h-64 mt-4">
                      <ResponsiveContainer width="100%" height={230} minWidth={0} minHeight={0}>
                        <BarChart data={['STONE', 'COAL', 'TEA', 'RICE', 'CAREERS'].map(cat => ({
                          name: cat,
                          leads: myLeads.filter(d => (d.productCategory || '').toUpperCase() === cat).length
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

                {/* Call Recordings Hub Section */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left font-mono space-y-4">
                  <div className="border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                    <h3 className="text-xs uppercase tracking-widest text-rose-400 font-bold flex items-center gap-2">
                      <FiMic className="animate-pulse" size={14} /> My Call Recordings ({getFilteredByDate(myCallRecordings).length})
                    </h3>
                    <button
                      onClick={() => setShowCallModal(true)}
                      className="text-[9px] uppercase font-bold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 px-2.5 py-1 rounded transition cursor-pointer"
                    >
                      + Upload Call Recording
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                    {getFilteredByDate(myCallRecordings).length === 0 ? (
                      <div className="col-span-full py-8 text-center text-[10px] text-[var(--crm-ink-faint)] uppercase tracking-wider">
                        No call recordings found for selected date filter.
                      </div>
                    ) : (
                      getFilteredByDate(myCallRecordings).map((rec) => (
                        <div key={rec._id} className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-md space-y-2 text-xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-[var(--crm-heading)] truncate text-xs">
                                {rec.customerName || 'Client Call'}
                              </h4>
                              {rec.mobileNumber && (
                                <span className="text-[9px] text-[var(--crm-ink-faint)] block">
                                  📱 {rec.mobileNumber} ({rec.contactRole || 'Contact'})
                                </span>
                              )}
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                              rec.leadPriority === 'HOT' ? 'bg-rose-950/60 text-rose-400 border-rose-800/60' : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                            }`}>
                              {rec.leadPriority || 'WARM'}
                            </span>
                          </div>

                          <audio
                            controls
                            controlsList="nodownload"
                            preload="metadata"
                            className="w-full h-7 rounded accent-teal-500"
                            src={`${API_URL}/leads/call-recordings/${rec._id}/stream`}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: FULL LEADS DESK WITH FILTERS */}
            {activeTab === 'leads' && (
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm font-mono text-xs space-y-4">
                <div className="border-b border-[var(--crm-line)] pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold flex items-center gap-1.5">
                      <FiUsers className="text-teal-400" size={15} /> Assigned Leads Manifest ({filteredLeads.length} / {myLeads.length})
                    </h3>
                    <p className="text-[10px] text-[var(--crm-ink-faint)] mt-0.5">Filter, search, and update progress for leads assigned to your trial executive profile.</p>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <FiSearch className="absolute left-2.5 top-2.5 text-[var(--crm-ink-faint)]" size={13} />
                      <input
                        type="text"
                        placeholder="Search Lead Code, Name, Phone..."
                        value={leadSearchQuery}
                        onChange={(e) => setLeadSearchQuery(e.target.value)}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-[11px] pl-8 pr-3 py-1.5 rounded outline-none focus:border-teal-500 transition"
                      />
                    </div>

                    <select
                      value={leadStageFilter}
                      onChange={(e) => setLeadStageFilter(e.target.value)}
                      className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-[10px] px-2.5 py-1.5 rounded outline-none focus:border-teal-500 cursor-pointer uppercase font-bold"
                    >
                      <option value="ALL">All Stages</option>
                      <option value="NEW">New</option>
                      <option value="QUALIFICATION">Qualification</option>
                      <option value="CONTACTED">Contacted / Follow-up</option>
                      <option value="REQUIREMENT_GATHERING">Requirement Gathering</option>
                      <option value="QUOTATION">Quotation</option>
                      <option value="CONVERTED">Converted / Closed</option>
                      <option value="REJECTED">Rejected</option>
                    </select>

                    <select
                      value={leadPriorityFilter}
                      onChange={(e) => setLeadPriorityFilter(e.target.value)}
                      className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-[10px] px-2.5 py-1.5 rounded outline-none focus:border-teal-500 cursor-pointer uppercase font-bold"
                    >
                      <option value="ALL">All Priorities</option>
                      <option value="HOT">Hot</option>
                      <option value="WARM">Warm</option>
                      <option value="COLD">Cold</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto mt-2">
                  {filteredLeads.length === 0 ? (
                    <div className="py-16 border border-dashed border-[var(--crm-line)] rounded text-center text-[var(--crm-ink-faint)] uppercase text-[10px]">
                      No assigned leads match your search/filter criteria.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[750px]">
                      <thead>
                        <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest border-b border-[var(--crm-line)]">
                          <th className="py-3 px-4">Lead Code</th>
                          <th className="py-3 px-4">Customer / Company</th>
                          <th className="py-3 px-4">Contact Phone</th>
                          <th className="py-3 px-4">Product Category</th>
                          <th className="py-3 px-4">Priority</th>
                          <th className="py-3 px-4">Current Stage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                        {filteredLeads.map((lead) => (
                          <tr key={lead._id} className="hover:bg-[var(--crm-bg-sunken)]/40 transition">
                            <td className="py-3 px-4 font-bold text-[var(--crm-heading)]">
                              <button
                                type="button"
                                onClick={() => navigate(`/crm/leads/${lead._id}`)}
                                className="hover:text-teal-400 font-mono text-left underline cursor-pointer"
                                title="Click to view full Lead Workspace"
                              >
                                {lead.leadCode}
                              </button>
                            </td>
                            <td className="py-3 px-4 font-sans font-medium">
                              <button
                                type="button"
                                onClick={() => navigate(`/crm/leads/${lead._id}`)}
                                className="hover:text-teal-400 text-left hover:underline cursor-pointer"
                                title="Click to view full Lead Workspace"
                              >
                                <div>{lead.customerName}</div>
                                {lead.companyName && <div className="text-[9px] text-[var(--crm-ink-faint)] font-mono">{lead.companyName}</div>}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-[var(--crm-ink-faint)] font-mono">{lead.phone || '--'}</td>
                            <td className="py-3 px-4">{lead.productCategory || 'General'}</td>
                            <td className="py-3 px-4">
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase border ${
                                (lead.priority || '').toUpperCase() === 'HOT' ? 'bg-rose-950 text-rose-400 border-rose-800' : 'bg-amber-950 text-amber-400 border-amber-800'
                              }`}>{lead.priority || 'WARM'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="bg-teal-950/80 text-teal-300 font-mono text-[8px] font-bold px-2 py-0.5 rounded border border-teal-800 uppercase">
                                {(lead.stage || 'NEW').replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ASSIGNED TASKS */}
            {activeTab === 'tasks' && (
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm font-mono text-xs space-y-4">
                <div className="border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                  <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold flex items-center gap-1.5">
                    <FiCheckSquare className="text-amber-400" size={15} /> Manager Assigned Tasks Desk
                  </h3>
                  <span className="text-[10px] text-[var(--crm-ink-faint)]">{myTasks.length} Total Tasks</span>
                </div>

                <div className="overflow-x-auto mt-2">
                  {myTasks.length === 0 ? (
                    <div className="py-16 text-center text-[var(--crm-ink-faint)] uppercase tracking-widest text-[10px]">
                      No tasks assigned by Sales Manager.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest border-b border-[var(--crm-line)]">
                          <th className="py-3 px-4">Task Directive</th>
                          <th className="py-3 px-4">Due Date</th>
                          <th className="py-3 px-4">Priority</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                        {myTasks.map((task) => (
                          <tr key={task._id} className="hover:bg-[var(--crm-bg-sunken)]/40 transition">
                            <td className="py-3 px-4 font-semibold text-[var(--crm-heading)]">
                              <div>{task.title}</div>
                              {task.description && <div className="text-[9px] text-[var(--crm-ink-faint)] font-light italic mt-0.5">"{task.description}"</div>}
                            </td>
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

            {/* TAB 4: CHAT SUPPORT WITH SALES MANAGER */}
            {activeTab === 'chat' && (
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm flex flex-col h-[560px]">
                <div className="border-b border-[var(--crm-line)] pb-3 flex justify-between items-center shrink-0 font-mono">
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold flex items-center gap-1.5">
                      <FiMessageSquare className="text-teal-400" size={15} /> 1-on-1 Sales Manager Chat Support
                    </h3>
                    <p className="text-[9px] text-[var(--crm-ink-faint)]">Direct chat line with your assigned Sales Manager.</p>
                  </div>
                  <span className="text-[8px] text-emerald-400 font-mono font-bold animate-pulse flex items-center gap-1">
                    🟢 Live Socket Link
                  </span>
                </div>

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto my-3 pr-2 space-y-3 custom-scrollbar text-xs font-sans">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--crm-ink-faint)] font-mono uppercase tracking-widest text-[9px] space-y-2">
                      <FiMessageSquare size={32} className="text-teal-500/40" />
                      <p>No chat history yet. Send a message or paste a Lead Code to consult with your Manager!</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, msgIdx) => {
                      const isMe = msg.senderId === String(user?._id || user?.id || user?.trialId || user?.employeeId) || 
                                   (msg.senderRole === 'SALES_TRIAL');
                      const isManager = ['ADMIN', 'MANAGER', 'SALES_MANAGER'].includes(msg.senderRole);

                      return (
                        <div key={msg._id || `trial_msg_${msgIdx}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[80%] rounded-lg p-3 space-y-1 shadow-sm ${
                            isMe 
                              ? 'bg-teal-600 text-white' 
                              : isManager 
                                ? 'bg-indigo-950/90 border border-indigo-800 text-[var(--crm-heading)]' 
                                : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)]'
                          }`}>
                            <div className="flex justify-between items-center gap-4 text-[9px] font-mono font-bold opacity-80 border-b border-white/10 pb-1">
                              <span>{msg.senderName} ({msg.senderRole || 'Executive'})</span>
                            </div>
                            <div className="leading-relaxed break-words font-sans text-xs pt-1">
                              {renderMessageContent(msg.message || msg.content, myLeads)}
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
                <form onSubmit={handleSendChatMessage} className="flex gap-2 shrink-0 border-t border-[var(--crm-line)] pt-3 font-mono">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type message or paste Lead Code e.g. LD-101... (Clickable link for Manager)"
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

            {/* TAB 5: LEADERBOARD & GAMIFICATION */}
            {activeTab === 'leaderboard' && (
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm font-mono text-xs space-y-4 text-left">
                <div className="border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                  <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold flex items-center gap-1.5">
                    <FiAward className="text-amber-400" size={16} /> Sales Performance Leaderboard & Gamification
                  </h3>
                  <div className="flex gap-2">
                    {['monthly', 'quarterly', 'annual'].map(period => (
                      <button
                        key={period}
                        onClick={() => { setLeaderboardTab(period); fetchLeaderboard(period); }}
                        className={`px-2.5 py-1 rounded text-[9px] uppercase font-bold tracking-wider ${
                          leaderboardTab === period ? 'bg-amber-600 text-white' : 'bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)]'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                {lbLoading ? (
                  <div className="py-12 text-center text-[var(--crm-ink-faint)] uppercase text-[10px]">Updating Leaderboard Standings...</div>
                ) : leaderboardData.length === 0 ? (
                  <div className="py-12 text-center text-[var(--crm-ink-faint)] uppercase text-[10px]">No leaderboard records found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest border-b border-[var(--crm-line)]">
                          <th className="py-3 px-4">Rank</th>
                          <th className="py-3 px-4">Executive Name</th>
                          <th className="py-3 px-4">Department</th>
                          <th className="py-3 px-4">Revenue Generated</th>
                          <th className="py-3 px-4 text-right">Deals Won</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                        {leaderboardData.map((lb, idx) => (
                          <tr key={lb._id || idx} className={`hover:bg-[var(--crm-bg-sunken)]/40 transition ${
                            lb.email?.toLowerCase() === user?.email?.toLowerCase() ? 'bg-teal-950/30 border-l-2 border-l-teal-500' : ''
                          }`}>
                            <td className="py-3 px-4 font-bold text-amber-400">#{idx + 1}</td>
                            <td className="py-3 px-4 font-sans font-bold text-[var(--crm-heading)]">{lb.name || lb.fullName}</td>
                            <td className="py-3 px-4 text-[var(--crm-ink-faint)]">{lb.department || 'SALES'}</td>
                            <td className="py-3 px-4 font-bold text-emerald-400">₹{Number(lb.revenue || 0).toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-bold text-teal-400">{lb.dealsWon || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: SHARED FILES */}
            {activeTab === 'shared_files' && (
              <div className="space-y-6 font-mono text-xs text-left">
                {/* Upload & Share File Form */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm space-y-4">
                  <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold border-b border-[var(--crm-line)] pb-3 flex items-center gap-1.5">
                    <FiFolder className="text-teal-400" size={15} /> Upload & Share File / Spreadsheet
                  </h3>

                  <form onSubmit={handleUploadFileSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Select File *</label>
                      <input
                        type="file"
                        required
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2 rounded text-[10px] cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Recipient Employee *</label>
                      <select
                        required
                        value={recipientId}
                        onChange={(e) => setRecipientId(e.target.value)}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded text-xs outline-none cursor-pointer"
                      >
                        <option value="">-- Select Recipient --</option>
                        {employeesList.map(e => (
                          <option key={e._id} value={e._id}>
                            {e.name || e.fullName} ({e.role || 'Executive'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Upload Note</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={uploadNote}
                          onChange={(e) => setUploadNote(e.target.value)}
                          placeholder="Note for recipient..."
                          className="flex-1 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3 py-2 rounded outline-none font-sans"
                        />
                        <button
                          type="submit"
                          disabled={isUploading}
                          className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-[10px] uppercase px-4 py-2 rounded transition cursor-pointer shrink-0"
                        >
                          {isUploading ? 'Uploading...' : 'Share File'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Shared Files Table */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm space-y-3">
                  <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                    <span>Shared Documents Manifest ({sharedFiles.length})</span>
                    <span className="text-[9px] text-[var(--crm-ink-faint)]">Secure Files Storage</span>
                  </h3>

                  <div className="overflow-x-auto">
                    {sharedFiles.length === 0 ? (
                      <div className="py-12 text-center text-[var(--crm-ink-faint)] uppercase text-[10px]">No shared documents available.</div>
                    ) : (
                      <table className="w-full text-left border-collapse min-w-[650px]">
                        <thead>
                          <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest border-b border-[var(--crm-line)]">
                            <th className="py-3 px-4">File Name</th>
                            <th className="py-3 px-4">Shared By / To</th>
                            <th className="py-3 px-4">Date Shared</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                          {sharedFiles.map((file) => (
                            <tr key={file._id} className="hover:bg-[var(--crm-bg-sunken)]/40 transition">
                              <td className="py-3 px-4 font-bold text-[var(--crm-heading)]">{file.originalName || file.filename}</td>
                              <td className="py-3 px-4 text-[var(--crm-ink-faint)]">{file.uploadedBy?.name || 'Executive'} → {file.sentTo?.name || 'All'}</td>
                              <td className="py-3 px-4 text-[var(--crm-ink-faint)]">{new Date(file.createdAt).toLocaleDateString()}</td>
                              <td className="py-3 px-4 text-right">
                                <a
                                  href={sharedFilesApi.getDownloadUrl(file._id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-800 text-[9px] font-bold uppercase px-3 py-1.5 rounded transition inline-flex items-center gap-1"
                                >
                                  <FiDownload size={10} /> Download
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CALL RECORDING / TELEPHONY LOG MODAL */}
      <CallRecordingModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        onSuccess={() => loadTrialDashboardData()}
        initialLeads={myLeads}
      />

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
                  <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 font-mono">Completion Remarks / Notes</label>
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

      {/* UPLOAD LOI DOCUMENT MODAL */}
      <AnimatePresence>
        {showLOIModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-lg p-6 w-full max-w-lg shadow-2xl relative text-[var(--crm-ink-soft)] font-mono text-left space-y-4"
            >
              <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2">
                  <FiFileText className="text-teal-400" size={16} /> Upload LOI Document (Letter of Intent)
                </h3>
                <button onClick={() => setShowLOIModal(false)} className="text-xs text-[var(--crm-ink-faint)] hover:text-white font-bold cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleLOISubmit} className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Select Lead *</label>
                  <select
                    required
                    value={loiTargetLeadId}
                    onChange={(e) => setLoiTargetLeadId(e.target.value)}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded text-xs outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Assigned Lead --</option>
                    {myLeads.map(l => (
                      <option key={l._id} value={l._id}>
                        {l.leadCode} - {l.customerName} ({l.productCategory || 'General'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Attach LOI Document (PDF / Image) *</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => setLoiFile(e.target.files[0])}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2 rounded text-[10px] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Document Remarks / Notes</label>
                  <textarea
                    rows={3}
                    value={loiNotes}
                    onChange={(e) => setLoiNotes(e.target.value)}
                    placeholder="Enter LOI terms or notes..."
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded outline-none resize-none font-sans"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={uploadingLOI}
                    className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold uppercase py-2.5 rounded text-[10px] tracking-wider transition cursor-pointer"
                  >
                    {uploadingLOI ? 'Uploading LOI...' : 'Upload LOI Document'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLOIModal(false)}
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

      {/* REQUEST QUOTATION MODAL */}
      <AnimatePresence>
        {showQuotationModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-lg p-6 w-full max-w-lg shadow-2xl relative text-[var(--crm-ink-soft)] font-mono text-left space-y-4"
            >
              <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2">
                  💬 Request Quotation Approval from Manager
                </h3>
                <button onClick={() => setShowQuotationModal(false)} className="text-xs text-[var(--crm-ink-faint)] hover:text-white font-bold cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleQuotationSubmit} className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Select Lead *</label>
                  <select
                    required
                    value={quoteTargetLeadId}
                    onChange={(e) => {
                      const lId = e.target.value;
                      setQuoteTargetLeadId(lId);
                      const matched = myLeads.find(l => String(l._id) === String(lId));
                      if (matched && matched.leadValue) {
                        setEmployeeRequestedPrice(matched.leadValue);
                      }
                    }}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded text-xs outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Assigned Lead --</option>
                    {myLeads.map(l => (
                      <option key={l._id} value={l._id}>
                        {l.leadCode} - {l.customerName} ({l.productCategory || 'General'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Requested Deal Price / Valuation (INR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 500000"
                    value={employeeRequestedPrice}
                    onChange={(e) => setEmployeeRequestedPrice(e.target.value)}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded text-xs outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Payment & Trade Terms</label>
                  <input
                    type="text"
                    placeholder="e.g. 50% Advance, 50% on Loading"
                    value={quotationTerms}
                    onChange={(e) => setQuotationTerms(e.target.value)}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded text-xs outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Margin / Quotation Notes</label>
                  <textarea
                    rows={3}
                    value={marginNote}
                    onChange={(e) => setMarginNote(e.target.value)}
                    placeholder="Explain requested pricing or margin details..."
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded outline-none resize-none font-sans"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={submittingQuotation}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold uppercase py-2.5 rounded text-[10px] tracking-wider transition cursor-pointer"
                  >
                    {submittingQuotation ? 'Submitting Request...' : 'Submit Quotation Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuotationModal(false)}
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

      {/* UPDATE LEAD STAGE MODAL */}
      <AnimatePresence>
        {showStageModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-lg p-6 w-full max-w-lg shadow-2xl relative text-[var(--crm-ink-soft)] font-mono text-left space-y-4"
            >
              <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2">
                  ⚡ Update Lead Pipeline Stage
                </h3>
                <button onClick={() => setShowStageModal(false)} className="text-xs text-[var(--crm-ink-faint)] hover:text-white font-bold cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleStageUpdateSubmit} className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Select Lead *</label>
                  <select
                    required
                    value={stageTargetLeadId}
                    onChange={(e) => setStageTargetLeadId(e.target.value)}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded text-xs outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Assigned Lead --</option>
                    {myLeads.map(l => (
                      <option key={l._id} value={l._id}>
                        {l.leadCode} - {l.customerName} (Current: {(l.stage || 'NEW').replace(/_/g, ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">New Stage *</label>
                  <select
                    required
                    value={newStageValue}
                    onChange={(e) => setNewStageValue(e.target.value)}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded text-xs outline-none cursor-pointer uppercase font-bold"
                  >
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="FOLLOW_UP">FOLLOW UP</option>
                    <option value="REQUIREMENT_CAPTURED">REQUIREMENT CAPTURED</option>
                    <option value="QUOTATION_REQUIRED">QUOTATION REQUIRED</option>
                    <option value="NEGOTIATION">NEGOTIATION</option>
                    <option value="LOI_PO_PENDING">LOI / PO PENDING</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 font-mono">Update Remark / Notes</label>
                  <textarea
                    rows={3}
                    value={stageRemark}
                    onChange={(e) => setStageRemark(e.target.value)}
                    placeholder="Enter stage update details..."
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded outline-none resize-none font-sans"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={submittingStage}
                    className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold uppercase py-2.5 rounded text-[10px] tracking-wider transition cursor-pointer"
                  >
                    {submittingStage ? 'Updating Stage...' : 'Update Stage'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStageModal(false)}
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
