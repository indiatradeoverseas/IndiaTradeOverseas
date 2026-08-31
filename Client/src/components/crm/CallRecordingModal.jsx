import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMic, FiUpload, FiZap, FiSmile } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { leadsApi } from '../../api/leads';
import { useAuth } from '../../hooks/useAuth';

export default function CallRecordingModal({ isOpen, onClose, leads = [], onSuccess }) {
  const { user } = useAuth();
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [leadPriority, setLeadPriority] = useState('WARM');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLeadSelect = (e) => {
    const leadId = e.target.value;
    setSelectedLeadId(leadId);
    if (leadId) {
      const found = leads.find(l => l._id === leadId);
      if (found) {
        setCustomerName(found.customerName || '');
        setLeadPriority(found.priority || 'WARM');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile) {
      toast.error('Please select an audio call recording file.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      if (selectedLeadId) formData.append('leadId', selectedLeadId);
      if (customerName) formData.append('customerName', customerName);
      formData.append('leadPriority', leadPriority);
      formData.append('notes', notes);
      if (duration) formData.append('duration', duration);

      const res = await leadsApi.uploadCallRecording(formData);
      if (res.success) {
        toast.success('Call recording uploaded & saved successfully! 🎙️');
        if (onSuccess) onSuccess(res.data?.callRecording);
        onClose();
        // Reset form
        setSelectedLeadId('');
        setCustomerName('');
        setLeadPriority('WARM');
        setNotes('');
        setDuration('');
        setAudioFile(null);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to upload call recording.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-lg p-6 w-full max-w-lg shadow-2xl relative text-[var(--crm-ink-soft)]"
        >
          {/* Modal Header */}
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-[var(--crm-line)] text-left">
            <div>
              <h2 className="text-base font-bold uppercase tracking-wide text-[var(--crm-heading)] flex items-center gap-2">
                <FiMic className="text-rose-500 animate-pulse" size={18} /> Upload Call Recording
              </h2>
              <p className="text-[10px] font-mono text-[var(--crm-ink-faint)] uppercase mt-0.5">
                Executive: <strong className="text-[var(--crm-heading)]">{user?.fullName || user?.name || 'Sales Executive'}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-1 rounded transition cursor-pointer"
            >
              <FiX size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-left text-xs font-mono">
            {/* Lead Selection */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                Select Lead (Optional)
              </label>
              <select
                value={selectedLeadId}
                onChange={handleLeadSelect}
                className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none cursor-pointer"
              >
                <option value="">-- Direct / Unlinked Call --</option>
                {leads.map(l => (
                  <option key={l._id} value={l._id}>
                    {l.customerName} ({l.leadCode}) - [{l.priority || 'WARM'}]
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                Customer Name / Inquiry Person *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar / Global Trade Co"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none"
              />
            </div>

            {/* Lead Temperature / Quality Tag */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                Lead Quality / Temperature *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'HOT', label: 'HOT 🔥', color: 'border-rose-500/50 bg-rose-950/30 text-rose-400' },
                  { value: 'WARM', label: 'WARM ⚡', color: 'border-amber-500/50 bg-amber-950/30 text-amber-400' },
                  { value: 'COLD', label: 'COLD ❄️', color: 'border-cyan-500/50 bg-cyan-950/30 text-cyan-400' }
                ].map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setLeadPriority(item.value)}
                    className={`py-2 px-3 border rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                      leadPriority === item.value
                        ? `${item.color} font-black shadow-md ring-1 ring-current`
                        : 'border-[var(--crm-line)] text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Call Duration */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                Call Duration (e.g. 03:45)
              </label>
              <input
                type="text"
                placeholder="e.g. 04m 12s"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none"
              />
            </div>

            {/* Audio File Selection */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                Call Audio File * (mp3, wav, m4a, webm)
              </label>
              <div className="border border-dashed border-[var(--crm-line)] p-4 rounded bg-[var(--crm-bg-sunken)]/50 text-center relative cursor-pointer hover:border-teal-500/50 transition">
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                  required
                  onChange={(e) => setAudioFile(e.target.files[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FiUpload size={20} className="mx-auto mb-1 text-[var(--crm-ink-faint)]" />
                <p className="text-[11px] font-bold text-[var(--crm-heading)]">
                  {audioFile ? audioFile.name : 'Click or Drag Call Recording File'}
                </p>
                <p className="text-[9px] text-[var(--crm-ink-faint)] mt-0.5">
                  {audioFile ? `${(audioFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Max 30MB audio recording'}
                </p>
              </div>
            </div>

            {/* Notes / Remarks */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                Call Notes & Summary
              </label>
              <textarea
                rows={3}
                placeholder="Key client points, requirements discussed, agreed next step..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 pt-3 border-t border-[var(--crm-line)] mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase rounded text-xs tracking-wider transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Uploading Recording...' : 'Save Call Recording'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] font-bold uppercase rounded text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
