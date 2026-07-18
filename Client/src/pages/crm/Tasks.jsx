import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { leadsApi } from '../../api/leads';
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
  FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// Staggered cinematic entrance variants
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
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showPerformModal, setShowPerformModal] = useState(false);

  const [actionType, setActionType] = useState('STAGE_CHANGE');
  const [nextStage, setNextStage] = useState('');
  const [activityNote, setActivityNote] = useState('');
  const [nextFollowup, setNextFollowup] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await leadsApi.getLeads();
      if (response.success) {
        setLeads(response.data.leads || []);
      }
    } catch (error) {
      console.error('Error fetching employee tasks:', error);
      toast.error('Failed to load your tasks');
    } finally {
      setLoading(false);
    }
  };

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

  // Fixed: Converted state badge colors to high contrast deep shades
  const getStageColor = (stage) => {
    const colors = {
      NEW_LEAD: 'bg-blue-950/20 text-blue-400 border-blue-500/20',
      ASSIGNED: 'bg-indigo-950/20 text-indigo-400 border-indigo-500/20',
      CONTACTED: 'bg-purple-950/20 text-purple-400 border-purple-500/20',
      QUOTATION_REQUIRED: 'bg-amber-950/20 text-amber-400 border-amber-500/20',
      QUOTATION_REQUESTED: 'bg-orange-950/20 text-orange-400 border-orange-500/20',
      QUOTATION_SHARED: 'bg-teal-950/20 text-teal-400 border-teal-500/20',
      DISPATCH_PLANNED: 'bg-cyan-950/20 text-cyan-400 border-cyan-500/20',
      PAYMENT_PENDING: 'bg-rose-950/20 text-rose-400 border-rose-500/20',
      DOCUMENT_PENDING: 'bg-violet-950/20 text-violet-400 border-violet-500/20',
      CLOSED_WON: 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20 font-bold',
      CLOSED_LOST: 'bg-gray-950/20 text-gray-400 border-gray-500/20 opacity-60 line-through'
    };
    return colors[stage] || 'bg-slate-950/20 text-slate-400 border-slate-500/20';
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.leadCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.productCategory.toLowerCase().includes(searchTerm.toLowerCase());

    const isClosed = lead.stage === 'CLOSED_WON' || lead.stage === 'CLOSED_LOST';
    const matchesTab =
      activeTab === 'ALL' ||
      (activeTab === 'PENDING' && !isClosed) ||
      (activeTab === 'COMPLETED' && isClosed);

    return matchesSearch && matchesTab;
  });

  const totalTasks = leads.length;
  const pendingCount = leads.filter(l => l.stage !== 'CLOSED_WON' && l.stage !== 'CLOSED_LOST').length;
  const completedCount = leads.filter(l => l.stage === 'CLOSED_WON').length;
  const lostCount = leads.filter(l => l.stage === 'CLOSED_LOST').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0E1116]">
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-12 h-[1px] bg-[#C5CBD3]/40" 
          />
          <p className="text-[10px] tracking-widest uppercase font-mono text-[#6D7886]">Cataloguing Pipeline Grains...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="min-h-screen bg-[#0E1116] text-[#C5CBD3] block pb-12"
    >
      
      {/* Header Panel Option */}
      <motion.div variants={blockVariants} className="w-full border-b border-[#C5CBD3]/10 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-[#040A12]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#6D7886] font-bold block font-mono">Operational Workflow Grid</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F2F4F7] tracking-tight uppercase">Task Performance Board</h1>
          <p className="text-xs text-[#6D7886] font-light max-w-2xl mt-1">Review assigned global charters, log real-time fulfillment progress, and execute lifecycle stage transitions.</p>
        </div>
      </motion.div>

      <div className="w-full py-8 space-y-6 bg-[#0E1116]">

        {/* Metric Cards grid */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Tasks Allocated", val: totalTasks, icon: FiGrid, bg: "bg-[#121D29]/60", text: "text-[#F2F4F7]" },
            { label: "Active Pipeline Elements", val: pendingCount, icon: FiClock, bg: "bg-indigo-950/20", text: "text-indigo-400" },
            { label: "Closed Contracts Won", val: completedCount, icon: FiCheckSquare, bg: "bg-emerald-950/20", text: "text-emerald-400" },
            { label: "Contracts Dismissed", val: lostCount, icon: FiAlertCircle, bg: "bg-rose-950/20", text: "text-rose-400" }
          ].map((card, idx) => (
            <motion.div 
              key={idx} 
              variants={blockVariants}
              whileHover={{ y: -3, borderColor: 'rgba(197,203,211,0.25)' }}
              className="bg-[#121D29]/30 rounded-sm border border-[#C5CBD3]/15 p-5 flex items-center justify-between shadow-xl transition-all duration-300"
            >
              <div className="text-left">
                <p className="text-[9px] uppercase tracking-widest font-mono font-bold text-[#6D7886]">{card.label}</p>
                <p className="text-2xl font-serif mt-2 font-normal text-[#F2F4F7]">{card.val}</p>
              </div>
              <div className={`p-3 border border-[#C5CBD3]/10 rounded-sm text-[#C5CBD3] shadow-inner ${card.bg}`}>
                <card.icon size={16} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Filter Toolbar Area */}
        <motion.div variants={blockVariants} className="bg-[#121D29]/20 p-4 rounded-sm border border-[#C5CBD3]/15 shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#6D7886]" size={15} />
            <input
              type="text"
              placeholder="Filter operations registry by corporate name, lead charter hash, or material classification..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/15 focus:border-[#F2F4F7]/40 text-xs rounded-sm outline-none transition text-[#F2F4F7] placeholder-[#6D7886]"
            />
          </div>

          {/* Nav Categories tab */}
          <div className="flex border border-[#C5CBD3]/15 p-1 bg-[#040A12]/60 rounded-sm shrink-0 w-full md:w-auto">
            {[
              { id: 'PENDING', label: 'Pending', count: pendingCount },
              { id: 'COMPLETED', label: 'Closed', count: completedCount + lostCount },
              { id: 'ALL', label: 'All Records', count: totalTasks }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 md:flex-initial px-4 py-1.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#121D29] text-[#F2F4F7] shadow-md'
                    : 'text-[#6D7886] hover:text-[#C5CBD3]'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </motion.div>

        {/* Cards matrix grid rendering */}
        {filteredLeads.length === 0 ? (
          <motion.div variants={blockVariants} className="bg-[#121D29]/10 rounded-sm text-center py-20 border border-[#C5CBD3]/15 shadow-sm">
            <FiCheckSquare size={36} className="mx-auto text-[#6D7886] opacity-50 mb-4" />
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#6D7886] font-medium">No workflow cards matched this active grid cluster parameter.</p>
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLeads.map((lead) => {
              const isClosed = lead.stage === 'CLOSED_WON' || lead.stage === 'CLOSED_LOST';

              return (
                <motion.div
                  key={lead._id}
                  variants={blockVariants}
                  whileHover={{ y: -4, borderColor: 'rgba(197,203,211,0.35)' }}
                  className="bg-[#121D29]/30 rounded-sm border border-[#C5CBD3]/15 hover:border-[#F2F4F7]/40 shadow-2xl transition-all duration-300 flex flex-col justify-between p-6 group"
                >
                  <div className="text-left">
                    {/* Unique Identifier Strip */}
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-mono font-bold text-[#6D7886] tracking-wider">
                        {lead.leadCode}
                      </span>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#F2F4F7] bg-[#121D29]/90 border border-[#C5CBD3]/10 px-2 py-0.5 rounded-sm">
                        {lead.productCategory}
                      </span>
                    </div>

                    {/* Consignee Data */}
                    <div className="mb-4">
                      <h3 onClick={() => navigate(`/crm/leads/${lead._id}`)} className="text-base font-serif font-normal text-[#F2F4F7] cursor-pointer hover:text-white transition-colors leading-tight">
                        {lead.customerName}
                      </h3>
                      {lead.companyName && (
                        <p className="text-xs text-[#6D7886] font-light mt-1.5">{lead.companyName}</p>
                      )}
                    </div>

                    {/* Specifications Metrics list */}
                    <div className="space-y-3 text-xs text-[#C5CBD3]/80 py-3.5 border-t border-b border-[#C5CBD3]/10 mb-4">
                      {lead.quantity && (
                        <div className="flex items-center gap-2">
                          <FiLayers className="text-[#6D7886] shrink-0" size={13} />
                          <span>Mass Metrics: <strong className="text-[#F2F4F7] font-medium">{lead.quantity}</strong></span>
                        </div>
                      )}
                      {lead.destination && (
                        <div className="flex items-center gap-2">
                          <FiMapPin className="text-[#6D7886] shrink-0" size={13} />
                          <span>Discharge Point: <strong className="text-[#F2F4F7] font-medium">{lead.destination}</strong></span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <FiClock className="text-[#6D7886] shrink-0" size={13} />
                        <span>Stage Axis:</span>
                        <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border ${getStageColor(lead.stage)}`}>
                          {getStageDisplay(lead.stage)}
                        </span>
                      </div>
                      {lead.nextFollowupAt && (
                        <div className="flex items-center gap-2 text-rose-400 font-medium bg-rose-950/20 border border-rose-500/20 p-2 rounded-sm font-mono text-[10px]">
                          <FiCalendar className="shrink-0 text-rose-400" size={13} />
                          <span>Follow-up: <strong>{new Date(lead.nextFollowupAt).toLocaleString()}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Remarks Block */}
                    {lead.remarks && (
                      <div className="mb-4 bg-[#0E1116] p-3 rounded-sm border border-[#C5CBD3]/10">
                        <p className="text-[8px] font-mono font-bold text-[#6D7886] uppercase tracking-widest mb-1">Latest Manifest Remark</p>
                        <p className="text-xs text-[#C5CBD3]/70 font-light italic line-clamp-2">"{lead.remarks}"</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Hub Row */}
                  <div className="flex gap-2.5 pt-2 border-t border-[#C5CBD3]/10">
                    <Link
                      to={`/crm/leads/${lead._id}`}
                      className="flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#C5CBD3] bg-[#0E1116] hover:bg-[#121D29] border border-[#C5CBD3]/20 hover:border-[#C5CBD3]/40 rounded-sm transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <FiEye size={12} />
                      <span>History</span>
                    </Link>

                    {!isClosed ? (
                      <button
                        onClick={() => handleOpenPerform(lead)}
                        className="flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#0E1116] bg-[#F2F4F7] hover:bg-[#C5CBD3] rounded-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <FiEdit size={12} />
                        <span>Perform Task</span>
                      </button>
                    ) : (
                      <span className="flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-center border border-[#C5CBD3]/10 bg-[#0E1116] text-[#6D7886]/60 rounded-sm flex items-center justify-center gap-1.5 cursor-not-allowed select-none">
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

      {/* Perform Task Modal Block */}
      <AnimatePresence>
        {showPerformModal && selectedLead && (
          <div className="fixed inset-0 bg-[#040A12]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-[#121D29] rounded-sm w-full max-w-lg overflow-hidden border border-[#C5CBD3]/15 shadow-2xl max-h-[90vh] flex flex-col relative"
            >
              {/* Form header overlay */}
              <div className="p-6 border-b border-[#C5CBD3]/10 flex justify-between items-center shrink-0 bg-[#0E1116]/80 text-left">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6D7886] font-bold block">Fulfillment Terminal</span>
                  <h3 className="text-base font-serif text-[#F2F4F7] uppercase tracking-wide mt-1">Report Task Progress: {selectedLead.leadCode}</h3>
                  <p className="text-xs text-[#6D7886] mt-1.5 font-light leading-relaxed">
                    Consignee: <strong className="text-[#F2F4F7] font-medium">{selectedLead.customerName}</strong> | Active Stage Axis: <strong className="uppercase font-mono text-amber-400">{getStageDisplay(selectedLead.stage)}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPerformModal(false)}
                  className="text-[#6D7886] hover:text-[#F2F4F7] p-1.5 rounded-sm hover:bg-[#121D29] transition-all cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Form input fields element wrapper */}
              <form onSubmit={handleSubmitPerform} className="p-6 overflow-y-auto space-y-5 flex-1 text-left">
                
                {/* Switch Mode Toggle buttons */}
                <div>
                  <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-2.5 font-mono">
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
                          ? 'border-[#F2F4F7] bg-[#0E1116] text-[#F2F4F7] ring-1 ring-[#F2F4F7]'
                          : 'border-[#C5CBD3]/15 text-[#6D7886] bg-[#0E1116]/50 hover:bg-[#121D29]'
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
                          ? 'border-[#F2F4F7] bg-[#0E1116] text-[#F2F4F7] ring-1 ring-[#F2F4F7]'
                          : 'border-[#C5CBD3]/15 text-[#6D7886] bg-[#0E1116]/50 hover:bg-[#121D29]'
                      }`}
                    >
                      <FiTrendingUp size={16} />
                      <span className="uppercase tracking-wider font-mono text-[9px]">Log Sub-Activity Matrix</span>
                    </button>
                  </div>
                </div>

                {/* Transition Stage selector dropdown */}
                {actionType === 'STAGE_CHANGE' && (
                  <div className="animate-fadeIn">
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">
                      Target Stage *
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={nextStage}
                        onChange={(e) => setNextStage(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 focus:border-[#F2F4F7]/40 text-xs rounded-sm outline-none cursor-pointer text-[#F2F4F7] appearance-none"
                      >
                        {(allowedTransitions[selectedLead.stage] || []).length === 0 ? (
                          <option value="" className="bg-[#0E1116]">Terminal state reached; no exits authorized</option>
                        ) : (
                          (allowedTransitions[selectedLead.stage] || []).map((stage) => (
                            <option key={stage} value={stage} className="bg-[#0E1116] text-[#C5CBD3]">
                              {getStageDisplay(stage)} {stage === 'CLOSED_WON' ? '🏆 (Won Portfolio)' : stage === 'CLOSED_LOST' ? '❌ (Lost Portfolio)' : ''}
                            </option>
                          ))
                        )}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#6D7886]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manifest Remarks Area */}
                <div>
                  <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">
                    Fulfillment Work Details Remarks *
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 focus:border-[#F2F4F7]/40 text-xs rounded-sm outline-none text-[#F2F4F7] font-light resize-none custom-scrollbar"
                    placeholder="Enter precise operational descriptions, partner correspondence notes, or dynamic trade conditions..."
                  />
                </div>

                {/* DateTime Picker Follow-up field */}
                <div>
                  <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">
                    Schedule Linked Pipeline Follow-up (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={nextFollowup}
                    onChange={(e) => setNextFollowup(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 focus:border-[#F2F4F7]/40 text-xs rounded-sm outline-none text-[#F2F4F7] font-mono cursor-pointer"
                  />
                  <p className="text-[10px] text-[#6D7886] mt-2 font-light leading-relaxed">
                    Leave parameter void if the target charter profile lifecycle transitions completely out of manual follow-up dependencies.
                  </p>
                </div>

                {/* Action buttons footer block */}
                <div className="flex space-x-3 pt-4 border-t border-[#C5CBD3]/10 shrink-0">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-[#F2F4F7] hover:bg-[#C5CBD3] text-[#0E1116] text-xs font-bold uppercase tracking-wider rounded-sm transition duration-300 disabled:opacity-40 cursor-pointer shadow-md"
                  >
                    {submitting ? 'Transmitting Work Logs...' : 'Commit Work Parameters'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPerformModal(false)}
                    className="flex-1 py-3 bg-[#0E1116] hover:bg-[#121D29] border border-[#C5CBD3]/20 text-[#C5CBD3] text-xs font-bold uppercase tracking-wider rounded-sm transition duration-300 cursor-pointer"
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