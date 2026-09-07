import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMic, FiUpload, FiPhone, FiPackage, FiMapPin, FiUserCheck, FiHash, FiClock, FiFileText } from 'react-icons/fi';
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

    // ALL FIELDS MANDATORY VALIDATION
    if (!customerName.trim()) {
      toast.error('Customer Name / Inquiry Person is required *');
      return;
    }
    if (!mobileNumber.trim()) {
      toast.error('Mobile / WhatsApp Number is required *');
      return;
    }
    if (!location.trim()) {
      toast.error('Location / City is required *');
      return;
    }
    if (!material.trim()) {
      toast.error('Material / Stone Type is required *');
      return;
    }
    if (!quantity.trim()) {
      toast.error('Quantity is required *');
      return;
    }
    if (!duration.trim()) {
      toast.error('Call Duration (e.g. 03m 45s) is required *');
      return;
    }
    if (!audioFile) {
      toast.error('Call Recording Audio File is required *');
      return;
    }
    if (!notes.trim()) {
      toast.error('Call Notes & Talk Summary is required *');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      if (selectedLeadId) formData.append('leadId', selectedLeadId);
      formData.append('customerName', customerName.trim());
      formData.append('mobileNumber', mobileNumber.trim());
      formData.append('contactRole', contactRole);
      formData.append('material', material.trim());
      formData.append('quantity', quantity.trim());
      formData.append('location', location.trim());
      formData.append('leadPriority', leadPriority);
      formData.append('notes', notes.trim());
      formData.append('duration', duration.trim());

      const res = await leadsApi.uploadCallRecording(formData);
      if (res.success) {
        toast.success('Call recording & details saved successfully! 🎙️');
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
          className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-lg p-6 w-full max-w-lg shadow-2xl relative text-[var(--crm-ink-soft)] font-mono text-left space-y-4 my-8 max-h-[90vh] flex flex-col"
        >
          {/* Header Bar matching Assign Task Modal */}
          <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3 shrink-0">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2 font-mono">
                <FiMic className="text-teal-400 animate-pulse" size={16} /> Upload Call Recording & Details
              </h3>
              <span className="text-[9px] font-mono text-[var(--crm-ink-faint)] uppercase block mt-0.5">
                Executive: <strong className="text-[var(--crm-heading)]">{user?.fullName || user?.name || 'Sales Executive'}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-[var(--crm-ink-faint)] hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-mono overflow-y-auto pr-1 custom-scrollbar flex-1">
            
            {/* Active Lead Banner */}
            {activeLead && (
              <div className="p-3 bg-[var(--crm-bg-sunken)] border border-teal-900/60 rounded flex items-center justify-between text-left shrink-0">
                <div className="flex items-center gap-2.5">
                  <FiUserCheck size={16} className="text-teal-400 shrink-0" />
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-teal-400 block font-mono">ACTIVE TARGET LEAD</span>
                    <h4 className="text-xs font-bold text-[var(--crm-heading)] font-mono">
                      {activeLead.customerName} {activeLead.leadCode && <span className="text-teal-300">({activeLead.leadCode})</span>}
                    </h4>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border font-mono ${
                  (activeLead.priority || leadPriority) === 'HOT' ? 'bg-rose-950/60 border-rose-800/60 text-rose-400' :
                  (activeLead.priority || leadPriority) === 'WARM' ? 'bg-amber-950/60 border-amber-800/60 text-amber-400' :
                  'bg-cyan-950/60 border-cyan-800/60 text-cyan-400'
                }`}>
                  {activeLead.priority || leadPriority || 'WARM'}
                </span>
              </div>
            )}

            {/* Select Lead */}
            <div>
              <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 font-mono">
                Select Lead (Follow-Up Target) *
              </label>
              <select
                required
                value={selectedLeadId}
                onChange={handleLeadSelect}
                className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-3 py-2 rounded outline-none cursor-pointer font-mono text-xs focus:border-teal-600 transition"
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
                <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 font-mono">
                  Customer Name / Inquiry Person *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vijay / Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-3 py-2 rounded outline-none font-mono text-xs focus:border-teal-600 transition"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 font-mono">
                  Role / Person Type *
                </label>
                <select
                  required
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-3 py-2 rounded outline-none cursor-pointer font-mono text-xs focus:border-teal-600 transition"
                >
                  <option value="Supplier">Supplier</option>
                  <option value="Buyer">Buyer</option>
                  <option value="Customer">Customer</option>
                  <option value="Follow up lead">Follow up lead</option>
                  <option value="Transporter">Transporter</option>
                </select>
              </div>
            </div>

            {/* Mobile + Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 font-mono">
                  Mobile / WhatsApp No *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +919709586173"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-3 py-2 rounded outline-none font-mono text-xs focus:border-teal-600 transition"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 font-mono">
                  Location / City *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siwan / Pakur"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-3 py-2 rounded outline-none font-mono text-xs focus:border-teal-600 transition"
                />
              </div>
            </div>

            {/* Material + Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 font-mono">
                  Material / Stone Type *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 20 mm / Pakur / Bhutan Black Stone"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-3 py-2 rounded outline-none font-mono text-xs focus:border-teal-600 transition"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 font-mono">
                  Quantity *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 65 gari / 100 Tons"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-3 py-2 rounded outline-none font-mono text-xs focus:border-teal-600 transition"
                />
              </div>
            </div>

            {/* Lead Quality / Temperature */}
            <div>
              <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 font-mono">
                Lead Quality / Temperature *
              </label>
              <div className="grid grid-cols-3 gap-2 font-mono">
                {[
                  { value: 'HOT', label: 'HOT 🔥', activeColor: 'bg-rose-950 border-rose-600 text-rose-400 font-bold' },
                  { value: 'WARM', label: 'WARM ⚡', activeColor: 'bg-amber-950 border-amber-500 text-amber-300 font-bold' },
                  { value: 'COLD', label: 'COLD ❄️', activeColor: 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold' }
                ].map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setLeadPriority(item.value)}
                    className={`py-2 px-3 border rounded text-[10px] font-bold uppercase transition cursor-pointer font-mono ${
                      leadPriority === item.value
                        ? `${item.activeColor} shadow-sm`
                        : 'bg-[var(--crm-bg-sunken)] border-[var(--crm-line)] text-[var(--crm-ink-faint)] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Call Duration */}
            <div>
              <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 font-mono">
                Call Duration (e.g. 03:45) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 04m 12s"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-3 py-2 rounded outline-none font-mono text-xs focus:border-teal-600 transition"
              />
            </div>

            {/* Call Audio File */}
            <div>
              <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 font-mono">
                Call Audio File * (MP3, WAV, M4A, WEBM)
              </label>
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                required
                onChange={(e) => setAudioFile(e.target.files[0] || null)}
                className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2 rounded text-[10px] font-mono cursor-pointer"
              />
            </div>

            {/* Notes / Summary */}
            <div>
              <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1 font-mono">
                Instructions / Call Notes & Talk Summary *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Follow up notes, client discussion points, requirement details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] p-2.5 rounded outline-none resize-none font-sans text-xs focus:border-teal-600 transition"
              />
            </div>

            {/* Footer Action Buttons matching Assign Task Modal */}
            <div className="flex gap-2 pt-2 border-t border-[var(--crm-line)] shrink-0 font-mono">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold uppercase py-2.5 rounded text-[10px] tracking-wider transition cursor-pointer"
              >
                {submitting ? 'Saving Call Recording...' : 'Save Call Recording'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] px-4 py-2.5 rounded text-[10px] font-bold uppercase cursor-pointer hover:text-white"
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
