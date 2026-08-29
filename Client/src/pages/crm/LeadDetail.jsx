import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { leadsApi } from '../../api/leads';
import { quotationsApi } from '../../api/quotations';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../hooks/useAuth';
import {
  FiArrowLeft, FiActivity, FiFileText, FiTruck, FiDollarSign,
  FiSend, FiTrash2, FiEye, FiShield, FiStar, FiUser, FiPhone,
  FiCheck, FiAward, FiXCircle, FiCheckCircle, FiCompass,
  FiMessageCircle, FiMail
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// Fluid animation orchestration profiles
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.01 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 140, damping: 20 } }
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newActivity, setNewActivity] = useState({ note: '', actionType: 'FOLLOW_UP', nextFollowupAt: '' });
  const [quotationData, setQuotationData] = useState({ employeeRequestedPrice: '', paymentTerms: '', validityDays: 7 });
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [emailForm, setEmailForm] = useState({ subject: '', body: '' });
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [revealedPhone, setRevealedPhone] = useState('');
  const [revealedEmail, setRevealedEmail] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [revealFieldTarget, setRevealFieldTarget] = useState('');
  const [reason, setReason] = useState('');

  const [users, setUsers] = useState([]);
  const [assignee, setAssignee] = useState('');
  const [deptAssignee, setDeptAssignee] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);

  const departments = ['STONE', 'COAL', 'TEA', 'RICE', 'TRANSPORT', 'ADMIN', 'IT', 'PROCUREMENT', 'ACCOUNTS', 'HR', 'SALES'];

  const activeStages = [
    'NEW_LEAD', 'LEAD_QUALIFICATION', 'FOLLOW_UP', 'REQUIREMENT_CAPTURED', 'QUOTATION_REQUIRED',
    'QUOTATION_PENDING_APPROVAL', 'QUOTATION_APPROVED', 'NEGOTIATION', 'LOI_PO_PENDING',
    'ORDER_CONFIRMED', 'DISPATCH_PENDING', 'PAYMENT_PENDING'
  ];

  const allowedTransitions = {
    NEW_LEAD: ['ASSIGNED', 'LEAD_QUALIFICATION', 'CLOSED_LOST', 'CONTACTED', 'DEAL_LOST'],
    ASSIGNED: ['CONTACTED', 'QUOTATION_REQUIRED', 'CLOSED_LOST', 'DEAL_LOST'],
    CONTACTED: ['QUOTATION_REQUIRED', 'CLOSED_LOST', 'FOLLOW_UP', 'DEAL_LOST'],
    LEAD_QUALIFICATION: ['FOLLOW_UP', 'CLOSED_LOST', 'DEAL_LOST'],
    FOLLOW_UP: ['REQUIREMENT_CAPTURED', 'CLOSED_LOST', 'REQUIREMENT_RECEIVED', 'DEAL_LOST'],
    REQUIREMENT_CAPTURED: ['QUOTATION_REQUIRED', 'CLOSED_LOST', 'DEAL_LOST'],
    QUOTATION_REQUIRED: ['QUOTATION_PENDING_APPROVAL', 'QUOTATION_REQUESTED', 'CLOSED_LOST', 'DEAL_LOST'],
    QUOTATION_PENDING_APPROVAL: ['QUOTATION_APPROVED', 'CLOSED_LOST', 'DEAL_LOST'],
    QUOTATION_APPROVED: ['NEGOTIATION', 'CLOSED_LOST', 'DEAL_LOST'],
    QUOTATION_REQUESTED: ['QUOTATION_SHARED', 'CLOSED_LOST', 'DEAL_LOST'],
    QUOTATION_SHARED: ['DISPATCH_PLANNED', 'CLOSED_WON', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'],
    NEGOTIATION: ['LOI_PO_PENDING', 'CLOSED_LOST', 'SAMPLE_SENT', 'DEAL_WON', 'DEAL_LOST'],
    LOI_PO_PENDING: ['ORDER_CONFIRMED', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'],
    ORDER_CONFIRMED: ['DISPATCH_PENDING', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'],
    DISPATCH_PENDING: ['PAYMENT_PENDING', 'CLOSED_LOST', 'DEAL_LOST'],
    DISPATCH_PLANNED: ['PAYMENT_PENDING', 'CLOSED_LOST', 'DEAL_LOST'],
    PAYMENT_PENDING: ['DOCUMENT_PENDING', 'CLOSED_WON', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'],
    DOCUMENT_PENDING: ['CLOSED_WON', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'],
    CLOSED_WON: [],
    CLOSED_LOST: [],
    REQUIREMENT_RECEIVED: ['QUOTATION_SENT', 'DEAL_WON', 'DEAL_LOST'],
    QUOTATION_SENT: ['NEGOTIATION', 'DEAL_WON', 'DEAL_LOST'],
    SAMPLE_SENT: ['PRICE_DISCUSSION', 'DEAL_WON', 'DEAL_LOST'],
    PRICE_DISCUSSION: ['PAYMENT_DISCUSSION', 'DEAL_WON', 'DEAL_LOST'],
    PAYMENT_DISCUSSION: ['PO_RECEIVED', 'DEAL_WON', 'DEAL_LOST'],
    PO_RECEIVED: ['ORDER_CONFIRMED', 'DEAL_WON', 'DEAL_LOST'],
    DEAL_WON: [],
    DEAL_LOST: []
  };

  const stageDetails = {
    NEW_LEAD: { label: 'New Lead', icon: FiStar, desc: 'Fresh lead inquiry received' },
    LEAD_QUALIFICATION: { label: 'Qualification', icon: FiUser, desc: 'Verifying lead requirements & validity' },
    FOLLOW_UP: { label: 'Follow Up', icon: FiPhone, desc: 'Contacting the lead for more detail' },
    REQUIREMENT_CAPTURED: { label: 'Req. Captured', icon: FiActivity, desc: 'Lead specifications detailed' },
    QUOTATION_REQUIRED: { label: 'Quote Req.', icon: FiFileText, desc: 'Quotation needs to be prepared' },
    QUOTATION_PENDING_APPROVAL: { label: 'Quote Pending', icon: FiSend, desc: 'Quotation waiting for manager approval' },
    QUOTATION_APPROVED: { label: 'Quote Approved', icon: FiCheckCircle, desc: 'Quotation approved by manager' },
    NEGOTIATION: { label: 'Negotiation', icon: FiActivity, desc: 'Discussing terms and pricing with lead' },
    LOI_PO_PENDING: { label: 'LOI/PO Pending', icon: FiFileText, desc: 'Awaiting purchase order/LOI' },
    ORDER_CONFIRMED: { label: 'Order Confirmed', icon: FiCheck, desc: 'Order confirmed and contract signed' },
    DISPATCH_PENDING: { label: 'Dispatch Pending', icon: FiTruck, desc: 'Logistics planning and dispatch pending' },
    PAYMENT_PENDING: { label: 'Payment Pending', icon: FiDollarSign, desc: 'Awaiting payment confirmation' },
    CLOSED_WON: { label: 'Closed Won', icon: FiAward, desc: 'Deal successfully won!' },
    CLOSED_LOST: { label: 'Closed Lost', icon: FiXCircle, desc: 'Deal closed as lost' }
  };

  useEffect(() => {
    fetchLeadDetails();
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'HR') {
      fetchUsers();
    }
  }, [id, user]);

  const fetchUsers = async () => {
    try {
      const response = await adminApi.getUsers();
      if (response.success) setUsers(response.data.users || []);
    } catch (e) { console.error(e); }
  };

  const fetchLeadDetails = async () => {
    try {
      const response = await leadsApi.getLeadById(id);
      if (response.success) {
        setLead(response.data.lead);
        setActivities(response.data.activities);
        setAssignee(response.data.lead.assignedTo?._id || response.data.lead.assignedTo || '');
        setDeptAssignee(response.data.lead.assignedDepartment || '');
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDeleteLead = async () => {
    if (window.confirm('Are you sure you want to permanently delete this task/lead? This will delete all activity logs for it.')) {
      try {
        const response = await leadsApi.deleteLead(id);
        if (response.success) {
          toast.success('Lead deleted successfully');
          navigate('/crm/leads');
        }
      } catch (e) { toast.error('Failed to delete lead'); }
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setIsAssigning(true);
    try {
      const response = await adminApi.assignLead(id, {
        assignedTo: assignee || null,
        assignedDepartment: deptAssignee || null
      });
      if (response.success) {
        toast.success('Lead assignment updated successfully');
        fetchLeadDetails();
      }
    } catch (err) { toast.error('Failed to update assignment'); } finally { setIsAssigning(false); }
  };

  const handlePriorityChange = async (newPriority) => {
    setUpdatingPriority(true);
    try {
      const response = await leadsApi.updatePriority(id, newPriority);
      if (response.success) {
        toast.success(`Lead Temperature updated to ${newPriority}!`);
        fetchLeadDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update lead priority.');
    } finally {
      setUpdatingPriority(false);
    }
  };

  const handleStageChange = async (newStage) => {
    try {
      const response = await leadsApi.updateStage(id, { newStage });
      if (response.success) {
        toast.success(`Stage updated to ${newStage.replace(/_/g, ' ')}`);
        fetchLeadDetails();
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update stage'); }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      const response = await leadsApi.addActivity(id, newActivity);
      if (response.success) {
        toast.success('Activity added successfully');
        setShowActivityModal(false);
        setNewActivity({ note: '', actionType: 'FOLLOW_UP', nextFollowupAt: '' });
        fetchLeadDetails();
      }
    } catch (err) { console.error(err); }
  };

  const handleLogWhatsApp = async (e) => {
    e.preventDefault();
    setSendingWhatsApp(true);
    try {
      const response = await leadsApi.logWhatsAppActivity(id, whatsAppMessage);
      if (response.success) {
        toast.success('WhatsApp activity logged successfully');
        setShowWhatsAppModal(false);
        setWhatsAppMessage('');
        fetchLeadDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log WhatsApp activity');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setSendingEmail(true);
    try {
      const response = await leadsApi.sendEmailActivity(id, emailForm.subject, emailForm.body);
      if (response.success) {
        toast.success(response.data?.sentLive ? 'Email sent and logged successfully' : 'Email logged successfully');
        setShowEmailModal(false);
        setEmailForm({ subject: '', body: '' });
        fetchLeadDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRequestQuotation = async (e) => {
    e.preventDefault();
    try {
      const response = await quotationsApi.requestQuotation({ leadId: id, ...quotationData });
      if (response.success) {
        toast.success('Quotation requested successfully');
        setShowQuotationModal(false);
        setQuotationData({ employeeRequestedPrice: '', paymentTerms: '', validityDays: 7 });
        fetchLeadDetails();
      }
    } catch (err) { console.error(err); }
  };

  const handleUnmaskClick = (field) => {
    setRevealFieldTarget(field);
    setShowWarningModal(true);
  };

  const handleRevealSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    try {
      const deviceHash = localStorage.getItem('deviceHash');
      const response = await adminApi.revealField({
        entityType: 'LEAD', entityId: id, fieldName: revealFieldTarget, reason, deviceHash
      });
      if (response.success) {
        if (revealFieldTarget === 'phone') setRevealedPhone(response.data.value);
        else setRevealedEmail(response.data.value);
        toast.success('Field revealed successfully');
        setShowWarningModal(false);
        setReason('');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Reveal attempt rejected.'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[var(--crm-bg)] flex items-center justify-center">
      <div className="w-12 h-[1px] bg-[var(--crm-ink-soft)]/40 animate-pulse" />
    </div>
  );

  if (!lead) return (
    <div className="text-center py-20 text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-mono bg-[var(--crm-bg)] min-h-screen">
      Lead manifest record not mapped.
    </div>
  );

  const currentStage = lead.stage;
  const isClosedWon = currentStage === 'CLOSED_WON' || currentStage === 'DEAL_WON';
  const isClosedLost = currentStage === 'CLOSED_LOST' || currentStage === 'DEAL_LOST';
  const currentStepIndex = activeStages.includes(currentStage) ? activeStages.indexOf(currentStage) : (isClosedWon || isClosedLost ? activeStages.length : 0);
  const progressPercent = Math.min(100, Math.max(0, (currentStepIndex / activeStages.length) * 100));

  const calculatePriorityScore = (l) => {
    if (!l) return 0;
    if (typeof l.score === 'number' && l.score > 0) return l.score;

    let score = 20;
    const st = String(l.stage || '').toUpperCase();
    const wonStages = ['CLOSED_WON', 'DEAL_WON'];
    const hotStages = ['ORDER_CONFIRMED', 'QUOTATION_APPROVED', 'NEGOTIATION', 'PRICE_DISCUSSION', 'PAYMENT_DISCUSSION', 'PO_RECEIVED', 'LOI_PO_PENDING', 'DISPATCH_PENDING', 'PAYMENT_PENDING'];
    const warmStages = ['REQUIREMENT_CAPTURED', 'REQUIREMENT_RECEIVED', 'QUOTATION_SENT', 'QUOTATION_REQUIRED', 'SAMPLE_SENT', 'CONTACTED', 'LEAD_QUALIFICATION', 'FOLLOW_UP'];

    if (wonStages.includes(st)) score = 100;
    else if (hotStages.includes(st)) score += 45;
    else if (warmStages.includes(st)) score += 25;

    if (l.priority === 'HOT') score = Math.max(score, 85);
    else if (l.priority === 'WARM') score = Math.max(score, 55);

    if (Array.isArray(l.loiDocuments) && l.loiDocuments.length > 0) score += 20;
    if (l.quantity || l.value) score += 10;

    return Math.min(100, Math.max(0, score));
  };

  const calculatedScore = calculatePriorityScore(lead);

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen w-full bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] block pb-12">
      
      {/* Top Context Header Section */}
      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-ink-soft)]/10 py-6 px-4 md:px-8 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-[var(--crm-bg-sunken)]/40 backdrop-blur-sm">
        <div className="flex items-start space-x-4">
          <button onClick={() => navigate('/crm/leads')} className="text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)] mt-1 transition-colors cursor-pointer">
            <FiArrowLeft size={18} />
          </button>
          <div className="space-y-1 text-left">
            <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--crm-ink-faint)] font-bold block font-mono">MANIFEST DETAIL // {lead.leadCode}</span>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] uppercase tracking-tight">{lead.customerName}</h1>
              <span className="px-2 py-0.5 border text-[9px] font-mono font-bold uppercase bg-[var(--crm-bg-sunken)]/60 border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)]">
                {lead.stage.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <button onClick={() => setShowQuotationModal(true)} className="flex-1 md:flex-none justify-center bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] border border-[var(--crm-ink-soft)]/20 text-[11px] font-bold font-mono uppercase tracking-widest h-[42px] px-4 rounded-sm flex items-center space-x-1.5 transition-all cursor-pointer hover:border-[var(--crm-heading)]/40 hover:bg-[var(--crm-bg-raised)]">
            <FiFileText size={13} className="text-[var(--crm-ink-faint)]" /> <span>Request Quote</span>
          </button>
          <button onClick={() => setShowActivityModal(true)} className="flex-1 md:flex-none justify-center bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] border border-[var(--crm-ink-soft)]/20 text-[11px] font-bold font-mono uppercase tracking-widest h-[42px] px-4 rounded-sm flex items-center space-x-1.5 transition-all cursor-pointer hover:border-[var(--crm-heading)]/40 hover:bg-[var(--crm-bg-raised)]">
            <FiActivity size={13} className="text-[var(--crm-ink-faint)]" /> <span>Log Activity</span>
          </button>
          <button onClick={() => setShowWhatsAppModal(true)} className="flex-1 md:flex-none justify-center bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] border border-[var(--crm-ink-soft)]/20 text-[11px] font-bold font-mono uppercase tracking-widest h-[42px] px-4 rounded-sm flex items-center space-x-1.5 transition-all cursor-pointer hover:border-[var(--crm-heading)]/40 hover:bg-[var(--crm-bg-raised)]">
            <FiMessageCircle size={13} className="text-[var(--crm-ink-faint)]" /> <span>Log WhatsApp</span>
          </button>
          <button onClick={() => setShowEmailModal(true)} className="flex-1 md:flex-none justify-center bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] border border-[var(--crm-ink-soft)]/20 text-[11px] font-bold font-mono uppercase tracking-widest h-[42px] px-4 rounded-sm flex items-center space-x-1.5 transition-all cursor-pointer hover:border-[var(--crm-heading)]/40 hover:bg-[var(--crm-bg-raised)]">
            <FiMail size={13} className="text-[var(--crm-ink-faint)]" /> <span>Send Email</span>
          </button>
          {user?.role === 'ADMIN' && (
            <button onClick={handleDeleteLead} className="flex-1 md:flex-none justify-center bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border border-[var(--crm-danger)]/30 text-[11px] font-bold font-mono uppercase tracking-widest h-[42px] px-4 rounded-sm flex items-center space-x-1.5 transition-all cursor-pointer hover:bg-[var(--crm-danger-bg)]">
              <FiTrash2 size={13} /> <span>Delete Node</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Main Core Viewport Data Stream Frame */}
      <div className="w-full px-4 md:px-8 py-6 space-y-6">
        
        {/* Metric Specification Hex cards */}
        <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Telephony Line', val: revealedPhone || lead.phoneMasked || '••••• •••••', revealTarget: 'phone' },
            { label: 'Email Coordinates', val: revealedEmail || lead.emailMasked || '•••••', revealTarget: 'email' },
            { label: 'Commodity Sector', val: lead.productCategory },
            { label: 'Volume / Mass', val: lead.quantity || '—' },
            { label: 'Assigned Custodian', val: lead.assignedTo?.fullName || lead.assignedTo || 'Unassigned', accent: 'text-[var(--crm-info)]' },
            { label: 'Department Router', val: lead.assignedDepartment || 'None', accent: 'text-[var(--crm-accent)]' }
          ].map((item, i) => (
            <div key={i} className="bg-[var(--crm-bg-raised)]/30 border border-[var(--crm-ink-soft)]/15 p-3.5 flex flex-col justify-between min-h-[85px] rounded-sm text-left font-mono">
              <div className="flex justify-between items-start gap-1">
                <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold">{item.label}</span>
                {item.revealTarget && !(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'HR') && (
                  <button onClick={() => handleUnmaskClick(item.revealTarget)} className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] transition-colors cursor-pointer"><FiEye size={12} /></button>
                )}
              </div>
              <p className={`text-xs font-bold tracking-wide break-all mt-2 truncate ${item.accent || 'text-[var(--crm-heading)]'}`}>{item.val}</p>
            </div>
          ))}
        </motion.div>

        {/* Lead Classification & Temperature Control Panel */}
        <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 p-5 bg-[var(--crm-bg-raised)]/20 rounded-sm text-left font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--crm-ink-soft)]/10 pb-4 mb-4">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold block mb-0.5">CLASSIFICATION MATRIX</span>
              <h3 className="text-base font-serif font-normal text-[var(--crm-heading)] flex items-center gap-2">
                Lead Temperature Status: 
                <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded border ${
                  lead.priority === 'HOT' ? 'bg-rose-950/80 text-rose-400 border-rose-800/60' :
                  lead.priority === 'WARM' ? 'bg-amber-950/80 text-amber-400 border-amber-800/60' :
                  'bg-cyan-950/80 text-cyan-400 border-cyan-800/60'
                }`}>
                  {lead.priority === 'HOT' ? 'HOT 🔥' : lead.priority === 'WARM' ? 'WARM ⚡' : 'COLD ❄️'}
                </span>
              </h3>
            </div>
            
            {/* Manual Temperature Override Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold">Manual Override:</span>
              <select
                value={lead.priority || 'WARM'}
                disabled={updatingPriority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="px-3 py-1.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs font-bold rounded-sm text-[var(--crm-heading)] outline-none cursor-pointer"
              >
                <option value="HOT" className="bg-[var(--crm-bg)] text-rose-400">HOT 🔥 (High Priority)</option>
                <option value="WARM" className="bg-[var(--crm-bg)] text-amber-400">WARM ⚡ (Medium Priority)</option>
                <option value="COLD" className="bg-[var(--crm-bg)] text-cyan-400">COLD ❄️ (Low Priority)</option>
                <option value="FAKE" className="bg-[var(--crm-bg)] text-gray-400">FAKE (Invalid Lead)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <span className="text-[10px] text-[var(--crm-ink-faint)] block uppercase mb-1 font-bold">Priority Score Metric</span>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-[var(--crm-positive)]">{calculatedScore} / 100</span>
                <div className="flex-1 bg-[var(--crm-bg)] h-2 border border-[var(--crm-ink-soft)]/15 rounded-xs overflow-hidden">
                  <div className={`h-full transition-all ${
                    calculatedScore >= 80 ? 'bg-rose-500' : calculatedScore >= 40 ? 'bg-amber-400' : 'bg-cyan-400'
                  }`} style={{ width: `${Math.min(100, calculatedScore)}%` }} />
                </div>
              </div>
            </div>

            <div className="p-3 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/10 rounded-sm text-xs space-y-1">
              <span className="text-[9px] text-[var(--crm-ink-faint)] uppercase font-bold block">Evaluation Rule Breakdown</span>
              <p className="text-[11px] text-[var(--crm-ink-soft)]">
                {lead.priority === 'HOT' ? '• Order Volume/LOI/Advance Payment agreed. High chance of conversion.' :
                 lead.priority === 'WARM' ? '• Active requirement captured. Quotation/Sample pending discussion.' :
                 '• Inbound inquiry requiring nurturing or preliminary qualification call.'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Task Management Router Pane */}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'HR') && (
          <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 p-5 bg-[var(--crm-bg-raised)]/20 rounded-sm text-left">
            <div className="mb-4">
              <span className="text-[9px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold block mb-0.5 font-mono">ROUTING CORE</span>
              <h3 className="text-base font-serif font-normal text-[var(--crm-heading)]">Assign Task / Lead Matrix</h3>
            </div>
            <form onSubmit={handleAssign} className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="w-full lg:flex-1">
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1.5 font-mono">Assign to Employee</label>
                <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 text-xs rounded-sm outline-none text-[var(--crm-heading)] focus:border-[var(--crm-heading)]/40 font-mono cursor-pointer">
                  <option value="" className="bg-[var(--crm-bg)]">Select Employee (Unassigned)</option>
                  {users.map((u) => <option key={u._id} value={u._id} className="bg-[var(--crm-bg)] text-[var(--crm-ink-soft)]">{u.fullName} ({u.role} - {u.department})</option>)}
                </select>
              </div>
              <div className="w-full lg:flex-1">
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1.5 font-mono">Assign to Department</label>
                <select value={deptAssignee} onChange={(e) => setDeptAssignee(e.target.value)} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 text-xs rounded-sm outline-none text-[var(--crm-heading)] focus:border-[var(--crm-heading)]/40 font-mono cursor-pointer">
                  <option value="" className="bg-[var(--crm-bg)]">Select Department (None)</option>
                  {departments.map((dept) => <option key={dept} value={dept} className="bg-[var(--crm-bg)] text-[var(--crm-ink-soft)]">{dept}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isAssigning} className="w-full lg:w-auto bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] text-[11px] font-bold uppercase tracking-widest px-6 h-[40px] rounded-sm transition-all cursor-pointer whitespace-nowrap font-mono hover:bg-[var(--crm-ink-soft)]">
                {isAssigning ? 'Synchronizing...' : 'Update Assignment'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Stage Management Linear Tracker */}
        <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg-raised)]/20 p-5 rounded-sm text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--crm-ink-soft)]/10 pb-4 mb-6">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold block mb-0.5 font-mono">PROGRESS MECHANISM</span>
              <h3 className="text-base font-serif font-normal text-[var(--crm-heading)]">Lead Progression Pipeline</h3>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1 min-w-[180px] font-mono">
              <div className="flex justify-between w-full text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)]">
                <span>Pipeline Index</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="w-full bg-[var(--crm-bg)] h-1.5 border border-[var(--crm-ink-soft)]/15 rounded-xs overflow-hidden">
                <div className={`h-full transition-all duration-500 ease-out ${isClosedWon ? 'bg-[var(--crm-positive)]' : isClosedLost ? 'bg-[var(--crm-danger)]' : 'bg-[var(--crm-heading)]'}`} style={{ width: `${progressPercent}%` }}/>
              </div>
            </div>
          </div>

          {/* Table Timeline Ribbon Slider */}
          <div className="overflow-x-auto pb-2 custom-scrollbar">
            <div className="flex items-center min-w-[1100px] justify-between relative px-1">
              {activeStages.map((stage, idx) => {
                const details = stageDetails[stage] || { label: stage, icon: FiStar };
                const StageIcon = details.icon;
                const isCurrent = currentStage === stage;
                const isCompleted = isClosedWon || isClosedLost || activeStages.indexOf(currentStage) > idx;
                const isClickable = allowedTransitions[currentStage]?.includes(stage);
                
                let currentStyle = isCurrent ? "border-[var(--crm-heading)] bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] font-bold"
                                  : isCompleted ? "border-[var(--crm-positive)]/30 bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] opacity-80"
                                  : isClickable ? "border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] hover:border-[var(--crm-heading)]/50 cursor-pointer"
                                  : "border-[var(--crm-ink-soft)]/10 bg-[var(--crm-bg)]/40 text-[var(--crm-ink-faint)] opacity-30 cursor-not-allowed";

                return (
                  <React.Fragment key={stage}>
                    <button onClick={() => isClickable && handleStageChange(stage)} disabled={!isClickable} className={`flex flex-col items-center justify-center p-2.5 border text-center transition-all duration-150 flex-1 mx-1 rounded-sm select-none focus:outline-none min-w-[90px] font-mono ${currentStyle}`}>
                      <StageIcon className="w-4 h-4 mb-1" />
                      <span className="text-[9px] font-bold tracking-wide uppercase truncate max-w-full">{details.label}</span>
                    </button>
                    {idx < activeStages.length - 1 && (
                      <div className={`h-[1px] w-4 shrink-0 ${isCompleted ? 'bg-[var(--crm-positive)]/40' : 'bg-[var(--crm-ink-soft)]/15'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Deal Outcome Terminals */}
          <div className="mt-6 pt-4 border-t border-[var(--crm-ink-soft)]/10 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
            {['CLOSED_WON', 'CLOSED_LOST'].map((outcome) => {
              const isWon = outcome === 'CLOSED_WON';
              const isTargetActive = currentStage === outcome;
              const canTransition = allowedTransitions[currentStage]?.includes(outcome);
              
              let outcomeStyle = isTargetActive 
                ? (isWon ? 'border-[var(--crm-positive)]/50 bg-[var(--crm-positive-bg)] text-[var(--crm-positive)]' : 'border-[var(--crm-danger)]/50 bg-[var(--crm-danger-bg)] text-[var(--crm-danger)]')
                : canTransition 
                ? 'border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] hover:border-[var(--crm-heading)]/40 cursor-pointer text-[var(--crm-ink-soft)]'
                : 'border-[var(--crm-ink-soft)]/10 bg-[var(--crm-bg)]/30 opacity-40 cursor-not-allowed text-[var(--crm-ink-faint)]';

              return (
                <button key={outcome} onClick={() => canTransition && handleStageChange(outcome)} disabled={isTargetActive || !canTransition} className={`flex items-center justify-between p-4 border rounded-sm text-left transition-all duration-200 focus:outline-none ${outcomeStyle}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 bg-[var(--crm-bg-raised)] ${isTargetActive ? (isWon ? 'text-[var(--crm-positive)]' : 'text-[var(--crm-danger)]') : 'text-[var(--crm-ink-faint)]'}`}>
                      {isWon ? <FiAward size={18} /> : <FiXCircle size={18} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--crm-heading)]">{isWon ? 'Closed Won' : 'Closed Lost'}</h4>
                      <p className="text-[10px] text-[var(--crm-ink-faint)] mt-0.5">{isWon ? 'Lead converted into verified customer node' : 'Lead dropped or qualified out'}</p>
                    </div>
                  </div>
                  {isTargetActive && <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border border-current">Active Outcome</span>}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Activity Timeline Records */}
        <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 p-5 bg-[var(--crm-bg-raised)]/20 rounded-sm text-left">
          <div className="mb-4 flex items-center justify-between border-b border-[var(--crm-ink-soft)]/10 pb-3">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold block mb-0.5 font-mono">AUDIT TRAIL</span>
              <h3 className="text-base font-serif font-normal text-[var(--crm-heading)]">Activity Timeline Stream</h3>
            </div>
            <FiCompass className="text-[var(--crm-ink-faint)]" size={15} />
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {activities.length === 0 ? (
              <p className="text-xs tracking-wide text-center py-8 text-[var(--crm-ink-faint)] font-mono uppercase">No activity records mapped inside this lead node.</p>
            ) : (
              activities.map((act) => (
                <div key={act._id} className="border-l border-[var(--crm-ink-soft)]/20 pl-4 py-1 text-left font-mono">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <span className="font-bold uppercase tracking-wider text-[var(--crm-heading)] text-xs">{act.actionType.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-[var(--crm-ink-faint)]">{new Date(act.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-[var(--crm-ink-soft)] leading-relaxed font-sans">{act.note}</p>
                  {act.nextFollowupAt && (
                    <p className="text-[10px] text-[var(--crm-warning)] font-bold uppercase tracking-wide mt-1">Next Scheduled Interface: {new Date(act.nextFollowupAt).toLocaleDateString()}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Overlays / Modals Interface Layer */}
      <AnimatePresence>
        {/* 1. Add Activity Modal */}
        {showActivityModal && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/15 rounded-sm p-6 w-full max-w-md relative text-[var(--crm-ink-soft)] text-left">
              <h3 className="text-base font-serif mb-4 uppercase tracking-wide border-b border-[var(--crm-ink-soft)]/10 pb-3 text-[var(--crm-heading)]">Log Activity Action</h3>
              <form onSubmit={handleAddActivity} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1.5">Action Type</label>
                  <select value={newActivity.actionType} onChange={(e) => setNewActivity({ ...newActivity, actionType: e.target.value })} className="w-full p-2.5 border border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] text-[var(--crm-heading)] rounded-sm outline-none cursor-pointer">
                    <option value="FOLLOW_UP" className="bg-[var(--crm-bg)]">Follow Up</option>
                    <option value="CALL" className="bg-[var(--crm-bg)]">Call</option>
                    <option value="EMAIL" className="bg-[var(--crm-bg)]">Email</option>
                    <option value="MEETING" className="bg-[var(--crm-bg)]">Meeting</option>
                    <option value="NOTE" className="bg-[var(--crm-bg)]">Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1.5">Operational Summary Note</label>
                  <textarea required rows="3" value={newActivity.note} onChange={(e) => setNewActivity({ ...newActivity, note: e.target.value })} className="w-full p-2.5 border border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] text-[var(--crm-heading)] rounded-sm outline-none resize-none font-sans" placeholder="Log interaction specifics..."/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1.5">Target Next Interface Schedule</label>
                  <input type="datetime-local" value={newActivity.nextFollowupAt} onChange={(e) => setNewActivity({ ...newActivity, nextFollowupAt: e.target.value })} className="w-full p-2.5 border border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] text-[var(--crm-heading)] rounded-sm outline-none"/>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[var(--crm-ink-soft)] transition-colors">Commit</button>
                  <button type="button" onClick={() => setShowActivityModal(false)} className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[var(--crm-bg-raised)] transition-colors">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 1b. Log WhatsApp Modal */}
        {showWhatsAppModal && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/15 rounded-sm p-6 w-full max-w-md relative text-[var(--crm-ink-soft)] text-left">
              <h3 className="text-base font-serif mb-4 uppercase tracking-wide border-b border-[var(--crm-ink-soft)]/10 pb-3 text-[var(--crm-heading)]">Log WhatsApp Activity</h3>
              <form onSubmit={handleLogWhatsApp} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1.5">Message Sent</label>
                  <textarea rows="3" value={whatsAppMessage} onChange={(e) => setWhatsAppMessage(e.target.value)} className="w-full p-2.5 border border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] text-[var(--crm-heading)] rounded-sm outline-none resize-none font-sans" placeholder="e.g. Sent quotation template via WhatsApp..."/>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={sendingWhatsApp} className="flex-1 bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[var(--crm-ink-soft)] transition-colors disabled:opacity-50">{sendingWhatsApp ? 'Logging...' : 'Log Activity'}</button>
                  <button type="button" onClick={() => setShowWhatsAppModal(false)} className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[var(--crm-bg-raised)] transition-colors">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 1c. Send Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/15 rounded-sm p-6 w-full max-w-md relative text-[var(--crm-ink-soft)] text-left">
              <h3 className="text-base font-serif mb-4 uppercase tracking-wide border-b border-[var(--crm-ink-soft)]/10 pb-3 text-[var(--crm-heading)]">Send Email</h3>
              <form onSubmit={handleSendEmail} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1.5">Subject *</label>
                  <input type="text" required value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} className="w-full p-2.5 border border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] text-[var(--crm-heading)] rounded-sm outline-none font-sans" placeholder="Email subject"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1.5">Body *</label>
                  <textarea required rows="4" value={emailForm.body} onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })} className="w-full p-2.5 border border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] text-[var(--crm-heading)] rounded-sm outline-none resize-none font-sans" placeholder="Email body..."/>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={sendingEmail} className="flex-1 bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[var(--crm-ink-soft)] transition-colors disabled:opacity-50">{sendingEmail ? 'Sending...' : 'Send Email'}</button>
                  <button type="button" onClick={() => setShowEmailModal(false)} className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[var(--crm-bg-raised)] transition-colors">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 2. Request Quotation Modal */}
        {showQuotationModal && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/15 rounded-sm p-6 w-full max-w-md relative text-[var(--crm-ink-soft)] text-left">
              <h3 className="text-base font-serif mb-4 uppercase tracking-wide border-b border-[var(--crm-ink-soft)]/10 pb-3 text-[var(--crm-heading)]">Request Trade Valuation</h3>
              <form onSubmit={handleRequestQuotation} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1.5">Target Base Value (₹) *</label>
                  <input type="number" required value={quotationData.employeeRequestedPrice} onChange={(e) => setQuotationData({ ...quotationData, employeeRequestedPrice: e.target.value })} className="w-full p-2.5 border border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] text-[var(--crm-heading)] rounded-sm outline-none" placeholder="Specify baseline transaction valuation"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1.5">Payment Protocols</label>
                  <input type="text" value={quotationData.paymentTerms} onChange={(e) => setQuotationData({ ...quotationData, paymentTerms: e.target.value })} className="w-full p-2.5 border border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] text-[var(--crm-heading)] rounded-sm outline-none font-sans" placeholder="e.g. 30% advance deposit tier"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1.5">Validity Lifecycle (Days)</label>
                  <input type="number" value={quotationData.validityDays} onChange={(e) => setQuotationData({ ...quotationData, validityDays: e.target.value })} className="w-full p-2.5 border border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] text-[var(--crm-heading)] rounded-sm outline-none"/>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[var(--crm-ink-soft)] transition-colors">Submit Quote</button>
                  <button type="button" onClick={() => setShowQuotationModal(false)} className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[var(--crm-bg-raised)] transition-colors">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 3. Security Access Audit Warning Modal */}
        {showWarningModal && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-[var(--crm-bg-raised)] border border-[var(--crm-danger)]/30 rounded-sm p-6 w-full max-w-md relative text-[var(--crm-ink-soft)] text-left">
              <div className="flex items-center space-x-2.5 mb-3 text-[var(--crm-danger)] font-mono"><FiShield size={18} /><h3 className="text-base font-serif uppercase tracking-wide">Security Access Protocol</h3></div>
              <p className="text-xs text-[var(--crm-ink-faint)] leading-relaxed mb-4 font-sans">WARNING: Unmasking raw database coordinates is tracked in global audit nodes. Enter a clear business justification to reveal this telemetry line.</p>
              <form onSubmit={handleRevealSubmit} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1.5">Justification Token Entry</label>
                  <textarea required rows="3" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-2.5 border border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] text-[var(--crm-heading)] rounded-sm outline-none resize-none font-sans" placeholder="e.g. Reviewing dispatch schedules directly with client..."/>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border border-[var(--crm-danger)]/30 py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[var(--crm-danger-bg)] transition-colors">Confirm Reveal</button>
                  <button type="button" onClick={() => { setShowWarningModal(false); setReason(''); }} className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[var(--crm-bg-raised)] transition-colors">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}