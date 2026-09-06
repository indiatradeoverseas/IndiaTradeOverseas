import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMic, FiUpload, FiPhone, FiPackage, FiMapPin, FiUserCheck, FiHash } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { leadsApi } from '../../api/leads';
import { useAuth } from '../../hooks/useAuth';

export default function CallRecordingModal({ isOpen, onClose, leads = [], initialLead = null, onSuccess }) {
  const { user } = useAuth();
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [contactRole, setContactRole] = useState('Supplier');
  const [material, setMaterial] = useState('');
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState('');
  const [leadPriority, setLeadPriority] = useState('WARM');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const combinedLeads = React.useMemo(() => {
    const map = new Map();
    if (initialLead) {
      const id = initialLead._id || initialLead.id;
      if (id) map.set(String(id), initialLead);
    }
    if (Array.isArray(leads)) {
      leads.forEach(l => {
        const id = l._id || l.id;
        if (id) map.set(String(id), l);
      });
    }
    return Array.from(map.values());
  }, [initialLead, leads]);

  useEffect(() => {
    if (isOpen) {
      const active = initialLead || (selectedLeadId ? combinedLeads.find(l => String(l._id || l.id) === String(selectedLeadId)) : null);
      if (active) {
        const leadId = String(active._id || active.id || '');
        setSelectedLeadId(leadId);
        setCustomerName(active.customerName || active.contactName || '');
        setMobileNumber(active.whatsAppNumber || active.phoneMasked || active.phoneNumber || '');
        setMaterial(active.productCategory || active.material || active.productOfInterest || '');
        setQuantity(active.quantity || '');
        setLocation(active.destination || active.country || active.location || '');
        setLeadPriority(active.priority || 'WARM');
      }
    }
  }, [initialLead, isOpen]);

  if (!isOpen) return null;

  const handleLeadSelect = (e) => {
    const leadId = e.target.value;
    setSelectedLeadId(leadId);
    if (leadId) {
      const found = combinedLeads.find(l => String(l._id || l.id) === String(leadId));
      if (found) {
        setCustomerName(found.customerName || found.contactName || '');
        setMobileNumber(found.whatsAppNumber || found.phoneMasked || found.phoneNumber || '');
        setMaterial(found.productCategory || found.material || found.productOfInterest || '');
        setQuantity(found.quantity || '');
        setLocation(found.destination || found.country || found.location || '');
        setLeadPriority(found.priority || 'WARM');
      }
    }
  };

  const activeLead = combinedLeads.find(l => String(l._id || l.id) === String(selectedLeadId)) || initialLead;

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
      if (mobileNumber) formData.append('mobileNumber', mobileNumber);
      if (contactRole) formData.append('contactRole', contactRole);
      if (material) formData.append('material', material);
      if (quantity) formData.append('quantity', quantity);
      if (location) formData.append('location', location);
      formData.append('leadPriority', leadPriority);
      formData.append('notes', notes);
      if (duration) formData.append('duration', duration);

      const res = await leadsApi.uploadCallRecording(formData);
      if (res.success) {
        toast.success('Call recording & details saved successfully to MongoDB! 🎙️');
        if (onSuccess) onSuccess(res.data?.callRecording);
        onClose();
        // Reset form
        setSelectedLeadId('');
        setCustomerName('');
        setMobileNumber('');
        setContactRole('Supplier');
        setMaterial('');
        setQuantity('');
        setLocation('');
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
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-lg p-5 sm:p-6 w-full max-w-xl shadow-2xl relative text-[var(--crm-ink-soft)] my-8 max-h-[90vh] flex flex-col"
        >
          {/* Modal Header */}
          <div className="flex justify-between items-center pb-3 mb-3 border-b border-[var(--crm-line)] text-left shrink-0">
            <div>
              <h2 className="text-base font-bold uppercase tracking-wide text-[var(--crm-heading)] flex items-center gap-2">
                <FiMic className="text-rose-500 animate-pulse" size={18} /> Upload Call Recording & Details
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

          <form onSubmit={handleSubmit} className="space-y-3.5 text-left text-xs font-mono overflow-y-auto pr-1 custom-scrollbar flex-1">
            {/* Active Lead Highlight Banner */}
            {activeLead && (
              <div className="p-3 bg-teal-950/40 border border-teal-500/40 rounded flex items-center justify-between text-left shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    <FiUserCheck size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-teal-400 block font-mono">ACTIVE FOLLOW-UP LEAD</span>
                    <h4 className="text-xs font-bold text-[var(--crm-heading)] font-mono">
                      {activeLead.customerName} {activeLead.leadCode && <span className="text-teal-300">({activeLead.leadCode})</span>}
                    </h4>
                    <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono">
                      {activeLead.productCategory || activeLead.material || 'General Inquiry'} • {activeLead.destination || activeLead.country || 'N/A'}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border font-mono ${
                  (activeLead.priority || leadPriority) === 'HOT' ? 'bg-rose-950/60 border-rose-500/50 text-rose-400' :
                  (activeLead.priority || leadPriority) === 'WARM' ? 'bg-amber-950/60 border-amber-500/50 text-amber-400' :
                  'bg-cyan-950/60 border-cyan-500/50 text-cyan-400'
                }`}>
                  {activeLead.priority || leadPriority || 'WARM'}
                </span>
              </div>
            )}

            {/* Lead Selection */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                Select Lead (Follow-Up Target)
              </label>
              <select
                value={selectedLeadId}
                onChange={handleLeadSelect}
                className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none cursor-pointer font-mono"
              >
                <option value="">-- Direct / Unlinked Call --</option>
                {combinedLeads.map(l => {
                  const lId = String(l._id || l.id);
                  const codeStr = l.leadCode ? `${l.leadCode} - ` : '';
                  return (
                    <option key={lId} value={lId}>
                      {codeStr}{l.customerName} ({l.productCategory || l.material || 'General'}) [{l.priority || 'WARM'}]
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Customer Name + Role */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                  Customer Name / Inquiry Person *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vijay / Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                  Role / Person Type
                </label>
                <select
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none cursor-pointer"
                >
                  <option value="Supplier">Supplier</option>
                  <option value="Buyer">Buyer</option>
                  <option value="Customer">Customer</option>
                  <option value="Follow up lead">Follow up lead</option>
                  <option value="Transporter">Transporter</option>
                </select>
              </div>
            </div>

            {/* Mobile Number + Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 flex items-center gap-1">
                  <FiPhone size={10} className="text-emerald-400" /> Mobile / WhatsApp No *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +919709586173"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 flex items-center gap-1">
                  <FiMapPin size={10} className="text-amber-400" /> Location / City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Siwan / Pakur"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none"
                />
              </div>
            </div>

            {/* Material / Product + Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 flex items-center gap-1">
                  <FiPackage size={10} className="text-cyan-400" /> Material / Stone Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20 mm / Pakur / Bhutan Black Stone"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 flex items-center gap-1">
                  <FiHash size={10} className="text-teal-400" /> Quantity
                </label>
                <input
                  type="text"
                  placeholder="e.g. 65 gari / 100 Tons"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none"
                />
              </div>
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
                Call Audio File * (MP3, WAV, M4A, WEBM)
              </label>
              <div className="border border-dashed border-[var(--crm-line)] p-3.5 rounded bg-[var(--crm-bg-sunken)]/50 text-center relative cursor-pointer hover:border-teal-500/50 transition">
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                  required
                  onChange={(e) => setAudioFile(e.target.files[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FiUpload size={18} className="mx-auto mb-1 text-[var(--crm-ink-faint)]" />
                <p className="text-[11px] font-bold text-[var(--crm-heading)]">
                  {audioFile ? audioFile.name : 'Click or Drag Call Recording File'}
                </p>
                <p className="text-[9px] text-[var(--crm-ink-faint)] mt-0.5">
                  {audioFile ? `${(audioFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Max 30MB audio recording'}
                </p>
              </div>
            </div>

            {/* Notes / Talk Summary */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                Call Notes & Talk Summary
              </label>
              <textarea
                rows={2}
                placeholder="Key client points, requirements discussed, agreed next step (e.g. visit office next week)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 pt-3 border-t border-[var(--crm-line)] mt-3 shrink-0">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase rounded text-xs tracking-wider transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Saving Call Recording...' : 'Save Call Recording'}
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
