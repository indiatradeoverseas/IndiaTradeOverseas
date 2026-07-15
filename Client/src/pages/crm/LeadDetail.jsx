import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { leadsApi } from '../../api/leads';
import { quotationsApi } from '../../api/quotations';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../hooks/useAuth';
import { FiArrowLeft, FiActivity, FiFileText, FiTruck, FiDollarSign, FiSend, FiTrash2, FiEye, FiShield, FiStar, FiUser, FiPhone, FiCheck, FiAward, FiXCircle, FiCheckCircle, FiCompass } from 'react-icons/fi';
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
  const [newActivity, setNewActivity] = useState({ note: '', actionType: 'FOLLOW_UP', nextFollowupAt: '' });
  const [quotationData, setQuotationData] = useState({ employeeRequestedPrice: '', paymentTerms: '', validityDays: 7 });

  const [revealedPhone, setRevealedPhone] = useState('');
  const [revealedEmail, setRevealedEmail] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [revealFieldTarget, setRevealFieldTarget] = useState('');
  const [reason, setReason] = useState('');

  const [users, setUsers] = useState([]);
  const [assignee, setAssignee] = useState('');
  const [deptAssignee, setDeptAssignee] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const stages = [
    'NEW_LEAD', 'LEAD_QUALIFICATION', 'FOLLOW_UP', 'REQUIREMENT_CAPTURED', 'QUOTATION_REQUIRED',
    'QUOTATION_PENDING_APPROVAL', 'QUOTATION_APPROVED', 'NEGOTIATION', 'LOI_PO_PENDING',
    'ORDER_CONFIRMED', 'DISPATCH_PENDING', 'PAYMENT_PENDING', 'CLOSED_WON', 'CLOSED_LOST'
  ];
  const departments = ['STONE', 'COAL', 'TEA', 'RICE', 'TRANSPORT', 'ADMIN', 'IT', 'PROCUREMENT', 'ACCOUNTS', 'HR', 'SALES'];

  const activeStages = [
    'NEW_LEAD', 'LEAD_QUALIFICATION', 'FOLLOW_UP', 'REQUIREMENT_CAPTURED', 'QUOTATION_REQUIRED',
    'QUOTATION_PENDING_APPROVAL', 'QUOTATION_APPROVED', 'NEGOTIATION', 'LOI_PO_PENDING',
    'ORDER_CONFIRMED', 'DISPATCH_PENDING', 'PAYMENT_PENDING'
  ];

  const allowedTransitions = {
    NEW_LEAD: ['ASSIGNED', 'LEAD_QUALIFICATION', 'CLOSED_LOST'],
    ASSIGNED: ['CONTACTED', 'QUOTATION_REQUIRED', 'CLOSED_LOST'],
    CONTACTED: ['QUOTATION_REQUIRED', 'CLOSED_LOST'],
    LEAD_QUALIFICATION: ['FOLLOW_UP', 'CLOSED_LOST'],
    FOLLOW_UP: ['REQUIREMENT_CAPTURED', 'CLOSED_LOST'],
    REQUIREMENT_CAPTURED: ['QUOTATION_REQUIRED', 'CLOSED_LOST'],
    QUOTATION_REQUIRED: ['QUOTATION_PENDING_APPROVAL', 'QUOTATION_REQUESTED', 'CLOSED_LOST'],
    QUOTATION_PENDING_APPROVAL: ['QUOTATION_APPROVED', 'CLOSED_LOST'],
    QUOTATION_APPROVED: ['NEGOTIATION', 'CLOSED_LOST'],
    QUOTATION_REQUESTED: ['QUOTATION_SHARED', 'CLOSED_LOST'],
    QUOTATION_SHARED: ['DISPATCH_PLANNED', 'CLOSED_WON', 'CLOSED_LOST'],
    NEGOTIATION: ['LOI_PO_PENDING', 'CLOSED_LOST'],
    LOI_PO_PENDING: ['ORDER_CONFIRMED', 'CLOSED_LOST'],
    ORDER_CONFIRMED: ['DISPATCH_PENDING', 'CLOSED_LOST'],
    DISPATCH_PENDING: ['PAYMENT_PENDING', 'CLOSED_LOST'],
    DISPATCH_PLANNED: ['PAYMENT_PENDING', 'CLOSED_LOST'],
    PAYMENT_PENDING: ['DOCUMENT_PENDING', 'CLOSED_WON', 'CLOSED_LOST'],
    DOCUMENT_PENDING: ['CLOSED_WON', 'CLOSED_LOST'],
    CLOSED_WON: [],
    CLOSED_LOST: []
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

  const getStageColor = (stage) => {
    const colors = {
      NEW_LEAD: 'bg-sky-900/5 text-sky-800 border-sky-800/20',
      LEAD_QUALIFICATION: 'bg-violet-900/5 text-violet-800 border-violet-800/20',
      FOLLOW_UP: 'bg-purple-900/5 text-purple-800 border-purple-800/20',
      REQUIREMENT_CAPTURED: 'bg-fuchsia-900/5 text-fuchsia-800 border-fuchsia-800/20',
      QUOTATION_REQUIRED: 'bg-amber-900/5 text-amber-800 border-amber-800/20',
      QUOTATION_PENDING_APPROVAL: 'bg-yellow-900/5 text-yellow-800 border-yellow-800/20',
      QUOTATION_APPROVED: 'bg-emerald-900/5 text-emerald-800 border-emerald-800/20 font-medium',
      NEGOTIATION: 'bg-orange-900/5 text-orange-800 border-orange-800/20',
      LOI_PO_PENDING: 'bg-indigo-900/5 text-indigo-800 border-indigo-800/20',
      ORDER_CONFIRMED: 'bg-teal-900/5 text-teal-800 border-teal-800/20',
      DISPATCH_PENDING: 'bg-cyan-900/5 text-cyan-800 border-cyan-800/20',
      PAYMENT_PENDING: 'bg-rose-900/5 text-rose-800 border-rose-800/20',
      CLOSED_WON: 'bg-emerald-800 text-[#FBF7EF] border-transparent font-bold',
      CLOSED_LOST: 'bg-slate-200 text-slate-400 border-slate-300 opacity-60 line-through'
    };
    return colors[stage] || 'bg-[#0B2D5B]/5 text-[#0B2D5B] border-[#0B2D5B]/20';
  };

  if (loading) return <div className="min-h-screen bg-[#FBF7EF] flex items-center justify-center"><div className="w-16 h-[1px] bg-[#C99B38] animate-pulse"/></div>;
  if (!lead) return <div className="text-center py-20 text-xs uppercase tracking-widest text-[#0B2D5B]/40 bg-[#FBF7EF] min-h-screen">Lead not found</div>;

  const selectedUser = users.find((u) => u._id === assignee);
  const currentStage = lead.stage;
  const isClosedWon = currentStage === 'CLOSED_WON';
  const isClosedLost = currentStage === 'CLOSED_LOST';
  const currentStepIndex = activeStages.includes(currentStage) ? activeStages.indexOf(currentStage) : (isClosedWon || isClosedLost ? activeStages.length : 0);
  const progressPercent = Math.min(100, Math.max(0, (currentStepIndex / activeStages.length) * 100));

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen w-full bg-[#FBF7EF] text-[#0B2D5B] font-sans antialiased m-0 p-0 box-border block">
      
      {/* Top Context Header Section - Flush Edges */}
      <motion.div variants={blockVariants} className="w-full border-b border-[#C99B38]/20 px-6 sm:px-10 py-6 flex flex-col md:flex-row md:items-end justify-between gap-6 bg-[#FBF7EF]">
        <div className="flex items-start space-x-4">
          <button onClick={() => navigate('/crm/leads')} className="text-[#0B2D5B] hover:text-[#C99B38] mt-1 transition-colors">
            <FiArrowLeft size={20} />
          </button>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-serif tracking-tight font-normal break-all uppercase">{lead.customerName}</h1>
              <span className={`inline-block px-2.5 py-0.5 border text-[9px] font-bold tracking-widest uppercase rounded-none ${getStageColor(lead.stage)}`}>
                {lead.stage.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs font-mono opacity-50 tracking-wide">{lead.leadCode}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <button onClick={() => setShowQuotationModal(true)} className="flex-1 md:flex-none justify-center bg-white text-[#0B2D5B] border border-[#C99B38]/30 text-[10px] font-bold uppercase tracking-wider px-4 py-3 rounded-none flex items-center space-x-1.5 transition-all cursor-pointer hover:bg-[#FBF7EF]">
            <FiFileText size={12} className="text-[#C99B38]" /> <span>Request Quotation</span>
          </button>
          <button onClick={() => setShowActivityModal(true)} className="flex-1 md:flex-none justify-center bg-white text-[#0B2D5B] border border-[#C99B38]/30 text-[10px] font-bold uppercase tracking-wider px-4 py-3 rounded-none flex items-center space-x-1.5 transition-all cursor-pointer hover:bg-[#FBF7EF]">
            <FiActivity size={12} className="text-[#C99B38]" /> <span>Add Activity</span>
          </button>
          {user?.role === 'ADMIN' && (
            <button onClick={handleDeleteLead} className="flex-1 md:flex-none justify-center bg-red-800 text-white border border-transparent text-[10px] font-bold uppercase tracking-wider px-4 py-3 rounded-none flex items-center space-x-1.5 transition-all cursor-pointer hover:opacity-95">
              <FiTrash2 size={12} /> <span>Delete Task</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Main Core Viewport Data Stream Frame */}
      <div className="w-full px-6 sm:px-10 py-8 space-y-6">
        
        {/* Metric Specification Hex cards */}
        <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Phone Registry', val: revealedPhone || lead.phoneMasked || 'N/A', revealTarget: 'phone' },
            { label: 'Email Coordinates', val: revealedEmail || lead.emailMasked || 'N/A', revealTarget: 'email' },
            { label: 'Commodity Target', val: lead.productCategory },
            { label: 'Mass / Volume', val: lead.quantity || 'N/A' },
            { label: 'Assigned Custodian', val: lead.assignedTo?.fullName || lead.assignedTo || 'Unassigned', accent: 'text-blue-800' },
            { label: 'Department Router', val: lead.assignedDepartment || 'None', accent: 'text-indigo-800' }
          ].map((item, i) => (
            <div key={i} className="bg-[#0B2D5B]/5 border border-[#C99B38]/15 p-4 flex flex-col justify-between min-h-[85px] rounded-none">
              <div className="flex justify-between items-start gap-1">
                <span className="text-[9px] uppercase tracking-wider text-[#0B2D5B]/50 font-bold">{item.label}</span>
                {item.revealTarget && !(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'HR') && (
                  <button onClick={() => handleUnmaskClick(item.revealTarget)} className="text-[#0B2D5B]/40 hover:text-[#C99B38] transition-colors"><FiEye size={12} /></button>
                )}
              </div>
              <p className={`text-xs font-medium tracking-wide break-all mt-2 truncate ${item.accent || 'text-[#0B2D5B]'}`}>{item.val}</p>
            </div>
          ))}
        </motion.div>

        {/* Task Management Router Pane */}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'HR') && (
          <motion.div variants={blockVariants} className="border border-[#C99B38]/15 p-5 bg-[#FBF7EF]">
            <div className="mb-4">
              <span className="text-[9px] uppercase tracking-widest text-[#C99B38] font-bold block mb-0.5 font-sans">ROUTING CORE</span>
              <h3 className="text-base font-serif font-normal">Assign Task / Lead Matrix</h3>
            </div>
            <form onSubmit={handleAssign} className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="w-full lg:flex-1">
                <label className="block text-[10px] font-bold text-[#0B2D5B]/60 uppercase tracking-wider mb-1.5">Assign to Employee</label>
                <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-[#C99B38]/20 text-xs rounded-none outline-none focus:border-[#C99B38] appearance-none cursor-pointer">
                  <option value="">Select Employee (Unassigned)</option>
                  {users.map((u) => <option key={u._id} value={u._id}>{u.fullName} ({u.role} - {u.department})</option>)}
                </select>
              </div>
              <div className="w-full lg:flex-1">
                <label className="block text-[10px] font-bold text-[#0B2D5B]/60 uppercase tracking-wider mb-1.5">Assign to Department</label>
                <select value={deptAssignee} onChange={(e) => setDeptAssignee(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-[#C99B38]/20 text-xs rounded-none outline-none focus:border-[#C99B38] appearance-none cursor-pointer">
                  <option value="">Select Department (None)</option>
                  {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isAssigning} className="w-full lg:w-auto bg-[#0B2D5B] text-white border border-transparent text-[10px] font-bold uppercase tracking-wider px-6 h-[38px] rounded-none transition-all cursor-pointer whitespace-nowrap hover:opacity-95">
                {isAssigning ? 'Synchronizing...' : 'Update Assignment'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Stage Management Linear Tracker */}
        <motion.div variants={blockVariants} className="border border-[#C99B38]/15 bg-[#FBF7EF] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C99B38]/10 pb-4 mb-6">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-[#C99B38] font-bold block mb-0.5">PROGRESS MECHANISM</span>
              <h3 className="text-base font-serif font-normal">Lead Progression Pipeline</h3>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1 min-w-[180px]">
              <div className="flex justify-between w-full text-[10px] font-bold uppercase tracking-wider text-[#0B2D5B]/60">
                <span>Pipeline Index</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="w-full bg-[#0B2D5B]/5 h-1 border border-[#C99B38]/10 rounded-none overflow-hidden">
                <div className={`h-full transition-all duration-500 ease-out ${isClosedWon ? 'bg-emerald-700' : isClosedLost ? 'bg-slate-400' : 'bg-[#0B2D5B]'}`} style={{ width: `${progressPercent}%` }}/>
              </div>
            </div>
          </div>

          {/* Table Timeline Ribbon Slider */}
          <div className="overflow-x-auto pb-2 scrollbar-none">
            <div className="flex items-center min-w-[1100px] justify-between relative px-1">
              {activeStages.map((stage, idx) => {
                const details = stageDetails[stage] || { label: stage, icon: FiStar };
                const StageIcon = details.icon;
                const isCurrent = currentStage === stage;
                const isCompleted = isClosedWon || isClosedLost || activeStages.indexOf(currentStage) > idx;
                const isClickable = allowedTransitions[currentStage]?.includes(stage);
                
                let currentStyle = isCurrent ? "border-[#0B2D5B] bg-[#0B2D5B]/5 text-[#0B2D5B] font-semibold"
                                  : isCompleted ? "border-emerald-800/20 bg-emerald-800/5 text-emerald-800 opacity-70"
                                  : isClickable ? "border-[#C99B38]/30 bg-white text-slate-700 hover:border-[#0B2D5B] cursor-pointer"
                                  : "border-slate-200/40 bg-slate-50/20 text-slate-400 opacity-30 cursor-not-allowed";

                return (
                  <React.Fragment key={stage}>
                    <button onClick={() => isClickable && handleStageChange(stage)} disabled={!isClickable} className={`flex flex-col items-center justify-center p-2.5 border text-center transition-all duration-150 flex-1 mx-1 rounded-none select-none focus:outline-none min-w-[90px] ${currentStyle}`}>
                      <StageIcon className="w-4 h-4 mb-1" />
                      <span className="text-[10px] font-medium tracking-wide uppercase truncate max-w-full">{details.label}</span>
                    </button>
                    {idx < activeStages.length - 1 && (
                      <div className={`h-[1px] w-4 shrink-0 ${isCompleted ? 'bg-emerald-800/40' : 'bg-[#C99B38]/20'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Deal Outcome Terminals */}
          <div className="mt-6 pt-4 border-t border-[#C99B38]/10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {['CLOSED_WON', 'CLOSED_LOST'].map((outcome) => {
              const isWon = outcome === 'CLOSED_WON';
              const isTargetActive = currentStage === outcome;
              const canTransition = allowedTransitions[currentStage]?.includes(outcome);
              
              let outcomeStyle = isTargetActive 
                ? (isWon ? 'border-emerald-800 bg-emerald-800/5 text-emerald-900' : 'border-rose-800 bg-rose-800/5 text-rose-900')
                : canTransition 
                ? 'border-[#C99B38]/20 bg-white hover:border-[#0B2D5B] cursor-pointer'
                : 'border-slate-200 bg-slate-50 opacity-40 cursor-not-allowed text-slate-400';

              return (
                <button key={outcome} onClick={() => canTransition && handleStageChange(outcome)} disabled={isTargetActive || !canTransition} className={`flex items-center justify-between p-4 border rounded-none text-left transition-all duration-200 focus:outline-none ${outcomeStyle}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 bg-[#0B2D5B]/5 ${isTargetActive ? (isWon ? 'text-emerald-800' : 'text-rose-800') : 'text-[#0B2D5B]/50'}`}>
                      {isWon ? <FiAward size={18} /> : <FiXCircle size={18} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider">{isWon ? 'Closed Won' : 'Closed Lost'}</h4>
                      <p className="text-[11px] opacity-60 mt-0.5">{isWon ? 'Lead converted into verified customer node' : 'Lead dropped or qualified out'}</p>
                    </div>
                  </div>
                  {isTargetActive && <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border border-current">Active Outcome</span>}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Activity Timeline Records */}
        <motion.div variants={blockVariants} className="border border-[#C99B38]/15 p-5 bg-[#FBF7EF]">
          <div className="mb-4 flex items-center justify-between border-b border-[#C99B38]/10 pb-3">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-[#C99B38] font-bold block mb-0.5">AUDIT TRAIL</span>
              <h3 className="text-base font-serif font-normal">Activity Timeline Stream</h3>
            </div>
            <FiCompass className="text-[#C99B38]" size={15} />
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {activities.length === 0 ? (
              <p className="text-xs tracking-wide text-center py-8 text-[#0B2D5B]/40 font-medium">No system metrics recorded yet inside this pipeline node.</p>
            ) : (
              activities.map((act) => (
                <div key={act._id} className="border-l border-[#C99B38]/30 pl-4 py-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <span className="font-bold uppercase tracking-wider text-[#0B2D5B] text-xs">{act.actionType.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] font-mono opacity-40">{new Date(act.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs opacity-80 font-light leading-relaxed">{act.note}</p>
                  {act.nextFollowupAt && (
                    <p className="text-[10px] text-[#C99B38] font-bold uppercase tracking-wide mt-1">Next Scheduled Interface: {new Date(act.nextFollowupAt).toLocaleDateString()}</p>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowActivityModal(false)} className="fixed inset-0 bg-[#0B2D5B]/30 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} className="bg-[#FBF7EF] border border-[#C99B38] rounded-none p-6 w-full max-w-md relative z-10 text-[#0B2D5B]">
              <h3 className="text-base font-serif mb-4 uppercase tracking-wide border-b border-[#C99B38]/20 pb-2">Log Activity Action</h3>
              <form onSubmit={handleAddActivity} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider mb-1">Action Type</label>
                  <select value={newActivity.actionType} onChange={(e) => setNewActivity({ ...newActivity, actionType: e.target.value })} className="w-full p-2 border border-[#C99B38]/20 bg-white rounded-none outline-none">
                    <option value="FOLLOW_UP">Follow Up</option><option value="CALL">Call</option><option value="EMAIL">Email</option><option value="MEETING">Meeting</option><option value="NOTE">Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider mb-1">Operational Summary Note</label>
                  <textarea required rows="3" value={newActivity.note} onChange={(e) => setNewActivity({ ...newActivity, note: e.target.value })} className="w-full p-2 border border-[#C99B38]/20 bg-white rounded-none outline-none resize-none" placeholder="Log details..."/>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider mb-1">Target Next Interface Matrix</label>
                  <input type="datetime-local" value={newActivity.nextFollowupAt} onChange={(e) => setNewActivity({ ...newActivity, nextFollowupAt: e.target.value })} className="w-full p-2 border border-[#C99B38]/20 bg-white rounded-none outline-none"/>
                </div>
                <div className="flex gap-2 pt-2"><button type="submit" className="flex-1 bg-[#0B2D5B] text-white py-2.5 font-bold uppercase text-[10px] tracking-wide rounded-none cursor-pointer">Commit</button><button type="button" onClick={() => setShowActivityModal(false)} className="flex-1 bg-white border border-[#C99B38]/20 py-2.5 font-bold uppercase text-[10px] tracking-wide rounded-none cursor-pointer">Cancel</button></div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 2. Request Quotation Modal */}
        {showQuotationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQuotationModal(false)} className="fixed inset-0 bg-[#0B2D5B]/30 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} className="bg-[#FBF7EF] border border-[#C99B38] rounded-none p-6 w-full max-w-md relative z-10 text-[#0B2D5B]">
              <h3 className="text-base font-serif mb-4 uppercase tracking-wide border-b border-[#C99B38]/20 pb-2">Request Trade Valuation</h3>
              <form onSubmit={handleRequestQuotation} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider mb-1">Target Base Value (₹) *</label>
                  <input type="number" required value={quotationData.employeeRequestedPrice} onChange={(e) => setQuotationData({ ...quotationData, employeeRequestedPrice: e.target.value })} className="w-full p-2 border border-[#C99B38]/20 bg-white rounded-none outline-none" placeholder="Specify baseline transaction values"/>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider mb-1">Payment Protocols</label>
                  <input type="text" value={quotationData.paymentTerms} onChange={(e) => setQuotationData({ ...quotationData, paymentTerms: e.target.value })} className="w-full p-2 border border-[#C99B38]/20 bg-white rounded-none outline-none" placeholder="e.g., 30% advance deposit tier"/>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider mb-1">Validity Lifecycle (Days)</label>
                  <input type="number" value={quotationData.validityDays} onChange={(e) => setQuotationData({ ...quotationData, validityDays: e.target.value })} className="w-full p-2 border border-[#C99B38]/20 bg-white rounded-none outline-none"/>
                </div>
                <div className="flex gap-2 pt-2"><button type="submit" className="flex-1 bg-[#0B2D5B] text-white py-2.5 font-bold uppercase text-[10px] tracking-wide rounded-none cursor-pointer">Submit Quote</button><button type="button" onClick={() => setShowQuotationModal(false)} className="flex-1 bg-white border border-[#C99B38]/20 py-2.5 font-bold uppercase text-[10px] tracking-wide rounded-none cursor-pointer">Cancel</button></div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 3. Security Access Audit Warning Modal */}
        {showWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowWarningModal(false); setReason(''); }} className="fixed inset-0 bg-[#0B2D5B]/30 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} className="bg-[#FBF7EF] border border-rose-800 rounded-none p-6 w-full max-w-md relative z-10 text-[#0B2D5B]">
              <div className="flex items-center space-x-2.5 mb-3 text-rose-800"><FiShield size={18} /><h3 className="text-base font-serif uppercase tracking-wide">Security Access Protocol</h3></div>
              <p className="text-xs opacity-70 leading-relaxed mb-4">WARNING: Unmasking raw database coordinates is tracked in global audit nodes. Enter a clear business justification to reveal this secure telemetry line.</p>
              <form onSubmit={handleRevealSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider mb-1">Justification Token Entry</label>
                  <textarea required rows="3" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-2 border border-[#C99B38]/20 bg-white rounded-none outline-none resize-none" placeholder="e.g. Reviewing dispatch schedules directly with client point..."/>
                </div>
                <div className="flex gap-2"><button type="submit" className="flex-1 bg-rose-900 text-white py-2.5 font-bold uppercase text-[10px] tracking-wide rounded-none cursor-pointer">Confirm Reveal</button><button type="button" onClick={() => { setShowWarningModal(false); setReason(''); }} className="flex-1 bg-white border border-slate-200 py-2.5 font-bold uppercase text-[10px] tracking-wide rounded-none cursor-pointer">Cancel</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}