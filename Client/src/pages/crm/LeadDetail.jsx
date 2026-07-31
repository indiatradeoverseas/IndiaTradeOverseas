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
    <div className="min-h-screen bg-[#0E1116] flex items-center justify-center">
      <div className="w-12 h-[1px] bg-[#C5CBD3]/40 animate-pulse" />
    </div>
  );

  if (!lead) return (
    <div className="text-center py-20 text-xs uppercase tracking-widest text-[#6D7886] font-mono bg-[#0E1116] min-h-screen">
      Lead manifest record not mapped.
    </div>
  );

  const currentStage = lead.stage;
  const isClosedWon = currentStage === 'CLOSED_WON' || currentStage === 'DEAL_WON';
  const isClosedLost = currentStage === 'CLOSED_LOST' || currentStage === 'DEAL_LOST';
  const currentStepIndex = activeStages.includes(currentStage) ? activeStages.indexOf(currentStage) : (isClosedWon || isClosedLost ? activeStages.length : 0);
  const progressPercent = Math.min(100, Math.max(0, (currentStepIndex / activeStages.length) * 100));

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen w-full bg-[#0E1116] text-[#C5CBD3] block pb-12">
      
      {/* Top Context Header Section */}
      <motion.div variants={blockVariants} className="w-full border-b border-[#C5CBD3]/10 py-6 px-4 md:px-8 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-[#040A12]/40 backdrop-blur-sm">
        <div className="flex items-start space-x-4">
          <button onClick={() => navigate('/crm/leads')} className="text-[#C5CBD3] hover:text-[#F2F4F7] mt-1 transition-colors cursor-pointer">
            <FiArrowLeft size={18} />
          </button>
          <div className="space-y-1 text-left">
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#6D7886] font-bold block font-mono">MANIFEST DETAIL // {lead.leadCode}</span>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F2F4F7] uppercase tracking-tight">{lead.customerName}</h1>
              <span className="px-2 py-0.5 border text-[9px] font-mono font-bold uppercase bg-[#040A12]/60 border-[#C5CBD3]/10 text-[#C5CBD3]">
                {lead.stage.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <button onClick={() => setShowQuotationModal(true)} className="flex-1 md:flex-none justify-center bg-[#0E1116] text-[#C5CBD3] border border-[#C5CBD3]/20 text-[11px] font-bold font-mono uppercase tracking-widest h-[42px] px-4 rounded-sm flex items-center space-x-1.5 transition-all cursor-pointer hover:border-[#F2F4F7]/40 hover:bg-[#121D29]">
            <FiFileText size={13} className="text-[#6D7886]" /> <span>Request Quote</span>
          </button>
          <button onClick={() => setShowActivityModal(true)} className="flex-1 md:flex-none justify-center bg-[#0E1116] text-[#C5CBD3] border border-[#C5CBD3]/20 text-[11px] font-bold font-mono uppercase tracking-widest h-[42px] px-4 rounded-sm flex items-center space-x-1.5 transition-all cursor-pointer hover:border-[#F2F4F7]/40 hover:bg-[#121D29]">
            <FiActivity size={13} className="text-[#6D7886]" /> <span>Log Activity</span>
          </button>
          <button onClick={() => setShowWhatsAppModal(true)} className="flex-1 md:flex-none justify-center bg-[#0E1116] text-[#C5CBD3] border border-[#C5CBD3]/20 text-[11px] font-bold font-mono uppercase tracking-widest h-[42px] px-4 rounded-sm flex items-center space-x-1.5 transition-all cursor-pointer hover:border-[#F2F4F7]/40 hover:bg-[#121D29]">
            <FiMessageCircle size={13} className="text-[#6D7886]" /> <span>Log WhatsApp</span>
          </button>
          <button onClick={() => setShowEmailModal(true)} className="flex-1 md:flex-none justify-center bg-[#0E1116] text-[#C5CBD3] border border-[#C5CBD3]/20 text-[11px] font-bold font-mono uppercase tracking-widest h-[42px] px-4 rounded-sm flex items-center space-x-1.5 transition-all cursor-pointer hover:border-[#F2F4F7]/40 hover:bg-[#121D29]">
            <FiMail size={13} className="text-[#6D7886]" /> <span>Send Email</span>
          </button>
          {user?.role === 'ADMIN' && (
            <button onClick={handleDeleteLead} className="flex-1 md:flex-none justify-center bg-rose-950/40 text-rose-400 border border-rose-500/30 text-[11px] font-bold font-mono uppercase tracking-widest h-[42px] px-4 rounded-sm flex items-center space-x-1.5 transition-all cursor-pointer hover:bg-rose-900/60">
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
            { label: 'Assigned Custodian', val: lead.assignedTo?.fullName || lead.assignedTo || 'Unassigned', accent: 'text-sky-400' },
            { label: 'Department Router', val: lead.assignedDepartment || 'None', accent: 'text-indigo-400' }
          ].map((item, i) => (
            <div key={i} className="bg-[#121D29]/30 border border-[#C5CBD3]/15 p-3.5 flex flex-col justify-between min-h-[85px] rounded-sm text-left font-mono">
              <div className="flex justify-between items-start gap-1">
                <span className="text-[9px] uppercase tracking-wider text-[#6D7886] font-bold">{item.label}</span>
                {item.revealTarget && !(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'HR') && (
                  <button onClick={() => handleUnmaskClick(item.revealTarget)} className="text-[#6D7886] hover:text-[#F2F4F7] transition-colors cursor-pointer"><FiEye size={12} /></button>
                )}
              </div>
              <p className={`text-xs font-bold tracking-wide break-all mt-2 truncate ${item.accent || 'text-[#F2F4F7]'}`}>{item.val}</p>
            </div>
          ))}
        </motion.div>

        {/* Task Management Router Pane */}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'HR') && (
          <motion.div variants={blockVariants} className="border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm text-left">
            <div className="mb-4">
              <span className="text-[9px] uppercase tracking-widest text-[#6D7886] font-bold block mb-0.5 font-mono">ROUTING CORE</span>
              <h3 className="text-base font-serif font-normal text-[#F2F4F7]">Assign Task / Lead Matrix</h3>
            </div>
            <form onSubmit={handleAssign} className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="w-full lg:flex-1">
                <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-wider mb-1.5 font-mono">Assign to Employee</label>
                <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/15 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 font-mono cursor-pointer">
                  <option value="" className="bg-[#0E1116]">Select Employee (Unassigned)</option>
                  {users.map((u) => <option key={u._id} value={u._id} className="bg-[#0E1116] text-[#C5CBD3]">{u.fullName} ({u.role} - {u.department})</option>)}
                </select>
              </div>
              <div className="w-full lg:flex-1">
                <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-wider mb-1.5 font-mono">Assign to Department</label>
                <select value={deptAssignee} onChange={(e) => setDeptAssignee(e.target.value)} className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/15 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 font-mono cursor-pointer">
                  <option value="" className="bg-[#0E1116]">Select Department (None)</option>
                  {departments.map((dept) => <option key={dept} value={dept} className="bg-[#0E1116] text-[#C5CBD3]">{dept}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isAssigning} className="w-full lg:w-auto bg-[#F2F4F7] text-[#040A12] text-[11px] font-bold uppercase tracking-widest px-6 h-[40px] rounded-sm transition-all cursor-pointer whitespace-nowrap font-mono hover:bg-[#C5CBD3]">
                {isAssigning ? 'Synchronizing...' : 'Update Assignment'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Stage Management Linear Tracker */}
        <motion.div variants={blockVariants} className="border border-[#C5CBD3]/15 bg-[#121D29]/20 p-5 rounded-sm text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C5CBD3]/10 pb-4 mb-6">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-[#6D7886] font-bold block mb-0.5 font-mono">PROGRESS MECHANISM</span>
              <h3 className="text-base font-serif font-normal text-[#F2F4F7]">Lead Progression Pipeline</h3>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1 min-w-[180px] font-mono">
              <div className="flex justify-between w-full text-[10px] font-bold uppercase tracking-wider text-[#6D7886]">
                <span>Pipeline Index</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="w-full bg-[#0E1116] h-1.5 border border-[#C5CBD3]/15 rounded-xs overflow-hidden">
                <div className={`h-full transition-all duration-500 ease-out ${isClosedWon ? 'bg-emerald-400' : isClosedLost ? 'bg-rose-500' : 'bg-[#F2F4F7]'}`} style={{ width: `${progressPercent}%` }}/>
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
                
                let currentStyle = isCurrent ? "border-[#F2F4F7] bg-[#121D29] text-[#F2F4F7] font-bold"
                                  : isCompleted ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400 opacity-80"
                                  : isClickable ? "border-[#C5CBD3]/20 bg-[#0E1116] text-[#C5CBD3] hover:border-[#F2F4F7]/50 cursor-pointer"
                                  : "border-[#C5CBD3]/10 bg-[#0E1116]/40 text-[#6D7886] opacity-30 cursor-not-allowed";

                return (
                  <React.Fragment key={stage}>
                    <button onClick={() => isClickable && handleStageChange(stage)} disabled={!isClickable} className={`flex flex-col items-center justify-center p-2.5 border text-center transition-all duration-150 flex-1 mx-1 rounded-sm select-none focus:outline-none min-w-[90px] font-mono ${currentStyle}`}>
                      <StageIcon className="w-4 h-4 mb-1" />
                      <span className="text-[9px] font-bold tracking-wide uppercase truncate max-w-full">{details.label}</span>
                    </button>
                    {idx < activeStages.length - 1 && (
                      <div className={`h-[1px] w-4 shrink-0 ${isCompleted ? 'bg-emerald-500/40' : 'bg-[#C5CBD3]/15'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Deal Outcome Terminals */}
          <div className="mt-6 pt-4 border-t border-[#C5CBD3]/10 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
            {['CLOSED_WON', 'CLOSED_LOST'].map((outcome) => {
              const isWon = outcome === 'CLOSED_WON';
              const isTargetActive = currentStage === outcome;
              const canTransition = allowedTransitions[currentStage]?.includes(outcome);
              
              let outcomeStyle = isTargetActive 
                ? (isWon ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-400' : 'border-rose-500/50 bg-rose-950/30 text-rose-400')
                : canTransition 
                ? 'border-[#C5CBD3]/20 bg-[#0E1116] hover:border-[#F2F4F7]/40 cursor-pointer text-[#C5CBD3]'
                : 'border-[#C5CBD3]/10 bg-[#0E1116]/30 opacity-40 cursor-not-allowed text-[#6D7886]';

              return (
                <button key={outcome} onClick={() => canTransition && handleStageChange(outcome)} disabled={isTargetActive || !canTransition} className={`flex items-center justify-between p-4 border rounded-sm text-left transition-all duration-200 focus:outline-none ${outcomeStyle}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 bg-[#121D29] ${isTargetActive ? (isWon ? 'text-emerald-400' : 'text-rose-400') : 'text-[#6D7886]'}`}>
                      {isWon ? <FiAward size={18} /> : <FiXCircle size={18} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[#F2F4F7]">{isWon ? 'Closed Won' : 'Closed Lost'}</h4>
                      <p className="text-[10px] text-[#6D7886] mt-0.5">{isWon ? 'Lead converted into verified customer node' : 'Lead dropped or qualified out'}</p>
                    </div>
                  </div>
                  {isTargetActive && <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border border-current">Active Outcome</span>}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Activity Timeline Records */}
        <motion.div variants={blockVariants} className="border border-[#C5CBD3]/15 p-5 bg-[#121D29]/20 rounded-sm text-left">
          <div className="mb-4 flex items-center justify-between border-b border-[#C5CBD3]/10 pb-3">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-[#6D7886] font-bold block mb-0.5 font-mono">AUDIT TRAIL</span>
              <h3 className="text-base font-serif font-normal text-[#F2F4F7]">Activity Timeline Stream</h3>
            </div>
            <FiCompass className="text-[#6D7886]" size={15} />
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {activities.length === 0 ? (
              <p className="text-xs tracking-wide text-center py-8 text-[#6D7886] font-mono uppercase">No activity records mapped inside this lead node.</p>
            ) : (
              activities.map((act) => (
                <div key={act._id} className="border-l border-[#C5CBD3]/20 pl-4 py-1 text-left font-mono">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <span className="font-bold uppercase tracking-wider text-[#F2F4F7] text-xs">{act.actionType.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-[#6D7886]">{new Date(act.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-[#C5CBD3] leading-relaxed font-sans">{act.note}</p>
                  {act.nextFollowupAt && (
                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wide mt-1">Next Scheduled Interface: {new Date(act.nextFollowupAt).toLocaleDateString()}</p>
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
          <div className="fixed inset-0 bg-[#040A12]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-[#121D29] border border-[#C5CBD3]/15 rounded-sm p-6 w-full max-w-md relative text-[#C5CBD3] text-left">
              <h3 className="text-base font-serif mb-4 uppercase tracking-wide border-b border-[#C5CBD3]/10 pb-3 text-[#F2F4F7]">Log Activity Action</h3>
              <form onSubmit={handleAddActivity} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6D7886] mb-1.5">Action Type</label>
                  <select value={newActivity.actionType} onChange={(e) => setNewActivity({ ...newActivity, actionType: e.target.value })} className="w-full p-2.5 border border-[#C5CBD3]/20 bg-[#0E1116] text-[#F2F4F7] rounded-sm outline-none cursor-pointer">
                    <option value="FOLLOW_UP" className="bg-[#0E1116]">Follow Up</option>
                    <option value="CALL" className="bg-[#0E1116]">Call</option>
                    <option value="EMAIL" className="bg-[#0E1116]">Email</option>
                    <option value="MEETING" className="bg-[#0E1116]">Meeting</option>
                    <option value="NOTE" className="bg-[#0E1116]">Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6D7886] mb-1.5">Operational Summary Note</label>
                  <textarea required rows="3" value={newActivity.note} onChange={(e) => setNewActivity({ ...newActivity, note: e.target.value })} className="w-full p-2.5 border border-[#C5CBD3]/20 bg-[#0E1116] text-[#F2F4F7] rounded-sm outline-none resize-none font-sans" placeholder="Log interaction specifics..."/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6D7886] mb-1.5">Target Next Interface Schedule</label>
                  <input type="datetime-local" value={newActivity.nextFollowupAt} onChange={(e) => setNewActivity({ ...newActivity, nextFollowupAt: e.target.value })} className="w-full p-2.5 border border-[#C5CBD3]/20 bg-[#0E1116] text-[#F2F4F7] rounded-sm outline-none"/>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-[#F2F4F7] text-[#040A12] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[#C5CBD3] transition-colors">Commit</button>
                  <button type="button" onClick={() => setShowActivityModal(false)} className="flex-1 bg-[#0E1116] border border-[#C5CBD3]/20 text-[#C5CBD3] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[#121D29] transition-colors">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 1b. Log WhatsApp Modal */}
        {showWhatsAppModal && (
          <div className="fixed inset-0 bg-[#040A12]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-[#121D29] border border-[#C5CBD3]/15 rounded-sm p-6 w-full max-w-md relative text-[#C5CBD3] text-left">
              <h3 className="text-base font-serif mb-4 uppercase tracking-wide border-b border-[#C5CBD3]/10 pb-3 text-[#F2F4F7]">Log WhatsApp Activity</h3>
              <form onSubmit={handleLogWhatsApp} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6D7886] mb-1.5">Message Sent</label>
                  <textarea rows="3" value={whatsAppMessage} onChange={(e) => setWhatsAppMessage(e.target.value)} className="w-full p-2.5 border border-[#C5CBD3]/20 bg-[#0E1116] text-[#F2F4F7] rounded-sm outline-none resize-none font-sans" placeholder="e.g. Sent quotation template via WhatsApp..."/>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={sendingWhatsApp} className="flex-1 bg-[#F2F4F7] text-[#040A12] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[#C5CBD3] transition-colors disabled:opacity-50">{sendingWhatsApp ? 'Logging...' : 'Log Activity'}</button>
                  <button type="button" onClick={() => setShowWhatsAppModal(false)} className="flex-1 bg-[#0E1116] border border-[#C5CBD3]/20 text-[#C5CBD3] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[#121D29] transition-colors">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 1c. Send Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-[#040A12]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-[#121D29] border border-[#C5CBD3]/15 rounded-sm p-6 w-full max-w-md relative text-[#C5CBD3] text-left">
              <h3 className="text-base font-serif mb-4 uppercase tracking-wide border-b border-[#C5CBD3]/10 pb-3 text-[#F2F4F7]">Send Email</h3>
              <form onSubmit={handleSendEmail} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6D7886] mb-1.5">Subject *</label>
                  <input type="text" required value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} className="w-full p-2.5 border border-[#C5CBD3]/20 bg-[#0E1116] text-[#F2F4F7] rounded-sm outline-none font-sans" placeholder="Email subject"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6D7886] mb-1.5">Body *</label>
                  <textarea required rows="4" value={emailForm.body} onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })} className="w-full p-2.5 border border-[#C5CBD3]/20 bg-[#0E1116] text-[#F2F4F7] rounded-sm outline-none resize-none font-sans" placeholder="Email body..."/>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={sendingEmail} className="flex-1 bg-[#F2F4F7] text-[#040A12] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[#C5CBD3] transition-colors disabled:opacity-50">{sendingEmail ? 'Sending...' : 'Send Email'}</button>
                  <button type="button" onClick={() => setShowEmailModal(false)} className="flex-1 bg-[#0E1116] border border-[#C5CBD3]/20 text-[#C5CBD3] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[#121D29] transition-colors">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 2. Request Quotation Modal */}
        {showQuotationModal && (
          <div className="fixed inset-0 bg-[#040A12]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-[#121D29] border border-[#C5CBD3]/15 rounded-sm p-6 w-full max-w-md relative text-[#C5CBD3] text-left">
              <h3 className="text-base font-serif mb-4 uppercase tracking-wide border-b border-[#C5CBD3]/10 pb-3 text-[#F2F4F7]">Request Trade Valuation</h3>
              <form onSubmit={handleRequestQuotation} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6D7886] mb-1.5">Target Base Value (₹) *</label>
                  <input type="number" required value={quotationData.employeeRequestedPrice} onChange={(e) => setQuotationData({ ...quotationData, employeeRequestedPrice: e.target.value })} className="w-full p-2.5 border border-[#C5CBD3]/20 bg-[#0E1116] text-[#F2F4F7] rounded-sm outline-none" placeholder="Specify baseline transaction valuation"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6D7886] mb-1.5">Payment Protocols</label>
                  <input type="text" value={quotationData.paymentTerms} onChange={(e) => setQuotationData({ ...quotationData, paymentTerms: e.target.value })} className="w-full p-2.5 border border-[#C5CBD3]/20 bg-[#0E1116] text-[#F2F4F7] rounded-sm outline-none font-sans" placeholder="e.g. 30% advance deposit tier"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6D7886] mb-1.5">Validity Lifecycle (Days)</label>
                  <input type="number" value={quotationData.validityDays} onChange={(e) => setQuotationData({ ...quotationData, validityDays: e.target.value })} className="w-full p-2.5 border border-[#C5CBD3]/20 bg-[#0E1116] text-[#F2F4F7] rounded-sm outline-none"/>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-[#F2F4F7] text-[#040A12] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[#C5CBD3] transition-colors">Submit Quote</button>
                  <button type="button" onClick={() => setShowQuotationModal(false)} className="flex-1 bg-[#0E1116] border border-[#C5CBD3]/20 text-[#C5CBD3] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[#121D29] transition-colors">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 3. Security Access Audit Warning Modal */}
        {showWarningModal && (
          <div className="fixed inset-0 bg-[#040A12]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-[#121D29] border border-rose-500/30 rounded-sm p-6 w-full max-w-md relative text-[#C5CBD3] text-left">
              <div className="flex items-center space-x-2.5 mb-3 text-rose-400 font-mono"><FiShield size={18} /><h3 className="text-base font-serif uppercase tracking-wide">Security Access Protocol</h3></div>
              <p className="text-xs text-[#6D7886] leading-relaxed mb-4 font-sans">WARNING: Unmasking raw database coordinates is tracked in global audit nodes. Enter a clear business justification to reveal this telemetry line.</p>
              <form onSubmit={handleRevealSubmit} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6D7886] mb-1.5">Justification Token Entry</label>
                  <textarea required rows="3" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-2.5 border border-[#C5CBD3]/20 bg-[#0E1116] text-[#F2F4F7] rounded-sm outline-none resize-none font-sans" placeholder="e.g. Reviewing dispatch schedules directly with client..."/>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-rose-950/60 text-rose-300 border border-rose-500/30 py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-rose-900/80 transition-colors">Confirm Reveal</button>
                  <button type="button" onClick={() => { setShowWarningModal(false); setReason(''); }} className="flex-1 bg-[#0E1116] border border-[#C5CBD3]/20 text-[#C5CBD3] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[#121D29] transition-colors">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}