import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { leadsApi } from '../../api/leads';
import { taskApi } from '../../api/task';
import { sharedFilesApi } from '../../api/sharedFiles';
import { useAuth } from '../../hooks/useAuth';
import {
  FiCheckSquare,
  FiSearch,
  FiEye,
  FiEdit,
  FiCalendar,
  FiAlertCircle,
  FiGrid,
  FiMapPin,
  FiLayers,
  FiClock,
  FiTrendingUp,
  FiX,
  FiDownload,
  FiFileText,
  FiUpload,
  FiUser
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// Staggered entrance variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 18 } }
};

export default function Tasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState('PIPELINE'); // 'PIPELINE' | 'ACTION_TASKS' | 'SHARED_FILES'
  
  // Pipeline Leads State
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'WON_DELIVERED' | 'ORDER_CONFIRM' | 'NEW_LEAD' | 'CALENDAR'
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showPerformModal, setShowPerformModal] = useState(false);
  const [actionType, setActionType] = useState('STAGE_CHANGE');
  const [nextStage, setNextStage] = useState('');
  const [activityNote, setActivityNote] = useState('');
  const [nextFollowup, setNextFollowup] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Stage Categorization Helpers to prevent mixing up leads
  const isWonOrDelivered = (stage) => {
    if (!stage) return false;
    const s = String(stage).toUpperCase().replace(/\s+/g, '_');
    return ['CLOSED_WON', 'DEAL_WON', 'DELIVERED', 'COMPLETED'].includes(s);
  };

  const isOrderConfirmedStage = (stage) => {
    if (!stage) return false;
    const s = String(stage).toUpperCase().replace(/\s+/g, '_');
    return [
      'ORDER_CONFIRMED',
      'PO_RECEIVED',
      'LOI_PO_PENDING',
      'DISPATCH_PENDING',
      'DISPATCH_PLANNED',
      'PAYMENT_PENDING',
      'PAYMENT_DISCUSSION',
      'DOCUMENT_PENDING',
      'QUOTATION_APPROVED'
    ].includes(s);
  };

  const isNewOrAssignedLead = (stage) => {
    if (!stage) return false;
    const s = String(stage).toUpperCase().replace(/\s+/g, '_');
    return !isWonOrDelivered(s) && !isOrderConfirmedStage(s) && !['CLOSED_LOST', 'DEAL_LOST'].includes(s);
  };

  const isLost = (stage) => {
    if (!stage) return false;
    const s = String(stage).toUpperCase().replace(/\s+/g, '_');
    return ['CLOSED_LOST', 'DEAL_LOST'].includes(s);
  };

  const getAssignedName = (lead) => {
    if (!lead || !lead.assignedTo) return 'Unassigned';
    const assigned = lead.assignedTo;
    if (typeof assigned === 'object' && assigned !== null) {
      return assigned.fullName || assigned.name || assigned.email || '';
    }
    if (typeof assigned === 'string' && assigned.trim() !== '' && assigned.toLowerCase() !== 'unassigned') {
      return assigned;
    }
    return 'Unassigned';
  };

  // General Action Tasks State
  const [actionTasks, setActionTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskUpdateModal, setShowTaskUpdateModal] = useState(false);
  const [taskStatus, setTaskStatus] = useState('PENDING');
  const [taskRemarks, setTaskRemarks] = useState('');
  const [taskFile, setTaskFile] = useState(null);
  const [updatingTask, setUpdatingTask] = useState(false);

  // Shared Files State
  const [sharedFiles, setSharedFiles] = useState([]);

  const allowedTransitions = {
    NEW_LEAD: ['ASSIGNED', 'CLOSED_LOST'],
    ASSIGNED: ['CONTACTED', 'CLOSED_LOST'],
    CONTACTED: ['QUOTATION_REQUIRED', 'CLOSED_LOST'],
    QUOTATION_REQUIRED: ['QUOTATION_REQUESTED', 'CLOSED_LOST'],
    QUOTATION_REQUESTED: ['QUOTATION_SHARED', 'CLOSED_LOST'],
    QUOTATION_SHARED: ['DISPATCH_PLANNED', 'CLOSED_WON', 'CLOSED_LOST'],
    DISPATCH_PLANNED: ['PAYMENT_PENDING', 'CLOSED_LOST'],
    PAYMENT_PENDING: ['DOCUMENT_PENDING', 'CLOSED_WON', 'CLOSED_LOST'],
    DOCUMENT_PENDING: ['CLOSED_WON', 'CLOSED_LOST'],
    CLOSED_WON: [],
    CLOSED_LOST: []
  };

  const getStageDisplay = (stage) => stage ? stage.replace(/_/g, ' ') : '';

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      // 1. Fetch Pipeline Leads
      const leadsRes = await leadsApi.getLeads();
      if (leadsRes.success) {
        setLeads(leadsRes.data.leads || []);
      }

      // 2. Fetch General Tasks (Assigned to Me)
      const tasksRes = await taskApi.getTasks({ employeeId: user._id });
      if (tasksRes.success) {
        setActionTasks(tasksRes.data.tasks || []);
      }

      // 3. Fetch Shared Files (Received by Me)
      const filesRes = await sharedFilesApi.getSharedFiles({ direction: 'received' });
      if (filesRes.success) {
        setSharedFiles(filesRes.files || []);
      }
    } catch (error) {
      console.error('Error fetching tasks data:', error);
      toast.error('Failed to load your tasks');
    } finally {
      setLoading(false);
    }
  };

  // Download Shared File helper
  const handleDownloadFile = async (file) => {
    try {
      const res = await sharedFilesApi.downloadFile(file._id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.originalName || file.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('File download started');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download file');
    }
  };

  // Perform Task (Leads) handlers
  const handleOpenPerform = (lead) => {
    setSelectedLead(lead);
    setActivityNote('');
    setNextFollowup('');

    const options = allowedTransitions[lead.stage] || [];
    if (options.length > 0) {
      setActionType('STAGE_CHANGE');
      setNextStage(options[0]);
    } else {
      setActionType('ACTIVITY_ONLY');
      setNextStage('');
    }

    setShowPerformModal(true);
  };

  const handleSubmitPerform = async (e) => {
    e.preventDefault();
    if (!activityNote.trim()) {
      return toast.error('Please describe the work details in the remarks field.');
    }

    setSubmitting(true);
    try {
      let response;
      if (actionType === 'STAGE_CHANGE' && nextStage) {
        response = await leadsApi.updateStage(selectedLead._id, {
          newStage: nextStage,
          remark: activityNote,
          nextFollowupAt: nextFollowup || null
        });
      } else {
        response = await leadsApi.addActivity(selectedLead._id, {
          actionType: 'FOLLOW_UP',
          note: activityNote,
          nextFollowupAt: nextFollowup || null
        });
      }

      if (response.success) {
        toast.success(
          actionType === 'STAGE_CHANGE'
            ? `Task stage successfully updated to ${getStageDisplay(nextStage)}! 🎉`
            : 'Activity progress log added successfully! 📋'
        );
        setShowPerformModal(false);
        fetchTasks();
      }
    } catch (error) {
      console.error('Error reporting task progress:', error);
      toast.error(error.response?.data?.message || 'Failed to update task progress.');
    } finally {
      setSubmitting(false);
    }
  };

  // Perform Action Task handlers
  const handleOpenTaskUpdate = (task) => {
    setSelectedTask(task);
    setTaskStatus(task.status);
    setTaskRemarks(task.remarks || '');
    setTaskFile(null);
    setShowTaskUpdateModal(true);
  };

  const handleUpdateTaskStatusSubmit = async (e) => {
    e.preventDefault();
    setUpdatingTask(true);
    try {
      const formData = new FormData();
      formData.append('status', taskStatus);
      formData.append('remarks', taskRemarks);
      if (taskFile) {
        formData.append('file', taskFile);
      }
      
      const res = await taskApi.updateTaskStatus(selectedTask._id, formData);
      if (res.success) {
        toast.success('Task status updated successfully! 👍');
        setShowTaskUpdateModal(false);
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update task status');
    } finally {
      setUpdatingTask(false);
    }
  };

  const getStageColor = (stage) => {
    const colors = {
      NEW_LEAD: 'bg-[var(--crm-info-bg)] text-[var(--crm-info)] border-[var(--crm-info)]/20',
      ASSIGNED: 'bg-[var(--crm-accent-bg)] text-[var(--crm-accent)] border-[var(--crm-accent)]/20',
      CONTACTED: 'bg-[var(--crm-accent-bg)] text-[var(--crm-accent-soft)] border-[var(--crm-accent-soft)]/20',
      QUOTATION_REQUIRED: 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20',
      QUOTATION_REQUESTED: 'bg-orange-950/20 text-orange-400 border-orange-500/20',
      QUOTATION_SHARED: 'bg-teal-950/20 text-teal-400 border-teal-500/20',
      DISPATCH_PLANNED: 'bg-cyan-950/20 text-cyan-400 border-cyan-500/20',
      PAYMENT_PENDING: 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20',
      DOCUMENT_PENDING: 'bg-violet-950/20 text-violet-400 border-violet-500/20',
      CLOSED_WON: 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20 font-bold',
      DEAL_WON: 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20 font-bold',
      DELIVERED: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 font-bold',
      CLOSED_LOST: 'bg-gray-950/20 text-gray-400 border-gray-500/20 opacity-60 line-through'
    };
    return colors[stage] || 'bg-slate-950/20 text-slate-400 border-slate-500/20';
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.leadCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.productCategory?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesTab = true;
    if (activeTab === 'ALL') {
      matchesTab = true;
    } else if (activeTab === 'WON_DELIVERED') {
      matchesTab = isWonOrDelivered(lead.stage);
    } else if (activeTab === 'ORDER_CONFIRM') {
      matchesTab = isOrderConfirmedStage(lead.stage);
    } else if (activeTab === 'NEW_LEAD') {
      matchesTab = isNewOrAssignedLead(lead.stage);
    } else if (activeTab === 'CALENDAR') {
      matchesTab = Boolean(lead.nextFollowupAt) || Boolean(selectedDate);
    }

    if (selectedDate) {
      const leadCreatedDate = lead.createdAt ? new Date(lead.createdAt).toISOString().split('T')[0] : '';
      const leadFollowupDate = lead.nextFollowupAt ? new Date(lead.nextFollowupAt).toISOString().split('T')[0] : '';
      const matchesDate = leadCreatedDate === selectedDate || leadFollowupDate === selectedDate;
      return matchesSearch && matchesTab && matchesDate;
    }

    return matchesSearch && matchesTab;
  });

  const totalTasks = leads.length;
  const wonDeliveredCount = leads.filter(l => isWonOrDelivered(l.stage)).length;
  const orderConfirmCount = leads.filter(l => isOrderConfirmedStage(l.stage)).length;
  const newLeadCount = leads.filter(l => isNewOrAssignedLead(l.stage)).length;
  const calendarCount = leads.filter(l => Boolean(l.nextFollowupAt)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--crm-bg)]">
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-12 h-[1px] bg-[var(--crm-ink-soft)]/40" 
          />
          <p className="text-[10px] tracking-widest uppercase font-mono text-[var(--crm-ink-faint)]">Cataloguing Workspace Tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="min-h-screen bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] block pb-12"
    >
      
      {/* Header Panel */}
      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-ink-soft)]/10 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-[var(--crm-bg-sunken)]/40 backdrop-blur-sm px-6">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--crm-ink-faint)] font-bold block font-mono">Operational Workflow Grid</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] tracking-tight uppercase">Task Performance Board</h1>
          <p className="text-xs text-[var(--crm-ink-faint)] font-light max-w-2xl mt-1">Review pipeline milestones, view direct action tasks, and retrieve shared workspace documents.</p>
        </div>
      </motion.div>

      {/* Main Mode Tabs */}
      <div className="flex overflow-x-auto custom-scrollbar border-b border-[var(--crm-line)] bg-[var(--crm-bg-raised)]/20 px-3 sm:px-6 py-1 gap-2.5">
        {[
          { id: 'PIPELINE', label: 'Pipeline Tasks (Leads)', icon: FiClock },
          { id: 'ACTION_TASKS', label: 'Action Tasks', icon: FiCheckSquare },
          { id: 'SHARED_FILES', label: 'Shared Files & Messages', icon: FiLayers }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMainTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              mainTab === tab.id
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)]'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="w-full py-8 space-y-6 bg-[var(--crm-bg)] px-3 sm:px-6 min-w-0 overflow-x-hidden">

        {/* ==================================================== */}
        {/* PIPELINE TAB */}
        {/* ==================================================== */}
        {mainTab === 'PIPELINE' && (
          <div className="space-y-6">
            {/* Metric Cards grid */}
            <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Tasks Allocated", val: totalTasks, icon: FiGrid, bg: "bg-[var(--crm-bg-raised)]/60", text: "text-[var(--crm-heading)]" },
                { label: "Deal Won & Delivered", val: wonDeliveredCount, icon: FiCheckSquare, bg: "bg-[var(--crm-positive-bg)]", text: "text-[var(--crm-positive)]" },
                { label: "Order Confirmed", val: orderConfirmCount, icon: FiClock, bg: "bg-[var(--crm-accent-bg)]", text: "text-[var(--crm-accent)]" },
                { label: "New & Assigned Leads", val: newLeadCount, icon: FiAlertCircle, bg: "bg-[var(--crm-info-bg)]", text: "text-[var(--crm-info)]" }
              ].map((card, idx) => (
                <motion.div 
                  key={idx} 
                  variants={blockVariants}
                  whileHover={{ y: -3, borderColor: 'rgba(197,203,211,0.25)' }}
                  className="bg-[var(--crm-bg-raised)]/30 rounded-sm border border-[var(--crm-ink-soft)]/15 p-5 flex items-center justify-between shadow-xl transition-all duration-300"
                >
                  <div className="text-left">
                    <p className="text-[9px] uppercase tracking-widest font-mono font-bold text-[var(--crm-ink-faint)]">{card.label}</p>
                    <p className="text-2xl font-serif mt-2 font-normal text-[var(--crm-heading)]">{card.val}</p>
                  </div>
                  <div className={`p-3 border border-[var(--crm-ink-soft)]/10 rounded-sm text-[var(--crm-ink-soft)] shadow-inner ${card.bg}`}>
                    <card.icon size={16} />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Filter Toolbar Area */}
            <motion.div variants={blockVariants} className="bg-[var(--crm-bg-raised)]/20 p-4 rounded-sm border border-[var(--crm-ink-soft)]/15 shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--crm-ink-faint)]" size={15} />
                <input
                  type="text"
                  placeholder="Filter operations registry by corporate name, lead charter hash, or material classification..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-xs rounded-sm outline-none transition text-[var(--crm-heading)] placeholder-[var(--crm-ink-faint)]"
                />
              </div>

              {/* Nav Categories tab */}
              <div className="flex border border-[var(--crm-ink-soft)]/15 p-1 bg-[var(--crm-bg-sunken)]/60 rounded-sm shrink-0 w-full md:w-auto overflow-x-auto custom-scrollbar">
                {[
                  { id: 'ALL', label: 'All Lead', count: totalTasks },
                  { id: 'NEW_LEAD', label: 'Lead', count: newLeadCount },
                  { id: 'WON_DELIVERED', label: 'Completed Lead', count: wonDeliveredCount },
                  { id: 'ORDER_CONFIRM', label: 'order Confirm', count: orderConfirmCount }
                  
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-teal-950/80 text-teal-300 border border-teal-500/50 shadow-md font-bold'
                        : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)] border border-transparent'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </motion.div>

            {/* PICK DATE Calendar Filter toolbar matching Image 2 */}
            <motion.div variants={blockVariants} className="bg-[var(--crm-bg-sunken)]/80 p-3 rounded-sm border border-teal-500/30 font-mono text-xs flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2 bg-teal-950/60 border border-teal-800 px-3 py-1.5 rounded-sm shadow-sm">
                  <FiCalendar size={14} className="text-teal-400 animate-pulse" /> PICK DATE:
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-[var(--crm-bg)] border border-teal-500/30 px-3 py-1.5 text-xs text-[var(--crm-heading)] rounded outline-none font-mono cursor-pointer focus:border-teal-400"
                />
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate('')}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div className="text-[10px] text-[var(--crm-ink-faint)] font-mono">
                {selectedDate ? (
                  <span>Filtering Date: <strong className="text-teal-300 font-bold">{selectedDate}</strong></span>
                ) : (
                  <span>Select any date using <strong className="text-teal-400 font-bold">PICK DATE: dd-mm-yyyy</strong> picker to filter daily lead records</span>
                )}
              </div>
            </motion.div>

            {/* Cards matrix grid rendering */}
            {filteredLeads.length === 0 ? (
              <motion.div variants={blockVariants} className="bg-[var(--crm-bg-raised)]/10 rounded-sm text-center py-20 border border-[var(--crm-ink-soft)]/15 shadow-sm">
                <FiCheckSquare size={36} className="mx-auto text-[var(--crm-ink-faint)] opacity-50 mb-4" />
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] font-medium">No workflow cards matched this active grid parameter.</p>
              </motion.div>
            ) : (
              <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLeads.map((lead) => {
                  const isClosed = lead.stage === 'CLOSED_WON' || lead.stage === 'CLOSED_LOST';
                  const assignedName = getAssignedName(lead);

                  return (
                    <motion.div
                      key={lead._id}
                      variants={blockVariants}
                      whileHover={{ y: -4 }}
                      className="bg-[var(--crm-bg-raised)]/40 rounded-xl border border-[var(--crm-line)] hover:border-teal-500/60 shadow-xl transition-all duration-300 flex flex-col justify-between p-5 group font-mono"
                    >
                      <div className="text-left">
                        {/* Unique Identifier Strip */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-mono font-bold text-teal-400 tracking-wider">
                            {lead.leadCode}
                          </span>
                          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-teal-300 bg-teal-950/40 border border-teal-800/60 px-2.5 py-0.5 rounded">
                            {lead.productCategory}
                          </span>
                        </div>

                        {/* Consignee Data */}
                        <div className="mb-3">
                          <h3 onClick={() => navigate(`/crm/leads/${lead._id}`)} className="text-base font-bold text-[var(--crm-heading)] cursor-pointer hover:text-teal-300 transition-colors leading-tight font-sans">
                            {lead.customerName}
                          </h3>
                          {lead.companyName && (
                            <p className="text-xs text-[var(--crm-ink-faint)] mt-1">{lead.companyName}</p>
                          )}
                        </div>

                        {/* Specifications Metrics list */}
                        <div className="space-y-2.5 text-xs text-[var(--crm-ink-soft)] py-3 border-t border-b border-[var(--crm-line)] mb-3">
                          {/* Assigned Representative Name */}
                          <div className="flex items-center gap-2">
                            <FiUser className="text-amber-400 shrink-0" size={13} />
                            <span>Assigned To: <strong className={assignedName === 'Unassigned' ? 'text-rose-400 font-bold' : 'text-amber-300 font-bold'}>{assignedName}</strong></span>
                          </div>

                          {lead.quantity && (
                            <div className="flex items-center gap-2">
                              <FiLayers className="text-teal-400 shrink-0" size={13} />
                              <span>Mass Metrics: <strong className="text-emerald-400 font-bold">{lead.quantity}</strong></span>
                            </div>
                          )}
                          {lead.destination && (
                            <div className="flex items-center gap-2">
                              <FiMapPin className="text-sky-400 shrink-0" size={13} />
                              <span>Discharge Point: <strong className="text-sky-300 font-bold">{lead.destination}</strong></span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <FiClock className="text-teal-400 shrink-0" size={13} />
                            <span>Stage Axis:</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getStageColor(lead.stage)}`}>
                              {getStageDisplay(lead.stage)}
                            </span>
                          </div>
                          {lead.nextFollowupAt && (
                            <div className="flex items-center gap-2 text-[var(--crm-danger)] font-medium bg-[var(--crm-danger-bg)] border border-[var(--crm-danger)]/20 p-2 rounded font-mono text-[10px]">
                              <FiCalendar className="shrink-0 text-[var(--crm-danger)]" size={13} />
                              <span>Follow-up: <strong>{new Date(lead.nextFollowupAt).toLocaleString()}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Remarks Block */}
                        {lead.remarks && (
                          <div className="mb-3 bg-[var(--crm-bg-sunken)] p-2.5 rounded border border-[var(--crm-line)] text-xs">
                            <p className="text-[8px] font-mono font-bold text-teal-400 uppercase tracking-widest mb-0.5">Latest Manifest Remark</p>
                            <p className="text-xs text-[var(--crm-ink-soft)] italic line-clamp-2">"{lead.remarks}"</p>
                          </div>
                        )}
                      </div>

                      {/* Actions Hub Row */}
                      <div className="flex gap-2.5 pt-3 border-t border-[var(--crm-line)]">
                        <Link
                          to={`/crm/leads/${lead._id}`}
                          className="flex-1 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] hover:border-slate-600 rounded-md transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <FiEye size={12} />
                          <span>History</span>
                        </Link>

                        {!isClosed ? (
                          <button
                            onClick={() => handleOpenPerform(lead)}
                            className="flex-1 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-white bg-teal-700 hover:bg-teal-600 border border-teal-500/50 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg hover:shadow-teal-900/40"
                          >
                            <FiEdit size={12} />
                            <span>Perform Task</span>
                          </button>
                        ) : (
                          <span className="flex-1 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-center border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] rounded-md flex items-center justify-center gap-1.5 cursor-not-allowed select-none">
                            <FiCheckSquare size={12} />
                            <span>Node Finalized</span>
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* ACTION TASKS TAB */}
        {/* ==================================================== */}
        {mainTab === 'ACTION_TASKS' && (
          <div className="space-y-6">
            {/* Metric row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-fadeIn">
              {[
                { label: "Total Assigned Tasks", val: actionTasks.length, color: "text-[var(--crm-heading)]" },
                { label: "Pending Tasks", val: actionTasks.filter(t => t.status === 'PENDING').length, color: "text-amber-500" },
                { label: "In Progress Tasks", val: actionTasks.filter(t => t.status === 'IN_PROGRESS').length, color: "text-blue-500" },
                { label: "Completed Tasks", val: actionTasks.filter(t => t.status === 'COMPLETED').length, color: "text-emerald-500" }
              ].map((card, idx) => (
                <div key={idx} className="bg-[var(--crm-bg-raised)]/30 rounded-sm border border-[var(--crm-line)] p-4 text-left shadow-lg">
                  <p className="text-[9px] uppercase tracking-widest font-mono font-bold text-[var(--crm-ink-faint)]">{card.label}</p>
                  <p className={`text-2xl font-serif mt-1 font-normal ${card.color}`}>{card.val}</p>
                </div>
              ))}
            </div>

            {/* Tasks list */}
            {actionTasks.length === 0 ? (
              <div className="bg-[var(--crm-bg-raised)]/10 rounded-sm text-center py-20 border border-[var(--crm-line)] shadow-sm animate-fadeIn">
                <FiCheckSquare size={36} className="mx-auto text-[var(--crm-ink-faint)] opacity-50 mb-4" />
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] font-medium">No action tasks assigned to you.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                {actionTasks.map(task => (
                  <div key={task._id} className="bg-[var(--crm-bg-raised)]/30 rounded-sm border border-[var(--crm-line)] hover:border-[var(--crm-heading)]/40 p-6 shadow-2xl transition-all duration-300 flex flex-col justify-between text-left group">
                    <div>
                      {/* Priority and Date */}
                      <div className="flex justify-between items-center mb-4">
                        <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border ${
                          task.priority === 'HIGH' ? 'bg-red-950/20 text-red-400 border-red-500/20' :
                          task.priority === 'MEDIUM' ? 'bg-amber-950/20 text-amber-400 border-amber-500/20' :
                          'bg-blue-950/20 text-blue-400 border-blue-500/20'
                        }`}>
                          {task.priority} Priority
                        </span>
                        <span className="text-[9px] font-mono text-[var(--crm-ink-faint)]">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-serif font-normal text-[var(--crm-heading)] leading-tight mb-2">
                        {task.title}
                      </h3>
                      <p className="text-xs text-[var(--crm-ink-soft)]/75 font-light leading-relaxed mb-4 line-clamp-3">
                        {task.description || 'No description provided.'}
                      </p>

                      {/* Meta information */}
                      <div className="space-y-2 py-3 border-t border-b border-[var(--crm-line)] text-xs text-[var(--crm-ink-soft)] mb-4">
                        <div className="flex justify-between">
                          <span className="text-[var(--crm-ink-faint)] font-mono uppercase text-[9px]">Assigned By:</span>
                          <span className="text-[var(--crm-heading)] font-semibold">{task.assignedBy?.name || 'Manager'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--crm-ink-faint)] font-mono uppercase text-[9px]">Category:</span>
                          <span className="text-[var(--crm-heading)] font-mono uppercase text-[10px] tracking-wider text-teal-400">{task.category || 'GENERAL'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--crm-ink-faint)] font-mono uppercase text-[9px]">Status:</span>
                          <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border ${
                            task.status === 'COMPLETED' ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20' :
                            task.status === 'IN_PROGRESS' ? 'bg-blue-950/20 text-blue-400 border-blue-500/20' :
                            'bg-amber-950/20 text-amber-400 border-amber-500/20'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                        {task.fileUrl && (
                          <div className="flex justify-between items-center pt-1 border-t border-[var(--crm-line)]/40">
                            <span className="text-[var(--crm-ink-faint)] font-mono uppercase text-[9px]">Attachment:</span>
                            <a
                              href={(() => {
                                const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                                const baseUrl = import.meta.env.VITE_BACKEND_URL || (isLocal ? 'http://localhost:5000' : 'https://indiatradeoverseas-1.onrender.com');
                                return task.fileUrl.startsWith('http') ? task.fileUrl : `${baseUrl}/${task.fileUrl.replace(/^\/+/, '')}`;
                              })()}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-teal-400 hover:underline flex items-center gap-1 font-mono text-[10px]"
                            >
                              <FiEye size={10} /> View File
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Remarks */}
                      {task.remarks && (
                        <div className="bg-[var(--crm-bg)] p-3 rounded-sm border border-[var(--crm-line)] mb-4">
                          <p className="text-[8px] font-mono font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1">Fulfillment Remark</p>
                          <p className="text-xs text-[var(--crm-ink-soft)]/70 font-light italic">"{task.remarks}"</p>
                          {task.completionFileUrl && (
                            <a
                              href={(() => {
                                const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                                const baseUrl = import.meta.env.VITE_BACKEND_URL || (isLocal ? 'http://localhost:5000' : 'https://indiatradeoverseas-1.onrender.com');
                                return task.completionFileUrl.startsWith('http') ? task.completionFileUrl : `${baseUrl}/${task.completionFileUrl.replace(/^\/+/, '')}`;
                              })()}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] text-teal-400 hover:underline flex items-center gap-1 font-mono mt-1.5"
                            >
                              <FiDownload size={8} /> Completion Proof File
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenTaskUpdate(task)}
                      className="w-full py-2 bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg)] text-xs font-bold uppercase tracking-wider rounded-sm transition duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <FiEdit size={12} />
                      <span>Perform Action</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* SHARED FILES TAB */}
        {/* ==================================================== */}
        {mainTab === 'SHARED_FILES' && (
          <div className="space-y-6">
            <div className="bg-[var(--crm-bg-raised)]/30 rounded-sm border border-[var(--crm-line)] p-5 text-left shadow-lg animate-fadeIn">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--crm-heading)] font-serif mb-1">Workspace Message Memos</h2>
              <p className="text-xs text-[var(--crm-ink-faint)] font-light">Below is the archive of files, memos, and workspace documents shared with you directly.</p>
            </div>

            {sharedFiles.length === 0 ? (
              <div className="bg-[var(--crm-bg-raised)]/10 rounded-sm text-center py-20 border border-[var(--crm-line)] shadow-sm animate-fadeIn">
                <FiLayers size={36} className="mx-auto text-[var(--crm-ink-faint)] opacity-50 mb-4" />
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] font-medium">No files or messages shared with you.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                {sharedFiles.map(file => (
                  <div key={file._id} className="bg-[var(--crm-bg-raised)]/30 rounded-sm border border-[var(--crm-line)] hover:border-[var(--crm-heading)]/40 p-6 shadow-2xl transition-all duration-300 flex flex-col justify-between text-left group font-sans">
                    <div>
                      {/* Date and Sender */}
                      <div className="flex justify-between items-center mb-4 border-b border-[var(--crm-line)] pb-3">
                        <div>
                          <span className="text-[8px] font-mono font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider block">Sent By</span>
                          <span className="text-xs text-[var(--crm-heading)] font-semibold">{file.sentBy?.name || 'Manager'} ({file.sentBy?.position || 'Manager'})</span>
                        </div>
                        <span className="text-[9px] font-mono text-[var(--crm-ink-faint)] self-start mt-0.5">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* File Info */}
                      <div className="mb-4 flex gap-3 items-center">
                        <div className="p-3 bg-teal-950/20 border border-teal-500/20 rounded-sm text-teal-400">
                          <FiFileText size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-[var(--crm-heading)] truncate leading-snug" title={file.originalName}>
                            {file.originalName}
                          </h4>
                          <p className="text-[9px] font-mono text-[var(--crm-ink-faint)] uppercase mt-0.5">
                            Size: {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      {/* Note */}
                      {file.note && (
                        <div className="bg-[var(--crm-bg)] p-3.5 rounded-sm border border-[var(--crm-line)] text-xs text-[var(--crm-ink-soft)]/75 font-light leading-relaxed mb-6 italic">
                          "{file.note}"
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-md font-mono"
                    >
                      <FiDownload size={13} />
                      <span>Download Document</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* PERFORM TASK MODAL BLOCK (LEADS) */}
      {/* ==================================================== */}
      <AnimatePresence>
        {showPerformModal && selectedLead && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-[var(--crm-bg-raised)] rounded-sm w-full max-w-lg overflow-hidden border border-[var(--crm-ink-soft)]/15 shadow-2xl max-h-[90vh] flex flex-col relative"
            >
              <div className="p-6 border-b border-[var(--crm-ink-soft)]/10 flex justify-between items-center shrink-0 bg-[var(--crm-bg)]/80 text-left">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--crm-ink-faint)] font-bold block">Fulfillment Terminal</span>
                  <h3 className="text-base font-serif text-[var(--crm-heading)] uppercase tracking-wide mt-1">Report Task Progress: {selectedLead.leadCode}</h3>
                  <p className="text-xs text-[var(--crm-ink-faint)] mt-1.5 font-light leading-relaxed">
                    Consignee: <strong className="text-[var(--crm-heading)] font-medium">{selectedLead.customerName}</strong> | Active Stage Axis: <strong className="uppercase font-mono text-[var(--crm-warning)]">{getStageDisplay(selectedLead.stage)}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPerformModal(false)}
                  className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-1.5 rounded-sm hover:bg-[var(--crm-bg-raised)] transition-all cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitPerform} className="p-6 overflow-y-auto space-y-5 flex-1 text-left">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-2.5 font-mono">
                    Fulfillment Execution Mode *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActionType('STAGE_CHANGE');
                        const ops = allowedTransitions[selectedLead.stage] || [];
                        if (ops.length > 0) setNextStage(ops[0]);
                      }}
                      className={`py-3 px-4 rounded-sm border text-xs font-bold flex flex-col items-center gap-2.5 transition-all duration-200 text-center cursor-pointer ${
                        actionType === 'STAGE_CHANGE'
                          ? 'border-[var(--crm-heading)] bg-[var(--crm-bg)] text-[var(--crm-heading)] ring-1 ring-[var(--crm-heading)]'
                          : 'border-[var(--crm-ink-soft)]/15 text-[var(--crm-ink-faint)] bg-[var(--crm-bg)]/50 hover:bg-[var(--crm-bg-raised)]'
                      }`}
                    >
                      <FiLayers size={16} />
                      <span className="uppercase tracking-wider font-mono text-[9px]">Transition Lifecycle Stage</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActionType('ACTIVITY_ONLY');
                        setNextStage('');
                      }}
                      className={`py-3 px-4 rounded-sm border text-xs font-bold flex flex-col items-center gap-2.5 transition-all duration-200 text-center cursor-pointer ${
                        actionType === 'ACTIVITY_ONLY'
                          ? 'border-[var(--crm-heading)] bg-[var(--crm-bg)] text-[var(--crm-heading)] ring-1 ring-[var(--crm-heading)]'
                          : 'border-[var(--crm-ink-soft)]/15 text-[var(--crm-ink-faint)] bg-[var(--crm-bg)]/50 hover:bg-[var(--crm-bg-raised)]'
                      }`}
                    >
                      <FiTrendingUp size={16} />
                      <span className="uppercase tracking-wider font-mono text-[9px]">Log Sub-Activity Matrix</span>
                    </button>
                  </div>
                </div>

                {actionType === 'STAGE_CHANGE' && (
                  <div className="animate-fadeIn">
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">
                      Target Stage *
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={nextStage}
                        onChange={(e) => setNextStage(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 focus:border-[var(--crm-heading)]/40 text-xs rounded-sm outline-none cursor-pointer text-[var(--crm-heading)] appearance-none"
                      >
                        {(allowedTransitions[selectedLead.stage] || []).length === 0 ? (
                          <option value="" className="bg-[var(--crm-bg)]">Terminal state reached; no exits authorized</option>
                        ) : (
                          (allowedTransitions[selectedLead.stage] || []).map((stage) => (
                            <option key={stage} value={stage} className="bg-[var(--crm-bg)] text-[var(--crm-ink-soft)]">
                              {getStageDisplay(stage)} {stage === 'CLOSED_WON' ? '🏆 (Won Portfolio)' : stage === 'CLOSED_LOST' ? '❌ (Lost Portfolio)' : ''}
                            </option>
                          ))
                        )}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--crm-ink-faint)]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">
                    Fulfillment Work Details Remarks *
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 focus:border-[var(--crm-heading)]/40 text-xs rounded-sm outline-none text-[var(--crm-heading)] font-light resize-none custom-scrollbar"
                    placeholder="Enter precise operational descriptions, partner correspondence notes, or dynamic trade conditions..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">
                    Schedule Linked Pipeline Follow-up (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={nextFollowup}
                    onChange={(e) => setNextFollowup(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 focus:border-[var(--crm-heading)]/40 text-xs rounded-sm outline-none text-[var(--crm-heading)] font-mono cursor-pointer"
                  />
                  <p className="text-[10px] text-[var(--crm-ink-faint)] mt-2 font-light leading-relaxed">
                    Leave parameter void if the target charter profile lifecycle transitions completely out of manual follow-up dependencies.
                  </p>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-[var(--crm-ink-soft)]/10 shrink-0">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg)] text-xs font-bold uppercase tracking-wider rounded-sm transition duration-300 disabled:opacity-40 cursor-pointer shadow-md font-mono"
                  >
                    {submitting ? 'Transmitting Work Logs...' : 'Commit Work Parameters'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPerformModal(false)}
                    className="flex-1 py-3 bg-[var(--crm-bg)] hover:bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] text-xs font-bold uppercase tracking-wider rounded-sm transition duration-300 cursor-pointer font-mono"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* PERFORM ACTION TASK UPDATE MODAL */}
      {/* ==================================================== */}
      <AnimatePresence>
        {showTaskUpdateModal && selectedTask && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-[var(--crm-bg-raised)] rounded-sm w-full max-w-lg overflow-hidden border border-[var(--crm-line)] shadow-2xl max-h-[90vh] flex flex-col relative text-left"
            >
              <div className="p-6 border-b border-[var(--crm-line)] flex justify-between items-center bg-[var(--crm-bg)]/80">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--crm-ink-faint)] font-bold block">Fulfillment Terminal</span>
                  <h3 className="text-base font-serif text-[var(--crm-heading)] uppercase tracking-wide mt-1">Perform Action: {selectedTask.title}</h3>
                  <p className="text-xs text-[var(--crm-ink-faint)] mt-1.5 font-light">
                    Assigned By: <strong className="text-[var(--crm-heading)] font-semibold">{selectedTask.assignedBy?.name || 'Manager'}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTaskUpdateModal(false)}
                  className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-1.5 rounded-sm hover:bg-[var(--crm-bg-raised)] transition-all cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateTaskStatusSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* Status Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-2 font-mono">
                    Task Status *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'PENDING', label: 'Pending', color: 'border-amber-500/30 text-amber-400' },
                      { id: 'IN_PROGRESS', label: 'In Progress', color: 'border-blue-500/30 text-blue-400' },
                      { id: 'COMPLETED', label: 'Completed', color: 'border-emerald-500/30 text-emerald-400' }
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setTaskStatus(st.id)}
                        className={`py-2 px-3 border text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-all text-center cursor-pointer ${
                          taskStatus === st.id
                            ? 'bg-[var(--crm-bg)] text-[var(--crm-heading)] border-[var(--crm-heading)] ring-1 ring-[var(--crm-heading)]'
                            : 'bg-[var(--crm-bg)]/40 border-[var(--crm-line)] text-[var(--crm-ink-faint)] hover:bg-[var(--crm-bg-raised)]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Remarks field */}
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-2 font-mono">
                    Fulfillment Progress Notes & Remarks *
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={taskRemarks}
                    onChange={(e) => setTaskRemarks(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 text-xs rounded-sm outline-none text-[var(--crm-heading)] font-light resize-none custom-scrollbar"
                    placeholder="Enter what you accomplished, follow-up feedback, or work details..."
                  />
                </div>

                {/* File Upload (Optional work proof) */}
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-2 font-mono">
                    Attach Completion Proof File (Optional)
                  </label>
                  <div className="relative border border-dashed border-[var(--crm-line)] hover:border-teal-500/50 p-4 rounded-sm transition-colors text-center cursor-pointer bg-[var(--crm-bg)]/20 group">
                    <input
                      type="file"
                      onChange={(e) => setTaskFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp"
                    />
                    <div className="flex flex-col items-center gap-1.5">
                      <FiUpload className="text-[var(--crm-ink-faint)] group-hover:text-teal-400 transition-colors" size={20} />
                      <span className="text-[10px] uppercase font-mono font-bold text-[var(--crm-ink-soft)] tracking-wider">
                        {taskFile ? taskFile.name : 'Choose File to Upload'}
                      </span>
                      <span className="text-[9px] text-[var(--crm-ink-faint)]">PDF, Docs, Excel, Images, CSV, TXT up to 15MB</span>
                    </div>
                  </div>
                </div>

                {/* Submit buttons */}
                <div className="flex space-x-3 pt-4 border-t border-[var(--crm-line)] shrink-0">
                  <button
                    type="submit"
                    disabled={updatingTask}
                    className="flex-1 py-3 bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg)] text-xs font-bold uppercase tracking-wider rounded-sm transition duration-300 disabled:opacity-40 cursor-pointer font-mono"
                  >
                    {updatingTask ? 'Saving Progress...' : 'Submit Fulfillment Notes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTaskUpdateModal(false)}
                    className="flex-1 py-3 bg-[var(--crm-bg)] hover:bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] text-xs font-bold uppercase tracking-wider rounded-sm transition duration-300 cursor-pointer font-mono"
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