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
        // Filter strictly to ONLY HR Department team members!
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
    // Open the tab synchronously (before the await below) so browsers don't
    // treat it as a blocked popup.
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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--crm-heading)]"></div>
          <p className="text-xs tracking-widest uppercase font-serif text-[var(--crm-ink-soft)] opacity-70">Cataloging Talent Pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] px-4 sm:px-8 py-8 space-y-8 font-sans antialiased">

      {/* Upper Deck Header */}
      <div className="border-b border-[var(--crm-ink-soft)]/10 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">Human Capital Matrix</span>
          <h1 className="text-3xl font-serif text-[var(--crm-heading)] tracking-wide mt-1">Job Applications</h1>
          <p className="text-sm text-[var(--crm-ink-faint)] font-light mt-0.5">Audit global talent records, manage interview routing matrices, and evaluate candidate credentials.</p>
        </div>

        <button
          onClick={() => handleOpenAssignModal(null)}
          className="px-4 py-2.5 bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-500/50 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-purple-900/40 shrink-0 self-start md:self-auto"
        >
          <FiUserPlus size={16} />
          <span>👤 Assign Task (HR Dept)</span>
        </button>
      </div>

      {/* Analytics Summary Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Received", val: applications.length, icon: FiUser, bg: "bg-[var(--crm-bg)]", text: "text-[var(--crm-heading)]" },
          { label: "Pending Review", val: applications.filter(a => a.status === 'PENDING').length, icon: FiClock, bg: "bg-[var(--crm-warning-bg)]", text: "text-[var(--crm-warning)]" },
          { label: "Accepted Nodes", val: applications.filter(a => a.status === 'ACCEPTED').length, icon: FiCheckCircle, bg: "bg-[var(--crm-positive-bg)]", text: "text-[var(--crm-positive)]" },
          { label: "Rejected Records", val: applications.filter(a => a.status === 'REJECTED').length, icon: FiXCircle, bg: "bg-[var(--crm-danger-bg)]", text: "text-[var(--crm-danger)]" }
        ].map((card, idx) => (
          <div key={idx} className="bg-[var(--crm-bg-raised)]/30 rounded-xl border border-[var(--crm-ink-soft)]/15 p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--crm-ink-faint)]">{card.label}</p>
              <p className={`text-2xl font-serif mt-1 font-normal ${card.text}`}>{card.val}</p>
            </div>
            <div className={`p-3 ${card.bg} ${card.text} rounded-xl shadow-inner`}>
              <card.icon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Control Console Filtering */}
      <div className="bg-[var(--crm-bg-raised)]/20 p-4 rounded-xl border border-[var(--crm-ink-soft)]/15 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--crm-ink-faint)]" size={16} />
          <input
            type="text"
            placeholder="Search candidate index registry by name, email coordinates, or phone manifest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 focus:ring-1 focus:ring-[var(--crm-heading)]/20 rounded-lg outline-none text-sm transition text-[var(--crm-heading)]"
          />
        </div>

        <div className="w-full md:w-52 flex items-center gap-2">
          <FiFilter className="text-[var(--crm-ink-faint)] shrink-0" size={16} />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 rounded-lg outline-none text-sm cursor-pointer text-[var(--crm-heading)]"
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
            className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 rounded-lg outline-none text-sm cursor-pointer text-[var(--crm-heading)]"
          >
            <option value="ALL">All Positions</option>
            {positions.filter(pos => pos !== 'ALL').map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Action Assignment Bar */}
      <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-heading)]/30 p-4 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={filteredApplications.length > 0 && selectedAppIds.length === filteredApplications.length}
            onChange={handleSelectAll}
            className="w-4 h-4 accent-[var(--crm-heading)] cursor-pointer rounded"
          />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--crm-heading)]">
            Select All ({selectedAppIds.length} / {filteredApplications.length} Selected)
          </span>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-mono text-[var(--crm-ink-faint)] whitespace-nowrap hidden sm:inline">Assign to HR Executive:</span>
          <select
            value={assigneeName}
            onChange={(e) => setAssigneeName(e.target.value)}
            className="px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 rounded-lg text-xs text-[var(--crm-heading)] focus:outline-none focus:border-[var(--crm-heading)] font-mono min-w-[200px]"
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
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition ${
              selectedAppIds.length > 0
                ? 'bg-[var(--crm-heading)] text-black hover:opacity-90 cursor-pointer shadow-md'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
            }`}
          >
            Assign Selected Leads ({selectedAppIds.length})
          </button>
        </div>
      </div>

      {/* Main Stream Table Registry */}
      <div className="bg-[var(--crm-bg-raised)]/10 rounded-xl border border-[var(--crm-ink-soft)]/15 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[11px] uppercase tracking-wider">
                <th className="py-4 px-4 text-center font-medium w-10">
                  <input
                    type="checkbox"
                    checked={filteredApplications.length > 0 && selectedAppIds.length === filteredApplications.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 accent-[var(--crm-heading)] cursor-pointer rounded"
                  />
                </th>
                <th className="py-4 px-6 font-medium">Candidate Identity Details</th>
                <th className="py-4 px-6 font-medium">Target Deployment Position</th>
                <th className="py-4 px-6 font-medium">Interview Rounds & Feedback</th>
                <th className="py-4 px-6 text-center font-medium">Pipeline Status</th>
                <th className="py-4 px-6 text-center font-medium">Credentials File</th>
                <th className="py-4 px-6 text-center font-medium">Lifecycle Routing</th>
                <th className="py-4 px-6 text-center font-medium">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-sm">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-16 text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] bg-[var(--crm-bg)]/40">
                    No strategic candidate profiles discoverable within the active search criteria.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const appId = app._id;
                  const isExpanded = expandedApp === appId;
                  const isSelected = selectedAppIds.includes(appId);
                  return (
                    <React.Fragment key={appId}>
                      <tr className={`hover:bg-[var(--crm-bg-raised)]/40 transition duration-150 ${isSelected ? 'bg-[var(--crm-bg-sunken)]/60' : ''}`}>

                        {/* Checkbox column */}
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(appId)}
                            className="w-4 h-4 accent-[var(--crm-heading)] cursor-pointer rounded"
                          />
                        </td>

                        {/* Name & Encrypted Data Toggles */}
                        <td className="py-4 px-6">
                          <div className="space-y-0.5">
                            <div className="font-serif font-medium text-base text-[var(--crm-heading)] flex flex-wrap items-center gap-2">
                              {app.fullName}
                              {app.coverLetter && (
                                <button
                                  onClick={() => setExpandedApp(isExpanded ? null : appId)}
                                  className="inline-flex items-center text-xs font-sans font-normal text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)] transition border border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] px-2 py-0.5 rounded gap-1"
                                >
                                  <FiEye size={12} />
                                  <span>Cover Manifest</span>
                                </button>
                              )}
                            </div>
                            <div className="text-xs text-[var(--crm-ink-faint)]">{app.email}</div>
                            <div className="text-xs text-[var(--crm-ink-faint)]">{app.phone}</div>
                            {app.assignedToName && (
                              <div className="pt-1">
                                <span className="inline-block px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-purple-950/40 text-purple-300 border border-purple-500/30">
                                  👤 Assigned to: {app.assignedToName}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Staged Position */}
                        <td className="py-4 px-6">
                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)]">
                            {app.position}
                          </span>
                        </td>

                        {/* Interview Rounds & Feedback */}
                        <td className="py-4 px-6">
                          {(!app.interviews || app.interviews.length === 0) ? (
                            <span className="text-[10px] font-mono text-[var(--crm-ink-faint)] italic">No rounds scheduled</span>
                          ) : (
                            <div className="space-y-2">
                              {app.interviews.map((rnd, rIdx) => {
                                const rStatus = rnd.status || 'SCHEDULED';
                                const badgeStyle = rStatus === 'PASSED' 
                                  ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/30'
                                  : rStatus === 'FAILED'
                                  ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/30'
                                  : rStatus === 'ON_HOLD'
                                  ? 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/30'
                                  : 'bg-[var(--crm-info-bg)] text-[var(--crm-info)] border-[var(--crm-info)]/30';

                                return (
                                  <div key={rnd._id || rIdx} className="p-2 border rounded-md bg-[var(--crm-bg-sunken)] text-[10px] font-mono space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-[var(--crm-heading)]">
                                        {rnd.roundName || `Round ${rnd.roundNumber || rIdx + 1}`}
                                        <span className="text-[8px] text-[var(--crm-ink-faint)] ml-1 font-mono font-normal">
                                          (Round {rnd.roundNumber || rIdx + 1} of {app.totalRounds || rnd.totalRounds || 3})
                                        </span>
                                      </span>
                                      <span className={`px-1.5 py-0.2 border text-[8px] font-bold rounded uppercase ${badgeStyle}`}>
                                        {rStatus}
                                      </span>
                                    </div>
                                    <div className="text-[9px] text-[var(--crm-ink-faint)] flex items-center justify-between">
                                      <span>Interviewer: <strong className="text-[var(--crm-heading)]">{rnd.interviewerName || 'Lead'}</strong></span>
                                      {rnd.scheduledDate && <span>{rnd.scheduledDate} {rnd.scheduledTime}</span>}
                                    </div>
                                    {rnd.meetingLink && (
                                      <div className="pt-0.5">
                                        <a
                                          href={rnd.meetingLink.startsWith('http') ? rnd.meetingLink : `https://${rnd.meetingLink}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-400 hover:underline"
                                        >
                                          📹 Join Meeting (Zoom/Meet)
                                        </a>
                                      </div>
                                    )}
                                    {rnd.rating && (
                                      <div className="text-[9px] text-[var(--crm-accent)] font-bold">
                                        Rating: {'★'.repeat(rnd.rating)}{'☆'.repeat(5 - rnd.rating)} ({rnd.rating}/5)
                                      </div>
                                    )}
                                    {rnd.feedback && (
                                      <div className="text-[9px] text-[var(--crm-ink-soft)] italic" title={rnd.feedback}>
                                        "{rnd.feedback}"
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <button
                              onClick={() => handleOpenEvaluationModal(app)}
                              className="text-[10px] font-mono font-bold uppercase text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              + Submit Evaluation Feedback
                            </button>
                          </div>
                        </td>

                        {/* Status Label */}
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-block px-2.5 py-0.5 border text-[10px] font-bold tracking-wider uppercase rounded ${getStatusColor(app.status)}`}>
                            {app.status}
                          </span>
                        </td>

                        {/* Digital CV Download Node */}
                        <td className="py-4 px-6 text-center">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleViewResume(appId)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-transparent border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] hover:border-[var(--crm-heading)]/40 hover:text-[var(--crm-heading)] text-xs font-semibold rounded-lg transition duration-200 shadow-sm"
                              title="View Resume"
                            >
                              <FiEye size={13} className="text-[var(--crm-ink-faint)]" />
                              <span>View</span>
                            </button>
                            <DownloadButton
                              action={() => handleDownloadResume(appId, app.resumeOriginalName)}
                              className="px-3 py-1.5 bg-transparent border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] hover:border-[var(--crm-heading)]/40 hover:text-[var(--crm-heading)] text-xs font-semibold rounded-lg transition duration-200 shadow-sm disabled:cursor-default"
                              title="Download PDF Credentials Dossier"
                              icon={FiDownload}
                              iconSize={13}
                              idleLabel="Download CV"
                              busyLabel="Downloading..."
                              doneLabel="Downloaded"
                            />
                          </div>
                        </td>

                        {/* Pipeline Stage Action Selector */}
                        <td className="py-4 px-6 text-center">
                          <select
                            value={app.status}
                            onChange={(e) => handleStatusChange(appId, e.target.value)}
                            className="px-2.5 py-1.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-xs font-medium text-[var(--crm-heading)] rounded-lg outline-none cursor-pointer"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="REVIEWED">Reviewed</option>
                            <option value="ACCEPTED">Accepted</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </td>

                        {/* Remove Record */}
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleDeleteApplication(appId, app.fullName)}
                            className="inline-flex items-center justify-center p-2 bg-transparent border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-faint)] hover:border-[var(--crm-danger)]/40 hover:text-[var(--crm-danger)] rounded-lg transition duration-200 cursor-pointer"
                            title="Delete Application"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </td>
                      </tr>

                      {/* Expanding Profile Section containing Cover Letter */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr className="bg-[var(--crm-bg)]/60">
                            <td colSpan="8" className="py-5 px-8 border-t border-[var(--crm-ink-soft)]/10">
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="space-y-2"
                              >
                                <h4 className="text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest flex items-center gap-1">
                                  <FiFileText className="text-[var(--crm-ink-faint)]" size={12} /> Candidate Intent Justification / Statement of Purpose
                                </h4>
                                <p className="text-[var(--crm-ink-soft)] text-xs leading-relaxed font-light whitespace-pre-line bg-[var(--crm-bg-raised)]/30 p-4 border border-[var(--crm-ink-soft)]/10 rounded-xl shadow-inner max-w-4xl">
                                  {app.coverLetter}
                                </p>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interview Evaluation Modal */}
      {showFeedbackModal && selectedEvaluationApp && (
        <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-[var(--crm-bg-raised)] rounded-sm p-6 w-full max-w-md border border-[var(--crm-line)] shadow-2xl text-left overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--crm-line)]">
              <div>
                <h2 className="font-serif text-lg text-[var(--crm-heading)] uppercase tracking-wide">Interview Evaluation Form</h2>
                <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono mt-0.5">
                  CANDIDATE: {selectedEvaluationApp.fullName} ({selectedEvaluationApp.position})
                </p>
              </div>
              <button onClick={() => setShowFeedbackModal(false)} className="text-[var(--crm-ink-faint)] hover:text-white font-bold">✕</button>
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
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)] cursor-pointer"
                  >
                    {selectedEvaluationApp.interviews.map((r, idx) => (
                      <option key={r._id || idx} value={r._id || r.id}>
                        {r.roundName || `Round ${r.roundNumber || idx + 1}`} - ({r.status || 'SCHEDULED'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Round Result *</label>
                  <select
                    required
                    value={feedbackForm.status}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none cursor-pointer text-[var(--crm-heading)]"
                  >
                    <option value="PASSED">PASSED (Cleared Round)</option>
                    <option value="FAILED">FAILED (Rejected)</option>
                    <option value="ON_HOLD">ON HOLD (Pending Next Review)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Rating (1-5 Stars) *</label>
                  <select
                    required
                    value={feedbackForm.rating}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none cursor-pointer text-[var(--crm-heading)]"
                  >
                    <option value="5">★★★★★ (5 - Excellent)</option>
                    <option value="4">★★★★☆ (4 - Good Candidate)</option>
                    <option value="3">★★★☆☆ (3 - Average)</option>
                    <option value="2">★★☆☆☆ (2 - Below Expectations)</option>
                    <option value="1">★☆☆☆☆ (1 - Poor Fit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Interviewer Feedback & Comments *</label>
                <textarea
                  required
                  rows={4}
                  value={feedbackForm.feedback}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, feedback: e.target.value })}
                  placeholder="Record strengths, weaknesses, technical evaluation, communication skills, and final recommendations..."
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-xs outline-none resize-none text-[var(--crm-heading)] font-sans"
                />
              </div>

              <div className="flex space-x-3 pt-3 border-t border-[var(--crm-line)]">
                <button type="submit" className="flex-1 py-2.5 bg-[var(--crm-accent)] text-[var(--crm-bg-sunken)] hover:bg-[var(--crm-accent-soft)] rounded-sm font-bold uppercase tracking-wider transition-colors cursor-pointer">
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[80] p-4">
          <div className="bg-[var(--crm-bg-raised)] rounded-xl p-6 w-full max-w-lg border border-purple-500/30 shadow-2xl text-left overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-[var(--crm-ink-soft)]/20">
              <div className="flex items-center gap-2">
                <FiUserPlus className="text-purple-400" size={20} />
                <h2 className="font-serif text-lg text-[var(--crm-heading)] uppercase tracking-wide">
                  Assign Task (HR Dept)
                </h2>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-[var(--crm-ink-faint)] hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSingleAssign} className="space-y-5 text-xs">
              {/* Select Candidate Section */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">
                  Target Candidate / Application Lead *
                </label>
                {selectedAppForAssign ? (
                  <div className="p-3 bg-[var(--crm-bg-sunken)] border border-purple-500/20 rounded-lg text-sm font-medium text-[var(--crm-heading)]">
                    <div>{selectedAppForAssign.fullName} ({selectedAppForAssign.position})</div>
                    <div className="text-xs text-[var(--crm-ink-faint)] font-mono">{selectedAppForAssign.email}</div>
                  </div>
                ) : (
                  <select
                    value={selectedCandidateIdForModal}
                    onChange={(e) => setSelectedCandidateIdForModal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 rounded-lg text-sm text-[var(--crm-heading)] focus:outline-none focus:border-purple-500 cursor-pointer"
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
                  <p className="text-[10px] text-purple-300 font-mono mt-1">
                     Will assign all {selectedAppIds.length} bulk selected candidate leads.
                  </p>
                )}
              </div>

              {/* Select HR Executive Section */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">
                  Assignee (HR Executive / Manager) *
                </label>
                <select
                  required
                  value={singleAssigneeName}
                  onChange={(e) => setSingleAssigneeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--crm-bg-sunken)] border border-purple-500/30 rounded-lg text-sm text-[var(--crm-heading)] focus:outline-none focus:border-purple-500 cursor-pointer font-mono"
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

              <div className="flex space-x-3 pt-4 border-t border-[var(--crm-ink-soft)]/20">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-800 hover:bg-purple-700 text-white rounded-lg font-bold font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg"
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
