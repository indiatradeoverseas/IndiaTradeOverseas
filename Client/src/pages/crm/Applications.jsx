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
  FiTrash2
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { careersApi } from '../../api/careers';
import { DownloadButton } from '../../components/ui/AnimatedActionButton';

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [expandedApp, setExpandedApp] = useState(null);

  useEffect(() => {
    fetchApplications();
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
      <div className="border-b border-[var(--crm-ink-soft)]/10 pb-6">
        <span className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">Human Capital Matrix</span>
        <h1 className="text-3xl font-serif text-[var(--crm-heading)] tracking-wide mt-1">Job Applications</h1>
        <p className="text-sm text-[var(--crm-ink-faint)] font-light mt-0.5">Audit global talent records, manage interview routing matrices, and evaluate candidate credentials.</p>
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

      {/* Main Stream Table Registry */}
      <div className="bg-[var(--crm-bg-raised)]/10 rounded-xl border border-[var(--crm-ink-soft)]/15 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[11px] uppercase tracking-wider">
                <th className="py-4 px-6 font-medium">Candidate Identity Details</th>
                <th className="py-4 px-6 font-medium">Target Deployment Position</th>
                <th className="py-4 px-6 font-medium">Inbound Timestamp</th>
                <th className="py-4 px-6 text-center font-medium">Pipeline Status</th>
                <th className="py-4 px-6 text-center font-medium">Credentials File</th>
                <th className="py-4 px-6 text-center font-medium">Lifecycle Routing</th>
                <th className="py-4 px-6 text-center font-medium">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-sm">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] bg-[var(--crm-bg)]/40">
                    No strategic candidate profiles discoverable within the active search criteria.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const appId = app._id;
                  const isExpanded = expandedApp === appId;
                  return (
                    <React.Fragment key={appId}>
                      <tr className="hover:bg-[var(--crm-bg-raised)]/40 transition duration-150">

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
                          </div>
                        </td>

                        {/* Staged Position */}
                        <td className="py-4 px-6">
                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)]">
                            {app.position}
                          </span>
                        </td>

                        {/* Formatted Date */}
                        <td className="py-4 px-6 text-xs font-mono text-[var(--crm-ink-faint)] font-medium">
                          {new Date(app.createdAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
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

                          <div className="bg-[var(--crm-bg)]/60">
                            <td colSpan="7" className="py-5 px-8 border-t border-[var(--crm-ink-soft)]/10">
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
                          </div>
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
    </div>
  );
}
