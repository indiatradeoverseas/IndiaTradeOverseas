import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { attendanceApi } from '../../api/attendance';
import { sharedFilesApi } from '../../api/sharedFiles';
import { careersApi } from '../../api/careers';
import { ticketsApi } from '../../api/tickets';
import { managerChatApi } from '../../api/managerChat';
import { employeesApi } from '../../api/employees';
import ManagerChatSupport from './ManagerChatSupport';
import { getFileUrl, API_URL } from '../../config/env';
import toast from 'react-hot-toast';
import {
  FiClock, FiCheckCircle, FiXCircle, FiUploadCloud, FiFileText,
  FiBriefcase, FiMessageSquare, FiZap, FiServer, FiShield,
  FiPlus, FiTrash2, FiDownload, FiSearch, FiUser, FiRefreshCw,
  FiSend, FiCheck, FiCpu, FiHardDrive, FiActivity, FiLock,
  FiCoffee, FiList, FiAlertTriangle
} from 'react-icons/fi';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.05 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 20 } }
};

export default function ItDashboard() {
  const { user } = useAuth();
  
  // Active Tab: 'OVERVIEW' | 'ATTENDANCE' | 'FILES' | 'JOBS' | 'CHAT' | 'TICKETS'
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. ATTENDANCE STATE
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attLoading, setAttLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  // 2. FILE SHARING STATE
  const [sharedFiles, setSharedFiles] = useState([]);
  const [fileSearch, setFileSearch] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    recipientId: '',
    category: 'GENERAL',
    file: null
  });

  // 3. JOB POSTINGS STATE
  const [jobsList, setJobsList] = useState([]);
  const [jobSearch, setJobSearch] = useState('');
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: '',
    department: 'IT & Infrastructure',
    location: 'Remote / On-Site',
    type: 'Full-time',
    experienceLevel: 'Mid-Level',
    salaryRange: '₹6,00,000 - ₹12,00,000 P.A.',
    description: '',
    requirements: '',
    status: 'ACTIVE'
  });

  // 4. MANAGER CHAT STATE
  const [chatParticipants, setChatParticipants] = useState([]);
  const [selectedChatUser, setSelectedChatUser] = useState('GENERAL');
  const [chatMessages, setChatMessages] = useState([]);
  const [newMsgText, setNewMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const chatBottomRef = useRef(null);

  // 5. IT SUPPORT TICKETS STATE
  const [tickets, setTickets] = useState([]);
  const [ticketSearch, setTicketSearch] = useState('');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'Hardware/Network',
    priority: 'MEDIUM',
    description: ''
  });

  // Fetch all live dynamic dashboard data
  const fetchAllDashboardData = async () => {
    try {
      setRefreshing(true);
      const [attRes, attHistRes, filesRes, jobsRes, chatPartRes, ticketsRes, recipRes] = await Promise.all([
        attendanceApi.getMyToday().catch(() => null),
        attendanceApi.getMyHistory({ limit: 10 }).catch(() => null),
        sharedFilesApi.getSharedFiles().catch(() => null),
        careersApi.getAllJobs().catch(() => null),
        managerChatApi.getParticipants().catch(() => null),
        ticketsApi.getTickets().catch(() => null),
        sharedFilesApi.getRecipients().catch(() => null)
      ]);

      // Attendance
      if (attRes && attRes.success) {
        setTodayAttendance(attRes.data?.record || attRes.data?.attendance || attRes.data);
      }
      const rawAttHist = attHistRes?.data?.records || attHistRes?.data?.history || attHistRes?.records || attHistRes?.history || attHistRes?.data || attHistRes;
      setAttendanceHistory(Array.isArray(rawAttHist) ? rawAttHist : []);

      // Shared Files
      const rawFiles = filesRes?.data?.files || filesRes?.files || filesRes?.data || filesRes;
      setSharedFiles(Array.isArray(rawFiles) ? rawFiles : []);

      // Recipients for file sharing
      const rawRecip = recipRes?.data?.recipients || recipRes?.recipients || recipRes?.data || recipRes;
      setRecipients(Array.isArray(rawRecip) ? rawRecip : []);

      // Job Postings
      const rawJobs = jobsRes?.data?.jobs || jobsRes?.jobs || jobsRes?.data || jobsRes;
      setJobsList(Array.isArray(rawJobs) ? rawJobs : []);

      // Chat Participants
      const rawChatPart = chatPartRes?.data?.participants || chatPartRes?.participants || chatPartRes?.data || chatPartRes;
      setChatParticipants(Array.isArray(rawChatPart) ? rawChatPart : []);

      // IT Tickets
      const rawTickets = ticketsRes?.data?.tickets || ticketsRes?.tickets || ticketsRes?.data || ticketsRes;
      setTickets(Array.isArray(rawTickets) ? rawTickets : []);


    } catch (err) {
      console.error('Error loading IT Dashboard telemetry:', err);
      toast.error('Failed to load some IT telemetry modules');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllDashboardData();
  }, []);

  // Timer calculation for check-in work duration
  useEffect(() => {
    let interval = null;
    if (todayAttendance && todayAttendance.checkIn && !todayAttendance.checkOut) {
      interval = setInterval(() => {
        const checkInTime = new Date(todayAttendance.checkIn).getTime();
        const now = new Date().getTime();
        const diffMs = Math.max(0, now - checkInTime);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
        setElapsedTime(
          `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        );
      }, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [todayAttendance]);

  // Load chat messages when selected chat user changes
  useEffect(() => {
    if (activeTab === 'CHAT' || showChatDrawer) {
      fetchChatMessages(selectedChatUser);
    }
  }, [selectedChatUser, activeTab, showChatDrawer]);

  const fetchChatMessages = async (recipientId) => {
    try {
      const res = await managerChatApi.getMessages({ recipientId });
      const rawMsgs = res?.data?.messages || res?.messages || res?.data || res;
      setChatMessages(Array.isArray(rawMsgs) ? rawMsgs : []);
      setTimeout(() => {
        if (chatBottomRef.current) {
          chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err) {
      console.error('Error fetching manager chat messages:', err);
      setChatMessages([]);
    }
  };


  // --- ATTENDANCE ACTIONS ---
  const handleCheckIn = async () => {
    try {
      setAttLoading(true);
      const res = await attendanceApi.checkIn();
      if (res && (res.success || res._id)) {
        toast.success('🟢 Checked In Successfully! Work session started.');
        await fetchAllDashboardData();
      } else {
        toast.error(res?.message || 'Failed to check in');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setAttLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setAttLoading(true);
      const res = await attendanceApi.checkOut();
      if (res && (res.success || res._id)) {
        toast.success('🔴 Checked Out Successfully! Work session logged.');
        await fetchAllDashboardData();
      } else {
        toast.error(res?.message || 'Failed to check out');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setAttLoading(false);
    }
  };

  const handleLunchToggle = async (isStart) => {
    try {
      setAttLoading(true);
      const res = isStart ? await attendanceApi.startLunch() : await attendanceApi.endLunch();
      if (res && res.success) {
        toast.success(isStart ? '🍱 Lunch Break Started' : '💼 Back to Work Session');
        await fetchAllDashboardData();
      } else {
        toast.error(res?.message || 'Lunch update failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update lunch state');
    } finally {
      setAttLoading(false);
    }
  };

  // --- FILE SHARING ACTIONS ---
  const handleUploadFile = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) return toast.error('Please select a file to share');
    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      if (uploadForm.title) formData.append('title', uploadForm.title);
      if (uploadForm.description) formData.append('description', uploadForm.description);
      if (uploadForm.recipientId) formData.append('recipientId', uploadForm.recipientId);
      if (uploadForm.category) formData.append('category', uploadForm.category);

      const res = await sharedFilesApi.shareFile(formData);
      if (res && (res.success || res._id)) {
        toast.success('📁 File uploaded & shared successfully!');
        setShowUploadModal(false);
        setUploadForm({ title: '', description: '', recipientId: '', category: 'GENERAL', file: null });
        await fetchAllDashboardData();
      } else {
        toast.error(res?.message || 'Failed to upload file');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'File upload error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFile = async (id) => {
    if (!window.confirm('Are you sure you want to delete this shared file?')) return;
    try {
      const res = await sharedFilesApi.deleteSharedFile(id);
      if (res && res.success) {
        toast.success('File removed successfully');
        setSharedFiles(prev => prev.filter(f => f._id !== id));
      } else {
        toast.error(res?.message || 'Failed to delete file');
      }
    } catch (err) {
      toast.error('Error deleting file');
    }
  };

  // --- JOB POSTING ACTIONS ---
  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!jobForm.title.trim() || !jobForm.description.trim()) {
      return toast.error('Please enter position title and description');
    }
    try {
      setCreatingJob(true);
      const res = await careersApi.createJob(jobForm);
      if (res && (res.success || res._id)) {
        toast.success('💼 New IT Position Posted Successfully!');
        setShowCreateJobModal(false);
        setJobForm({
          title: '',
          department: 'IT & Infrastructure',
          location: 'Remote / On-Site',
          type: 'Full-time',
          experienceLevel: 'Mid-Level',
          salaryRange: '₹6,00,000 - ₹12,00,000 P.A.',
          description: '',
          requirements: '',
          status: 'ACTIVE'
        });
        await fetchAllDashboardData();
      } else {
        toast.error(res?.message || 'Failed to post job');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating job posting');
    } finally {
      setCreatingJob(false);
    }
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job posting?')) return;
    try {
      const res = await careersApi.deleteJob(id);
      if (res && res.success) {
        toast.success('Job posting deleted');
        setJobsList(prev => prev.filter(j => j._id !== id));
      } else {
        toast.error(res?.message || 'Failed to delete job');
      }
    } catch (err) {
      toast.error('Error deleting job posting');
    }
  };

  // --- MANAGER CHAT ACTIONS ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMsgText.trim()) return;
    try {
      setSendingMsg(true);
      const payload = {
        recipientId: selectedChatUser || 'GENERAL',
        message: newMsgText.trim()
      };
      const res = await managerChatApi.sendMessage(payload);
      if (res && (res.success || res._id)) {
        setNewMsgText('');
        await fetchChatMessages(selectedChatUser);
      } else {
        toast.error(res?.message || 'Failed to send message');
      }
    } catch (err) {
      toast.error('Error sending message');
    } finally {
      setSendingMsg(false);
    }
  };

  // --- IT SUPPORT TICKET ACTIONS ---
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      return toast.error('Please enter ticket subject and description');
    }
    try {
      setCreatingTicket(true);
      const res = await ticketsApi.createTicket(ticketForm);
      if (res && (res.success || res._id)) {
        toast.success('🎟️ IT Ticket Logged Successfully!');
        setShowTicketModal(false);
        setTicketForm({ subject: '', category: 'Hardware/Network', priority: 'MEDIUM', description: '' });
        await fetchAllDashboardData();
      } else {
        toast.error(res?.message || 'Failed to create ticket');
      }
    } catch (err) {
      toast.error('Error logging IT ticket');
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleUpdateTicketStatus = async (id, status) => {
    try {
      const res = await ticketsApi.updateStatus(id, status);
      if (res && res.success) {
        toast.success(`Ticket marked as ${status}`);
        setTickets(prev => prev.map(t => t._id === id ? { ...t, status } : t));
      }
    } catch (err) {
      toast.error('Failed to update ticket status');
    }
  };

  // Filtered Lists
  const filteredFiles = useMemo(() => {
    const list = Array.isArray(sharedFiles) ? sharedFiles : [];
    if (!fileSearch.trim()) return list;
    const term = fileSearch.toLowerCase();
    return list.filter(f => 
      (f.title || f.originalName || f.fileName || '').toLowerCase().includes(term) ||
      (f.category || '').toLowerCase().includes(term) ||
      (f.uploadedBy?.fullName || f.uploadedBy?.name || '').toLowerCase().includes(term)
    );
  }, [sharedFiles, fileSearch]);

  const filteredJobs = useMemo(() => {
    const list = Array.isArray(jobsList) ? jobsList : [];
    if (!jobSearch.trim()) return list;
    const term = jobSearch.toLowerCase();
    return list.filter(j =>
      (j.title || '').toLowerCase().includes(term) ||
      (j.department || '').toLowerCase().includes(term) ||
      (j.location || '').toLowerCase().includes(term)
    );
  }, [jobsList, jobSearch]);

  const filteredTickets = useMemo(() => {
    const list = Array.isArray(tickets) ? tickets : [];
    if (!ticketSearch.trim()) return list;
    const term = ticketSearch.toLowerCase();
    return list.filter(t =>
      (t.subject || '').toLowerCase().includes(term) ||
      (t.category || '').toLowerCase().includes(term) ||
      (t.status || '').toLowerCase().includes(term)
    );
  }, [tickets, ticketSearch]);


  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--crm-bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-widest text-[var(--crm-ink-faint)] uppercase animate-pulse">
            LOADING IT TELEMETRY & DASHBOARD...
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen w-full bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] font-sans pb-16"
    >
      {/* Upper Context Header Panel */}
      <motion.div
        variants={blockVariants}
        className="w-full border-b border-[var(--crm-line)] py-5 px-4 md:px-8 bg-[var(--crm-bg-raised)] backdrop-blur-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400 font-bold font-mono">
                DEPT // IT & TECHNICAL OPERATIONS HUB
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                SYSTEM ONLINE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-[var(--crm-heading)] uppercase tracking-tight flex items-center gap-2">
              <FiCpu className="text-cyan-500" />
              IT Dashboard & Infrastructure Hub
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Attendance Quick Badge */}
            <div className="flex items-center gap-2 bg-[var(--crm-bg-sunken)] px-3 py-1.5 rounded border border-[var(--crm-line)] text-xs">
              <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold">Duty Status:</span>
              {todayAttendance?.checkIn && !todayAttendance?.checkOut ? (
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <FiCheckCircle size={13} /> Checked-In ({elapsedTime})
                </span>
              ) : todayAttendance?.checkOut ? (
                <span className="text-amber-500 font-bold flex items-center gap-1">
                  <FiClock size={13} /> Shift Ended
                </span>
              ) : (
                <span className="text-rose-500 font-bold flex items-center gap-1">
                  <FiXCircle size={13} /> Not Checked In
                </span>
              )}
            </div>

            {/* Refresh Telemetry */}
            <button
              onClick={fetchAllDashboardData}
              disabled={refreshing}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={13} />
              <span>{refreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Container Content */}
      <div className="w-full px-4 sm:px-6 md:px-8 py-6 space-y-6">

        {/* Executive Telemetry Metric Cards */}
        <motion.div variants={blockVariants} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          
          {/* Card 1: Attendance */}
          <div className="p-3.5 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold">ATTENDANCE</span>
              <FiClock className="text-cyan-500" size={14} />
            </div>
            <span className="text-sm font-extrabold text-[var(--crm-heading)] block truncate">
              {todayAttendance?.checkIn && !todayAttendance?.checkOut ? 'ON DUTY' : todayAttendance?.checkOut ? 'OFF DUTY' : 'PENDING'}
            </span>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold block mt-0.5">
              {todayAttendance?.checkIn ? `In at ${new Date(todayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Biometric Active'}
            </span>
          </div>

          {/* Card 2: Shared Files */}
          <div className="p-3.5 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm hover:border-emerald-500/40 transition">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold">SHARED FILES</span>
              <FiFileText className="text-emerald-500" size={14} />
            </div>
            <span className="text-sm font-extrabold text-emerald-500 block truncate">
              {(Array.isArray(sharedFiles) ? sharedFiles : []).length} Documents
            </span>
            <span className="text-[10px] text-[var(--crm-ink-faint)] font-semibold block mt-0.5">
              IT Repository
            </span>
          </div>

          {/* Card 3: Job Openings */}
          <div className="p-3.5 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm hover:border-indigo-500/40 transition">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold">IT JOBS</span>
              <FiBriefcase className="text-indigo-500" size={14} />
            </div>
            <span className="text-sm font-extrabold text-indigo-500 block truncate">
              {(Array.isArray(jobsList) ? jobsList : []).length} Positions
            </span>
            <span className="text-[10px] text-indigo-400/80 font-semibold block mt-0.5">
              Careers & Hiring
            </span>
          </div>

          {/* Card 4: Manager Chat */}
          <div className="p-3.5 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm hover:border-purple-500/40 transition">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold">MANAGER CHAT</span>
              <FiMessageSquare className="text-purple-500" size={14} />
            </div>
            <span className="text-sm font-extrabold text-purple-500 block truncate">
              {(Array.isArray(chatParticipants) ? chatParticipants : []).length} Channels
            </span>
            <span className="text-[10px] text-purple-400/80 font-semibold block mt-0.5">
              Executive Direct
            </span>
          </div>

          {/* Card 5: IT Tickets */}
          <div className="p-3.5 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm hover:border-amber-500/40 transition">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold">IT TICKETS</span>
              <FiAlertTriangle className="text-amber-500" size={14} />
            </div>
            <span className="text-sm font-extrabold text-amber-500 block truncate">
              {(Array.isArray(tickets) ? tickets : []).filter(t => t && t.status !== 'RESOLVED').length} Open
            </span>
            <span className="text-[10px] text-amber-500/80 font-semibold block mt-0.5">
              {(Array.isArray(tickets) ? tickets : []).length} Total Logs
            </span>
          </div>


          {/* Card 6: System Telemetry */}
          <div className="p-3.5 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm hover:border-teal-500/40 transition">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold">SERVER UPTIME</span>
              <FiServer className="text-teal-500" size={14} />
            </div>
            <span className="text-sm font-extrabold text-teal-500 block truncate">
              99.99%
            </span>
            <span className="text-[10px] text-teal-400/80 font-semibold block mt-0.5">
              Latency: &lt;12ms
            </span>
          </div>

        </motion.div>

        {/* Dashboard Navigation Tabs */}
        <motion.div variants={blockVariants} className="border-b border-[var(--crm-line)] pb-1">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3.5 py-2 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
                activeTab === 'OVERVIEW'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                  : 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border-[var(--crm-line)] hover:bg-[var(--crm-line)]'
              }`}
            >
              <FiCpu size={14} />
              <span>Overview & Telemetry</span>
            </button>

            <button
              onClick={() => setActiveTab('ATTENDANCE')}
              className={`px-3.5 py-2 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
                activeTab === 'ATTENDANCE'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                  : 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border-[var(--crm-line)] hover:bg-[var(--crm-line)]'
              }`}
            >
              <FiClock size={14} />
              <span>Check-In & Attendance</span>
            </button>

            <button
              onClick={() => setActiveTab('FILES')}
              className={`px-3.5 py-2 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
                activeTab === 'FILES'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                  : 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border-[var(--crm-line)] hover:bg-[var(--crm-line)]'
              }`}
            >
              <FiFileText size={14} />
              <span>File Sharing Hub ({sharedFiles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('JOBS')}
              className={`px-3.5 py-2 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
                activeTab === 'JOBS'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                  : 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border-[var(--crm-line)] hover:bg-[var(--crm-line)]'
              }`}
            >
              <FiBriefcase size={14} />
              <span>Job Postings ({jobsList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('CHAT')}
              className={`px-3.5 py-2 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
                activeTab === 'CHAT'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                  : 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border-[var(--crm-line)] hover:bg-[var(--crm-line)]'
              }`}
            >
              <FiMessageSquare size={14} />
              <span>Manager Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('TICKETS')}
              className={`px-3.5 py-2 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
                activeTab === 'TICKETS'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                  : 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border-[var(--crm-line)] hover:bg-[var(--crm-line)]'
              }`}
            >
              <FiAlertTriangle size={14} />
              <span>IT Support Tickets ({tickets.length})</span>
            </button>

          </div>
        </motion.div>

        {/* TAB 1: OVERVIEW & SYSTEM TELEMETRY */}
        {activeTab === 'OVERVIEW' && (
          <motion.div variants={blockVariants} className="space-y-6">
            
            {/* Quick Action Banner */}
            <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/30 p-5 rounded-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white uppercase flex items-center gap-2">
                  <FiZap className="text-cyan-400 animate-pulse" />
                  Quick IT Operations Console
                </h3>
                <p className="text-xs text-slate-300">
                  Manage biometric check-ins, share IT files, publish tech careers, and communicate directly with management.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!todayAttendance?.checkIn || todayAttendance?.checkOut ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={attLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    <FiCheckCircle size={15} />
                    <span>Check In Duty</span>
                  </button>
                ) : (
                  <button
                    onClick={handleCheckOut}
                    disabled={attLoading}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded transition flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    <FiXCircle size={15} />
                    <span>Check Out Duty</span>
                  </button>
                )}

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded transition flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <FiUploadCloud size={15} />
                  <span>Share File</span>
                </button>

                <button
                  onClick={() => setShowCreateJobModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded transition flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <FiPlus size={15} />
                  <span>Post Job</span>
                </button>
              </div>
            </div>

            {/* Split Grid: Attendance Widget & Infrastructure Health */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Widget: Live Duty & Attendance Tracker */}
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2">
                    <FiClock className="text-cyan-500" />
                    Live Biometric Duty Attendance
                  </h4>
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    REALTIME LOG
                  </span>
                </div>

                <div className="bg-[var(--crm-bg-sunken)] p-4 rounded border border-[var(--crm-line)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] block mb-1">Shift Duration</span>
                    <span className="text-2xl font-mono font-extrabold text-[var(--crm-heading)]">
                      {elapsedTime}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] block mb-1">Check-in Time</span>
                    <span className="text-xs font-bold text-emerald-500 font-mono">
                      {todayAttendance?.checkIn ? new Date(todayAttendance.checkIn).toLocaleTimeString() : 'Not Checked In'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!todayAttendance?.checkIn || todayAttendance?.checkOut ? (
                    <button
                      onClick={handleCheckIn}
                      disabled={attLoading}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <FiCheckCircle size={15} />
                      <span>CHECK IN TODAY</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleCheckOut}
                        disabled={attLoading}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <FiXCircle size={15} />
                        <span>CHECK OUT SHIFT</span>
                      </button>

                      {todayAttendance?.lunchStart && !todayAttendance?.lunchEnd ? (
                        <button
                          onClick={() => handleLunchToggle(false)}
                          disabled={attLoading}
                          className="py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <FiCoffee size={14} />
                          <span>End Lunch</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLunchToggle(true)}
                          disabled={attLoading}
                          className="py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <FiCoffee size={14} />
                          <span>Lunch Break</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Right Widget: Infrastructure Server Health */}
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2">
                    <FiServer className="text-emerald-500" />
                    Infrastructure & Server Telemetry
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    ALL SYSTEMS GO
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded">
                    <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold block mb-1">API Node Cluster</span>
                    <span className="font-bold text-emerald-400 font-mono flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 200 OK (8ms)
                    </span>
                  </div>

                  <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded">
                    <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold block mb-1">MongoDB Replica</span>
                    <span className="font-bold text-emerald-400 font-mono flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Connected
                    </span>
                  </div>

                  <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded">
                    <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold block mb-1">WebSocket Service</span>
                    <span className="font-bold text-cyan-400 font-mono flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Live Realtime
                    </span>
                  </div>

                  <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded">
                    <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold block mb-1">Security Audit Engine</span>
                    <span className="font-bold text-indigo-400 font-mono flex items-center gap-1">
                      <FiShield size={12} /> Active Monitoring
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Split Grid: Recent Files & Job Postings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Recent Files Table */}
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2">
                    <FiFileText className="text-emerald-500" />
                    Recent Shared IT Files
                  </h4>
                  <button onClick={() => setActiveTab('FILES')} className="text-[11px] font-bold text-cyan-500 hover:underline">
                    View All ({sharedFiles.length}) &rarr;
                  </button>
                </div>

                {sharedFiles.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[var(--crm-ink-faint)] font-mono">
                    No shared files uploaded yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sharedFiles.slice(0, 4).map(file => (
                      <div key={file._id} className="p-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FiFileText className="text-cyan-500 shrink-0" size={15} />
                          <div className="truncate">
                            <span className="font-bold text-[var(--crm-heading)] block truncate">
                              {file.title || file.originalName || file.fileName || 'Shared Document'}
                            </span>
                            <span className="text-[10px] text-[var(--crm-ink-faint)] font-mono block">
                              Shared by: {file.uploadedBy?.fullName || file.uploadedBy?.name || 'IT Team'}
                            </span>
                          </div>
                        </div>

                        <a
                          href={sharedFilesApi.getDownloadUrl(file._id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600 hover:text-white border border-cyan-500/30 rounded text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                        >
                          <FiDownload size={12} /> Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active IT Job Postings */}
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2">
                    <FiBriefcase className="text-indigo-500" />
                    Active IT & Tech Job Postings
                  </h4>
                  <button onClick={() => setActiveTab('JOBS')} className="text-[11px] font-bold text-indigo-500 hover:underline">
                    Manage Jobs ({jobsList.length}) &rarr;
                  </button>
                </div>

                {jobsList.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[var(--crm-ink-faint)] font-mono">
                    No active IT job postings found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {jobsList.slice(0, 4).map(job => (
                      <div key={job._id} className="p-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[var(--crm-heading)] block">
                            {job.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {job.department || 'IT'} &bull; {job.location || 'Remote'}
                          </span>
                        </div>

                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold">
                          {job.type || 'Full-time'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </motion.div>
        )}

        {/* TAB 2: ATTENDANCE MANAGEMENT */}
        {activeTab === 'ATTENDANCE' && (
          <motion.div variants={blockVariants} className="space-y-6">
            
            {/* Attendance Main Control Panel */}
            <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-6 rounded-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--crm-heading)] uppercase tracking-tight flex items-center gap-2">
                    <FiClock className="text-cyan-500" />
                    Biometric Check-In & Duty Session Management
                  </h3>
                  <p className="text-xs text-[var(--crm-ink-faint)]">
                    Record duty check-in, check-out, lunch breaks, and review historical attendance records.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] block">Current Session Duration</span>
                  <span className="text-3xl font-mono font-extrabold text-cyan-400">
                    {elapsedTime}
                  </span>
                </div>
              </div>

              {/* Status & Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="p-4 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded">
                  <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold block mb-1">Shift Status</span>
                  {todayAttendance?.checkIn && !todayAttendance?.checkOut ? (
                    <span className="text-base font-bold text-emerald-500 flex items-center gap-1.5">
                      <FiCheckCircle /> ACTIVE ON DUTY
                    </span>
                  ) : todayAttendance?.checkOut ? (
                    <span className="text-base font-bold text-amber-500 flex items-center gap-1.5">
                      <FiClock /> SHIFT COMPLETED
                    </span>
                  ) : (
                    <span className="text-base font-bold text-rose-500 flex items-center gap-1.5">
                      <FiXCircle /> NOT CHECKED IN
                    </span>
                  )}
                </div>

                <div className="p-4 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded">
                  <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold block mb-1">Check-in Time</span>
                  <span className="text-base font-bold text-[var(--crm-heading)] font-mono">
                    {todayAttendance?.checkIn ? new Date(todayAttendance.checkIn).toLocaleString() : 'Not Marked'}
                  </span>
                </div>

                <div className="p-4 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded">
                  <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold block mb-1">Check-out Time</span>
                  <span className="text-base font-bold text-[var(--crm-heading)] font-mono">
                    {todayAttendance?.checkOut ? new Date(todayAttendance.checkOut).toLocaleString() : 'Pending Shift End'}
                  </span>
                </div>

              </div>

              {/* Main Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {!todayAttendance?.checkIn || todayAttendance?.checkOut ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={attLoading}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <FiCheckCircle size={18} />
                    <span>START DUTY / CHECK IN</span>
                  </button>
                ) : (
                  <button
                    onClick={handleCheckOut}
                    disabled={attLoading}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <FiXCircle size={18} />
                    <span>END SHIFT / CHECK OUT</span>
                  </button>
                )}

                {todayAttendance?.checkIn && !todayAttendance?.checkOut && (
                  todayAttendance?.lunchStart && !todayAttendance?.lunchEnd ? (
                    <button
                      onClick={() => handleLunchToggle(false)}
                      disabled={attLoading}
                      className="px-5 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded transition flex items-center gap-2 cursor-pointer"
                    >
                      <FiCoffee size={16} />
                      <span>RESUME WORK (END LUNCH)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLunchToggle(true)}
                      disabled={attLoading}
                      className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded transition flex items-center gap-2 cursor-pointer"
                    >
                      <FiCoffee size={16} />
                      <span>TAKE LUNCH BREAK</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Attendance History Table */}
            <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2 border-b border-[var(--crm-line)] pb-3">
                <FiList className="text-cyan-500" />
                Attendance Log History
              </h4>

              {attendanceHistory.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--crm-ink-faint)] font-mono">
                  No attendance history logs recorded
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-[var(--crm-bg-sunken)] border-b border-[var(--crm-line)] text-[10px] uppercase font-mono text-[var(--crm-ink-faint)]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Check In</th>
                        <th className="py-2.5 px-3">Check Out</th>
                        <th className="py-2.5 px-3">Work Hours</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--crm-line)]">
                      {attendanceHistory.map((rec, idx) => (
                        <tr key={rec._id || idx} className="hover:bg-[var(--crm-bg-sunken)]/50 transition">
                          <td className="py-2.5 px-3 font-mono text-[var(--crm-heading)]">
                            {rec.date ? new Date(rec.date).toLocaleDateString() : rec.checkIn ? new Date(rec.checkIn).toLocaleDateString() : '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-emerald-400">
                            {rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-amber-400">
                            {rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            {rec.workHours ? `${rec.workHours} hrs` : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {rec.status || 'PRESENT'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </motion.div>
        )}

        {/* TAB 3: FILE SHARING HUB */}
        {activeTab === 'FILES' && (
          <motion.div variants={blockVariants} className="space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--crm-bg-raised)] p-4 border border-[var(--crm-line)] rounded-sm">
              <div className="relative flex-1 max-w-md">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)]" size={14} />
                <input
                  type="text"
                  placeholder="Search shared files by name, category or uploader..."
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] pl-9 pr-3 py-1.5 text-xs text-[var(--crm-heading)] rounded outline-none focus:border-cyan-500 transition"
                />
              </div>

              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded transition flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <FiUploadCloud size={15} />
                <span>Upload & Share File</span>
              </button>
            </div>

            {/* Files List */}
            <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2 border-b border-[var(--crm-line)] pb-3 mb-4">
                <FiFileText className="text-cyan-500" />
                Shared File Repository ({filteredFiles.length})
              </h4>

              {filteredFiles.length === 0 ? (
                <div className="text-center py-12 text-xs text-[var(--crm-ink-faint)] font-mono">
                  No files found matching search criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFiles.map(file => (
                    <div key={file._id} className="p-4 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded flex flex-col justify-between space-y-3 hover:border-cyan-500/50 transition">
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs text-[var(--crm-heading)] line-clamp-1">
                            {file.title || file.originalName || file.fileName || 'Shared Document'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                            {file.category || 'GENERAL'}
                          </span>
                        </div>

                        {file.description && (
                          <p className="text-[11px] text-[var(--crm-ink-faint)] line-clamp-2">
                            {file.description}
                          </p>
                        )}

                        <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-[var(--crm-line)]">
                          Shared by: <strong className="text-[var(--crm-heading)]">{file.uploadedBy?.fullName || file.uploadedBy?.name || 'IT User'}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2">
                        <a
                          href={sharedFilesApi.getDownloadUrl(file._id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-cyan-600 text-white hover:bg-cyan-500 rounded text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <FiDownload size={13} /> Download File
                        </a>

                        {(file.uploadedBy?._id === user?._id || user?.role === 'ADMIN') && (
                          <button
                            onClick={() => handleDeleteFile(file._id)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition cursor-pointer"
                            title="Delete File"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        )}

        {/* TAB 4: JOB POSTINGS */}
        {activeTab === 'JOBS' && (
          <motion.div variants={blockVariants} className="space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--crm-bg-raised)] p-4 border border-[var(--crm-line)] rounded-sm">
              <div className="relative flex-1 max-w-md">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)]" size={14} />
                <input
                  type="text"
                  placeholder="Search jobs by title, location or department..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] pl-9 pr-3 py-1.5 text-xs text-[var(--crm-heading)] rounded outline-none focus:border-cyan-500 transition"
                />
              </div>

              <button
                onClick={() => setShowCreateJobModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded transition flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <FiPlus size={15} />
                <span>Post New Tech Job</span>
              </button>
            </div>

            {/* Jobs Grid */}
            <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2 border-b border-[var(--crm-line)] pb-3 mb-4">
                <FiBriefcase className="text-indigo-500" />
                Active Career Openings ({filteredJobs.length})
              </h4>

              {filteredJobs.length === 0 ? (
                <div className="text-center py-12 text-xs text-[var(--crm-ink-faint)] font-mono">
                  No job postings available. Click "Post New Tech Job" to add one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredJobs.map(job => (
                    <div key={job._id} className="p-4 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded flex flex-col justify-between space-y-3 hover:border-indigo-500/50 transition">
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="font-bold text-sm text-[var(--crm-heading)]">
                              {job.title}
                            </h5>
                            <span className="text-[11px] text-cyan-400 font-mono block">
                              {job.department || 'IT'} &bull; {job.location || 'Remote'}
                            </span>
                          </div>

                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {job.type || 'Full-time'}
                          </span>
                        </div>

                        {job.description && (
                          <p className="text-xs text-[var(--crm-ink-faint)] line-clamp-3">
                            {job.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono pt-2 border-t border-[var(--crm-line)]">
                          <span>Salary: <strong className="text-emerald-400">{job.salaryRange || 'As per norms'}</strong></span>
                          <span>Level: <strong className="text-sky-300">{job.experienceLevel || 'All Levels'}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] text-[var(--crm-ink-faint)] font-mono">
                          Posted: {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Active'}
                        </span>

                        <button
                          onClick={() => handleDeleteJob(job._id)}
                          className="px-2.5 py-1 text-rose-400 hover:bg-rose-500/10 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <FiTrash2 size={12} /> Remove Posting
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        )}

        {/* TAB 5: MANAGER CHAT */}
        {activeTab === 'CHAT' && (
          <motion.div variants={blockVariants} className="space-y-4">
            
            <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm overflow-hidden grid grid-cols-1 md:grid-cols-4 min-h-[500px]">
              
              {/* Left Channel / Participant List */}
              <div className="border-r border-[var(--crm-line)] p-4 space-y-3 bg-[var(--crm-bg-sunken)]">
                <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-1.5">
                    <FiMessageSquare className="text-purple-500" /> Channels
                  </span>
                  <button
                    onClick={() => setShowChatDrawer(!showChatDrawer)}
                    className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded font-bold hover:bg-purple-500 cursor-pointer"
                  >
                    Full Chat
                  </button>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedChatUser('GENERAL')}
                    className={`w-full text-left p-2.5 rounded text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      selectedChatUser === 'GENERAL'
                        ? 'bg-purple-600 text-white'
                        : 'hover:bg-[var(--crm-line)] text-[var(--crm-heading)]'
                    }`}
                  >
                    <span>📢 General IT Stream</span>
                  </button>

                  {chatParticipants.map(part => (
                    <button
                      key={part._id}
                      onClick={() => setSelectedChatUser(part._id)}
                      className={`w-full text-left p-2.5 rounded text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        selectedChatUser === part._id
                          ? 'bg-purple-600 text-white'
                          : 'hover:bg-[var(--crm-line)] text-[var(--crm-heading)]'
                      }`}
                    >
                      <div className="truncate">
                        <span className="block truncate">{part.fullName || part.name || part.email}</span>
                        <span className="text-[10px] opacity-70 block font-mono">{part.role || 'Executive'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Active Chat Box */}
              <div className="col-span-3 flex flex-col justify-between p-4 bg-[var(--crm-bg-raised)]">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[var(--crm-line)]">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-[var(--crm-heading)]">
                      {selectedChatUser === 'GENERAL' ? '📢 General IT Channel' : 'Direct Executive Chat'}
                    </span>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar my-4 space-y-3 max-h-[360px] pr-2">
                  {(!Array.isArray(chatMessages) || chatMessages.length === 0) ? (
                    <div className="text-center py-12 text-xs text-[var(--crm-ink-faint)] font-mono">
                      No messages yet. Send a message to start conversation!
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => {

                      const isMe = msg.senderId === user?._id || msg.sender?._id === user?._id;
                      return (
                        <div key={msg._id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] p-3 rounded-lg text-xs font-sans ${
                            isMe ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] rounded-bl-none'
                          }`}>
                            <span className="text-[10px] font-bold block mb-1 opacity-80">
                              {msg.senderName || msg.sender?.fullName || 'User'}
                            </span>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.message || msg.content}</p>
                            <span className="text-[9px] opacity-60 block text-right mt-1 font-mono">
                              {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input Form */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-[var(--crm-line)]">
                  <input
                    type="text"
                    placeholder="Type message to management / IT team..."
                    value={newMsgText}
                    onChange={(e) => setNewMsgText(e.target.value)}
                    className="flex-1 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-2 text-xs text-[var(--crm-heading)] rounded outline-none focus:border-purple-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg || !newMsgText.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FiSend size={13} /> Send
                  </button>
                </form>

              </div>

            </div>

          </motion.div>
        )}

        {/* TAB 6: IT SUPPORT TICKETS */}
        {activeTab === 'TICKETS' && (
          <motion.div variants={blockVariants} className="space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--crm-bg-raised)] p-4 border border-[var(--crm-line)] rounded-sm">
              <div className="relative flex-1 max-w-md">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)]" size={14} />
                <input
                  type="text"
                  placeholder="Search IT tickets by subject or status..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] pl-9 pr-3 py-1.5 text-xs text-[var(--crm-heading)] rounded outline-none focus:border-cyan-500 transition"
                />
              </div>

              <button
                onClick={() => setShowTicketModal(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded transition flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <FiPlus size={15} />
                <span>Log IT Ticket</span>
              </button>
            </div>

            {/* Tickets Table */}
            <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2 border-b border-[var(--crm-line)] pb-3 mb-4">
                <FiAlertTriangle className="text-amber-500" />
                IT Infrastructure Support Tickets ({filteredTickets.length})
              </h4>

              {filteredTickets.length === 0 ? (
                <div className="text-center py-12 text-xs text-[var(--crm-ink-faint)] font-mono">
                  No IT tickets found. Click "Log IT Ticket" to create one.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-[var(--crm-bg-sunken)] border-b border-[var(--crm-line)] text-[10px] uppercase font-mono text-[var(--crm-ink-faint)]">
                      <tr>
                        <th className="py-2.5 px-3">Ticket Subject</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Priority</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--crm-line)]">
                      {filteredTickets.map(t => (
                        <tr key={t._id} className="hover:bg-[var(--crm-bg-sunken)]/50 transition">
                          <td className="py-2.5 px-3 font-bold text-[var(--crm-heading)]">
                            {t.subject}
                            {t.description && <span className="block text-[10px] font-normal text-[var(--crm-ink-faint)] line-clamp-1">{t.description}</span>}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-cyan-400">
                            {t.category || 'Hardware'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              t.priority === 'HIGH' || t.priority === 'URGENT' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {t.priority || 'MEDIUM'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            }`}>
                              {t.status || 'OPEN'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {t.status !== 'RESOLVED' ? (
                              <button
                                onClick={() => handleUpdateTicketStatus(t._id, 'RESOLVED')}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-500 transition cursor-pointer"
                              >
                                Mark Resolved
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-500 font-bold">Resolved ✓</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </motion.div>
        )}

      </div>

      {/* --- MODAL 1: FILE UPLOAD MODAL --- */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] w-full max-w-lg rounded p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-3">
                <h3 className="text-sm font-bold uppercase text-[var(--crm-heading)] flex items-center gap-2">
                  <FiUploadCloud className="text-cyan-500" /> Upload & Share File
                </h3>
                <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  &times;
                </button>
              </div>

              <form onSubmit={handleUploadFile} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Select File *</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] p-2 text-xs text-[var(--crm-heading)] rounded"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">File Title</label>
                  <input
                    type="text"
                    placeholder="e.g. IT Architecture Diagram 2026"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-1.5 text-xs text-[var(--crm-heading)] rounded"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Category</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-1.5 text-xs text-[var(--crm-heading)] rounded"
                  >
                    <option value="GENERAL">General IT</option>
                    <option value="DOCUMENT">Documentation</option>
                    <option value="SOFTWARE">Software / Code</option>
                    <option value="POLICY">Policy & Manuals</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the document..."
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] p-2 text-xs text-[var(--crm-heading)] rounded"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-line)] text-xs font-bold rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingFile}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded transition cursor-pointer disabled:opacity-50"
                  >
                    {uploadingFile ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: CREATE JOB POSTING MODAL --- */}
      <AnimatePresence>
        {showCreateJobModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] w-full max-w-lg rounded p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-3">
                <h3 className="text-sm font-bold uppercase text-[var(--crm-heading)] flex items-center gap-2">
                  <FiBriefcase className="text-indigo-500" /> Post New Tech Job Opening
                </h3>
                <button onClick={() => setShowCreateJobModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Position Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Full-Stack Engineer"
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-1.5 text-xs text-[var(--crm-heading)] rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Department</label>
                    <input
                      type="text"
                      value={jobForm.department}
                      onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                      className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-1.5 text-xs text-[var(--crm-heading)] rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Job Type</label>
                    <select
                      value={jobForm.type}
                      onChange={(e) => setJobForm({ ...jobForm, type: e.target.value })}
                      className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-1.5 text-xs text-[var(--crm-heading)] rounded"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Salary Range</label>
                    <input
                      type="text"
                      placeholder="e.g. ₹8,00,000 - ₹14,00,000 P.A."
                      value={jobForm.salaryRange}
                      onChange={(e) => setJobForm({ ...jobForm, salaryRange: e.target.value })}
                      className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-1.5 text-xs text-[var(--crm-heading)] rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Experience Level</label>
                    <input
                      type="text"
                      placeholder="e.g. 2+ Years Experience"
                      value={jobForm.experienceLevel}
                      onChange={(e) => setJobForm({ ...jobForm, experienceLevel: e.target.value })}
                      className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-1.5 text-xs text-[var(--crm-heading)] rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Job Description *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Key responsibilities and duties..."
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] p-2 text-xs text-[var(--crm-heading)] rounded"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateJobModal(false)}
                    className="px-4 py-2 bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-line)] text-xs font-bold rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingJob}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded transition cursor-pointer disabled:opacity-50"
                  >
                    {creatingJob ? 'Posting...' : 'Publish Job Opening'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 3: IT SUPPORT TICKET MODAL --- */}
      <AnimatePresence>
        {showTicketModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] w-full max-w-lg rounded p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-3">
                <h3 className="text-sm font-bold uppercase text-[var(--crm-heading)] flex items-center gap-2">
                  <FiAlertTriangle className="text-amber-500" /> Log IT Support Ticket
                </h3>
                <button onClick={() => setShowTicketModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Ticket Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Database Connection Timeouts"
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-1.5 text-xs text-[var(--crm-heading)] rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Category</label>
                    <select
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                      className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-1.5 text-xs text-[var(--crm-heading)] rounded"
                    >
                      <option value="Hardware/Network">Hardware / Network</option>
                      <option value="Software/Database">Software / Database</option>
                      <option value="Security/Access">Security / Access</option>
                      <option value="Other">Other IT Issue</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Priority</label>
                    <select
                      value={ticketForm.priority}
                      onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                      className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-1.5 text-xs text-[var(--crm-heading)] rounded"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Description *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe the technical issue..."
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                    className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] p-2 text-xs text-[var(--crm-heading)] rounded"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTicketModal(false)}
                    className="px-4 py-2 bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-line)] text-xs font-bold rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTicket}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded transition cursor-pointer disabled:opacity-50"
                  >
                    {creatingTicket ? 'Submitting...' : 'Log IT Ticket'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded Manager Chat Drawer if toggled */}
      {showChatDrawer && (
        <ManagerChatSupport onClose={() => setShowChatDrawer(false)} />
      )}

    </motion.div>
  );
}
