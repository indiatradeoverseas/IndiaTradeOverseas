import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { quotationsApi } from '../../api/quotations';
import { FiCheck, FiX, FiFileText, FiAlertCircle, FiFilter, FiCheckCircle, FiClock, FiLayers, FiCheckSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

// Staggered cinematic entrance variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.02, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 20 } }
};

export default function Quotations() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [sectorFilter, setSectorFilter] = useState('ALL'); // 'ALL' | 'TEA' | 'RICE' | 'STONE' | 'COAL' | 'TRANSPORT'
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchQuotations();
  }, [statusFilter]);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : {};
      const response = await quotationsApi.getPendingQuotations(params);
      if (response.success) {
        setQuotations(response.data.quotations || []);
        setSelectedIds([]);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast.error('Failed to pull quotations payload.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, approvedPrice) => {
    const price = prompt('Enter approved price:', approvedPrice);
    if (price) {
      try {
        const response = await quotationsApi.approveQuotation(id, { approvedPrice: parseFloat(price) });
        if (response.success) {
          toast.success('Quotation approved successfully');
          fetchQuotations();
        }
      } catch (error) {
        console.error('Error approving quotation:', error);
        toast.error('Failed to commit approval metric.');
      }
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      try {
        const response = await quotationsApi.rejectQuotation(id, { marginNote: reason });
        if (response.success) {
          toast.success('Quotation request rejected');
          fetchQuotations();
        }
      } catch (error) {
        console.error('Error rejecting quotation:', error);
        toast.error('Failed to execute ledger rejection.');
      }
    }
  };

  const filteredQuotations = quotations.filter(q => {
    if (sectorFilter === 'ALL') return true;
    const cat = (q.leadId?.productCategory || '').toUpperCase();
    return cat === sectorFilter;
  });

  const pendingFilteredQuotations = filteredQuotations.filter(q => q.status === 'PENDING');

  const handleSelectAll = () => {
    const pendingIds = pendingFilteredQuotations.map(q => q._id);
    if (selectedIds.length === pendingIds.length && pendingIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingIds);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    const input = prompt(`Enter Approved Price for all ${selectedIds.length} selected quotations:\n(Leave blank to approve each quote at its own proposed base price)`);
    
    if (input === null) return; // User clicked Cancel

    try {
      const payload = {
        quotationIds: selectedIds,
        ...(input.trim() !== '' ? { approvedPrice: parseFloat(input) } : {})
      };
      const response = await quotationsApi.bulkApproveQuotations(payload);
      if (response.success) {
        toast.success(`🎉 Bulk Approved ${response.data.approvedCount} quotations successfully!`);
        fetchQuotations();
      }
    } catch (error) {
      console.error('Error bulk approving quotations:', error);
      toast.error(error.response?.data?.message || 'Failed to execute bulk approval.');
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    const reason = prompt(`Enter rejection reason for all ${selectedIds.length} selected quotations:`);
    if (reason === null) return; // User clicked Cancel

    try {
      const response = await quotationsApi.bulkRejectQuotations({
        quotationIds: selectedIds,
        marginNote: reason
      });
      if (response.success) {
        toast.success(`⚠️ Bulk Rejected ${response.data.rejectedCount} quotations.`);
        fetchQuotations();
      }
    } catch (error) {
      console.error('Error bulk rejecting quotations:', error);
      toast.error(error.response?.data?.message || 'Failed to execute bulk rejection.');
    }
  };

  if (loading && quotations.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--crm-bg)] flex items-center justify-center">
        <div className="w-12 h-[1px] bg-[var(--crm-ink-soft)]/40 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="min-h-screen w-full bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] block pb-12"
    >
      {/* Upper Context Header Panel with Actions */}
      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-ink-soft)]/10 py-6 px-4 md:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[var(--crm-bg-sunken)]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--crm-ink-faint)] font-bold block font-mono">FINANCIAL AUDIT ENGINE</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] tracking-tight uppercase flex items-center gap-3">
            <FiFileText className="text-[var(--crm-ink-faint)]" size={24} /> Quotations Brokerage
          </h1>
          <p className="text-xs text-[var(--crm-ink-faint)] font-light max-w-xl">
            Evaluate pending pricing proposals, review approved deal valuations, and perform 1-click bulk approvals.
          </p>
        </div>

        {/* Header Control Toolbar: Single All Approved Quotes Button */}
        <div className="flex items-center gap-2 font-mono">
          <button
            onClick={() => setStatusFilter(prev => prev === 'APPROVED' ? 'ALL' : 'APPROVED')}
            className={`px-3.5 py-2 text-[10px] font-bold uppercase rounded-sm border transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500 shadow-md ring-1 ring-emerald-400'
                : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40 hover:border-emerald-500/60'
            }`}
          >
            <FiCheckCircle size={12} /> All Approved Quotes
          </button>
        </div>
      </motion.div>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full px-4 md:px-8 pt-4"
          >
            <div className="w-full p-3.5 bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-slate-900 border border-teal-500/40 rounded-sm shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center gap-2.5 text-teal-300">
                <FiCheckSquare size={16} className="text-teal-400 animate-pulse" />
                <span className="font-bold uppercase tracking-wider text-[11px]">
                  {selectedIds.length} Quotation{selectedIds.length > 1 ? 's' : ''} Selected for Bulk Action
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleBulkApprove}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase text-[10px] tracking-wider rounded-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <FiCheck size={14} /> Bulk Approve ({selectedIds.length})
                </button>

                <button
                  onClick={handleBulkReject}
                  className="px-4 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-600/80 text-rose-300 font-bold uppercase text-[10px] tracking-wider rounded-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <FiX size={14} /> Bulk Reject ({selectedIds.length})
                </button>

                <button
                  onClick={() => setSelectedIds([])}
                  className="px-2.5 py-2 text-[10px] font-bold uppercase text-[var(--crm-ink-faint)] hover:text-white transition cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Commodity Sector Filter Ribbon */}
      <div className="w-full px-4 md:px-8 pt-6 pb-2 bg-[var(--crm-bg)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-2 text-xs text-[var(--crm-ink-faint)]">
          <FiFilter size={13} />
          <span className="text-[10px] uppercase font-bold tracking-wider">Commodity Sectors:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'TEA', 'RICE', 'STONE', 'COAL', 'TRANSPORT'].map(sec => {
            const isActive = sectorFilter === sec;
            return (
              <button
                key={sec}
                onClick={() => setSectorFilter(sec)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-xs border transition cursor-pointer ${
                  isActive
                    ? sec === 'TEA' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' :
                      sec === 'RICE' ? 'bg-amber-950 text-amber-300 border-amber-700' :
                      sec === 'STONE' ? 'bg-slate-800 text-slate-200 border-slate-600' :
                      'bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] border-[var(--crm-heading)]/50'
                    : 'bg-[var(--crm-bg-sunken)]/60 text-[var(--crm-ink-faint)] border-[var(--crm-ink-soft)]/15 hover:text-[var(--crm-heading)]'
                }`}
              >
                {sec === 'ALL' ? 'All Sectors' : sec}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Interface Layer */}
      <div className="w-full px-4 md:px-8 py-4 bg-[var(--crm-bg)]">
        <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 overflow-hidden w-full bg-[var(--crm-bg-raised)]/10 rounded-sm shadow-2xl">
          <div className="overflow-x-auto w-full block custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-ink-soft)]/15">
                  <th className="py-4 px-4 text-center w-10">
                    <input
                      type="checkbox"
                      checked={pendingFilteredQuotations.length > 0 && selectedIds.length === pendingFilteredQuotations.length}
                      onChange={handleSelectAll}
                      className="cursor-pointer accent-teal-500"
                      title="Select All Pending Quotes"
                    />
                  </th>
                  <th className="py-4 px-5">Lead / Client Name</th>
                  <th className="py-4 px-5">Commodity Sector</th>
                  <th className="py-4 px-5">Requested By</th>
                  <th className="py-4 px-5">Proposed Base Price</th>
                  <th className="py-4 px-5">Approved Price</th>
                  <th className="py-4 px-5 text-center">Timestamp</th>
                  <th className="py-4 px-5 text-center">Execution Deck</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-xs">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-20 bg-[var(--crm-bg-raised)]/5">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <FiCheck className="text-[var(--crm-ink-faint)] mb-3" size={32} />
                        <p className="font-mono uppercase tracking-widest text-[10px]">No pricing requests mapped for selected filter.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map((quotation) => (
                    <tr key={quotation._id} className="hover:bg-[var(--crm-bg-raised)]/40 transition-colors">
                      <td className="py-4 px-4 text-center shrink-0 w-10">
                        {quotation.status === 'PENDING' ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(quotation._id)}
                            onChange={() => handleSelectOne(quotation._id)}
                            className="cursor-pointer accent-teal-500"
                          />
                        ) : (
                          <span className="text-[10px] text-[var(--crm-ink-faint)]/40 font-mono">—</span>
                        )}
                      </td>

                      <td className="py-4 px-5 font-serif text-sm text-[var(--crm-heading)]">
                        {quotation.leadId?.customerName || 'N/A'}
                      </td>

                      {/* Sector Badge */}
                      <td className="py-4 px-5 font-mono">
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${
                          quotation.leadId?.productCategory === 'TEA' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60' :
                          quotation.leadId?.productCategory === 'RICE' ? 'bg-amber-950/80 text-amber-400 border-amber-800/60' :
                          quotation.leadId?.productCategory === 'STONE' ? 'bg-slate-800/80 text-slate-300 border-slate-700' :
                          'bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-soft)] border-[var(--crm-ink-soft)]/20'
                        }`}>
                          {quotation.leadId?.productCategory || 'GENERAL'}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-[var(--crm-ink-soft)]/90 font-light font-mono text-[11px]">
                        {quotation.requestedBy?.fullName || quotation.requestedBy?.name || 'Website Buyer Inbound'}
                      </td>

                      <td className="py-4 px-5 font-mono font-bold text-sm text-[var(--crm-heading)]">
                        {quotation.employeeRequestedPrice ? `₹${quotation.employeeRequestedPrice.toLocaleString('en-IN')}` : '₹—'}
                      </td>

                      <td className="py-4 px-5 font-mono font-bold text-sm text-[var(--crm-positive)]">
                        {quotation.approvedPrice ? `₹${quotation.approvedPrice.toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-4 px-5 text-center font-mono text-[var(--crm-ink-faint)]">
                        {new Date(quotation.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-5 text-center">
                        {(() => {
                          const userRole = (user?.role || '').toUpperCase();
                          const canApprove = 
                            userRole === 'ADMIN' ||
                            userRole === 'MANAGER' ||
                            userRole.includes('MANAGER') ||
                            user?.department === 'ADMIN' ||
                            user?.department === 'MANAGEMENT' ||
                            user?.quotationPermission === true ||
                            user?.permissions?.quotation === true;

                          if (quotation.status === 'APPROVED') {
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2.5 py-1 border border-emerald-800/60 rounded-sm">
                                <FiCheckCircle size={12} /> Approved
                              </span>
                            );
                          }

                          if (quotation.status === 'REJECTED') {
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-950/60 px-2.5 py-1 border border-rose-800/60 rounded-sm">
                                <FiX size={12} /> Rejected
                              </span>
                            );
                          }

                          return canApprove ? (
                            <div className="flex justify-center items-center gap-2.5">
                              <motion.button 
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => handleApprove(quotation._id, quotation.employeeRequestedPrice)} 
                                className="w-8 h-8 rounded-sm bg-[var(--crm-positive-bg)] border border-[var(--crm-positive)]/20 text-[var(--crm-positive)] hover:bg-[var(--crm-positive)] hover:text-[var(--crm-bg)] flex items-center justify-center transition-colors cursor-pointer shadow-md" 
                                title="Approve Quote"
                              >
                                <FiCheck size={14} />
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => handleReject(quotation._id)} 
                                className="w-8 h-8 rounded-sm bg-[var(--crm-danger-bg)] border border-[var(--crm-danger)]/20 text-[var(--crm-danger)] hover:bg-[var(--crm-danger)] hover:text-[var(--crm-bg)] flex items-center justify-center transition-colors cursor-pointer shadow-md" 
                                title="Reject Quote"
                              >
                                <FiX size={14} />
                              </motion.button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--crm-ink-faint)]/60 select-none bg-[var(--crm-bg-sunken)] px-2 py-1 border border-[var(--crm-ink-soft)]/5 rounded-sm">
                              <FiAlertCircle size={10} /> Crypt Restricted
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}