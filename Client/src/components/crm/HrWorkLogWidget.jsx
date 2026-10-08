import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCheckSquare, FiPhoneCall, FiClock, FiUserPlus, FiFileText, FiCalendar, FiSearch, FiMic } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { hrWorkLogApi } from '../../api/hrWorkLog';
import { useAuth } from '../../hooks/useAuth';
import { socketService } from '../../services/socket';

export default function HrWorkLogWidget({ showSubmissionForm = true, title = "HR Manager & HR Executive Daily Work Log Hub" }) {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [numberOfCalls, setNumberOfCalls] = useState(0);
  const [callDuration, setCallDuration] = useState('');
  const [numberOfHiring, setNumberOfHiring] = useState(0);
  const [workSummary, setWorkSummary] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await hrWorkLogApi.getHrWorkLogs();
      if (res && res.success) {
        setLogs(res.data?.logs || res.logs || []);
      }
    } catch (err) {
      console.error('Error fetching HR work logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const handleNewLog = (e) => {
      const newLog = e?.detail || e;
      if (newLog && newLog._id) {
        setLogs(prev => [newLog, ...prev.filter(l => l._id !== newLog._id)]);
      }
    };

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('hr_work_log_submitted', handleNewLog);
    }
    window.addEventListener('hr_work_log_submitted_event', handleNewLog);

    return () => {
      if (socket) {
        socket.off('hr_work_log_submitted', handleNewLog);
      }
      window.removeEventListener('hr_work_log_submitted_event', handleNewLog);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workSummary.trim()) {
      return toast.error('Please enter a detailed work summary paragraph');
    }

    setSubmitting(true);
    try {
      const payload = {
        numberOfCalls: Number(numberOfCalls || 0),
        callDuration: callDuration.trim(),
        numberOfHiring: Number(numberOfHiring || 0),
        workSummary: workSummary.trim()
      };

      const res = await hrWorkLogApi.submitHrWorkLog(payload);
      if (res && res.success) {
        toast.success('HR Daily Work Log submitted successfully! 📋');
        setNumberOfCalls(0);
        setCallDuration('');
        setNumberOfHiring(0);
        setWorkSummary('');
        fetchLogs();
      }
    } catch (err) {
      console.error('Error submitting HR work log:', err);
      toast.error(err.response?.data?.message || 'Failed to submit HR work log');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (selectedDate) {
      const logDate = new Date(log.createdAt || log.date).toISOString().split('T')[0];
      if (logDate !== selectedDate) return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = (log.employeeName || '').toLowerCase().includes(q);
      const matchRole = (log.employeeRole || '').toLowerCase().includes(q);
      const matchSummary = (log.workSummary || '').toLowerCase().includes(q);
      return matchName || matchRole || matchSummary;
    }
    return true;
  });

  return (
    <div className="space-y-6 font-mono text-left">
      {/* Widget Container */}
      <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 sm:p-6 rounded-2xl shadow-xs space-y-6">
        
        {/* Header Title */}
        <div className="border-b border-[var(--crm-line)] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm sm:text-base uppercase tracking-widest text-[var(--crm-heading)] font-sans font-extrabold flex items-center gap-2">
              <FiCheckSquare className="text-emerald-500" size={18} />
              <span>{title}</span>
            </h3>
            <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1 font-mono">
              Daily Activity Reporting for HR Managers & HR Executives (Auto-synced to Founder & CEO Dashboard)
            </p>
          </div>
          <span className="bg-emerald-600 text-white border border-emerald-600 font-sans text-[9px] px-3 py-1 rounded-xl font-extrabold uppercase tracking-wider shadow-xs shrink-0">
            HR DPR REPORTING HUB
          </span>
        </div>

        {/* SECTION 1: Submission Form (Shown when showSubmissionForm is true) */}
        {showSubmissionForm && (
          <form onSubmit={handleSubmit} className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] p-4 sm:p-5 rounded-xl space-y-4 shadow-xs">
            <h4 className="text-xs font-sans font-extrabold text-[var(--crm-heading)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--crm-line)] pb-2">
              <FiFileText className="text-teal-500" size={15} />
              <span>Log Today's HR Work Activity</span>
            </h4>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-heading)] uppercase mb-1">
                  📞 Number of Calls
                </label>
                <input
                  type="number"
                  min="0"
                  value={numberOfCalls}
                  onChange={(e) => setNumberOfCalls(e.target.value)}
                  className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] font-mono text-xs px-3 py-2 rounded-xl outline-none focus:border-emerald-500 transition"
                  placeholder="e.g. 15"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-heading)] uppercase mb-1">
                  ⏱️ Call Duration
                </label>
                <input
                  type="text"
                  value={callDuration}
                  onChange={(e) => setCallDuration(e.target.value)}
                  className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] font-mono text-xs px-3 py-2 rounded-xl outline-none focus:border-emerald-500 transition"
                  placeholder="e.g. 2 hours 15 mins"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-heading)] uppercase mb-1">
                  🤝 Number of Hiring / Onboarded
                </label>
                <input
                  type="number"
                  min="0"
                  value={numberOfHiring}
                  onChange={(e) => setNumberOfHiring(e.target.value)}
                  className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] font-mono text-xs px-3 py-2 rounded-xl outline-none focus:border-emerald-500 transition"
                  placeholder="e.g. 3 candidates"
                />
              </div>
            </div>

            {/* Detailed Summary Paragraph Box */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--crm-heading)] uppercase mb-1">
                 Work Summary Paragraph (Detailed Activity & Remarks) *
              </label>
              <textarea
                rows={3}
                required
                value={workSummary}
                onChange={(e) => setWorkSummary(e.target.value)}
                className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] font-sans text-xs px-3 py-2.5 rounded-xl outline-none focus:border-emerald-500 transition resize-none leading-relaxed"
                placeholder="Enter the details of the work done today..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-xs border border-emerald-600 disabled:opacity-50"
            >
              {submitting ? 'Submitting HR Log...' : '+ SUBMIT HR DAILY WORK LOG'}
            </button>
          </form>
        )}

        {/* SECTION 2: Submitted HR Work Logs Feed */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[var(--crm-line)] pb-3">
            <h4 className="text-xs font-sans font-extrabold text-[var(--crm-heading)] uppercase tracking-wider flex items-center gap-2">
              <FiCalendar className="text-amber-500" size={15} />
              <span>HR Work Activity Records ({filteredLogs.length})</span>
            </h4>

            {/* Search & Filter */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)]" size={12} />
                <input
                  type="text"
                  placeholder="Filter by name/summary..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-[10px] pl-8 pr-3 py-1.5 rounded-lg outline-none font-mono"
                />
              </div>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-[10px] px-2.5 py-1.5 rounded-lg outline-none font-mono cursor-pointer"
              />

              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="text-[9px] uppercase font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>

          {/* Logs List */}
          {loading ? (
            <div className="py-12 text-center text-xs text-[var(--crm-ink-faint)] uppercase tracking-wider">
              Loading HR Work Logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 border border-dashed border-[var(--crm-line)] rounded-xl text-center text-xs text-[var(--crm-ink-faint)] uppercase tracking-wider">
              No HR daily work logs submitted for selected filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLogs.map((log) => (
                <div key={log._id} className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] p-4 rounded-xl space-y-3 shadow-xs">
                  
                  {/* Top Row: Employee Name + Role Badge */}
                  <div className="flex justify-between items-start gap-2 border-b border-[var(--crm-line)] pb-2">
                    <div>
                      <h5 className="font-serif font-bold text-[var(--crm-heading)] text-sm">
                        {log.employeeName}
                      </h5>
                      <span className="text-[9px] text-[var(--crm-ink-faint)] uppercase font-mono font-bold block">
                        📅 {new Date(log.createdAt || log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-emerald-600 text-white border border-emerald-600 shadow-xs font-mono">
                      {log.employeeRole || 'HR MANAGER'}
                    </span>
                  </div>

                  {/* Activity Metrics Pills */}
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                    <div className="bg-[var(--crm-bg-raised)] p-2 rounded-lg border border-[var(--crm-line)]">
                      <span className="text-[8px] text-[var(--crm-ink-faint)] block uppercase font-bold">📞 Calls</span>
                      <strong className="text-teal-600 dark:text-teal-400 font-extrabold text-xs">{log.numberOfCalls}</strong>
                    </div>

                    <div className="bg-[var(--crm-bg-raised)] p-2 rounded-lg border border-[var(--crm-line)]">
                      <span className="text-[8px] text-[var(--crm-ink-faint)] block uppercase font-bold">⏱️ Duration</span>
                      <strong className="text-amber-600 dark:text-amber-400 font-extrabold text-xs truncate block">{log.callDuration || 'N/A'}</strong>
                    </div>

                    <div className="bg-[var(--crm-bg-raised)] p-2 rounded-lg border border-[var(--crm-line)]">
                      <span className="text-[8px] text-[var(--crm-ink-faint)] block uppercase font-bold">🤝 Hiring</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">{log.numberOfHiring}</strong>
                    </div>
                  </div>

                  {/* Summary Paragraph */}
                  {log.workSummary && (
                    <div className="bg-[var(--crm-bg-raised)] p-3 rounded-lg border border-[var(--crm-line)] text-xs font-sans text-[var(--crm-heading)] leading-relaxed italic border-l-4 border-l-emerald-500 font-medium">
                      "{log.workSummary}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
