import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiPlus, FiCheck, FiX, FiSun, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { leaveApi } from '../../api/leave';
import { useAuth } from '../../hooks/useAuth';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 18, mass: 1 } }
};

export default function Leave() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ leaveType: 'PAID', startDate: '', endDate: '', reason: '' });

  const isManagerTier = ['ADMIN', 'MANAGER', 'HR'].includes(user?.role);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const requests = [leaveApi.getMyBalance(), leaveApi.getLeaves({ employeeId: user._id })];
      if (isManagerTier) requests.push(leaveApi.getLeaves({ status: 'PENDING' }));
      const results = await Promise.all(requests);

      if (results[0].success) setBalance(results[0].data.balance);
      if (results[1].success) setMyLeaves(results[1].data.leaves || []);
      if (isManagerTier && results[2]?.success) setPendingQueue(results[2].data.leaves || []);
    } catch (error) {
      console.error('Error fetching leave data:', error);
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await leaveApi.applyForLeave(formData);
      if (response.success) {
        toast.success('Leave request submitted successfully');
        setShowModal(false);
        setFormData({ leaveType: 'PAID', startDate: '', endDate: '', reason: '' });
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      const response = await leaveApi.cancelLeave(id);
      if (response.success) {
        toast.success('Leave request cancelled');
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel leave request');
    }
  };

  const handleReview = async (id, status) => {
    let reviewNote = '';
    if (status === 'REJECTED') {
      reviewNote = window.prompt('Reason for rejecting this leave request (optional):') || '';
    }
    try {
      const response = await leaveApi.reviewLeave(id, status, reviewNote);
      if (response.success) {
        toast.success(`Leave request ${status.toLowerCase()}`);
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to review leave request');
    }
  };

  const statusColor = (status) => {
    const colors = {
      PENDING: 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20',
      APPROVED: 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20',
      REJECTED: 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20',
      CANCELLED: 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-faint)] border-[var(--crm-ink-soft)]/10'
    };
    return colors[status] || 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-faint)] border-[var(--crm-ink-soft)]/10';
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--crm-bg)] flex items-center justify-center">
        <div className="w-12 h-[1px] bg-[var(--crm-ink-soft)]/40 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen w-full bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] pb-12">

      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-ink-soft)]/10 py-6 px-4 md:px-8 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-[var(--crm-bg-sunken)]/40 backdrop-blur-sm">
        <div>
          <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--crm-ink-faint)] font-bold block font-mono">MODULE 02 // LEAVE MANAGEMENT</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] uppercase tracking-tight">Leave</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] text-[11px] uppercase tracking-widest font-bold h-[42px] px-5 rounded-sm flex items-center space-x-1.5 transition-all hover:bg-[var(--crm-ink-soft)]"
        >
          <FiPlus size={14} /> <span>Apply for Leave</span>
        </button>
      </motion.div>

      <div className="w-full px-4 md:px-8 py-6 space-y-6">

        {/* Balance cards */}
        <motion.div variants={blockVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg-raised)]/20 p-5 rounded-sm shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold font-mono flex items-center gap-1.5"><FiSun size={12} /> Paid Leave (This Month)</span>
              <p className="text-2xl font-serif font-light tracking-tight text-[var(--crm-heading)] mt-2">
                {balance?.paidLeave?.available ?? 0} <span className="text-xs text-[var(--crm-ink-faint)] font-mono">/ {balance?.paidLeave?.total ?? 1} available</span>
              </p>
              <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono mt-1">Does not carry forward to next month</p>
            </div>
          </div>
          <div className="border border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg-raised)]/20 p-5 rounded-sm shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold font-mono flex items-center gap-1.5"><FiAlertTriangle size={12} /> Emergency Leave (This Year)</span>
              <p className="text-2xl font-serif font-light tracking-tight text-[var(--crm-heading)] mt-2">
                {balance?.emergencyLeave?.available ?? 0} <span className="text-xs text-[var(--crm-ink-faint)] font-mono">/ {balance?.emergencyLeave?.total ?? 5} available</span>
              </p>
              <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono mt-1">Resets every January 1st</p>
            </div>
          </div>
        </motion.div>

        {/* Pending Approvals (manager tier) */}
        {isManagerTier && (
          <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg-raised)]/10 rounded-sm overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 bg-[var(--crm-bg-sunken)] border-b border-[var(--crm-ink-soft)]/10">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">Pending Approvals ({pendingQueue.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-xs">
                  {pendingQueue.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-10 opacity-40 font-mono uppercase tracking-widest text-[10px]">No pending leave requests.</td></tr>
                  ) : (
                    pendingQueue.map((lv) => (
                      <tr key={lv._id} className="hover:bg-[var(--crm-bg-raised)]/40 transition-colors">
                        <td className="py-3 px-5 text-[var(--crm-heading)]">{lv.appliedBy?.fullName || 'Unknown'}</td>
                        <td className="py-3 px-5">
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)] rounded-sm">{lv.leaveType}</span>
                        </td>
                        <td className="py-3 px-5 font-mono text-[var(--crm-ink-faint)]">{fmtDate(lv.startDate)} – {fmtDate(lv.endDate)}</td>
                        <td className="py-3 px-5 font-mono text-[var(--crm-ink-soft)]">{lv.daysCount}d</td>
                        <td className="py-3 px-5 text-[var(--crm-ink-soft)] font-light max-w-[220px] truncate" title={lv.reason}>{lv.reason}</td>
                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleReview(lv._id, 'APPROVED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border border-[var(--crm-positive)]/20 hover:bg-[var(--crm-positive-bg)] mr-2"
                          >
                            <FiCheck size={11} /> Approve
                          </button>
                          <button
                            onClick={() => handleReview(lv._id, 'REJECTED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border border-[var(--crm-danger)]/20 hover:bg-[var(--crm-danger-bg)]"
                          >
                            <FiX size={11} /> Reject
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* My leave history */}
        <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg-raised)]/10 rounded-sm overflow-hidden shadow-xl">
          <div className="px-5 py-3.5 bg-[var(--crm-bg-sunken)] border-b border-[var(--crm-ink-soft)]/10">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">My Leave History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[var(--crm-bg-sunken)]/60 text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold">
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Dates</th>
                  <th className="py-3 px-5">Days</th>
                  <th className="py-3 px-5">Reason</th>
                  <th className="py-3 px-5">Reviewer Note</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  <th className="py-3 px-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-xs">
                {myLeaves.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-16 opacity-40 font-mono uppercase tracking-widest text-[10px]">No leave requests yet.</td></tr>
                ) : (
                  myLeaves.map((lv) => (
                    <tr key={lv._id} className="hover:bg-[var(--crm-bg-raised)]/40 transition-colors">
                      <td className="py-3 px-5">
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)] rounded-sm">{lv.leaveType}</span>
                      </td>
                      <td className="py-3 px-5 font-mono text-[var(--crm-ink-faint)]">{fmtDate(lv.startDate)} – {fmtDate(lv.endDate)}</td>
                      <td className="py-3 px-5 font-mono text-[var(--crm-ink-soft)]">{lv.daysCount}d</td>
                      <td className="py-3 px-5 text-[var(--crm-ink-soft)] font-light max-w-[200px] truncate" title={lv.reason}>{lv.reason}</td>
                      <td className="py-3 px-5 text-[var(--crm-ink-faint)] font-light max-w-[200px] truncate" title={lv.reviewNote}>{lv.reviewNote || '—'}</td>
                      <td className="py-3 px-5 text-center">
                        <span className={`inline-block px-2 py-0.5 border text-[9px] font-bold tracking-wider uppercase rounded ${statusColor(lv.status)}`}>{lv.status}</span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        {lv.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancel(lv._id)}
                            className="text-[9px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] hover:text-[var(--crm-danger)] transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Apply for Leave Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-[var(--crm-bg-raised)] rounded-sm p-6 w-full max-w-md border border-[var(--crm-ink-soft)]/20 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 border-b border-[var(--crm-ink-soft)]/10 pb-3">
                <h2 className="text-base font-serif text-[var(--crm-heading)] tracking-wide uppercase flex items-center gap-2"><FiCalendar size={16} /> Apply for Leave</h2>
                <button onClick={() => setShowModal(false)} className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)] font-light text-xl">&times;</button>
              </div>

              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">Leave Type *</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-sm outline-none cursor-pointer text-[var(--crm-heading)]"
                  >
                    <option value="PAID">Paid Leave (1/month)</option>
                    <option value="EMERGENCY">Emergency Leave (5/year)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-sm outline-none text-[var(--crm-heading)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">End Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-sm outline-none text-[var(--crm-heading)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">Reason *</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Brief reason for the leave..."
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-sm outline-none resize-none text-[var(--crm-heading)]"
                  />
                </div>

                <div className="flex space-x-3 pt-4 border-t border-[var(--crm-ink-soft)]/10">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg-sunken)] rounded-sm text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] rounded-sm text-xs font-bold uppercase tracking-wider transition-all"
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
