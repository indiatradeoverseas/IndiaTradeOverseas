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

function getConfirmedCommercialTotal(quotation) {
  const terms = quotation?.commercialTerms;

  if (!terms || !terms.confirmedAt) {
    return null;
  }

  const requiredTextFields = [
    'source',
    'product',
    'destination',
    'unit',
    'deliveryTerms',
    'paymentTerms',
    'reference',
    'currency',
  ];

  if (requiredTextFields.some((field) => !String(terms[field] || '').trim())) {
    return null;
  }

  if (!/^[A-Z]{3}$/.test(String(terms.currency || '').trim().toUpperCase())) {
    return null;
  }

  const quantity = Number(terms.quantity);
  const unitPrice = Number(terms.unitPrice);
  const freight = Number(terms.freight);
  const tax = Number(terms.tax);

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(unitPrice) ||
    unitPrice < 0 ||
    !Number.isFinite(freight) ||
    freight < 0 ||
    !Number.isFinite(tax) ||
    tax < 0
  ) {
    return null;
  }

  const validUntil = new Date(terms.validUntil);
  if (!Number.isFinite(validUntil.getTime()) || validUntil <= new Date()) {
    return null;
  }

  return Math.round((quantity * unitPrice + freight + tax) * 100) / 100;
}

function formatCommercialAmount(value, currency = '') {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '—';
  }

  const code = String(currency || '').trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(code)) {
    return amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
}


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


  const handleApprove = async (quotation) => {
    const confirmedTotal = getConfirmedCommercialTotal(quotation) || quotation.employeeRequestedPrice;

    if (!confirmedTotal || Number(confirmedTotal) <= 0) {
      toast.error('Quotation requested price is missing.');
      return;
    }

    const currency = quotation.commercialTerms?.currency || 'INR';
    const paymentTerms = quotation.commercialTerms?.paymentTerms || quotation.paymentTerms || '';

    const promptMessage = [
      paymentTerms ? `Payment Protocol: ${paymentTerms}` : null,
      `Quotation Valuation: ${formatCommercialAmount(confirmedTotal, currency)}`,
      '',
      'Confirm approved price (₹):'
    ].filter(Boolean).join('\n');

    const price = window.prompt(promptMessage, String(confirmedTotal));

    if (price === null) {
      return;
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      toast.error('Approved price must be a positive number.');
      return;
    }

    try {
      const response = await quotationsApi.approveQuotation(quotation._id, {
        approvedPrice: numericPrice
      });

      if (response.success) {
        toast.success('Quotation approved successfully 🚀');
        fetchQuotations();
      }
    } catch (error) {
      console.error('Error approving quotation:', error);
      toast.error(error.response?.data?.message || 'Failed to approve quotation.');
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

  // Deduplicate quotations per lead so each lead appears once with its primary / latest quotation
  const deduplicatedQuotations = React.useMemo(() => {
    const map = new Map();
    for (const q of quotations) {
      const leadKey = q.leadId?._id || q.leadId || q._id;
      if (map.has(leadKey)) {
        const existing = map.get(leadKey);
        const existingHasPrice = existing.employeeRequestedPrice != null;
        const currentHasPrice = q.employeeRequestedPrice != null;
        if (!existingHasPrice && currentHasPrice) {
          map.set(leadKey, q);
        } else if (new Date(q.createdAt) > new Date(existing.createdAt) && (existingHasPrice === currentHasPrice)) {
          map.set(leadKey, q);
        }
      } else {
        map.set(leadKey, q);
      }
    }
    return Array.from(map.values());
  }, [quotations]);

  const filteredQuotations = deduplicatedQuotations.filter(q => {
    if (sectorFilter === 'ALL') return true;
    const cat = (q.leadId?.productCategory || '').toUpperCase();
    return cat === sectorFilter;
  });

  const pendingFilteredQuotations = filteredQuotations.filter(
    q => q.status === 'PENDING'
  );

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

    const selectedQuotations = filteredQuotations.filter(
      q => selectedIds.includes(q._id)
    );

    try {
      let approvedCount = 0;

      for (const quotation of selectedQuotations) {
        const approvedPrice = getConfirmedCommercialTotal(quotation) || quotation.employeeRequestedPrice;
        if (!approvedPrice) continue;
        const response = await quotationsApi.approveQuotation(quotation._id, {
          approvedPrice,
        });

        if (response.success) {
          approvedCount += 1;
        }
      }

      toast.success(`Approved ${approvedCount} quotation${approvedCount === 1 ? '' : 's'} successfully.`);
      fetchQuotations();
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

  const canApproveUser = React.useMemo(() => {
    const userRole = (user?.role || '').toUpperCase();
    const userDepartment = String(user?.department || '').toUpperCase();
    return (
      ['ADMIN', 'SUPER_ADMIN', 'FOUNDER', 'CO_FOUNDER', 'CEO', 'MANAGER'].includes(userRole) ||
      userRole.includes('MANAGER') ||
      userDepartment === 'ADMIN' ||
      userDepartment === 'MANAGEMENT' ||
      user?.quotationPermission === true ||
      user?.permissions?.quotation === true
    );
  }, [user]);

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
      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-ink-soft)]/10 py-4 sm:py-6 px-3.5 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--crm-bg-sunken)]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--crm-ink-faint)] font-bold block font-mono">FINANCIAL AUDIT ENGINE</span>
          <h1 className="text-lg sm:text-2xl font-serif font-semibold text-[var(--crm-heading)] tracking-tight uppercase flex items-center gap-2.5">
            <FiFileText className="text-[var(--crm-ink-faint)] shrink-0" size={20} /> Quotations Brokerage
          </h1>
          <p className="text-[11px] sm:text-xs text-[var(--crm-ink-faint)] font-light max-w-xl leading-relaxed">
            Evaluate pending pricing proposals, review approved deal valuations, and perform 1-click bulk approvals.
          </p>
        </div>

        {/* Header Control Toolbar: Single All Approved Quotes Button */}
        <div className="flex items-center gap-2 font-mono shrink-0">
          <button
            onClick={() => setStatusFilter(prev => prev === 'APPROVED' ? 'ALL' : 'APPROVED')}
            className={`w-full sm:w-auto px-3.5 py-2 text-[10px] font-bold uppercase rounded-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
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
            className="w-full px-3.5 sm:px-8 pt-3"
          >
            <div className="w-full p-3 bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-slate-900 border border-teal-500/40 rounded-xs shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-teal-300">
                <FiCheckSquare size={16} className="text-teal-400 animate-pulse shrink-0" />
                <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
                  {selectedIds.length} Quotation{selectedIds.length > 1 ? 's' : ''} Selected
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleBulkApprove}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase text-[10px] tracking-wider rounded-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                >
                  <FiCheck size={13} /> Approve ({selectedIds.length})
                </button>

                <button
                  onClick={handleBulkReject}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-600/80 text-rose-300 font-bold uppercase text-[10px] tracking-wider rounded-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                >
                  <FiX size={13} /> Reject ({selectedIds.length})
                </button>

                <button
                  onClick={() => setSelectedIds([])}
                  className="px-2 py-1.5 text-[10px] font-bold uppercase text-[var(--crm-ink-faint)] hover:text-white transition cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Commodity Sector Filter Ribbon */}
      <div className="w-full px-3.5 sm:px-8 pt-4 pb-2 bg-[var(--crm-bg)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 font-mono">
        <div className="flex items-center gap-1.5 text-xs text-[var(--crm-ink-faint)] shrink-0">
          <FiFilter size={12} />
          <span className="text-[10px] uppercase font-bold tracking-wider">Commodity Sectors:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full sm:w-auto pb-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
          {['ALL', 'TEA', 'RICE', 'STONE', 'COAL', 'TRANSPORT'].map(sec => {
            const isActive = sectorFilter === sec;
            return (
              <button
                key={sec}
                onClick={() => setSectorFilter(sec)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-xs border transition cursor-pointer whitespace-nowrap shrink-0 ${
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

      {/* Main Content Area */}
      <div className="w-full px-3.5 sm:px-8 py-3 bg-[var(--crm-bg)]">
        {/* Mobile View: Cards */}
        <div className="block md:hidden space-y-3">
          {filteredQuotations.length === 0 ? (
            <div className="border border-[var(--crm-ink-soft)]/15 rounded-xs p-8 text-center bg-[var(--crm-bg-raised)]/10">
              <FiCheck className="text-[var(--crm-ink-faint)] mx-auto mb-2 opacity-40" size={28} />
              <p className="font-mono uppercase tracking-widest text-[10px] text-[var(--crm-ink-faint)]">
                No pricing requests mapped for selected filter.
              </p>
            </div>
          ) : (
            filteredQuotations.map((quotation) => {
              const isPending = quotation.status === 'PENDING';
              const isSelected = selectedIds.includes(quotation._id);

              return (
                <div 
                  key={quotation._id}
                  className={`p-3.5 rounded-xs border transition-all ${
                    isSelected
                      ? 'bg-teal-950/20 border-teal-500/50 shadow-md'
                      : 'bg-[var(--crm-bg-raised)]/20 border-[var(--crm-ink-soft)]/15 hover:border-[var(--crm-ink-soft)]/30'
                  }`}
                >
                  {/* Card Header: Checkbox, Customer Name, Category */}
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--crm-ink-soft)]/10 pb-2.5 mb-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {isPending && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(quotation._id)}
                          className="mt-1 cursor-pointer accent-teal-500 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <h3 className="font-serif text-sm font-bold text-[var(--crm-heading)] truncate">
                          {quotation.leadId?.customerName || 'N/A'}
                        </h3>
                        {quotation.leadId?.leadCode && (
                          <span className="text-[10px] font-mono text-teal-400 block font-medium">
                            {quotation.leadId.leadCode}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 text-[9px] font-bold font-mono uppercase rounded-xs border shrink-0 ${
                      quotation.leadId?.productCategory === 'TEA' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60' :
                      quotation.leadId?.productCategory === 'RICE' ? 'bg-amber-950/80 text-amber-400 border-amber-800/60' :
                      quotation.leadId?.productCategory === 'STONE' ? 'bg-slate-800/80 text-slate-300 border-slate-700' :
                      'bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-soft)] border-[var(--crm-ink-soft)]/20'
                    }`}>
                      {quotation.leadId?.productCategory || 'GENERAL'}
                    </span>
                  </div>

                  {/* Pricing Overview Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-2.5 bg-[var(--crm-bg-sunken)]/40 p-2.5 rounded-xs border border-[var(--crm-ink-soft)]/10">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] block mb-0.5">Target Base Price</span>
                      <span className="text-teal-400 font-bold">
                        {quotation.employeeRequestedPrice || quotation.leadId?.leadValue ? (
                          formatCommercialAmount(
                            quotation.employeeRequestedPrice || quotation.leadId?.leadValue,
                            quotation.commercialTerms?.currency || 'INR'
                          )
                        ) : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] block mb-0.5">Approved Price</span>
                      <span className="text-[var(--crm-positive)] font-bold">
                        {quotation.approvedPrice
                          ? formatCommercialAmount(quotation.approvedPrice, quotation.commercialTerms?.currency)
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Payment Protocol & Metadata */}
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[var(--crm-ink-faint)] mb-2.5">
                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-xs border bg-teal-950/60 text-teal-300 border-teal-800/60">
                      {quotation.commercialTerms?.paymentTerms || quotation.paymentTerms || 'Standard Terms'}
                    </span>
                    <span>
                      {new Date(quotation.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Action Deck & Requester */}
                  <div className="pt-2 border-t border-[var(--crm-ink-soft)]/10 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-[var(--crm-ink-faint)] truncate max-w-[130px]">
                      By: {quotation.requestedBy?.fullName || quotation.requestedBy?.name || quotation.leadId?.assignedTo?.fullName || quotation.leadId?.assignedTo?.name || 'Sales Rep'}
                    </span>

                    <div className="shrink-0">
                      {quotation.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 border border-emerald-800/60 rounded-xs">
                          <FiCheckCircle size={10} /> Approved
                        </span>
                      ) : quotation.status === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-950/60 px-2 py-0.5 border border-rose-800/60 rounded-xs">
                          <FiX size={10} /> Rejected
                        </span>
                      ) : canApproveUser ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApprove(quotation)}
                            className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-xs bg-emerald-950/90 border border-emerald-600/80 text-emerald-300 hover:bg-emerald-900 transition flex items-center gap-1 cursor-pointer"
                          >
                            <FiCheck size={11} /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(quotation._id)}
                            className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-xs bg-rose-950/90 border border-rose-600/80 text-rose-300 hover:bg-rose-900 transition flex items-center gap-1 cursor-pointer"
                          >
                            <FiX size={11} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-[var(--crm-ink-faint)]/60 bg-[var(--crm-bg-sunken)] px-2 py-0.5 border border-[var(--crm-ink-soft)]/5 rounded-xs">
                          <FiAlertCircle size={9} /> Restricted
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Data Table */}
        <div className="hidden md:block">
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
                    <th className="py-4 px-5 font-bold text-teal-400">Target Base Price (₹)</th>
                    <th className="py-4 px-5">Payment Protocol</th>
                    <th className="py-4 px-5">Requested By</th>
                    <th className="py-4 px-5">Approved Price</th>
                    <th className="py-4 px-5 text-center">Timestamp</th>
                    <th className="py-4 px-5 text-center">Execution Deck</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-xs">
                  {filteredQuotations.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-20 bg-[var(--crm-bg-raised)]/5">
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
                          <div className="flex flex-col">
                            <span className="font-bold">{quotation.leadId?.customerName || 'N/A'}</span>
                            {quotation.leadId?.leadCode && (
                              <span className="text-[10px] font-mono text-teal-400 font-normal">
                                {quotation.leadId.leadCode}
                              </span>
                            )}
                          </div>
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

                        {/* Target Base Price */}
                        <td className="py-4 px-5 font-mono text-sm text-[var(--crm-heading)] font-bold">
                          {quotation.employeeRequestedPrice || quotation.leadId?.leadValue ? (
                            <span className="text-teal-400 font-bold">
                              {formatCommercialAmount(
                                quotation.employeeRequestedPrice || quotation.leadId?.leadValue,
                                quotation.commercialTerms?.currency || 'INR'
                              )}
                            </span>
                          ) : (
                            <span className="text-[var(--crm-ink-faint)]">—</span>
                          )}
                        </td>

                        {/* Payment Protocol Badge */}
                        <td className="py-4 px-5 font-mono">
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded border bg-teal-950/60 text-teal-300 border-teal-800/60 shadow-sm inline-block font-mono">
                            {quotation.commercialTerms?.paymentTerms || quotation.paymentTerms || '—'}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-[var(--crm-ink-soft)]/90 font-light font-mono text-[11px]">
                          {quotation.requestedBy?.fullName || quotation.requestedBy?.name || quotation.leadId?.assignedTo?.fullName || quotation.leadId?.assignedTo?.name || 'Sales Representative'}
                        </td>

                        <td className="py-4 px-5 font-mono font-bold text-sm text-[var(--crm-positive)]">
                          {quotation.approvedPrice
                            ? formatCommercialAmount(
                                quotation.approvedPrice,
                                quotation.commercialTerms?.currency
                              )
                            : '—'}
                        </td>

                        <td className="py-4 px-5 text-center font-mono text-[var(--crm-ink-faint)]">
                          {new Date(quotation.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-4 px-5 text-center">
                          {(() => {
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

                            return canApproveUser ? (
                              <div className="flex justify-center items-center gap-2.5">
                                <motion.button 
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.92 }}
                                  onClick={() => handleApprove(quotation)}
                                  className="w-8 h-8 rounded-sm bg-[var(--crm-positive-bg)] border border-[var(--crm-positive)]/20 text-[var(--crm-positive)] hover:bg-[var(--crm-positive)] hover:text-[var(--crm-bg)] flex items-center justify-center transition-colors cursor-pointer shadow-md" 
                                  title="Approve Quote & Advance Stage"
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
      </div>
    </motion.div>
  );
}