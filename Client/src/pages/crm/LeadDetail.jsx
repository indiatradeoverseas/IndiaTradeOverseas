import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leadsApi } from '../../api/leads';
import { quotationsApi } from '../../api/quotations';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../hooks/useAuth';
import { FiArrowLeft, FiActivity, FiFileText, FiTruck, FiDollarSign, FiSend, FiTrash2, FiEye, FiShield, FiStar, FiUser, FiPhone, FiCheck, FiAward, FiXCircle, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

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
    'NEW_LEAD',
    'LEAD_QUALIFICATION',
    'FOLLOW_UP',
    'REQUIREMENT_CAPTURED',
    'QUOTATION_REQUIRED',
    'QUOTATION_PENDING_APPROVAL',
    'QUOTATION_APPROVED',
    'NEGOTIATION',
    'LOI_PO_PENDING',
    'ORDER_CONFIRMED',
    'DISPATCH_PENDING',
    'PAYMENT_PENDING',
    'CLOSED_WON',
    'CLOSED_LOST'
  ];
  const departments = ['STONE', 'COAL', 'TEA', 'RICE', 'TRANSPORT', 'ADMIN', 'IT', 'PROCUREMENT', 'ACCOUNTS', 'HR', 'SALES'];

  const activeStages = [
    'NEW_LEAD',
    'LEAD_QUALIFICATION',
    'FOLLOW_UP',
    'REQUIREMENT_CAPTURED',
    'QUOTATION_REQUIRED',
    'QUOTATION_PENDING_APPROVAL',
    'QUOTATION_APPROVED',
    'NEGOTIATION',
    'LOI_PO_PENDING',
    'ORDER_CONFIRMED',
    'DISPATCH_PENDING',
    'PAYMENT_PENDING'
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
      if (response.success) {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
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
    } catch (error) {
      console.error('Error fetching lead details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async () => {
    if (window.confirm('Are you sure you want to permanently delete this task/lead? This will delete all activity logs for it.')) {
      try {
        const response = await leadsApi.deleteLead(id);
        if (response.success) {
          toast.success('Lead deleted successfully');
          navigate('/crm/leads');
        }
      } catch (error) {
        console.error('Error deleting lead:', error);
        toast.error('Failed to delete lead');
      }
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
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStageChange = async (newStage) => {
    try {
      const response = await leadsApi.updateStage(id, { newStage });
      if (response.success) {
        toast.success(`Stage updated to ${newStage.replace(/_/g, ' ')}`);
        fetchLeadDetails();
      }
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error(error.response?.data?.message || 'Failed to update stage');
    }
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
    } catch (error) {
      console.error('Error adding activity:', error);
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
    } catch (error) {
      console.error('Error requesting quotation:', error);
    }
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
        entityType: 'LEAD',
        entityId: id,
        fieldName: revealFieldTarget,
        reason,
        deviceHash
      });
      if (response.success) {
        if (revealFieldTarget === 'phone') {
          setRevealedPhone(response.data.value);
        } else {
          setRevealedEmail(response.data.value);
        }
        toast.success('Field revealed successfully');
        setShowWarningModal(false);
        setReason('');
      }
    } catch (error) {
      console.error('Error revealing field:', error);
      toast.error(error.response?.data?.message || 'Reveal attempt rejected.');
    }
  };

  const getStageColor = (stage) => {
    const colors = {
      NEW_LEAD: 'bg-sky-50 text-sky-700 border border-sky-200/60',
      LEAD_QUALIFICATION: 'bg-violet-50 text-violet-700 border border-violet-200/60',
      FOLLOW_UP: 'bg-purple-50 text-purple-700 border border-purple-200/60',
      REQUIREMENT_CAPTURED: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200/60',
      QUOTATION_REQUIRED: 'bg-amber-50 text-amber-700 border border-amber-200/60',
      QUOTATION_PENDING_APPROVAL: 'bg-yellow-50 text-yellow-700 border border-yellow-200/60',
      QUOTATION_APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      NEGOTIATION: 'bg-orange-50 text-orange-700 border border-orange-200/60',
      LOI_PO_PENDING: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
      ORDER_CONFIRMED: 'bg-teal-50 text-teal-700 border border-teal-200/60',
      DISPATCH_PENDING: 'bg-cyan-50 text-cyan-700 border border-cyan-200/60',
      PAYMENT_PENDING: 'bg-rose-50 text-rose-700 border border-rose-200/60',
      CLOSED_WON: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      CLOSED_LOST: 'bg-slate-100 text-slate-700 border border-slate-200'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Lead not found</p>
      </div>
    );
  }

  const selectedUser = users.find((u) => u._id === assignee);

  const currentStage = lead.stage;
  const isClosedWon = currentStage === 'CLOSED_WON';
  const isClosedLost = currentStage === 'CLOSED_LOST';
  const currentStepIndex = activeStages.includes(currentStage) ? activeStages.indexOf(currentStage) : (isClosedWon || isClosedLost ? activeStages.length : 0);
  const progressPercent = Math.min(100, Math.max(0, (currentStepIndex / activeStages.length) * 100));

  return (
    <div className="space-y-6 px-4 py-2 max-w-7xl mx-auto">

      {/* Top Bar Header Options */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-start space-x-4">
          <button onClick={() => navigate('/crm/leads')} className="text-gray-600 hover:text-gray-900 mt-1">
            <FiArrowLeft size={24} />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-all">{lead.customerName}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStageColor(lead.stage)}`}>
                {lead.stage.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-gray-600 text-sm mt-0.5">{lead.leadCode}</p>
          </div>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto">
          <button onClick={() => setShowQuotationModal(true)} className="btn-primary flex items-center justify-center space-x-2 flex-1 sm:flex-initial text-sm py-2 px-3">
            <FiFileText size={18} />
            <span>Request Quotation</span>
          </button>
          <button onClick={() => setShowActivityModal(true)} className="btn-secondary flex items-center justify-center space-x-2 flex-1 sm:flex-initial text-sm py-2 px-3">
            <FiActivity size={18} />
            <span>Add Activity</span>
          </button>
          {user?.role === 'ADMIN' && (
            <button
              onClick={handleDeleteLead}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition font-medium flex items-center justify-center space-x-2 w-full sm:w-auto text-sm"
            >
              <FiTrash2 size={18} />
              <span>Delete Task</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="card relative p-4">
          <div className="flex justify-between items-start">
            <p className="text-xs text-gray-600 font-medium">Phone</p>
            {!(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'HR') && (
              <button
                onClick={() => handleUnmaskClick('phone')}
                className="text-slate-400 hover:text-blue-600 transition"
                title="Reveal phone"
              >
                <FiEye size={16} />
              </button>
            )}
          </div>
          <p className="text-base font-semibold mt-1 break-all">{revealedPhone || lead.phoneMasked || 'N/A'}</p>
        </div>
        <div className="card relative p-4">
          <div className="flex justify-between items-start">
            <p className="text-xs text-gray-600 font-medium">Email</p>
            {!(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'HR') && (
              <button
                onClick={() => handleUnmaskClick('email')}
                className="text-slate-400 hover:text-blue-600 transition"
                title="Reveal email"
              >
                <FiEye size={16} />
              </button>
            )}
          </div>
          <p className="text-base font-semibold mt-1 break-all">{revealedEmail || lead.emailMasked || 'N/A'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-600 font-medium">Product</p>
          <p className="text-base font-semibold mt-1 truncate">{lead.productCategory}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-600 font-medium">Quantity</p>
          <p className="text-base font-semibold mt-1">{lead.quantity || 'N/A'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-600 font-medium">Assigned To</p>
          <p className="text-base font-semibold mt-1 truncate text-blue-600">
            {lead.assignedTo?.fullName || lead.assignedTo || 'Unassigned'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-600 font-medium">Department</p>
          <p className="text-base font-semibold mt-1 truncate text-indigo-600">
            {lead.assignedDepartment || 'None'}
          </p>
        </div>
      </div>

      {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'HR') && (
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assign Task / Lead</h2>
          <form onSubmit={handleAssign} className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="w-full lg:flex-1">
              <label className="label text-sm mb-1.5 block">Assign to Employee</label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="input w-full text-sm"
              >
                <option value="">Select Employee (Unassigned)</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.fullName} ({u.role} - {u.department})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full lg:flex-1">
              <label className="label text-sm mb-1.5 block">Assign to Department</label>
              <select
                value={deptAssignee}
                onChange={(e) => setDeptAssignee(e.target.value)}
                className="input w-full text-sm"
              >
                <option value="">Select Department (None)</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isAssigning}
              className="btn-primary w-full lg:w-auto px-6 h-[42px] whitespace-nowrap text-sm"
            >
              {isAssigning ? 'Saving...' : 'Update Assignment'}
            </button>
          </form>

          {/* Dynamic visual preview of assignment */}
          <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assignment Preview</h3>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Employee:</span>
                {selectedUser ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    👤 {selectedUser.fullName} ({selectedUser.role})
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                    Unassigned
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Department:</span>
                {deptAssignee ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                    🏢 {deptAssignee}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                    None
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {selectedUser
                ? `This task will be assigned to ${selectedUser.fullName} (${selectedUser.role}).`
                : 'No specific employee will be assigned to this task.'}
              {deptAssignee
                ? ` It will be routed to the ${deptAssignee} department.`
                : ' It will not belong to any department.'}
            </p>
          </div>
        </div>
      )}

      {/* Stage Management Container */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition duration-200 overflow-hidden">
        {/* Top Header Section */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Lead Progression Pipeline</h2>
            <p className="text-xs text-slate-500 mt-0.5">Click a stage block to update the lead's current stage.</p>
          </div>
          
          {/* Progress Status Text & Bar */}
          <div className="flex flex-col items-end gap-1.5 min-w-[200px]">
            <div className="flex justify-between w-full text-xs font-semibold text-slate-600">
              <span>Pipeline Progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isClosedWon 
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' 
                    : isClosedLost 
                    ? 'bg-slate-400' 
                    : 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]'
                }`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Pipeline Tracker body */}
        <div className="p-6">
          {/* Horizontal scroll container for active stages */}
          <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <div className="flex items-center min-w-[1200px] justify-between relative px-2">
              {activeStages.map((stage, idx) => {
                const details = stageDetails[stage] || { label: stage, icon: FiStar };
                const StageIcon = details.icon;
                
                // Determine stage status
                const isCurrent = currentStage === stage;
                const isCompleted = isClosedWon || isClosedLost || activeStages.indexOf(currentStage) > idx;
                const isClickable = allowedTransitions[currentStage]?.includes(stage);
                
                let btnStyle = "";
                let badgeStyle = "";
                
                if (isCurrent) {
                  btnStyle = "border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-sm shadow-indigo-100 scale-[1.02] ring-2 ring-indigo-600/20 cursor-default";
                  badgeStyle = "bg-indigo-600 text-white animate-pulse";
                } else if (isCompleted) {
                  btnStyle = "border-emerald-200 bg-emerald-50/40 text-emerald-700 cursor-default";
                  badgeStyle = "bg-emerald-500 text-white";
                } else if (isClickable) {
                  btnStyle = "border-slate-300 bg-white text-slate-700 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/20 cursor-pointer scale-[1.01]";
                  badgeStyle = "bg-slate-300 text-slate-800";
                } else {
                  btnStyle = "border-slate-100 bg-slate-50/50 text-slate-400 opacity-40 cursor-not-allowed";
                  badgeStyle = "bg-slate-100 text-slate-400";
                }

                return (
                  <React.Fragment key={stage}>
                    <button
                      onClick={() => isClickable && handleStageChange(stage)}
                      disabled={!isClickable}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 flex-1 mx-1.5 focus:outline-none select-none relative group ${btnStyle}`}
                    >
                      <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold mb-2 transition-all ${badgeStyle}`}>
                        {isCompleted ? <FiCheck className="w-3.5 h-3.5" /> : idx + 1}
                      </span>
                      <StageIcon className={`w-5 h-5 mb-1.5 transition-transform ${isClickable ? 'group-hover:scale-110' : ''}`} />
                      
                      <span className="text-xs font-semibold whitespace-nowrap">{details.label}</span>
                      
                      <span className="absolute -top-10 scale-0 transition-all duration-150 rounded bg-slate-800 p-2 text-white text-[10px] whitespace-nowrap shadow-md group-hover:scale-100 z-10">
                        {details.desc || stage.replace(/_/g, ' ')}
                      </span>
                    </button>

                    {idx < activeStages.length - 1 && (
                      <div className="flex-1 h-[2px] min-w-[20px] max-w-[50px] relative">
                        <div className={`absolute inset-0 transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative px-4 bg-white text-xs font-semibold text-slate-450 uppercase tracking-wider">
              Deal Outcomes
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const canTransitionToWon = allowedTransitions[currentStage]?.includes('CLOSED_WON');
              return (
                <button
                  onClick={() => handleStageChange('CLOSED_WON')}
                  disabled={isClosedWon || !canTransitionToWon}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 focus:outline-none text-left group ${
                    isClosedWon 
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20 cursor-default' 
                      : !canTransitionToWon
                      ? 'border-slate-100 bg-slate-50 text-slate-400 opacity-50 cursor-not-allowed'
                      : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/10 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`p-2.5 rounded-lg transition-colors ${
                      isClosedWon 
                        ? 'bg-emerald-500 text-white' 
                        : !canTransitionToWon
                        ? 'bg-slate-100 text-slate-300'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'
                    }`}>
                      <FiAward className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-sm ${isClosedWon ? 'text-emerald-800' : !canTransitionToWon ? 'text-slate-400' : 'text-slate-700'}`}>Closed Won</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Lead converted successfully into customer!</p>
                    </div>
                  </div>
                  {isClosedWon && (
                    <span className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full animate-bounce">
                      Active Outcome 🎉
                    </span>
                  )}
                </button>
              );
            })()}

            {(() => {
              const canTransitionToLost = allowedTransitions[currentStage]?.includes('CLOSED_LOST');
              return (
                <button
                  onClick={() => handleStageChange('CLOSED_LOST')}
                  disabled={isClosedLost || !canTransitionToLost}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 focus:outline-none text-left group ${
                    isClosedLost 
                      ? 'border-rose-500 bg-rose-50/50 shadow-sm ring-2 ring-rose-500/20 cursor-default' 
                      : !canTransitionToLost
                      ? 'border-slate-100 bg-slate-50 text-slate-400 opacity-50 cursor-not-allowed'
                      : 'border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/10 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`p-2.5 rounded-lg transition-colors ${
                      isClosedLost 
                        ? 'bg-rose-500 text-white' 
                        : !canTransitionToLost
                        ? 'bg-slate-100 text-slate-300'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-rose-100 group-hover:text-rose-600'
                    }`}>
                      <FiXCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-sm ${isClosedLost ? 'text-rose-800' : !canTransitionToLost ? 'text-slate-400' : 'text-slate-700'}`}>Closed Lost</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Lead was dropped, qualified out, or lost.</p>
                    </div>
                  </div>
                  {isClosedLost && (
                    <span className="flex items-center text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                      Active Outcome
                    </span>
                  )}
                </button>
              );
            })()}
          </div>

          {isClosedWon && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between shadow-md shadow-emerald-500/10 animate-fade-in">
              <div className="flex items-center space-x-3">
                <FiAward className="w-8 h-8 text-yellow-300" />
                <div>
                  <h4 className="font-bold text-sm">Congratulations! Deal Closed Won!</h4>
                  <p className="text-xs text-emerald-100 mt-0.5">This task has been successfully resolved and won.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h2>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">No activities recorded yet</p>
          ) : (
            activities.map((activity) => (
              <div key={activity._id} className="border-l-4 border-indigo-500 pl-4 py-1.5">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-2">
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">{activity.actionType}</span>
                  <span className="text-xs text-gray-500">{new Date(activity.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-gray-600 text-sm break-words">{activity.note}</p>
                {activity.nextFollowupAt && (
                  <p className="text-xs font-medium text-indigo-600 mt-1">Next Follow-up: {new Date(activity.nextFollowupAt).toLocaleDateString()}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-5 sm:p-6 w-full max-w-md my-8">
            <h2 className="text-xl font-bold mb-4">Add Activity</h2>
            <form onSubmit={handleAddActivity}>
              <div className="space-y-4">
                <div>
                  <label className="label text-sm mb-1 block">Activity Type</label>
                  <select
                    value={newActivity.actionType}
                    onChange={(e) => setNewActivity({ ...newActivity, actionType: e.target.value })}
                    className="input w-full text-sm"
                  >
                    <option value="FOLLOW_UP">Follow Up</option>
                    <option value="CALL">Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="MEETING">Meeting</option>
                    <option value="NOTE">Note</option>
                  </select>
                </div>
                <div>
                  <label className="label text-sm mb-1 block">Note</label>
                  <textarea
                    required
                    rows={3}
                    value={newActivity.note}
                    onChange={(e) => setNewActivity({ ...newActivity, note: e.target.value })}
                    className="input w-full text-sm"
                    placeholder="Enter activity details here"
                  ></textarea>
                </div>
                <div>
                  <label className="label text-sm mb-1 block">Next Follow-up Date</label>
                  <input
                    type="datetime-local"
                    value={newActivity.nextFollowupAt}
                    onChange={(e) => setNewActivity({ ...newActivity, nextFollowupAt: e.target.value })}
                    className="input w-full text-sm"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button type="submit" className="btn-primary flex-1 text-sm py-2">Add</button>
                <button type="button" onClick={() => setShowActivityModal(false)} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQuotationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-5 sm:p-6 w-full max-w-md my-8">
            <h2 className="text-xl font-bold mb-4">Request Quotation</h2>
            <form onSubmit={handleRequestQuotation}>
              <div className="space-y-4">
                <div>
                  <label className="label text-sm mb-1 block">Requested Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={quotationData.employeeRequestedPrice}
                    onChange={(e) => setQuotationData({ ...quotationData, employeeRequestedPrice: e.target.value })}
                    className="input w-full text-sm"
                    placeholder="Enter your requested price here"
                  />
                </div>
                <div>
                  <label className="label text-sm mb-1 block">Payment Terms</label>
                  <input
                    type="text"
                    value={quotationData.paymentTerms}
                    onChange={(e) => setQuotationData({ ...quotationData, paymentTerms: e.target.value })}
                    className="input w-full text-sm"
                    placeholder="e.g., 30% advance, 70% against documents"
                  />
                </div>
                <div>
                  <label className="label text-sm mb-1 block">Validity (Days)</label>
                  <input
                    type="number"
                    value={quotationData.validityDays}
                    onChange={(e) => setQuotationData({ ...quotationData, validityDays: e.target.value })}
                    className="input w-full text-sm"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button type="submit" className="btn-primary flex-1 text-sm py-2">Submit</button>
                <button type="button" onClick={() => setShowQuotationModal(false)} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWarningModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all border border-slate-100 my-8">
            <div className="p-5 sm:p-6">
              <div className="flex items-center space-x-3 mb-4 text-orange-600">
                <FiShield size={24} />
                <h3 className="text-lg font-bold text-slate-800">Security Access Audit</h3>
              </div>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                WARNING: Unmasking sensitive lead details is strictly monitored and audited. Please enter your business reason to justify revealing this field.
              </p>
              <form onSubmit={handleRevealSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Business Justification</label>
                  <textarea
                    required
                    rows="3"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder:text-slate-400 shadow-inner"
                    placeholder="e.g., Calling customer for quotation review..."
                  />
                </div>
                <div className="flex space-x-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow transition-colors"
                  >
                    Confirm Access
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowWarningModal(false); setReason(''); }}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}