import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPhoneCall, FiMic, FiSearch, FiFilter, FiCalendar, FiUpload,
  FiUser, FiMapPin, FiPackage, FiHash, FiClock, FiPlus, FiCheckSquare,
  FiPlay, FiMessageSquare, FiTrendingUp, FiAlertCircle, FiDownload, FiCheck, FiPhone, FiCheckCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { leadsApi } from '../../api/leads';
import { taskApi } from '../../api/task';
import { employeesApi } from '../../api/employees';
import { salesTrialApi } from '../../api/salesTrialApi';
import { useAuth } from '../../hooks/useAuth';
import { API_URL } from '../../config/env';
import CallRecordingModal from '../../components/crm/CallRecordingModal';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.05 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20 } }
};

export default function Followup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'COMPLETED'
  const [dateFilterMode, setDateFilterMode] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'PICK_DATE'
  const [selectedDate, setSelectedDate] = useState('');
  
  // Call Recording Modal
  const [showCallModal, setShowCallModal] = useState(false);

  // Manager Remark Inline Save
  const [remarkInputs, setRemarkInputs] = useState({});
  const [savingRemarkId, setSavingRemarkId] = useState(null);
  const [togglingStatusId, setTogglingStatusId] = useState(null);

  // Assign Task Modal for Followup Item
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTargetLead, setTaskTargetLead] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: 'MEDIUM',
    category: 'FOLLOW_UP'
  });
  const [taskFile, setTaskFile] = useState(null);
  const [submittingTask, setSubmittingTask] = useState(false);

  const isManagerOrAdmin = 
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    user?.role === 'SALES_MANAGER' ||
    user?.department === 'ADMIN' ||
    (user?.position && user.position.toLowerCase().includes('admin'));

  useEffect(() => {
    loadData();
  }, [user]);

  const isAssignedToMe = (item) => {
    if (!user || !item) return false;
    
    // Extract assignee from item directly or nested leadId
    const assigned = (typeof item.assignedTo === 'object' && item.assignedTo !== null) 
      ? item.assignedTo 
      : (item.leadId && typeof item.leadId === 'object' && item.leadId.assignedTo)
        ? item.leadId.assignedTo
        : item.assignedTo;

    const myId = String(user._id || '');
    const myEmpId = user.employeeDbId ? String(user.employeeDbId) : '';
    const myEmail = user.email ? user.email.toLowerCase() : '';

    if (assigned) {
      const assignedId = (typeof assigned === 'object' && assigned !== null) 
        ? String(assigned._id || assigned.id || '') 
        : String(assigned || '');
      const assignedEmail = (typeof assigned === 'object' && assigned !== null && assigned.email) 
        ? assigned.email.toLowerCase() 
        : '';

      return (
        (assignedId && (assignedId === myId || (myEmpId && assignedId === myEmpId))) ||
        (assignedEmail && myEmail && assignedEmail === myEmail)
      );
    }

    // Fallback: If no explicit assignedTo, check if created/recorded by current user
    const execId = String(
      item.executiveId?._id || item.executiveId || item.createdBy?._id || item.createdBy || ''
    );
    return execId && (execId === myId || (myEmpId && execId === myEmpId));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [recRes, leadsRes, empRes] = await Promise.all([
        leadsApi.getCallRecordings(),
        leadsApi.getLeads({ limit: 300 }),
        employeesApi.getEmployees({ department: 'sales' }).catch(() => ({ success: false }))
      ]);

      const fetchedRecordings = recRes.success ? (recRes.data?.recordings || []) : [];
      const fetchedLeads = leadsRes.success ? (leadsRes.data?.leads || []) : [];

      // For non-managers, filter recordings strictly by assignment
      const visibleRecordings = isManagerOrAdmin
        ? fetchedRecordings
        : fetchedRecordings.filter(r => isAssignedToMe(r));

      let empList = [];
      if (empRes.success && empRes.data?.employees) {
        empList = empRes.data.employees;
      } else {
        const fallbackRes = await taskApi.getEmployeesByDepartment('SALES').catch(() => ({ success: false }));
        if (fallbackRes.success && fallbackRes.data?.employees) {
          empList = fallbackRes.data.employees;
        }
      }

      try {
        const trialRes = await salesTrialApi.getTrialUsers().catch(() => null);
        if (trialRes && trialRes.success) {
          const trialUsersList = trialRes.data?.users || [];
          const activeTrial = trialUsersList.filter(u => u.status === 'ACTIVE' || u.isApproved);
          const seen = new Set(empList.map(e => String(e._id || e.employeeId || '')));
          activeTrial.forEach(u => {
            const uId = String(u._id || u.trialId || '');
            if (uId && !seen.has(uId)) {
              seen.add(uId);
              empList.push({
                _id: u._id,
                name: `${u.fullName || u.name} (${u.trialId || 'Sales Trial'})`,
                fullName: `${u.fullName || u.name} (${u.trialId || 'Sales Trial'})`,
                email: u.email,
                role: 'SALES_TRIAL',
                employeeId: u.trialId,
                isTrial: true
              });
            }
          });
        }
      } catch (errTrial) {
        console.warn('Trial users fetch notice in Followup:', errTrial.message);
      }

      // Collect lead IDs that already have call recordings
      const recordingLeadIds = new Set(
        visibleRecordings
          .map(r => (r.leadId ? String(r.leadId._id || r.leadId) : ''))
          .filter(Boolean)
      );

      // Synthesize virtual recording entries for assigned follow-up leads without recordings
      const virtualAssignedRecordings = [];
      fetchedLeads.forEach(l => {
        const lIdStr = String(l._id);
        if (!recordingLeadIds.has(lIdStr)) {
          const isAssigned = isAssignedToMe(l);
          const isFollowupStage = ['NEW_LEAD', 'ASSIGNED', 'CONTACTED', 'LEAD_QUALIFICATION', 'FOLLOW_UP', 'REQUIREMENT_CAPTURED', 'QUOTATION_REQUIRED', 'QUOTATION_PENDING_APPROVAL', 'QUOTATION_APPROVED', 'QUOTATION_REQUESTED', 'QUOTATION_SHARED', 'NEGOTIATION', 'LOI_PO_PENDING', 'ORDER_CONFIRMED', 'CLOSED_WON', 'DELIVERED', 'COMPLETED', 'DEAL_WON'].includes(String(l.stage || '').toUpperCase());

          if (isFollowupStage && (isManagerOrAdmin || isAssigned)) {
            let execName = typeof l.createdBy === 'object' && l.createdBy ? (l.createdBy.fullName || l.createdBy.name) : '';
            let assigneeName = typeof l.assignedTo === 'object' && l.assignedTo ? (l.assignedTo.fullName || l.assignedTo.name) : '';

            if (!execName && l.createdBy) {
              const match = empList.find(e => String(e._id) === String(l.createdBy) || String(e.employeeId) === String(l.createdBy) || String(e.trialId) === String(l.createdBy));
              if (match) execName = match.fullName || match.name;
            }
            if (!assigneeName && l.assignedTo) {
              const match = empList.find(e => String(e._id) === String(l.assignedTo) || String(e.employeeId) === String(l.assignedTo) || String(e.trialId) === String(l.assignedTo));
              if (match) assigneeName = match.fullName || match.name;
            }

            if (!assigneeName && l.assignedDepartment) {
              assigneeName = `Dept: ${l.assignedDepartment}`;
            }

            if (!assigneeName && execName) {
              assigneeName = execName;
            } else if (!assigneeName) {
              assigneeName = 'Unassigned';
            }

            if (!execName && assigneeName && !assigneeName.startsWith('Dept:')) {
              execName = assigneeName;
            } else if (!execName) {
              execName = 'Unassigned';
            }

            const isDoneStage = ['REQUIREMENT_CAPTURED', 'QUOTATION_REQUIRED', 'QUOTATION_PENDING_APPROVAL', 'QUOTATION_APPROVED', 'QUOTATION_REQUESTED', 'QUOTATION_SHARED', 'NEGOTIATION', 'LOI_PO_PENDING', 'ORDER_CONFIRMED', 'CLOSED_WON', 'DELIVERED', 'COMPLETED', 'DEAL_WON'].includes(String(l.stage || '').toUpperCase());

            virtualAssignedRecordings.push({
              _id: `virtual_${l._id}`,
              isVirtual: true,
              leadId: l,
              leadCode: l.leadCode,
              customerName: l.customerName,
              mobileNumber: l.phone || l.whatsAppNumber || '—',
              location: l.country || 'IN',
              material: l.productCategory || 'STONE',
              quantity: l.quantity ? String(l.quantity) : '—',
              executiveName: execName,
              assignedToName: assigneeName,
              leadPriority: l.priority || 'WARM',
              notes: l.remarks || `Assigned Follow-up Lead (${(l.stage || 'FOLLOW_UP').replace(/_/g, ' ')})`,
              createdAt: l.createdAt || new Date().toISOString(),
              status: isDoneStage ? 'COMPLETED' : 'PENDING'
            });
          }
        }
      });

      setRecordings([...visibleRecordings, ...virtualAssignedRecordings]);
      setLeads(fetchedLeads);
      setEmployees(empList);
    } catch (err) {
      console.error('Followup data load error:', err);
      toast.error('Failed to load follow-up records');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (recordingId, currentStatus) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setTogglingStatusId(recordingId);
    try {
      if (String(recordingId).startsWith('virtual_')) {
        const realLeadId = String(recordingId).replace('virtual_', '');
        const targetStage = nextStatus === 'COMPLETED' ? 'REQUIREMENT_CAPTURED' : 'FOLLOW_UP';

        const res = await leadsApi.updateStage(realLeadId, { newStage: targetStage });
        if (res && res.success) {
          toast.success(
            nextStatus === 'COMPLETED'
              ? `Follow-up marked as COMPLETE! Stage updated to REQUIREMENT CAPTURED 🎉`
              : `Follow-up re-opened! Stage updated back to FOLLOW UP 🔄`
          );
        } else {
          throw new Error(res?.message || 'Failed to update lead stage');
        }
      } else {
        const res = await leadsApi.updateCallRecordingStatus(recordingId, nextStatus);
        if (res && res.success) {
          const recObj = res.data?.recording;
          if (recObj) {
            const lId = recObj.leadId ? (typeof recObj.leadId === 'object' ? recObj.leadId._id : recObj.leadId) : null;
            if (lId) {
              const targetStage = nextStatus === 'COMPLETED' ? 'REQUIREMENT_CAPTURED' : 'FOLLOW_UP';
              await leadsApi.updateStage(lId, { newStage: targetStage }).catch(err => {
                console.warn('[Followup] Stage update notice:', err.message);
              });
            }
          }
          toast.success(
            nextStatus === 'COMPLETED'
              ? `Follow-up marked as COMPLETE! Stage updated to REQUIREMENT CAPTURED`
              : `Follow-up re-opened! Stage updated back to FOLLOW UP`
          );
        } else {
          throw new Error(res?.message || 'Failed to update call recording status');
        }
      }

      // Reload fresh data from backend to ensure 100% state sync on refresh
      await loadData();
    } catch (err) {
      console.error('[Followup] Status update error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update follow-up status');
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleSaveRemark = async (recordingId) => {
    const remarkText = remarkInputs[recordingId];
    if (remarkText === undefined) return;
    setSavingRemarkId(recordingId);
    try {
      if (String(recordingId).startsWith('virtual_')) {
        toast.success('Manager remark saved!');
        setRecordings(prev => prev.map(r => r._id === recordingId ? { ...r, managerRemark: remarkText, managerRemarkBy: user?.fullName || user?.name } : r));
      } else {
        const res = await leadsApi.updateCallRecordingRemark(recordingId, remarkText);
        if (res.success) {
          toast.success('Manager remark saved!');
          setRecordings(prev => prev.map(r => r._id === recordingId ? { ...r, managerRemark: remarkText, managerRemarkBy: user?.fullName || user?.name } : r));
        }
      }
    } catch (err) {
      toast.error('Failed to save remark');
    } finally {
      setSavingRemarkId(null);
    }
  };

  const handleOpenAssignTask = (rec) => {
    setTaskTargetLead(rec);
    const initialAssignee = (rec.leadId && typeof rec.leadId === 'object' && rec.leadId.assignedTo)
      ? String(rec.leadId.assignedTo._id || rec.leadId.assignedTo)
      : (rec.executiveId || '');

    setTaskForm({
      title: `Follow-up Task: ${rec.customerName} (${rec.leadCode || 'Call Record'})`,
      description: `Follow up with client ${rec.customerName}. Notes: ${rec.notes || 'N/A'}. Material: ${rec.material || 'N/A'}.`,
      assignedTo: initialAssignee,
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      priority: rec.leadPriority === 'HOT' ? 'HIGH' : 'MEDIUM',
      category: 'FOLLOW_UP'
    });
    setShowTaskModal(true);
  };

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
      if (taskTargetLead && taskTargetLead.leadId) {
        const lId = typeof taskTargetLead.leadId === 'object' ? taskTargetLead.leadId._id : taskTargetLead.leadId;
        formData.append('leadId', lId);
      }
      if (taskFile) formData.append('file', taskFile);

      const res = await taskApi.createTask(formData);
      if (res.success) {
        // Also explicitly sync lead's assignedTo if leadId is associated
        if (taskTargetLead && taskTargetLead.leadId) {
          const lId = typeof taskTargetLead.leadId === 'object' ? taskTargetLead.leadId._id : taskTargetLead.leadId;
          await leadsApi.assignLead(lId, { assignedTo: taskForm.assignedTo }).catch(err => {
            console.warn('[Followup] Lead re-assign sync failed:', err.message);
          });
        }

        toast.success('Task assigned & Next Custodian updated successfully! 🎯');
        setShowTaskModal(false);
        setTaskFile(null);
        setTaskTargetLead(null);
        await loadData(); // Reload recordings and updated custodian name immediately!
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign task');
    } finally {
      setSubmittingTask(false);
    }
  };

  const getAudioUrl = (recording) => {
    if (!recording || recording.isVirtual || !recording._id || String(recording._id).startsWith('virtual_')) return '';
    return `${API_URL}/leads/call-recordings/${recording._id}/stream`;
  };

  // Counts
  const pendingCount = recordings.filter(r => (r.status || 'PENDING') === 'PENDING').length;
  const completedCount = recordings.filter(r => r.status === 'COMPLETED').length;
  const todayCount = recordings.filter(r => new Date(r.createdAt).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]).length;
  const hotCount = recordings.filter(r => r.leadPriority === 'HOT').length;

  // Filtered List
  const filteredRecordings = recordings.filter(rec => {
    const recStatus = rec.status || 'PENDING';
    if (statusFilter !== 'ALL' && recStatus !== statusFilter) {
      return false;
    }

    if (priorityFilter !== 'ALL' && (rec.leadPriority || 'WARM') !== priorityFilter) {
      return false;
    }

    if (dateFilterMode !== 'ALL') {
      const dStr = new Date(rec.createdAt).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      if (dateFilterMode === 'TODAY' && dStr !== todayStr) return false;
      if (dateFilterMode === 'YESTERDAY') {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        if (dStr !== yest.toISOString().split('T')[0]) return false;
      }
      if (dateFilterMode === 'PICK_DATE' && selectedDate && dStr !== selectedDate) return false;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = (rec.customerName || '').toLowerCase().includes(q);
      const matchCode = (rec.leadCode || '').toLowerCase().includes(q);
      const matchExec = (rec.executiveName || '').toLowerCase().includes(q);
      const matchAssignee = (rec.assignedToName || '').toLowerCase().includes(q);
      const matchMat = (rec.material || '').toLowerCase().includes(q);
      const matchPhone = (rec.mobileNumber || '').toLowerCase().includes(q);
      return matchName || matchCode || matchExec || matchAssignee || matchMat || matchPhone;
    }

    return true;
  });

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full min-w-0 font-sans antialiased text-[var(--crm-ink-soft)] bg-[var(--crm-bg)] pb-16">
      
      {/* Header Bar */}
      <motion.div variants={blockVariants} className="w-full bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 sm:p-5 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm text-left">
        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-[0.25em] text-teal-400 font-bold block font-mono">SALES TELEPHONY & FOLLOW-UP HUB</span>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--crm-heading)] tracking-tight flex items-center gap-2">
            <FiPhoneCall className="text-teal-500" size={22} /> Follow-up & Call Recording Registry
          </h1>
          <p className="text-xs text-[var(--crm-ink-faint)]">
            Manage active call recordings, track follow-up progress, review executives, and route leads to next stage custodians.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCallModal(true)}
            className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded transition cursor-pointer shadow-sm"
          >
            <FiMic size={13} className="animate-pulse" /> Upload Call Recording
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={blockVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 font-mono text-left">
        <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-lg flex flex-col justify-between shadow-sm">
          <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold">TOTAL FOLLOW-UPS</span>
          <p className="text-xl font-bold text-[var(--crm-heading)] mt-1">{recordings.length}</p>
          <span className="text-[9px] text-[var(--crm-ink-faint)] mt-1">Logged Records</span>
        </div>

        <div 
          onClick={() => setStatusFilter('PENDING')}
          className="bg-[var(--crm-bg-raised)] border border-amber-900/40 hover:border-amber-500/60 p-4 rounded-lg flex flex-col justify-between shadow-sm cursor-pointer transition"
        >
          <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
            <FiClock size={11} /> PENDING FOLLOW-UPS
          </span>
          <p className="text-xl font-bold text-amber-400 mt-1">{pendingCount}</p>
          <span className="text-[9px] text-amber-500/80 mt-1">Requires Executive Action</span>
        </div>

        <div 
          onClick={() => setStatusFilter('COMPLETED')}
          className="bg-[var(--crm-bg-raised)] border border-emerald-900/40 hover:border-emerald-500/60 p-4 rounded-lg flex flex-col justify-between shadow-sm cursor-pointer transition"
        >
          <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
            <FiCheckCircle size={11} /> COMPLETED FOLLOW-UPS
          </span>
          <p className="text-xl font-bold text-emerald-400 mt-1">{completedCount}</p>
          <span className="text-[9px] text-emerald-500/80 mt-1">Finished / Stage Advanced</span>
        </div>

        <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-lg flex flex-col justify-between shadow-sm">
          <span className="text-[9px] uppercase tracking-wider text-rose-400 font-bold">HOT PRIORITY DEALS</span>
          <p className="text-xl font-bold text-rose-400 mt-1">{hotCount}</p>
          <span className="text-[9px] text-[var(--crm-ink-faint)] mt-1">Urgent Conversion</span>
        </div>
      </motion.div>

      {/* Main Status Toggle Bar (Upper Followup vs FollowupComplete Buttons) */}
      <motion.div variants={blockVariants} className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-3 rounded-lg shadow-sm font-mono text-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 text-left">
        {/* Status Mode Buttons */}
        <div className="flex items-center gap-2 bg-[var(--crm-bg-sunken)] p-1 rounded-md border border-[var(--crm-line)]">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
              statusFilter === 'ALL'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-[var(--crm-ink-faint)] hover:text-white'
            }`}
          >
            All Follow-ups <span className="px-1.5 py-0.2 text-[9px] bg-black/40 rounded-full">{recordings.length}</span>
          </button>

          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-sm font-black'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            ⏱️ Followup Pending <span className="px-1.5 py-0.2 text-[9px] bg-black/40 rounded-full text-amber-300">{pendingCount}</span>
          </button>

          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-sm font-black'
                : 'text-emerald-400/80 hover:text-emerald-300'
            }`}
          >
            ✓ Followup Complete <span className="px-1.5 py-0.2 text-[9px] bg-black/40 rounded-full text-emerald-300">{completedCount}</span>
          </button>
        </div>

        {/* Priority & Search Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1 md:justify-end">
          <div className="relative min-w-[180px] flex-1 sm:flex-initial">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)]" size={13} />
            <input
              type="text"
              placeholder="Search Executive, Custodian, Client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] pl-8 pr-3 py-1.5 rounded outline-none focus:border-teal-500 transition text-xs"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-2.5 py-1.5 rounded outline-none cursor-pointer text-xs font-mono"
          >
            <option value="ALL">All Priorities</option>
            <option value="HOT">🔥 HOT</option>
            <option value="WARM">⚡ WARM</option>
            <option value="COLD">❄️ COLD</option>
          </select>

          <button
            onClick={() => { setDateFilterMode('ALL'); setSelectedDate(''); }}
            className={`px-2.5 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
              dateFilterMode === 'ALL'
                ? 'bg-teal-700 text-white font-black'
                : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-faint)]'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => { setDateFilterMode('TODAY'); setSelectedDate(''); }}
            className={`px-2.5 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
              dateFilterMode === 'TODAY'
                ? 'bg-teal-700 text-white font-black'
                : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-faint)]'
            }`}
          >
            Today
          </button>
        </div>
      </motion.div>

      {/* Main Content Stream: Follow-up Recording Cards */}
      <motion.div variants={blockVariants} className="space-y-4 text-left">
        {loading ? (
          <div className="py-24 text-center font-mono text-xs text-[var(--crm-ink-faint)] uppercase tracking-widest">
            Loading Follow-up Call Records...
          </div>
        ) : filteredRecordings.length === 0 ? (
          <div className="py-24 border border-dashed border-[var(--crm-line)] rounded-lg text-center font-mono space-y-2">
            <FiMic className="mx-auto text-[var(--crm-ink-faint)]" size={32} />
            <p className="text-xs uppercase text-[var(--crm-ink-faint)] tracking-widest">No follow-up call recordings found for selected filter</p>
            <button
              onClick={() => { setStatusFilter('ALL'); setPriorityFilter('ALL'); setSearchTerm(''); }}
              className="text-[10px] font-bold text-teal-400 hover:underline uppercase tracking-wider cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecordings.map((rec) => {
              const leadObjId = typeof rec.leadId === 'object' && rec.leadId ? rec.leadId._id : rec.leadId;
              const isCompleted = rec.status === 'COMPLETED';

              return (
                <div
                  key={rec._id}
                  className={`bg-[var(--crm-bg-raised)] border p-4 sm:p-5 rounded-lg shadow-sm font-mono space-y-3.5 transition ${
                    isCompleted ? 'border-emerald-900/60 hover:border-emerald-700/80 bg-emerald-950/10' : 'border-[var(--crm-line)] hover:border-teal-900/60'
                  }`}
                >
                  {/* Top Status Header Row: Status Badge + Toggle Status Button */}
                  <div className="flex flex-wrap justify-between items-center bg-[var(--crm-bg-sunken)]/60 px-3 py-2 rounded border border-[var(--crm-line)]/50 gap-2">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <span className="px-2.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 shadow-xs">
                          <FiCheckCircle size={10} /> FOLLOWUP COMPLETE
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 shadow-xs animate-pulse">
                          <FiClock size={10} /> FOLLOWUP PENDING
                        </span>
                      )}

                      {rec.leadPriority && (
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase border ${
                          rec.leadPriority === 'HOT' ? 'bg-rose-950/60 text-rose-400 border-rose-800/40' :
                          rec.leadPriority === 'WARM' ? 'bg-amber-950/60 text-amber-400 border-amber-800/40' :
                          'bg-cyan-950/60 text-cyan-400 border-cyan-800/40'
                        }`}>
                          {rec.leadPriority === 'HOT' ? 'HOT 🔥' : rec.leadPriority === 'WARM' ? 'WARM ⚡' : 'COLD ❄️'}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(rec._id, rec.status)}
                      disabled={togglingStatusId === rec._id}
                      className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded border transition cursor-pointer disabled:opacity-50 ${
                        isCompleted
                          ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                          : 'bg-emerald-900/60 hover:bg-emerald-800 border-emerald-700 text-emerald-300'
                      }`}
                    >
                      {togglingStatusId === rec._id ? 'Updating...' : isCompleted ? 'Re-open Followup' : '✓ Mark as Complete'}
                    </button>
                  </div>

                  {/* People Section: Who did Follow-up & Who is assigned for Next Stage */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] bg-black/40 p-2.5 rounded border border-[var(--crm-line)]">
                    <div className="space-y-0.5">
                      <span className="text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold block">
                        👤 FOLLOW-UP DONE BY:
                      </span>
                      <strong className="text-teal-400 text-xs font-bold block truncate">
                        {rec.executiveName || 'Unassigned'}
                      </strong>
                    </div>

                    <div className="space-y-0.5 sm:border-l border-[var(--crm-line)] sm:pl-2.5">
                      <span className="text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold block">
                        🎯 NEXT STAGE CUSTODIAN:
                      </span>
                      <strong className="text-emerald-400 text-xs font-bold block truncate">
                        {rec.assignedToName || rec.executiveName || 'Unassigned'}
                      </strong>
                    </div>
                  </div>

                  {/* Customer Information & Lead Code */}
                  <div className="flex justify-between items-start pt-1">
                    <div>
                      {leadObjId ? (
                        <Link
                          to={`/crm/leads/${leadObjId}`}
                          className="font-serif font-bold text-sm text-[var(--crm-heading)] hover:text-teal-400 hover:underline flex items-center gap-1.5 cursor-pointer transition"
                        >
                          {rec.customerName}
                          {rec.contactRole && (
                            <span className="text-[9px] font-mono font-normal text-teal-400 border border-teal-900/40 px-1.5 py-0.2 rounded bg-teal-950/30">
                              {rec.contactRole}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <h4 className="font-serif font-bold text-sm text-[var(--crm-heading)] flex items-center gap-1.5">
                          {rec.customerName}
                          {rec.contactRole && (
                            <span className="text-[9px] font-mono font-normal text-teal-400 border border-teal-900/40 px-1.5 py-0.2 rounded bg-teal-950/30">
                              {rec.contactRole}
                            </span>
                          )}
                        </h4>
                      )}
                    </div>

                    {rec.leadCode && leadObjId && (
                      <Link
                        to={`/crm/leads/${leadObjId}`}
                        className="text-[10px] font-bold text-teal-400 hover:text-teal-300 hover:underline uppercase tracking-wider bg-teal-950/40 border border-teal-900/60 px-2 py-1 rounded cursor-pointer transition flex items-center gap-1"
                      >
                        {rec.leadCode} →
                      </Link>
                    )}
                  </div>

                  {/* Audio Player Component */}
                  {rec.isVirtual ? (
                    <div className="bg-[var(--crm-bg-sunken)] p-3 rounded border border-teal-900/40 text-[10px] text-teal-300 flex items-center justify-between font-mono">
                      <span className="flex items-center gap-1.5 font-bold">
                        <FiMic size={12} className="text-amber-400 shrink-0 animate-pulse" /> Assigned Follow-up Task
                      </span>
                      <span className="text-[9px] text-[var(--crm-ink-faint)]">Pending Audio Log</span>
                    </div>
                  ) : (
                    <div className="bg-[var(--crm-bg-sunken)] p-3 rounded border border-[var(--crm-line)] space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] text-[var(--crm-ink-faint)]">
                        <span className="flex items-center gap-1">
                          <FiMic size={10} className="text-rose-400" /> {rec.originalName || 'Call Audio File'}
                        </span>
                        <span>Duration: {rec.duration || '00:00'}</span>
                      </div>
                      <audio
                        controls
                        controlsList="nodownload"
                        preload="metadata"
                        src={getAudioUrl(rec)}
                        className="w-full h-8 rounded accent-teal-500"
                      />
                    </div>
                  )}

                  {/* Lead Specifications Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--crm-ink-soft)] bg-[var(--crm-bg-sunken)]/40 p-2.5 rounded border border-[var(--crm-line)]/50">
                    {rec.mobileNumber && rec.mobileNumber !== '—' ? (
                      <a href={`tel:${rec.mobileNumber}`} className="hover:text-emerald-400 hover:underline cursor-pointer flex items-center">
                        <FiPhone size={10} className="inline text-emerald-400 mr-1 shrink-0" /> Phone: <strong className="text-[var(--crm-heading)] ml-1">{rec.mobileNumber} 📞</strong>
                      </a>
                    ) : (
                      <p><FiPhone size={10} className="inline text-emerald-400 mr-1" /> Phone: <strong className="text-[var(--crm-heading)]">—</strong></p>
                    )}
                    <p><FiMapPin size={10} className="inline text-amber-400 mr-1" /> Location: <strong className="text-[var(--crm-heading)]">{rec.location || '—'}</strong></p>
                    <p><FiPackage size={10} className="inline text-cyan-400 mr-1" /> Material: <strong className="text-[var(--crm-heading)]">{rec.material || '—'}</strong></p>
                    <p><FiHash size={10} className="inline text-teal-400 mr-1" /> Quantity: <strong className="text-[var(--crm-heading)]">{rec.quantity || '—'}</strong></p>
                  </div>

                  {/* Notes / Talk Summary */}
                  {rec.notes && (
                    <div className="text-[11px] font-sans text-[var(--crm-ink-soft)] italic bg-[var(--crm-bg-sunken)]/20 p-2.5 rounded border-l-2 border-teal-500 leading-relaxed">
                      "{rec.notes}"
                    </div>
                  )}

                  {/* Manager Remark Section */}
                  <div className="pt-2 border-t border-[var(--crm-line)] space-y-2">
                    {rec.managerRemark ? (
                      <div className="text-[10px] font-mono text-amber-300/90 bg-amber-950/20 p-2 rounded border border-amber-900/30 space-y-0.5">
                        <span className="text-[8px] uppercase font-bold text-amber-400 block">
                          Manager Feedback ({rec.managerRemarkBy || 'Manager'}):
                        </span>
                        <p className="font-sans italic text-xs">"{rec.managerRemark}"</p>
                      </div>
                    ) : isManagerOrAdmin ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add Manager remark / coaching guidance..."
                          value={remarkInputs[rec._id] || ''}
                          onChange={(e) => setRemarkInputs({ ...remarkInputs, [rec._id]: e.target.value })}
                          className="flex-1 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-[10px] px-2.5 py-1.5 rounded outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRemark(rec._id)}
                          disabled={savingRemarkId === rec._id}
                          className="bg-teal-700 hover:bg-teal-600 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1.5 rounded transition cursor-pointer disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    ) : null}

                    {/* Footer Actions: Assign Task Button */}
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[8px] text-[var(--crm-ink-faint)]">
                        Logged: {new Date(rec.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {isManagerOrAdmin && (
                        <button
                          type="button"
                          onClick={() => handleOpenAssignTask(rec)}
                          className="bg-teal-950/80 hover:bg-teal-900 border border-teal-800 text-teal-300 font-bold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1"
                        >
                          <FiCheckSquare size={10} /> Assign Task
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ASSIGN TASK MODAL FOR MANAGER */}
      <AnimatePresence>
        {showTaskModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 w-full max-w-lg shadow-2xl relative text-[var(--crm-ink-soft)] font-sans text-left space-y-4"
            >
              <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3">
                <h3 className="text-lg font-bold uppercase tracking-tight text-[var(--crm-heading)] flex items-center gap-2">
                  <FiCheckSquare className="text-teal-400" size={18} /> Assign Task to Executive
                </h3>
                <button onClick={() => setShowTaskModal(false)} className="text-base text-[var(--crm-ink-faint)] hover:text-white font-bold cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleTaskSubmit} className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 rounded-xl text-sm outline-none text-[var(--crm-heading)] placeholder-slate-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1">Assign to Sales Executive *</label>
                  <select
                    required
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 rounded-xl text-sm outline-none cursor-pointer text-[var(--crm-heading)] transition"
                  >
                    <option value="">-- Select Executive --</option>
                    {employees.map(e => (
                      <option key={e._id} value={e._id}>
                        {e.name || e.fullName} ({e.role || 'Sales Rep'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1">Due Date *</label>
                    <input
                      type="date"
                      required
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 rounded-xl text-sm outline-none cursor-pointer text-[var(--crm-heading)] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1">Priority</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 rounded-xl text-sm outline-none cursor-pointer text-[var(--crm-heading)] transition"
                    >
                      <option value="HIGH">HIGH 🔥</option>
                      <option value="MEDIUM">MEDIUM ⚡</option>
                      <option value="LOW">LOW ❄️</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1">Instructions / Description</label>
                  <textarea
                    rows={3}
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 rounded-xl text-sm outline-none resize-none font-sans text-[var(--crm-heading)] placeholder-slate-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1">Attach File (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setTaskFile(e.target.files[0])}
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] rounded-xl text-xs cursor-pointer"
                  />
                </div>

                <div className="flex space-x-3 pt-4 border-t border-[var(--crm-line)]">
                  <button
                    type="submit"
                    disabled={submittingTask}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold rounded-xl text-[var(--crm-bg-sunken)] bg-[var(--crm-heading)] hover:opacity-90 transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {submittingTask ? 'Assigning Task...' : 'Confirm Assign Task'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold rounded-xl text-[var(--crm-ink-soft)] bg-[var(--crm-bg)] border border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)] transition active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Call Recording Upload Modal */}
      <CallRecordingModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        leads={leads}
        onSuccess={loadData}
      />
    </motion.div>
  );
}
