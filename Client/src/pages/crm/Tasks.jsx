import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // Added this back in safely
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

  const getStageColor = (stage) => {
    const colors = {
      NEW_LEAD: 'bg-blue-50 text-blue-700 border-blue-100',
      ASSIGNED: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      CONTACTED: 'bg-purple-50 text-purple-700 border-purple-100',
      QUOTATION_REQUIRED: 'bg-amber-50 text-amber-700 border-amber-100',
      QUOTATION_REQUESTED: 'bg-orange-50 text-orange-700 border-orange-100',
      QUOTATION_SHARED: 'bg-teal-50 text-teal-700 border-teal-100',
      DISPATCH_PLANNED: 'bg-cyan-50 text-cyan-700 border-cyan-100',
      PAYMENT_PENDING: 'bg-rose-50 text-rose-700 border-rose-100',
      DOCUMENT_PENDING: 'bg-violet-50 text-violet-700 border-violet-100',
      CLOSED_WON: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold',
      CLOSED_LOST: 'bg-gray-50 text-gray-500 border-gray-200 line-through'
    };
    return colors[stage] || 'bg-slate-50 text-slate-700 border-slate-100';
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
      <div className="flex items-center justify-center min-h-[60vh] bg-[#FBF7EF]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C99B38]"></div>
          <p className="text-xs tracking-widest uppercase font-serif text-[#0B2D5B] opacity-70">Cataloging Pipeline Tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#0B2D5B] px-4 sm:px-8 py-8 space-y-8 font-sans antialiased">
      
      {/* Header Panel */}
      <div className="border-b border-[#C99B38]/10 pb-6">
        <span className="text-xs uppercase tracking-widest text-[#C99B38] font-bold">Operational Workflow Grid</span>
        <h1 className="text-3xl font-serif text-[#0B2D5B] tracking-wide mt-1">Task Performance Board</h1>
        <p className="text-sm text-gray-500 font-light mt-0.5">Review assigned global charters, log real-time fulfillment progress, and execute lifecycle stage transitions.</p>
      </div>

      {/* Quick Summary Metrics Tracker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Tasks Allocated", val: totalTasks, icon: FiGrid, bg: "bg-[#0B2D5B]/5", text: "text-[#0B2D5B]" },
          { label: "Active Pipeline Elements", val: pendingCount, icon: FiClock, bg: "bg-indigo-50", text: "text-[#1E4670]" },
          { label: "Closed Contracts Won", val: completedCount, icon: FiCheckSquare, bg: "bg-emerald-50", text: "text-emerald-800" },
          { label: "Contracts Dismissed", val: lostCount, icon: FiAlertCircle, bg: "bg-gray-50", text: "text-gray-400" }
        ].map((card, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-[#C99B38]/10 p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{card.label}</p>
              <p className="text-2xl font-serif mt-1 font-normal text-[#0B2D5B]">{card.val}</p>
            </div>
            <div className={`p-3 ${card.bg} text-[#C99B38] rounded-xl shadow-inner`}>
              <card.icon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Control Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#C99B38]/10 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full relative">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Filter operations registry by corporate name, lead charter hash, or material classification..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] focus:ring-1 focus:ring-[#C99B38] rounded-lg outline-none text-sm transition text-[#0B2D5B]"
          />
        </div>

        {/* Custom Tab Selection Buttons */}
        <div className="flex border border-gray-200 p-1 rounded-xl bg-[#FBF7EF]/60 shrink-0 w-full md:w-auto">
          {[
            { id: 'PENDING', label: 'Pending', count: pendingCount },
            { id: 'COMPLETED', label: 'Closed', count: completedCount + lostCount },
            { id: 'ALL', label: 'All Records', count: totalTasks }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 md:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-[#0B2D5B] shadow-sm font-bold'
                  : 'text-gray-400 hover:text-[#0B2D5B]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards Matrix Grid layout */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-xl text-center py-20 border border-[#C99B38]/10 shadow-sm">
          <FiCheckSquare size={40} className="mx-auto text-[#C99B38] opacity-60 mb-4" />
          <p className="text-xs uppercase tracking-widest text-gray-400 font-medium">No workflow cards matched this active grid cluster parameter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => {
            const isClosed = lead.stage === 'CLOSED_WON' || lead.stage === 'CLOSED_LOST';

            return (
              <div
                key={lead._id}
                className="bg-white rounded-xl border border-gray-100 hover:border-[#C99B38]/30 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between p-6 group relative"
              >
                <div>
                  {/* Card Micro Identity Strip */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-mono font-bold text-gray-400 tracking-wider">
                      {lead.leadCode}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0B2D5B] bg-[#0B2D5B]/5 px-2 py-0.5 rounded">
                      {lead.productCategory}
                    </span>
                  </div>

                  {/* Consignee Data */}
                  <div className="mb-4">
                    <h3 onClick={() => navigate(`/crm/leads/${lead._id}`)} className="text-lg font-serif font-medium text-[#0B2D5B] cursor-pointer hover:text-[#C99B38] transition-colors leading-tight">
                      {lead.customerName}
                    </h3>
                    {lead.companyName && (
                      <p className="text-xs text-gray-400 font-light mt-0.5">{lead.companyName}</p>
                    )}
                  </div>

                  {/* Specification List Elements */}
                  <div className="space-y-2.5 text-xs text-gray-600 py-3 border-t border-b border-gray-100/60 mb-4">
                    {lead.quantity && (
                      <div className="flex items-center gap-2">
                        <FiLayers className="text-gray-400 shrink-0" size={13} />
                        <span>Mass Metrics: <strong className="text-[#0B2D5B] font-medium">{lead.quantity}</strong></span>
                      </div>
                    )}
                    {lead.destination && (
                      <div className="flex items-center gap-2">
                        <FiMapPin className="text-gray-400 shrink-0" size={13} />
                        <span>Discharge Point: <strong className="text-[#0B2D5B] font-medium">{lead.destination}</strong></span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <FiClock className="text-gray-400 shrink-0" size={13} />
                      <span>Stage Axis:</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getStageColor(lead.stage)}`}>
                        {getStageDisplay(lead.stage)}
                      </span>
                    </div>
                    {lead.nextFollowupAt && (
                      <div className="flex items-center gap-2 text-rose-700 font-medium bg-rose-50 border border-rose-100 p-2 rounded-lg">
                        <FiCalendar className="shrink-0" size={13} />
                        <span>Follow-up: <strong className="font-mono">{new Date(lead.nextFollowupAt).toLocaleString()}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Remarks */}
                  {lead.remarks && (
                    <div className="mb-4 bg-[#FBF7EF]/60 p-3 rounded-lg border border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Latest Manifest Remark</p>
                      <p className="text-xs text-gray-600 font-light italic line-clamp-2">"{lead.remarks}"</p>
                    </div>
                  )}
                </div>

                {/* Card Action Hub Footer Row */}
                <div className="flex gap-2 pt-2 border-t border-gray-50">
                  <Link
                    to={`/crm/leads/${lead._id}`}
                    className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <FiEye size={12} />
                    <span>View History</span>
                  </Link>

                  {!isClosed ? (
                    <button
                      onClick={() => handleOpenPerform(lead)}
                      className="flex-1 py-2 text-xs font-bold text-white bg-[#0B2D5B] hover:bg-[#C99B38] rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-98 shadow-sm"
                    >
                      <FiEdit size={12} />
                      <span>Perform Task</span>
                    </button>
                  ) : (
                    <span className="flex-1 py-2 text-xs font-semibold text-center border border-gray-100 bg-gray-50 text-gray-400 rounded-lg flex items-center justify-center gap-1.5 cursor-not-allowed select-none">
                      <FiCheckSquare size={12} />
                      <span>Node Finalized</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Perform Task Progress Modal Canvas Layer */}
      <AnimatePresence>
        {showPerformModal && selectedLead && (
          <div className="fixed inset-0 bg-[#0B2D5B]/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl w-full max-w-lg overflow-hidden border border-[#C99B38]/20 shadow-2xl max-h-[90vh] flex flex-col"
            >
              {/* Overlay Form Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0 bg-[#FBF7EF]">
                <div>
                  <h3 className="text-base font-serif text-[#0B2D5B] uppercase tracking-wide">Report Task Progress: {selectedLead.leadCode}</h3>
                  <p className="text-xs text-gray-400 mt-1 font-light">
                    Consignee: <strong className="text-[#0B2D5B] font-medium">{selectedLead.customerName}</strong> | Active Stage Axis: <strong className="uppercase font-mono text-[#C99B38]">{getStageDisplay(selectedLead.stage)}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPerformModal(false)}
                  className="text-gray-400 hover:text-[#0B2D5B] p-1 rounded-lg hover:bg-gray-100 transition"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Execution Entry Form Body */}
              <form onSubmit={handleSubmitPerform} className="p-6 overflow-y-auto space-y-5 flex-1">
                
                {/* Action Mode Toggle Switches */}
                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-2.5">
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
                      className={`py-3 px-4 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all duration-200 text-center ${
                        actionType === 'STAGE_CHANGE'
                          ? 'border-[#0B2D5B] bg-[#FBF7EF] text-[#0B2D5B] ring-1 ring-[#0B2D5B]'
                          : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <FiLayers size={16} />
                      <span>Transition Lifecycle Stage</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActionType('ACTIVITY_ONLY');
                        setNextStage('');
                      }}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all duration-200 text-center ${
                        actionType === 'ACTIVITY_ONLY'
                          ? 'border-[#0B2D5B] bg-[#FBF7EF] text-[#0B2D5B] ring-1 ring-[#0B2D5B]'
                          : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <FiTrendingUp size={16} />
                      <span>Log Sub-Activity Matrix</span>
                    </button>
                  </div>
                </div>

                {/* Transition State Selector Node */}
                {actionType === 'STAGE_CHANGE' && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                      Target Stage *
                    </label>
                    <select
                      required
                      value={nextStage}
                      onChange={(e) => setNextStage(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none cursor-pointer text-[#0B2D5B]"
                    >
                      {(allowedTransitions[selectedLead.stage] || []).length === 0 ? (
                        <option value="">Terminal state reached; no exits authorized</option>
                      ) : (
                        (allowedTransitions[selectedLead.stage] || []).map((stage) => (
                          <option key={stage} value={stage}>
                            {getStageDisplay(stage)} {stage === 'CLOSED_WON' ? '🏆 (Won Portfolio)' : stage === 'CLOSED_LOST' ? '❌ (Lost Portfolio)' : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {/* Manifest Remarks Details */}
                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                    Fulfillment Work Details Remarks *
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B] font-light resize-none"
                    placeholder="Enter precise operational descriptions, partner correspondence notes, or dynamic trade conditions..."
                  />
                </div>

                {/* Followup Timestamp Input Picker */}
                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                    Schedule Linked Pipeline Follow-up (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={nextFollowup}
                    onChange={(e) => setNextFollowup(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B] font-mono cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5 font-light">
                    Leave parameter void if the target charter profile lifecycle transitions completely out of manual follow-up dependencies.
                  </p>
                </div>

                {/* Action Form Footer Control Buttons */}
                <div className="flex space-x-3 pt-4 border-t border-gray-100 shrink-0">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-[#0B2D5B] hover:bg-[#C99B38] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition duration-300 disabled:opacity-40"
                  >
                    {submitting ? 'Transmitting Work Logs...' : 'Commit Work Parameters'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPerformModal(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-200 transition duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}