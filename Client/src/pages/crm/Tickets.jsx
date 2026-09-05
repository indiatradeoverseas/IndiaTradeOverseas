import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLifeBuoy, FiPlus, FiSearch, FiFilter, FiMessageSquare, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { ticketsApi } from '../../api/tickets';
import { useAuth } from '../../hooks/useAuth';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 18, mass: 1 } }
};

const CATEGORIES = ['IT', 'HR', 'ADMIN', 'FINANCE', 'SALES', 'TRANSPORT'];
const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function Tickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [formData, setFormData] = useState({ subject: '', description: '', category: 'IT', priority: 'MEDIUM' });
  const [submitting, setSubmitting] = useState(false);

  const userRole = (user?.role || '').toUpperCase();
  const isManagerTier = ['ADMIN', 'FOUNDER', 'CO_FOUNDER', 'SUPER_ADMIN', 'HR', 'HR_MANAGER', 'HR_EXECUTIVE', 'HRMANAGE', 'HREXECUTIVE', 'TRANSPORT_MANAGER'].includes(userRole);

  const visibleTickets = isManagerTier 
    ? tickets 
    : tickets.filter(t => {
        const creatorId = String(t.raisedBy?._id || t.raisedBy || '');
        const userId = String(user?._id || user?.employeeId || '');
        const creatorName = (t.raisedByName || t.raisedBy?.fullName || t.raisedBy?.name || '').toLowerCase().trim();
        const myName = (user?.fullName || user?.name || '').toLowerCase().trim();

        return (creatorId && userId && creatorId === userId) || (creatorName && myName && creatorName === myName);
      });

  useEffect(() => {
    fetchTickets();
  }, [filterCategory, filterStatus]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (filterStatus) params.status = filterStatus;
      const response = await ticketsApi.getTickets(params);
      if (response.success) setTickets(response.data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await ticketsApi.createTicket(formData);
      if (response.success) {
        toast.success('Ticket raised successfully');
        setShowCreateModal(false);
        setFormData({ subject: '', description: '', category: '', priority: '' });
        window.dispatchEvent(new CustomEvent('ticket_created_event', { detail: response.data?.ticket }));
        fetchTickets();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to raise ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const response = await ticketsApi.updateStatus(id, status);
      if (response.success) {
        toast.success(`Ticket status updated to ${status}`);
        fetchTickets();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleAddComment = async (id) => {
    const message = (commentDrafts[id] || '').trim();
    if (!message) return;
    try {
      const response = await ticketsApi.addComment(id, message);
      if (response.success) {
        setCommentDrafts({ ...commentDrafts, [id]: '' });
        const detail = await ticketsApi.getTicketById(id);
        if (detail.success) {
          setTickets((prev) => prev.map((t) => (t._id === id ? detail.data.ticket : t)));
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    try {
      const response = await ticketsApi.getTicketById(id);
      if (response.success) {
        setTickets((prev) => prev.map((t) => (t._id === id ? response.data.ticket : t)));
      }
    } catch (error) {
      console.error('Error fetching ticket detail:', error);
    }
  };

  const statusColor = (status) => {
    const colors = {
      OPEN: 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20',
      ASSIGNED: 'bg-[var(--crm-info-bg)] text-[var(--crm-info)] border-[var(--crm-info)]/20',
      IN_PROGRESS: 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20',
      RESOLVED: 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20',
      CLOSED: 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-faint)] border-[var(--crm-ink-soft)]/10'
    };
    return colors[status] || 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-faint)] border-[var(--crm-ink-soft)]/10';
  };

  const priorityColor = (priority) => {
    const colors = {
      LOW: 'text-[var(--crm-ink-faint)]',
      MEDIUM: 'text-[var(--crm-info)]',
      HIGH: 'text-[var(--crm-warning)]',
      URGENT: 'text-[var(--crm-danger)]'
    };
    return colors[priority] || 'text-[var(--crm-ink-faint)]';
  };

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
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] uppercase tracking-tight">Support Tickets</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] text-[11px] uppercase tracking-widest font-bold h-[42px] px-5 rounded-sm flex items-center space-x-1.5 transition-all hover:bg-[var(--crm-ink-soft)]"
        >
          <FiPlus size={14} /> <span>Raise Ticket</span>
        </button>
      </motion.div>

      <div className="w-full px-4 md:px-8 py-6 space-y-5">

        <motion.div variants={blockVariants} className="p-4 bg-[var(--crm-bg-raised)]/20 border border-[var(--crm-ink-soft)]/15 rounded-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full md:w-56 flex items-center gap-2">
            <FiFilter className="text-[var(--crm-ink-faint)] shrink-0" size={14} />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 text-xs rounded-sm outline-none cursor-pointer text-[var(--crm-heading)]"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-full md:w-56">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 text-xs rounded-sm outline-none cursor-pointer text-[var(--crm-heading)]"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </motion.div>

        <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg-raised)]/10 rounded-sm overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold">
                  <th className="py-3.5 px-5">Ticket</th>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5">Priority</th>
                  <th className="py-3.5 px-5">Raised By</th>
                  <th className="py-3.5 px-5">Resolved By</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-xs">
                {visibleTickets.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-16 opacity-40 font-mono uppercase tracking-widest text-[10px]">{isManagerTier ? 'No tickets found in the system.' : 'No tickets raised by you yet.'}</td></tr>
                ) : (
                  visibleTickets.map((ticket) => (
                    <React.Fragment key={ticket._id}>
                      <tr className="hover:bg-[var(--crm-bg-raised)]/40 transition-colors cursor-pointer" onClick={() => handleExpand(ticket._id)}>
                        <td className="py-3 px-5">
                          <div className="font-serif text-[var(--crm-heading)]">{ticket.subject}</div>
                          <div className="text-[10px] text-[var(--crm-ink-faint)] font-mono">{ticket.ticketCode}</div>
                        </td>
                        <td className="py-3 px-5">
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)] rounded-sm">{ticket.category}</span>
                        </td>
                        <td className={`py-3 px-5 font-mono font-bold text-[10px] uppercase ${priorityColor(ticket.priority)}`}>{ticket.priority}</td>
                        <td className="py-3 px-5 text-[var(--crm-ink-soft)] font-medium">{ticket.raisedByName || ticket.raisedBy?.fullName || ticket.raisedBy?.name || 'Vikram Rathore'}</td>
                        <td className="py-3 px-5 text-[var(--crm-positive)] font-medium font-mono text-[11px]">
                          {ticket.status === 'RESOLVED' || ticket.resolvedByName ? (
                            <span>✓ {ticket.resolvedByName || ticket.resolvedBy?.fullName || ticket.resolvedBy?.name || 'HR Executive'}</span>
                          ) : (
                            <span className="text-[var(--crm-ink-faint)]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                          {isManagerTier ? (
                            <select
                              value={ticket.status}
                              onChange={(e) => handleStatusChange(ticket._id, e.target.value)}
                              className={`px-2 py-1 border text-[9px] font-bold tracking-wider uppercase rounded outline-none cursor-pointer bg-transparent ${statusColor(ticket.status)}`}
                            >
                              {STATUSES.map((s) => <option key={s} value={s} className="bg-[var(--crm-bg)] text-[var(--crm-ink-soft)]">{s.replace('_', ' ')}</option>)}
                            </select>
                          ) : (
                            <span className={`inline-block px-2 py-0.5 border text-[9px] font-bold tracking-wider uppercase rounded ${statusColor(ticket.status)}`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                      </tr>
                      <AnimatePresence>
                        {expandedId === ticket._id && (
                          <tr>
                            <td colSpan="6" className="bg-[var(--crm-bg)]/60 py-5 px-8 border-t border-[var(--crm-ink-soft)]/10">
                              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-4">
                                <p className="text-[var(--crm-ink-soft)] text-xs leading-relaxed font-light whitespace-pre-line bg-[var(--crm-bg-raised)]/30 p-4 border border-[var(--crm-ink-soft)]/10 rounded-sm">
                                  {ticket.description}
                                </p>

                                <div className="space-y-2">
                                  <h4 className="text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest flex items-center gap-1">
                                    <FiMessageSquare size={12} /> Comments ({ticket.comments?.length || 0})
                                  </h4>
                                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                                    {(ticket.comments || []).map((c, idx) => (
                                      <div key={idx} className="text-[11px] bg-[var(--crm-bg-raised)]/20 border border-[var(--crm-ink-soft)]/10 rounded-sm p-2.5 flex justify-between gap-3">
                                        <span className="text-[var(--crm-ink-soft)] font-light">{c.message}</span>
                                        <span className="text-[var(--crm-ink-faint)] font-mono text-[9px] whitespace-nowrap">{c.authorName || c.authorId?.fullName || c.authorId?.name || 'User'}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <input
                                      type="text"
                                      placeholder="Add a comment..."
                                      value={commentDrafts[ticket._id] || ''}
                                      onChange={(e) => setCommentDrafts({ ...commentDrafts, [ticket._id]: e.target.value })}
                                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(ticket._id)}
                                      className="flex-1 px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 rounded-sm outline-none text-xs text-[var(--crm-heading)]"
                                    />
                                    <button
                                      onClick={() => handleAddComment(ticket._id)}
                                      className="px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] rounded-sm transition-all"
                                    >
                                      <FiSend size={13} />
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Raise Ticket Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-[var(--crm-bg-raised)] rounded-sm p-6 w-full max-w-md border border-[var(--crm-ink-soft)]/20 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 border-b border-[var(--crm-ink-soft)]/10 pb-3">
                <h2 className="text-base font-serif text-[var(--crm-heading)] tracking-wide uppercase flex items-center gap-2"><FiLifeBuoy size={16} /> Raise Support Ticket</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)] font-light text-xl">&times;</button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">Subject *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Brief summary of the issue"
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-sm outline-none text-[var(--crm-heading)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-sm outline-none cursor-pointer text-[var(--crm-heading)]"
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-sm outline-none cursor-pointer text-[var(--crm-heading)]"
                    >
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">Description *</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the issue in detail..."
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-sm outline-none resize-none text-[var(--crm-heading)]"
                  />
                </div>

                <div className="flex space-x-3 pt-4 border-t border-[var(--crm-ink-soft)]/10">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg-sunken)] rounded-sm text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Raise Ticket'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
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
