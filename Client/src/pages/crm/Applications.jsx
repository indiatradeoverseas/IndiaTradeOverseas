import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFileText,
  FiDownload,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiEye,
  FiUser,
  FiUserPlus,
  FiTrash2
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { careersApi } from '../../api/careers';
import { employeesApi } from '../../api/employees';
import { DownloadButton } from '../../components/ui/AnimatedActionButton';

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [expandedApp, setExpandedApp] = useState(null);

  // Bulk Selection & Assignment States
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [assigneeName, setAssigneeName] = useState('');
  const [executivesList, setExecutivesList] = useState([]);

  // Single Candidate Assign Task Modal States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAppForAssign, setSelectedAppForAssign] = useState(null);
  const [singleAssigneeName, setSingleAssigneeName] = useState('');

  useEffect(() => {
    fetchApplications();
    fetchExecutives();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await careersApi.getApplications();
      if (response && response.success) {
        setApplications(response.data.applications || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load job applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutives = async () => {
    try {
      const res = await employeesApi.getEmployees();
      if (res && res.data) {
        const emps = res.data.employees || res.data || [];
        const hrDeptEmployees = emps.filter(emp => {
          const dept = (emp.department || '').toUpperCase();
          const role = (emp.role || '').toUpperCase();
          const pos = (emp.position || '').toUpperCase();
          return dept === 'HR' || dept === 'HUMAN RESOURCES' || role.includes('HR') || pos.includes('HR');
        });
        setExecutivesList(hrDeptEmployees);
      }
    } catch (err) {
      console.error('Failed to load HR Executives list', err);
    }
  };

  const [selectedCandidateIdForModal, setSelectedCandidateIdForModal] = useState('');

  const handleSelectAll = () => {
    if (selectedAppIds.length === filteredApplications.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(filteredApplications.map((app) => app._id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenAssignModal = (app = null) => {
    if (app) {
      setSelectedAppForAssign(app);
      setSelectedCandidateIdForModal(app._id);
      setSingleAssigneeName(app.assignedToName || '');
    } else {
      setSelectedAppForAssign(null);
      setSelectedCandidateIdForModal(selectedAppIds.length === 1 ? selectedAppIds[0] : '');
      setSingleAssigneeName(assigneeName || '');
    }
    setShowAssignModal(true);
  };

  const handleConfirmSingleAssign = async (e) => {
    e.preventDefault();
    if (!singleAssigneeName.trim()) {
      toast.error('Please select an HR Executive from the HR Department.');
      return;
    }

    let targetIds = [];
    if (selectedAppForAssign) {
      targetIds = [selectedAppForAssign._id];
    } else if (selectedCandidateIdForModal) {
      targetIds = [selectedCandidateIdForModal];
    } else if (selectedAppIds.length > 0) {
      targetIds = selectedAppIds;
    } else {
      toast.error('Please select at least one candidate application lead.');
      return;
    }

    const matchedExecutive = executivesList.find(e => (e.fullName || e.name) === singleAssigneeName);
    const targetAssignedToId = matchedExecutive ? (matchedExecutive._id || matchedExecutive.id || '') : '';

    try {
      const res = await careersApi.bulkAssignApplications(
        targetIds,
        targetAssignedToId,
        singleAssigneeName
      );
      if (res && res.success) {
        toast.success(`Successfully assigned task to ${singleAssigneeName} (HR Dept)! 🎯`);
        setShowAssignModal(false);
        setSelectedAppIds([]);
        setSelectedAppForAssign(null);
        setSelectedCandidateIdForModal('');
        window.dispatchEvent(new Event('task_assigned_event'));
        localStorage.setItem('task_assigned_timestamp', Date.now().toString());
        fetchApplications();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to assign task');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const response = await careersApi.updateApplicationStatus(id, status);
      if (response && response.success) {
        toast.success(`Application status updated to ${status}`);
        fetchApplications();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDownloadResume = async (id, originalName) => {
    try {
      await careersApi.downloadResume(id, originalName);
      toast.success('Resume downloaded successfully', { id: 'download' });
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast.error('Failed to download resume', { id: 'download' });
      throw error;
    }
  };

  const handleDeleteApplication = async (id, fullName) => {
    if (!window.confirm(`Permanently delete ${fullName}'s application? This also removes their uploaded resume/cover letter and cannot be undone.`)) return;

    try {
      const response = await careersApi.deleteApplication(id);
      if (response && response.success) {
        toast.success('Application deleted successfully');
        setApplications((prev) => prev.filter((app) => app._id !== id));
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error(error.response?.data?.message || 'Failed to delete application');
    }
  };

  const handleViewResume = async (id) => {
    const viewerWindow = window.open('', '_blank');
    try {
      await careersApi.viewResume(id, viewerWindow);
    } catch (error) {
      console.error('Error viewing resume:', error);
      toast.error('Failed to view resume');
      if (viewerWindow && !viewerWindow.closed) viewerWindow.close();
    }
  };

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedEvaluationApp, setSelectedEvaluationApp] = useState(null);
  const [selectedEvaluationRound, setSelectedEvaluationRound] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    status: 'PASSED',
    feedback: ''
  });

  const handleOpenEvaluationModal = (app, round = null) => {
    setSelectedEvaluationApp(app);
    const targetRound = round || (app.interviews && app.interviews.length > 0 ? app.interviews[app.interviews.length - 1] : null);
    setSelectedEvaluationRound(targetRound);
    setFeedbackForm({
      rating: targetRound?.rating || 5,
      status: targetRound?.status === 'PASSED' || targetRound?.status === 'FAILED' || targetRound?.status === 'ON_HOLD' ? targetRound.status : 'PASSED',
      feedback: targetRound?.feedback || ''
    });
    setShowFeedbackModal(true);
  };

  const handleSubmitEvaluationFeedback = async (e) => {
    e.preventDefault();
    if (!selectedEvaluationApp) return;

    try {
      const res = await careersApi.submitInterviewFeedback(
        selectedEvaluationApp._id,
        selectedEvaluationRound?._id || selectedEvaluationRound?.id,
        feedbackForm
      );

      if (res && res.success) {
        toast.success(`Interview evaluation saved (${feedbackForm.status})! 🎯`);
        setShowFeedbackModal(false);
        fetchApplications();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit interview feedback');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20',
      REVIEWED: 'bg-[var(--crm-info-bg)] text-[var(--crm-info)] border-[var(--crm-info)]/20',
      ACCEPTED: 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20',
      REJECTED: 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20'
    };
    return colors[status] || 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-faint)] border-[var(--crm-ink-soft)]/10';
  };

  const getRoundBadgeStyle = (rStatus) => {
    if (rStatus === 'PASSED') return 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/30';
    if (rStatus === 'FAILED') return 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/30';
    if (rStatus === 'ON_HOLD') return 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/30';
    return 'bg-[var(--crm-info-bg)] text-[var(--crm-info)] border-[var(--crm-info)]/30';
  };

  const positions = ['ALL', ...new Set(applications.map(app => app.position))];

  const filteredApplications = applications.filter(app => {
    const matchesSearch =
      app.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.phone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'ALL' || app.status === selectedStatus;
    const matchesPosition = selectedPosition === 'ALL' || app.position === selectedPosition;

    return matchesSearch && matchesStatus && matchesPosition;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[var(--crm-bg)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <p className="text-xs tracking-widest uppercase font-serif text-[var(--crm-ink-soft)] opacity-70">Cataloging Talent Pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 font-sans antialiased">

      {/* Upper Deck Header */}
      <div className="border-b border-[var(--crm-ink-soft)]/10 pb-5 sm:pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">Human Capital Matrix</span>
          <h1 className="text-2xl sm:text-3xl font-serif text-[var(--crm-heading)] tracking-wide mt-1">Job Applications</h1>
          <p className="text-xs sm:text-sm text-[var(--crm-ink-faint)] font-light mt-0.5">Audit global talent records, manage interview routing matrices, and evaluate candidate credentials.</p>
        </div>

        <button
          onClick={() => handleOpenAssignModal(null)}
          className="w-full md:w-auto justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/50 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-blue-900/40 shrink-0"
        >
          <FiUserPlus size={16} />
          <span>👤 Assign Task (HR Dept)</span>
        </button>
      </div>

      {/* Analytics Summary Panels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {[
          { label: "Total Received", val: applications.length, icon: FiUser, bg: "bg-[var(--crm-bg)]", text: "text-[var(--crm-heading)]" },
          { label: "Pending Review", val: applications.filter(a => a.status === 'PENDING').length, icon: FiClock, bg: "bg-[var(--crm-warning-bg)]", text: "text-[var(--crm-warning)]" },
          { label: "Accepted Nodes", val: applications.filter(a => a.status === 'ACCEPTED').length, icon: FiCheckCircle, bg: "bg-[var(--crm-positive-bg)]", text: "text-[var(--crm-positive)]" },
          { label: "Rejected Records", val: applications.filter(a => a.status === 'REJECTED').length, icon: FiXCircle, bg: "bg-[var(--crm-danger-bg)]", text: "text-[var(--crm-danger)]" }
        ].map((card, idx) => (
          <div key={idx} className="bg-[var(--crm-bg-raised)]/30 rounded-xl border border-[var(--crm-ink-soft)]/15 p-3.5 sm:p-5 flex items-center justify-between shadow-sm gap-2">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-[var(--crm-ink-faint)] truncate">{card.label}</p>
              <p className={`text-xl sm:text-2xl font-serif mt-1 font-normal ${card.text}`}>{card.val}</p>
            </div>
            <div className={`p-2 sm:p-3 ${card.bg} ${card.text} rounded-xl shadow-inner shrink-0`}>
              <card.icon size={16} />
            </div>
          </div>
        ))}
      </div>

      {/* Control Console Filtering */}
      <div className="bg-[var(--crm-bg-raised)]/20 p-3 sm:p-4 rounded-xl border border-[var(--crm-ink-soft)]/15 shadow-sm flex flex-col md:flex-row gap-3 sm:gap-4 md:items-center">
        <div className="flex-1 w-full relative">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--crm-ink-faint)]" size={16} />
          <input
            type="text"
            placeholder="Search candidate by name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 rounded-lg outline-none text-sm transition text-[var(--crm-heading)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 md:flex md:gap-4 md:w-auto">
          <div className="w-full md:w-52 flex items-center gap-2">
            <FiFilter className="text-[var(--crm-ink-faint)] shrink-0" size={16} />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-blue-500/40 rounded-lg outline-none text-xs sm:text-sm cursor-pointer text-[var(--crm-heading)]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="w-full md:w-60 flex items-center gap-2">
            <FiFilter className="text-[var(--crm-ink-faint)] shrink-0" size={16} />
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-blue-500/40 rounded-lg outline-none text-xs sm:text-sm cursor-pointer text-[var(--crm-heading)]"
            >
              <option value="ALL">All Positions</option>
              {positions.filter(pos => pos !== 'ALL').map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Assignment Bar */}
      <div className="bg-[var(--crm-bg-raised)] border border-blue-500/30 p-3.5 sm:p-4 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={filteredApplications.length > 0 && selectedAppIds.length === filteredApplications.length}
            onChange={handleSelectAll}
            className="w-4 h-4 accent-blue-500 cursor-pointer rounded shrink-0"
          />
          <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-[var(--crm-heading)]">
            Select All ({selectedAppIds.length} / {filteredApplications.length})
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <select
            value={assigneeName}
            onChange={(e) => setAssigneeName(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 rounded-lg text-xs text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-mono sm:min-w-[200px]"
          >
            <option value="">-- Select HR Executive --</option>
            {executivesList.map(emp => (
              <option key={emp._id || emp.id} value={emp.fullName || emp.name}>
                {emp.fullName || emp.name} ({emp.department || 'HR'})
              </option>
            ))}
          </select>
          <button
            onClick={() => handleOpenAssignModal(null)}
            disabled={selectedAppIds.length === 0}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition border ${
              selectedAppIds.length > 0
                ? 'bg-blue-600 text-white border-blue-400/50 hover:bg-blue-500 cursor-pointer shadow-md shadow-blue-900/30'
                : 'bg-blue-950/40 text-blue-300/60 border-blue-500/20 cursor-not-allowed'
            }`}
          >
            Assign Selected ({selectedAppIds.length})
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP / TABLET CARD GRID VIEW                           */}
      {/* ========================================================= */}
      <div className="hidden md:block">
        {filteredApplications.length === 0 ? (
          <div className="text-center py-16 text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] bg-[var(--crm-bg-raised)]/20 rounded-xl border border-[var(--crm-ink-soft)]/15">
            No candidate profiles match the current search.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredApplications.map((app) => {
              const appId = app._id;
              const isExpanded = expandedApp === appId;
              const isSelected = selectedAppIds.includes(appId);

              return (
                <div
                  key={appId}
                  className={`rounded-xl border p-4 space-y-3 transition duration-150 ${
                    isSelected
                      ? 'border-blue-500/50 bg-blue-950/10 shadow-md shadow-blue-900/20'
                      : 'border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg-raised)]/20 hover:border-blue-500/30'
                  }`}
                >
                  {/* Header Row */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(appId)}
                      className="w-4 h-4 mt-1 accent-blue-500 cursor-pointer rounded shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-serif font-medium text-base text-[var(--crm-heading)] truncate">
                            {app.fullName}
                          </h3>
                          <p className="text-[11px] text-[var(--crm-ink-faint)] truncate">{app.email}</p>
                          <p className="text-[11px] text-[var(--crm-ink-faint)]">{app.phone}</p>
                        </div>
                        <span className={`shrink-0 inline-block px-2.5 py-0.5 border text-[10px] font-bold tracking-wider uppercase rounded ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)]">
                          {app.position}
                        </span>
                        {app.assignedToName && (
                          <span className="inline-block px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-blue-950/40 text-blue-300 border border-blue-500/30">
                            👤 {app.assignedToName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Interview Rounds */}
                  {app.interviews && app.interviews.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[var(--crm-ink-soft)]/10">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--crm-ink-faint)] font-mono">
                        Interview Rounds ({app.interviews.length})
                      </p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {app.interviews.map((rnd, rIdx) => {
                          const rStatus = rnd.status || 'SCHEDULED';
                          return (
                            <div key={rnd._id || rIdx} className="p-2 border border-[var(--crm-ink-soft)]/10 rounded-md bg-[var(--crm-bg-sunken)] text-[10px] font-mono space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-[var(--crm-heading)] truncate">
                                  {rnd.roundName || `Round ${rnd.roundNumber || rIdx + 1}`}
                                </span>
                                <span className={`shrink-0 px-1.5 py-0.2 border text-[8px] font-bold rounded uppercase ${getRoundBadgeStyle(rStatus)}`}>
                                  {rStatus}
                                </span>
                              </div>
                              <div className="text-[9px] text-[var(--crm-ink-faint)] flex items-center justify-between gap-2">
                                <span className="truncate">By: <strong className="text-[var(--crm-heading)]">{rnd.interviewerName || 'Lead'}</strong></span>
                                {rnd.scheduledDate && <span className="shrink-0">{rnd.scheduledDate} {rnd.scheduledTime}</span>}
                              </div>
                              {rnd.meetingLink && (
                                <a
                                  href={rnd.meetingLink.startsWith('http') ? rnd.meetingLink : `https://${rnd.meetingLink}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-400 hover:underline"
                                >
                                  📹 Join Meeting
                                </a>
                              )}
                              {rnd.rating && (
                                <div className="text-[9px] text-[var(--crm-accent)] font-bold">
                                  {'★'.repeat(rnd.rating)}{'☆'.repeat(5 - rnd.rating)} ({rnd.rating}/5)
                                </div>
                              )}
                              {rnd.feedback && (
                                <div className="text-[9px] text-[var(--crm-ink-soft)] italic line-clamp-2" title={rnd.feedback}>
                                  "{rnd.feedback}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cover Letter Toggle */}
                  {app.coverLetter && (
                    <div className="pt-1">
                      <button
                        onClick={() => setExpandedApp(isExpanded ? null : appId)}
                        className="inline-flex items-center text-[10px] font-mono font-bold uppercase text-blue-400 hover:text-blue-300 gap-1"
                      >
                        <FiFileText size={12} />
                        {isExpanded ? 'Hide Cover Letter' : 'View Cover Letter'}
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="mt-2 text-[var(--crm-ink-soft)] text-[11px] leading-relaxed font-light whitespace-pre-line bg-[var(--crm-bg-sunken)] p-3 border border-[var(--crm-ink-soft)]/10 rounded-lg max-h-48 overflow-y-auto">
                              {app.coverLetter}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-[var(--crm-ink-soft)]/10 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleViewResume(appId)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-transparent border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 text-[11px] font-semibold rounded-lg transition"
                      >
                        <FiEye size={13} />
                        <span>View CV</span>
                      </button>
                      <DownloadButton
                        action={() => handleDownloadResume(appId, app.resumeOriginalName)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-transparent border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-[11px] font-semibold rounded-lg transition disabled:cursor-default"
                        title="Download CV"
                        icon={FiDownload}
                        iconSize={13}
                        idleLabel="Download"
                        busyLabel="Loading..."
                        doneLabel="Done"
                      />
                      <button
                        onClick={() => handleOpenEvaluationModal(app)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition"
                      >
                        + Evaluate
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(appId, e.target.value)}
                        className="px-2.5 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-blue-500/40 text-[11px] font-medium text-[var(--crm-heading)] rounded-lg outline-none cursor-pointer"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="REVIEWED">Reviewed</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                      <button
                        onClick={() => handleOpenAssignModal(app)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition"
                      >
                        <FiUserPlus size={13} />
                        Assign
                      </button>
                      <button
                        onClick={() => handleDeleteApplication(appId, app.fullName)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-transparent border border-[var(--crm-danger)]/30 text-[var(--crm-danger)] hover:bg-[var(--crm-danger)]/10 text-[11px] font-bold uppercase tracking-wider rounded-lg transition"
                      >
                        <FiTrash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MOBILE CARD VIEW                                          */}
      {/* ========================================================= */}
      <div className="md:hidden space-y-3">
        {filteredApplications.length === 0 ? (
          <div className="text-center py-12 text-[10px] uppercase tracking-widest text-[var(--crm-ink-faint)] bg-[var(--crm-bg-raised)]/20 rounded-xl border border-[var(--crm-ink-soft)]/15">
            No candidate profiles match the current search.
          </div>
        ) : (
          filteredApplications.map((app) => {
            const appId = app._id;
            const isExpanded = expandedApp === appId;
            const isSelected = selectedAppIds.includes(appId);

            return (
              <div
                key={appId}
                className={`rounded-xl border p-3.5 space-y-3 transition ${
                  isSelected
                    ? 'border-blue-500/50 bg-blue-950/10'
                    : 'border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg-raised)]/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(appId)}
                    className="w-4 h-4 mt-0.5 accent-blue-500 cursor-pointer rounded shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-serif font-medium text-base text-[var(--crm-heading)] truncate">
                          {app.fullName}
                        </h3>
                        <p className="text-[11px] text-[var(--crm-ink-faint)] truncate">{app.email}</p>
                        <p className="text-[11px] text-[var(--crm-ink-faint)]">{app.phone}</p>
                      </div>
                      <span className={`shrink-0 inline-block px-2 py-0.5 border text-[9px] font-bold tracking-wider uppercase rounded ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)]">
                        {app.position}
                      </span>
                      {app.assignedToName && (
                        <span className="inline-block px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-blue-950/40 text-blue-300 border border-blue-500/30">
                          👤 {app.assignedToName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {app.interviews && app.interviews.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-[var(--crm-ink-soft)]/10">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--crm-ink-faint)] font-mono pt-1">
                      Interview Rounds
                    </p>
                    {app.interviews.map((rnd, rIdx) => {
                      const rStatus = rnd.status || 'SCHEDULED';
                      return (
                        <div key={rnd._id || rIdx} className="p-2 border border-[var(--crm-ink-soft)]/10 rounded-md bg-[var(--crm-bg-sunken)] text-[10px] font-mono space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[var(--crm-heading)] truncate">
                              {rnd.roundName || `Round ${rnd.roundNumber || rIdx + 1}`}
                            </span>
                            <span className={`shrink-0 px-1.5 py-0.2 border text-[8px] font-bold rounded uppercase ${getRoundBadgeStyle(rStatus)}`}>
                              {rStatus}
                            </span>
                          </div>
                          <div className="text-[9px] text-[var(--crm-ink-faint)] flex items-center justify-between gap-2">
                            <span className="truncate">By: <strong className="text-[var(--crm-heading)]">{rnd.interviewerName || 'Lead'}</strong></span>
                            {rnd.scheduledDate && <span className="shrink-0">{rnd.scheduledDate} {rnd.scheduledTime}</span>}
                          </div>
                          {rnd.meetingLink && (
                            <a
                              href={rnd.meetingLink.startsWith('http') ? rnd.meetingLink : `https://${rnd.meetingLink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-400 hover:underline"
                            >
                              📹 Join Meeting
                            </a>
                          )}
                          {rnd.rating && (
                            <div className="text-[9px] text-[var(--crm-accent)] font-bold">
                              {'★'.repeat(rnd.rating)}{'☆'.repeat(5 - rnd.rating)} ({rnd.rating}/5)
                            </div>
                          )}
                          {rnd.feedback && (
                            <div className="text-[9px] text-[var(--crm-ink-soft)] italic line-clamp-2">
                              "{rnd.feedback}"
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {app.coverLetter && (
                  <div>
                    <button
                      onClick={() => setExpandedApp(isExpanded ? null : appId)}
                      className="inline-flex items-center text-[10px] font-mono font-bold uppercase text-blue-400 hover:text-blue-300 gap-1"
                    >
                      <FiFileText size={12} />
                      {isExpanded ? 'Hide Cover Letter' : 'View Cover Letter'}
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="mt-2 text-[var(--crm-ink-soft)] text-[11px] leading-relaxed font-light whitespace-pre-line bg-[var(--crm-bg-sunken)] p-3 border border-[var(--crm-ink-soft)]/10 rounded-lg max-h-56 overflow-y-auto">
                            {app.coverLetter}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className="pt-2 border-t border-[var(--crm-ink-soft)]/10 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleViewResume(appId)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-transparent border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 text-[11px] font-semibold rounded-lg transition"
                    >
                      <FiEye size={13} />
                      <span>View CV</span>
                    </button>
                    <DownloadButton
                      action={() => handleDownloadResume(appId, app.resumeOriginalName)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-transparent border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-[11px] font-semibold rounded-lg transition disabled:cursor-default"
                      title="Download CV"
                      icon={FiDownload}
                      iconSize={13}
                      idleLabel="Download CV"
                      busyLabel="Downloading..."
                      doneLabel="Downloaded"
                    />
                  </div>

                  <button
                    onClick={() => handleOpenEvaluationModal(app)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition"
                  >
                    + Submit Evaluation Feedback
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(appId, e.target.value)}
                      className="px-2.5 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-blue-500/40 text-[11px] font-medium text-[var(--crm-heading)] rounded-lg outline-none cursor-pointer"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="REVIEWED">Reviewed</option>
                      <option value="ACCEPTED">Accepted</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                    <button
                      onClick={() => handleOpenAssignModal(app)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition"
                    >
                      <FiUserPlus size={13} />
                      Assign
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteApplication(appId, app.fullName)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-transparent border border-[var(--crm-danger)]/30 text-[var(--crm-danger)] hover:bg-[var(--crm-danger)]/10 text-[11px] font-bold uppercase tracking-wider rounded-lg transition"
                  >
                    <FiTrash2 size={13} />
                    Delete Application
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Interview Evaluation Modal */}
      {showFeedbackModal && selectedEvaluationApp && (
        <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-[var(--crm-bg-raised)] rounded-t-2xl sm:rounded-sm p-5 sm:p-6 w-full max-w-md border border-[var(--crm-line)] shadow-2xl text-left overflow-y-auto max-h-[92vh] sm:max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--crm-line)]">
              <div className="min-w-0">
                <h2 className="font-serif text-base sm:text-lg text-[var(--crm-heading)] uppercase tracking-wide">Interview Evaluation</h2>
                <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono mt-0.5 truncate">
                  {selectedEvaluationApp.fullName} ({selectedEvaluationApp.position})
                </p>
              </div>
              <button onClick={() => setShowFeedbackModal(false)} className="text-[var(--crm-ink-faint)] hover:text-white font-bold shrink-0 ml-2">✕</button>
            </div>
            <form onSubmit={handleSubmitEvaluationFeedback} className="space-y-4 text-xs font-medium">
              {selectedEvaluationApp.interviews && selectedEvaluationApp.interviews.length > 1 && (
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Select Round *</label>
                  <select
                    value={selectedEvaluationRound?._id || selectedEvaluationRound?.id || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const matchRound = selectedEvaluationApp.interviews.find(r => (r._id || r.id) === selectedId);
                      if (matchRound) {
                        setSelectedEvaluationRound(matchRound);
                        setFeedbackForm({
                          rating: matchRound.rating || 5,
                          status: matchRound.status === 'PASSED' || matchRound.status === 'FAILED' || matchRound.status === 'ON_HOLD' ? matchRound.status : 'PASSED',
                          feedback: matchRound.feedback || ''
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-emerald-500/55 rounded-sm text-sm outline-none text-[var(--crm-heading)] cursor-pointer"
                  >
                    {selectedEvaluationApp.interviews.map((r, idx) => (
                      <option key={r._id || idx} value={r._id || r.id}>
                        {r.roundName || `Round ${r.roundNumber || idx + 1}`} - ({r.status || 'SCHEDULED'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Round Result *</label>
                  <select
                    required
                    value={feedbackForm.status}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-emerald-500/55 rounded-sm text-sm outline-none cursor-pointer text-[var(--crm-heading)]"
                  >
                    <option value="PASSED">PASSED (Cleared Round)</option>
                    <option value="FAILED">FAILED (Rejected)</option>
                    <option value="ON_HOLD">ON HOLD (Pending)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Rating (1-5) *</label>
                  <select
                    required
                    value={feedbackForm.rating}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-emerald-500/55 rounded-sm text-sm outline-none cursor-pointer text-[var(--crm-heading)]"
                  >
                    <option value="5">★★★★★ (5 - Excellent)</option>
                    <option value="4">★★★★☆ (4 - Good)</option>
                    <option value="3">★★★☆☆ (3 - Average)</option>
                    <option value="2">★★☆☆☆ (2 - Below)</option>
                    <option value="1">★☆☆☆☆ (1 - Poor)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Feedback & Comments *</label>
                <textarea
                  required
                  rows={4}
                  value={feedbackForm.feedback}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, feedback: e.target.value })}
                  placeholder="Record strengths, weaknesses, technical evaluation, communication skills, and final recommendations..."
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-emerald-500/55 rounded-sm text-xs outline-none resize-none text-[var(--crm-heading)] font-sans"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-3 border-t border-[var(--crm-line)]">
                <button type="submit" className="flex-1 py-2.5 bg-emerald-600 text-white hover:bg-emerald-500 rounded-sm font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Submit Feedback
                </button>
                <button type="button" onClick={() => setShowFeedbackModal(false)} className="flex-1 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)] rounded-sm text-[var(--crm-ink-soft)] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Task (HR Dept) Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-3 sm:p-4 overflow-y-auto min-h-screen py-6 sm:py-10" onClick={() => setShowAssignModal(false)}>
          <div className="bg-[var(--crm-bg-raised)] rounded-2xl p-5 sm:p-6 w-full max-w-lg border border-blue-500/30 shadow-2xl text-left my-auto max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--crm-ink-soft)]/20 shrink-0">
              <div className="flex items-center gap-2">
                <FiUserPlus className="text-blue-400" size={20} />
                <h2 className="font-serif text-base sm:text-lg text-[var(--crm-heading)] uppercase tracking-wide">
                  Assign Task (HR Dept)
                </h2>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-[var(--crm-ink-faint)] hover:text-white font-bold text-lg cursor-pointer p-1 rounded hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSingleAssign} className="space-y-5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">
                  Target Candidate / Application Lead *
                </label>
                {selectedAppForAssign ? (
                  <div className="p-3 bg-[var(--crm-bg-sunken)] border border-blue-500/20 rounded-lg text-sm font-medium text-[var(--crm-heading)]">
                    <div className="truncate">{selectedAppForAssign.fullName} ({selectedAppForAssign.position})</div>
                    <div className="text-xs text-[var(--crm-ink-faint)] font-mono truncate">{selectedAppForAssign.email}</div>
                  </div>
                ) : (
                  <select
                    value={selectedCandidateIdForModal}
                    onChange={(e) => setSelectedCandidateIdForModal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 rounded-lg text-sm text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Choose Candidate Lead --</option>
                    {filteredApplications.map(app => (
                      <option key={app._id} value={app._id}>
                        {app.fullName} ({app.position}) - {app.email}
                      </option>
                    ))}
                  </select>
                )}
                {selectedAppIds.length > 0 && !selectedAppForAssign && !selectedCandidateIdForModal && (
                  <p className="text-[10px] text-blue-300 font-mono mt-1">
                    Will assign all {selectedAppIds.length} bulk selected candidate leads.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">
                  Assignee (HR Executive / Manager) *
                </label>
                <select
                  required
                  value={singleAssigneeName}
                  onChange={(e) => setSingleAssigneeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--crm-bg-sunken)] border border-blue-500/30 rounded-lg text-sm text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 cursor-pointer font-mono"
                >
                  <option value="">-- Select HR Department Member --</option>
                  {executivesList.length === 0 ? (
                    <option disabled value="">No HR Executive found in system</option>
                  ) : (
                    executivesList.map((emp) => (
                      <option key={emp._id || emp.id} value={emp.fullName || emp.name}>
                        {emp.fullName || emp.name} ({emp.department || 'HR'} - {emp.position || emp.role || 'HR Staff'})
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono mt-1">
                  Only verified members of the HR Department appear in this selection list.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-[var(--crm-ink-soft)]/20">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg"
                >
                  Confirm & Assign Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] rounded-lg font-bold font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
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