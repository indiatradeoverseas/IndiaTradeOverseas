import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { quotationsApi } from '../../api/quotations';
import { FiCheck, FiX, FiEye, FiFileText, FiAlertCircle } from 'react-icons/fi';
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

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const response = await quotationsApi.getPendingQuotations();
      if (response.success) {
        setQuotations(response.data.quotations || []);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast.error('Failed to pull pending quotations payload.');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1116] flex items-center justify-center">
        <div className="w-12 h-[1px] bg-[#C5CBD3]/40 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="min-h-screen w-full bg-[#0E1116] text-[#C5CBD3] block pb-12"
    >
      {/* Upper Context Header Panel */}
      <motion.div variants={blockVariants} className="w-full border-b border-[#C5CBD3]/10 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-[#040A12]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#6D7886] font-bold block font-mono">FINANCIAL AUDIT ENGINE</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F2F4F7] tracking-tight uppercase flex items-center gap-3">
            <FiFileText className="text-[#6D7886]" size={24} /> Quotations Brokerage
          </h1>
          <p className="text-xs text-[#6D7886] font-light max-w-xl">
            Evaluate pending pricing proposals, adjust statutory margin criteria, and sign off on active deal quotes.
          </p>
        </div>
      </motion.div>

      {/* Table Interface Layer */}
      <div className="w-full py-8 bg-[#0E1116]">
        <motion.div variants={blockVariants} className="border border-[#C5CBD3]/15 overflow-hidden w-full bg-[#121D29]/10 rounded-sm shadow-2xl">
          <div className="overflow-x-auto w-full block custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#040A12] text-[#6D7886] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[#C5CBD3]/15">
                  <th className="py-4 px-5">Lead / Client Name</th>
                  <th className="py-4 px-5">Requested By</th>
                  <th className="py-4 px-5">Proposed Base Price</th>
                  <th className="py-4 px-5 text-center">Fulfillment Status</th>
                  <th className="py-4 px-5 text-center">Timestamp</th>
                  <th className="py-4 px-5 text-center">Execution Deck</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C5CBD3]/10 text-xs">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-20 bg-[#121D29]/5">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <FiCheck className="text-[#6D7886] mb-3" size={32} />
                        <p className="font-mono uppercase tracking-widest text-[10px]">No pending pricing requests mapped.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  quotations.map((quotation) => (
                    <tr key={quotation._id} className="hover:bg-[#121D29]/40 transition-colors">
                      <td className="py-4 px-5 font-serif text-sm text-[#F2F4F7]">{quotation.leadId?.customerName || 'N/A'}</td>
                      <td className="py-4 px-5 text-[#C5CBD3]/90 font-light">{quotation.requestedBy?.fullName || 'System Managed'}</td>
                      <td className="py-4 px-5 font-mono font-bold text-sm text-[#F2F4F7]">₹{quotation.employeeRequestedPrice?.toLocaleString()}</td>
                      <td className="py-4 px-5 text-center">
                        <span className="px-2 py-0.5 border text-[9px] font-mono font-bold uppercase bg-amber-950/20 border-amber-500/20 text-amber-400 rounded-sm">
                          {quotation.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center font-mono text-[#6D7886]">{new Date(quotation.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 px-5 text-center">
                        {user?.role === 'ADMIN' || user?.quotationPermission === true ? (
                          <div className="flex justify-center items-center gap-2.5">
                            <motion.button 
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.92 }}
                              onClick={() => handleApprove(quotation._id, quotation.employeeRequestedPrice)} 
                              className="w-8 h-8 rounded-sm bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-[#0E1116] flex items-center justify-center transition-colors cursor-pointer shadow-md" 
                              title="Approve Quote"
                            >
                              <FiCheck size={14} />
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.92 }}
                              onClick={() => handleReject(quotation._id)} 
                              className="w-8 h-8 rounded-sm bg-rose-950/20 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-[#0E1116] flex items-center justify-center transition-colors cursor-pointer shadow-md" 
                              title="Reject Quote"
                            >
                              <FiX size={14} />
                            </motion.button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[#6D7886]/60 select-none bg-[#040A12] px-2 py-1 border border-[#C5CBD3]/5 rounded-sm">
                            <FiAlertCircle size={10} /> Crypt Restricted
                          </span>
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
    </motion.div>
  );
}