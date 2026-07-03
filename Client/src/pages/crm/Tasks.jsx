import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
      CLOSED_WON: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      CLOSED_LOST: 'bg-slate-100 text-slate-700 border-slate-200'
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

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Performance Board</h1>
          <p className="text-gray-600 mt-1">Review your assigned leads/tasks, log activities, and progress stages to closure.</p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FiGrid size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Tasks</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalTasks}</p>
          </div>
        </div>

        <div className="card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FiClock size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Pending</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{pendingCount}</p>
          </div>
        </div>

        <div className="card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FiCheckSquare size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Closed Won</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{completedCount}</p>
          </div>
        </div>

        <div className="card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <FiAlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Closed Lost</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{lostCount}</p>
          </div>
        </div>
      </div>


      <div className="card p-4 bg-white shadow-sm border border-slate-100 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full relative">
          <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer, code, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {/* Tab Buttons */}
        <div className="flex border border-slate-200 p-1 rounded-xl bg-slate-50/50 shrink-0 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${activeTab === 'PENDING'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${activeTab === 'COMPLETED'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            Closed ({completedCount + lostCount})
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${activeTab === 'ALL'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            All ({totalTasks})
          </button>
        </div>
      </div>

      {/* Task List Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="card text-center py-16 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <FiCheckSquare size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 font-medium">No tasks found matching your filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => {
            const isClosed = lead.stage === 'CLOSED_WON' || lead.stage === 'CLOSED_LOST';
            const availableOptions = allowedTransitions[lead.stage] || [];

            return (
              <div
                key={lead._id}
                className="card flex flex-col justify-between hover:shadow-lg transition-all border border-slate-100 hover:border-slate-200 bg-white rounded-2xl p-6 shadow-sm group"
              >
                <div
                  onClick={() => navigate(`/crm/leads/${lead._id}`)}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {/* Category and Code Header */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold font-mono text-slate-400 tracking-wider">
                      {lead.leadCode}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {lead.productCategory}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {lead.customerName}
                    </h3>
                    {lead.companyName && (
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{lead.companyName}</p>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2.5 text-xs text-slate-600 py-3 border-t border-b border-slate-50 mb-4">
                    {lead.quantity && (
                      <div className="flex items-center gap-2">
                        <FiLayers className="text-slate-400 shrink-0" />
                        <span>Qty: <strong>{lead.quantity}</strong></span>
                      </div>
                    )}
                    {lead.destination && (
                      <div className="flex items-center gap-2">
                        <FiMapPin className="text-slate-400 shrink-0" />
                        <span>To: <strong>{lead.destination}</strong></span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <FiClock className="text-slate-400 shrink-0" />
                      <span>Current Stage:</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStageColor(lead.stage)}`}>
                        {getStageDisplay(lead.stage)}
                      </span>
                    </div>
                    {lead.nextFollowupAt && (
                      <div className="flex items-center gap-2 text-rose-600 font-medium bg-rose-50/50 p-1.5 rounded-lg border border-rose-100/50">
                        <FiCalendar className="shrink-0" />
                        <span>Follow-up: <strong>{new Date(lead.nextFollowupAt).toLocaleString()}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Remarks */}
                  {lead.remarks && (
                    <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Latest Remark</p>
                      <p className="text-xs text-slate-600 italic line-clamp-2">"{lead.remarks}"</p>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2 pt-2">
                  <Link
                    to={`/crm/leads/${lead._id}`}
                    className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <FiEye />
                    <span>View History</span>
                  </Link>

                  {!isClosed ? (
                    <button
                      onClick={() => handleOpenPerform(lead)}
                      className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <FiEdit />
                      <span>Perform Task</span>
                    </button>
                  ) : (
                    <span className="flex-1 py-2 text-xs font-semibold text-center border border-slate-100 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                      <FiCheckSquare />
                      <span>Task Closed</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Perform Task Progress Form Modal */}
      {showPerformModal && selectedLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Perform Task: {selectedLead.leadCode}</h3>
                <p className="text-xs text-slate-400 mt-1">Customer: <strong>{selectedLead.customerName}</strong> | Current Stage: <strong className="uppercase">{getStageDisplay(selectedLead.stage)}</strong></p>
              </div>
              <button
                onClick={() => setShowPerformModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitPerform} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Action Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Action Mode *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActionType('STAGE_CHANGE');
                      const ops = allowedTransitions[selectedLead.stage] || [];
                      if (ops.length > 0) setNextStage(ops[0]);
                    }}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center ${actionType === 'STAGE_CHANGE'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-1 ring-indigo-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <FiLayers size={18} />
                    <span>Progress Stage</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActionType('ACTIVITY_ONLY');
                      setNextStage('');
                    }}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center ${actionType === 'ACTIVITY_ONLY'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-1 ring-indigo-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <FiTrendingUp size={18} />
                    <span>Log Activity Only</span>
                  </button>
                </div>
              </div>

              {actionType === 'STAGE_CHANGE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Choose Next Stage *
                  </label>
                  <select
                    required
                    value={nextStage}
                    onChange={(e) => setNextStage(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm cursor-pointer"
                  >
                    {(allowedTransitions[selectedLead.stage] || []).length === 0 ? (
                      <option value="">No transitions allowed from this stage</option>
                    ) : (
                      (allowedTransitions[selectedLead.stage] || []).map((stage) => (
                        <option key={stage} value={stage}>
                          {getStageDisplay(stage)} {stage === 'CLOSED_WON' ? '🏆 (Won)' : stage === 'CLOSED_LOST' ? '❌ (Lost)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                  {/* baad me add krunga chart */}
                </div>
              )}

              {/* Action Note/Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Activity Details *
                </label>
                <textarea
                  required
                  rows="4"
                  value={activityNote}
                  onChange={(e) => setActivityNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder:text-slate-400"
                  placeholder="Describe your progress"
                />
              </div>

              {/* Followup Date Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Schedule Next Follow-up (Optional)
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={nextFollowup}
                    onChange={(e) => setNextFollowup(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Leave empty if no further follow-up is required.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Save & Log Work'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPerformModal(false)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
