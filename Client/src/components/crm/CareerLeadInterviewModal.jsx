import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX,
  FiCalendar,
  FiClock,
  FiUser,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiVideo,
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiStar,
  FiSend,
  FiList,
  FiActivity,
  FiCheckSquare
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { careersApi } from '../../api/careers';

export default function CareerLeadInterviewModal({ lead, isOpen, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('SCHEDULE'); // 'SCHEDULE' | 'EVALUATE' | 'AUDIT_LOGS'
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [scheduleForm, setScheduleForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '11:00',
    roundName: 'Round 1 - Screening',
    meetingLink: '',
    notes: '',
    status: 'SCHEDULED',
    rating: 5,
    feedback: ''
  });

  useEffect(() => {
    if (isOpen && lead) {
      // Determine default round name
      const existingLogsCount = auditLogs.length;
      const defaultRound = existingLogsCount === 0
        ? 'Round 1 - Screening'
        : existingLogsCount === 1
        ? 'Round 2 - Technical Interview'
        : `Round ${existingLogsCount + 1} - Final HR Round`;

      setScheduleForm({
        date: new Date().toISOString().split('T')[0],
        time: '11:00',
        roundName: defaultRound,
        meetingLink: '',
        notes: '',
        status: 'SCHEDULED',
        rating: 5,
        feedback: ''
      });

      fetchCandidateAuditLogs();
    }
  }, [isOpen, lead]);

  const fetchCandidateAuditLogs = async () => {
    if (!lead) return;
    setLoadingLogs(true);
    try {
      const leadId = lead._id || lead.id;
      const email = lead.email || (lead.candidateApp?.email) || (lead.careerLead?.email);
      const res = await careersApi.getCandidateAuditLogs({ leadId, email });
      if (res && res.success) {
        setAuditLogs(res.logs || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (!isOpen || !lead) return null;

  // Extract normalized candidate info safely regardless of lead object structure
  const candidateName = lead.fullName || lead.candidateName || lead.candidateApp?.fullName || lead.careerLead?.fullName || 'Candidate';
  const candidateEmail = lead.email || lead.candidateEmail || lead.candidateApp?.email || lead.careerLead?.email || 'N/A';
  const candidatePhone = lead.phone || lead.candidatePhone || lead.candidateApp?.phone || lead.careerLead?.phone || 'N/A';
  const position = lead.position || lead.candidateApp?.position || lead.careerLead?.position || 'General Candidate';
  const refNo = lead.refNo || lead.careerLead?.refNo || '';
  const currentStatus = lead.status || lead.careerLead?.status || 'NEW';

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleForm.date || !scheduleForm.time) {
      return toast.error('Please specify interview date and time');
    }

    setSubmitting(true);
    try {
      const leadId = String(lead._id || lead.id || 'lead_task_0');
      const isPassed = scheduleForm.status === 'PASSED' || scheduleForm.status === 'HIRED';

      const payload = {
        leadId,
        leadType: lead.isApplicationTask ? 'APPLICATION' : 'CAREER_LEAD',
        candidateName,
        candidateEmail,
        candidatePhone,
        position,
        refNo,
        action: isPassed ? 'PASSED_FORWARDED_TO_HR_MANAGER' : (scheduleForm.status === 'SCHEDULED' ? 'INTERVIEW_SCHEDULED' : 'INTERVIEW_EVALUATED'),
        roundName: scheduleForm.roundName,
        scheduledDate: scheduleForm.date,
        scheduledTime: scheduleForm.time,
        meetingLink: scheduleForm.meetingLink ? scheduleForm.meetingLink.trim() : '',
        status: scheduleForm.status,
        rating: Number(scheduleForm.rating || 5),
        feedback: scheduleForm.feedback ? scheduleForm.feedback.trim() : '',
        notes: scheduleForm.notes ? scheduleForm.notes.trim() : ''
      };

      const res = await careersApi.createAuditLog(payload);

      if (res && res.success) {
        if (isPassed) {
          toast.success(`🎉 Candidate ${candidateName} PASSED! Profile forwarded to HR Manager.`);
        } else if (scheduleForm.status === 'FAILED') {
          toast.error(`Candidate ${candidateName} marked as Rejected.`);
        } else {
          toast.success(`Interview scheduled/updated for ${candidateName}! 🗓️`);
        }

        // Notify app event listeners
        window.dispatchEvent(new Event('task_updated_event'));
        window.dispatchEvent(new Event('task_assigned_event'));
        if (onRefresh) onRefresh();

        fetchCandidateAuditLogs();
        setActiveTab('AUDIT_LOGS');
      }
    } catch (err) {
      console.error('Failed to record interview audit log:', err);
      toast.error(err.response?.data?.message || 'Error scheduling interview audit log');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeStyle = (st) => {
    switch (st) {
      case 'PASSED':
      case 'HIRED':
      case 'ACCEPTED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold';
      case 'FAILED':
      case 'REJECTED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold';
      case 'ON_HOLD':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40 font-bold';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[var(--crm-bg-raised)] border border-blue-500/30 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* MODAL HEADER WITH CANDIDATE SUMMARY */}
          <div className="p-4 sm:p-5 border-b border-[var(--crm-line)] bg-[var(--crm-bg-sunken)]/60 relative">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <FiX size={18} />
            </button>

            <div className="flex items-start gap-3.5 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold text-lg shrink-0 font-serif uppercase shadow-md">
                {candidateName[0] || 'C'}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif font-bold text-lg text-[var(--crm-heading)] truncate">
                    {candidateName}
                  </h3>
                  {refNo && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      #{refNo}
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] uppercase border ${getStatusBadgeStyle(currentStatus)}`}>
                    {currentStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-[var(--crm-ink-faint)] font-medium">
                  <span className="flex items-center gap-1.5 truncate">
                    <FiBriefcase size={12} className="text-blue-400 shrink-0" />
                    <span className="truncate text-[var(--crm-heading)] font-semibold">{position}</span>
                  </span>

                  <a href={`mailto:${candidateEmail}`} className="flex items-center gap-1.5 hover:text-blue-400 hover:underline truncate">
                    <FiMail size={12} className="text-blue-400 shrink-0" />
                    <span className="truncate">{candidateEmail}</span>
                  </a>

                  <a href={`tel:${candidatePhone}`} className="flex items-center gap-1.5 hover:text-emerald-400 hover:underline">
                    <FiPhone size={12} className="text-emerald-400 shrink-0" />
                    <span>{candidatePhone}</span>
                  </a>
                </div>
              </div>
            </div>

            {/* TAB SWITCHER */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--crm-line)]/60 font-sans">
              <button
                onClick={() => setActiveTab('SCHEDULE')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'SCHEDULE'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] hover:text-white'
                }`}
              >
                <FiCalendar size={13} /> Schedule / Evaluate
              </button>

              <button
                onClick={() => setActiveTab('AUDIT_LOGS')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'AUDIT_LOGS'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] hover:text-white'
                }`}
              >
                <FiActivity size={13} /> Audit Logs ({auditLogs.length})
              </button>
            </div>
          </div>

          {/* TAB BODY CONTENT */}
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto font-sans">
            {activeTab === 'SCHEDULE' ? (
              <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs font-medium">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                      Interview Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={scheduleForm.date}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                      Interview Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={scheduleForm.time}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                      Round Designation / Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Round 1 - Screening"
                      value={scheduleForm.roundName}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, roundName: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                      Result / Outcome Status *
                    </label>
                    <select
                      value={scheduleForm.status}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-sans cursor-pointer font-bold"
                    >
                      <option value="SCHEDULED">SCHEDULED (Upcoming Interview)</option>
                      <option value="PASSED">PASSED (Forward to HR Manager) 🏆</option>
                      <option value="FAILED">FAILED (Rejected Candidate) ❌</option>
                      <option value="ON_HOLD">ON HOLD (Pending Next Review) ⏳</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                    Meeting Link (Zoom / Google Meet / Teams)
                  </label>
                  <div className="relative">
                    <FiVideo className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="https://meet.google.com/..."
                      value={scheduleForm.meetingLink}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, meetingLink: e.target.value }))}
                      className="w-full pl-10 pr-3.5 p-2.5 rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                      Candidate Rating (1 - 5 Stars)
                    </label>
                    <select
                      value={scheduleForm.rating}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                      className="w-full p-2.5 rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-sans cursor-pointer"
                    >
                      <option value={5}>★★★★★ (5/5 - Outstanding Fit)</option>
                      <option value={4}>★★★★☆ (4/5 - Good Candidate)</option>
                      <option value={3}>★★★☆☆ (3/5 - Average Fit)</option>
                      <option value={2}>★★☆☆☆ (2/5 - Weak Candidate)</option>
                      <option value={1}>★☆☆☆☆ (1/5 - Poor Fit)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                      Interviewer Remarks / Feedback Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Record technical skills, communication, salary expectation..."
                      value={scheduleForm.feedback}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, feedback: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-sans"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2.5 border-t border-[var(--crm-line)]">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider text-[var(--crm-ink-soft)] hover:bg-[var(--crm-bg-sunken)] transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-2"
                  >
                    {submitting ? (
                      <span>Saving Audit Record...</span>
                    ) : (
                      <>
                        <FiSend size={13} />
                        <span>Save Interview & Log Audit</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* TAB 2: COMPLETE AUDIT LOGS TIMELINE */
              <div className="space-y-3 font-sans">
                {loadingLogs ? (
                  <div className="p-8 text-center text-xs text-[var(--crm-ink-faint)] animate-pulse">
                    Loading interview audit log history...
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-8 border rounded-2xl text-center space-y-2 bg-[var(--crm-bg-sunken)]">
                    <FiActivity size={24} className="mx-auto text-blue-400" />
                    <p className="text-xs font-bold uppercase text-[var(--crm-heading)]">No Audit Logs Registered Yet</p>
                    <p className="text-[11px] text-[var(--crm-ink-faint)]">
                      Schedule or evaluate an interview in Tab 1 to create the first audit record.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[var(--crm-line)]">
                    {auditLogs.map((log) => (
                      <div key={log._id} className="relative pl-9 text-xs space-y-1.5">
                        <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-[var(--crm-bg-raised)] shadow-sm" />

                        <div className="border rounded-2xl p-3.5 bg-[var(--crm-bg-sunken)] space-y-2" style={{ borderColor: 'var(--crm-line)' }}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="font-bold text-[var(--crm-heading)] text-xs font-sans">
                              {log.roundName}
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase border ${getStatusBadgeStyle(log.status)}`}>
                              {log.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-[var(--crm-ink-faint)]">
                            <div>Interviewer: <strong className="text-[var(--crm-heading)]">{log.performedByName}</strong></div>
                            <div>Date: <strong className="text-[var(--crm-heading)]">{log.scheduledDate || 'N/A'} {log.scheduledTime}</strong></div>
                          </div>

                          {log.meetingLink && (
                            <a
                              href={log.meetingLink.startsWith('http') ? log.meetingLink : `https://${log.meetingLink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-teal-400 hover:underline flex items-center gap-1"
                            >
                              <FiVideo size={12} /> Join Meeting Link
                            </a>
                          )}

                          {log.rating > 0 && (
                            <div className="text-[11px] text-amber-400 font-bold">
                              Rating: {'★'.repeat(log.rating)}{'☆'.repeat(5 - log.rating)} ({log.rating}/5)
                            </div>
                          )}

                          {log.feedback && (
                            <div className="text-[11px] text-[var(--crm-heading)] bg-[var(--crm-bg-raised)] p-2 rounded-xl border border-[var(--crm-line)] italic">
                              "{log.feedback}"
                            </div>
                          )}

                          {log.forwardedToHrManager && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 pt-1">
                              <FiCheckSquare size={12} /> Candidate PASSED & Forwarded to HR Manager
                            </div>
                          )}

                          <div className="text-[9px] text-[var(--crm-ink-faint)] pt-1 text-right">
                            Logged on: {new Date(log.createdAt || log.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
