import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiAlertTriangle,
  FiX,
  FiDollarSign,
  FiTruck,
  FiUsers,
  FiMapPin,
  FiMinusCircle,
  FiPackage,
  FiPhoneOff,
  FiAlertCircle,
  FiClock,
  FiCreditCard,
  FiShieldOff,
  FiHelpCircle,
  FiCheck
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export const LOST_REASON_OPTIONS = [
  { id: 'Price', label: 'Price', desc: 'Rates higher than client target price', icon: FiDollarSign, color: 'text-amber-400 border-amber-500/30 bg-amber-950/20' },
  { id: 'Freight', label: 'Freight', desc: 'Shipping/freight costs too expensive', icon: FiTruck, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20' },
  { id: 'Competitor', label: 'Competitor', desc: 'Lost deal to competing supplier', icon: FiUsers, color: 'text-purple-400 border-purple-500/30 bg-purple-950/20' },
  { id: 'Unsupported destination', label: 'Unsupported destination', desc: 'Location or port unavailable', icon: FiMapPin, color: 'text-rose-400 border-rose-500/30 bg-rose-950/20' },
  { id: 'Quantity too low', label: 'Quantity too low', desc: 'Order volume below minimum threshold', icon: FiMinusCircle, color: 'text-orange-400 border-orange-500/30 bg-orange-950/20' },
  { id: 'Product unavailable', label: 'Product unavailable', desc: 'Stock out or specs not available', icon: FiPackage, color: 'text-yellow-400 border-yellow-500/30 bg-yellow-950/20' },
  { id: 'No response', label: 'No response', desc: 'Client unreachable or ghosted', icon: FiPhoneOff, color: 'text-slate-400 border-slate-500/30 bg-slate-950/20' },
  { id: 'Invalid contact', label: 'Invalid contact', desc: 'Wrong number or fake inquiry', icon: FiAlertCircle, color: 'text-red-400 border-red-500/30 bg-red-950/20' },
  { id: 'Timing', label: 'Timing', desc: 'Buyer postponed project or timeline missed', icon: FiClock, color: 'text-blue-400 border-blue-500/30 bg-blue-950/20' },
  { id: 'Payment terms', label: 'Payment terms', desc: 'Disagreement on advance/LC credit terms', icon: FiCreditCard, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20' },
  { id: 'Trust concern', label: 'Trust concern', desc: 'Client hesitation or verification delay', icon: FiShieldOff, color: 'text-pink-400 border-pink-500/30 bg-pink-950/20' },
  { id: 'Other', label: 'Other', desc: 'Specialized reason detailed below', icon: FiHelpCircle, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-950/20' }
];

export default function LostReasonModal({ isOpen, onClose, onSubmit, leadName = '', loading = false }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedReason) {
      toast.error(' Please select a Mandatory Lost Reason category!');
      return;
    }
    if (!notes.trim() || notes.trim().length < 5) {
      toast.error(' Please provide a clear explanation note (min 5 chars)!');
      return;
    }
    onSubmit({ lostReason: selectedReason, lostReasonNotes: notes.trim() });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[var(--crm-bg-raised)] border border-rose-500/30 rounded-md p-6 w-full max-w-2xl relative text-[var(--crm-ink-soft)] text-left shadow-2xl my-8 font-mono"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-[var(--crm-ink-soft)]/15 pb-4 mb-5">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-rose-950/60 border border-rose-700/40 rounded text-rose-400 shrink-0">
                <FiAlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-serif font-normal text-[var(--crm-heading)] mt-0.5">
                  Declare Lost Reason {leadName ? `for ${leadName}` : ''}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-1.5 rounded transition-colors cursor-pointer"
            >
              <FiX size={18} />
            </button>
          </div>

          <p className="text-xs text-[var(--crm-ink-soft)] font-sans mb-4 leading-relaxed">
            As per CRM policy, whenever a lead is marked <span className="text-rose-400 font-bold">CLOSED LOST</span>, specifying the exact root cause category and detailed explanation is mandatory.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Options Grid */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-2.5">
                Select Primary Lost Reason Category *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {LOST_REASON_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedReason === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedReason(opt.id)}
                      className={`p-3 rounded border text-left transition-all duration-150 relative cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-rose-500 bg-rose-950/40 ring-1 ring-rose-500 text-[var(--crm-heading)]'
                          : 'border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg)]/60 text-[var(--crm-ink-soft)] hover:border-[var(--crm-ink-soft)]/40 hover:bg-[var(--crm-bg-raised)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className={`p-1.5 rounded border ${opt.color}`}>
                          <Icon size={14} />
                        </div>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">
                            <FiCheck size={10} />
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wide text-[var(--crm-heading)] block">
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-[var(--crm-ink-faint)] font-sans leading-tight mt-0.5 line-clamp-1">
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explanation Note */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-faint)] mb-1.5">
                Detailed Lost Reason Explanation / Notes *
              </label>
              <textarea
                required
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain in detail why this lead was lost"
                className="w-full p-3 border border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] text-[var(--crm-heading)] text-xs font-sans rounded outline-none resize-none focus:border-rose-500/60 leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-[var(--crm-ink-soft)]/10">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] hover:bg-[var(--crm-bg-sunken)] text-[11px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold uppercase tracking-widest rounded transition-all cursor-pointer shadow-lg shadow-rose-950/40 flex items-center space-x-2"
              >
                {loading ? (
                  <span>Saving Audit...</span>
                ) : (
                  <>
                    <FiAlertTriangle size={13} />
                    <span>Confirm Closed Lost</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
