import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiSmartphone, FiBriefcase, FiGlobe, FiX, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function WhatsAppChoiceModal({ isOpen, onClose, lead, customMessage, defaultNumber }) {
  const [selectedNumber, setSelectedNumber] = useState('');
  const [appType, setAppType] = useState(() => localStorage.getItem('ito_whatsapp_app_pref') || 'STANDARD'); // 'STANDARD' | 'BUSINESS' | 'WEB'
  const [rememberChoice, setRememberChoice] = useState(() => localStorage.getItem('ito_whatsapp_remember') === 'true');

  // Collect all available phone numbers for the lead
  const phoneNumbers = React.useMemo(() => {
    if (!lead && !defaultNumber) return [];
    
    const numbers = [];
    const seen = new Set();

    const addNum = (num, label) => {
      if (!num) return;
      const clean = String(num).replace(/[^0-9]/g, '');
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        const formatted = clean.length === 10 ? `+91 ${clean.slice(0, 5)} ${clean.slice(5)}` : `+${clean}`;
        numbers.push({ raw: clean, label, formatted });
      }
    };

    if (lead) {
      if (lead.whatsAppNumber) addNum(lead.whatsAppNumber, 'WhatsApp Line');
      if (lead.phone) addNum(lead.phone, 'Primary Phone');
      if (lead.alternatePhone || lead.mobileNumber) addNum(lead.alternatePhone || lead.mobileNumber, 'Alternate Contact');
    } else if (defaultNumber) {
      addNum(defaultNumber, 'Target Phone');
    }

    return numbers;
  }, [lead, defaultNumber]);

  useEffect(() => {
    if (phoneNumbers.length > 0) {
      setSelectedNumber(phoneNumbers[0].raw);
    }
  }, [phoneNumbers]);

  if (!isOpen) return null;

  const handleLaunchWhatsApp = (chosenAppType = appType) => {
    if (!selectedNumber) {
      toast.error('No valid phone number selected');
      return;
    }

    let formattedNum = selectedNumber.replace(/[^0-9]/g, '');
    if (formattedNum.length === 10) formattedNum = '91' + formattedNum;

    const clientName = lead?.customerName || 'Client';
    const rawMsg = customMessage || `Hello ${clientName},\n\nThis is regarding your inquiry with India Trade Overseas (Ref: ${lead?.leadCode || 'N/A'}).`;
    const message = encodeURIComponent(rawMsg);

    // Save preferences if rememberChoice is true
    if (rememberChoice) {
      localStorage.setItem('ito_whatsapp_app_pref', chosenAppType);
      localStorage.setItem('ito_whatsapp_remember', 'true');
    } else {
      localStorage.removeItem('ito_whatsapp_remember');
    }

    let url = '';
    if (chosenAppType === 'BUSINESS') {
      url = `https://api.whatsapp.com/send?phone=${formattedNum}&text=${message}`;
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        url = `whatsapp-business://send?phone=${formattedNum}&text=${message}`;
      }
    } else if (chosenAppType === 'WEB') {
      url = `https://web.whatsapp.com/send?phone=${formattedNum}&text=${message}`;
    } else {
      url = `https://wa.me/${formattedNum}?text=${message}`;
    }

    try {
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success(`Opening WhatsApp (${chosenAppType === 'BUSINESS' ? 'Business' : chosenAppType === 'WEB' ? 'Web' : 'Standard'})...`);
    } catch (err) {
      console.error('Error launching WhatsApp link:', err);
      window.open(`https://wa.me/${formattedNum}?text=${message}`, '_blank');
    }

    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto min-h-screen py-6 sm:py-10" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="bg-[var(--crm-bg-raised,#0F172A)] border border-[var(--crm-line,#334155)] rounded-2xl w-full max-w-md shadow-2xl relative text-left my-auto overflow-hidden font-sans text-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-900/60 via-teal-900/40 to-slate-900 border-b border-emerald-500/20 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
                <FiMessageSquare size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-serif">
                  Select WhatsApp App & Line
                </h3>
                <p className="text-[10px] text-emerald-300/80 font-mono">
                  Target: {lead?.customerName || 'Client'} {lead?.leadCode ? `(${lead.leadCode})` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <FiX size={18} />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-5 text-xs font-medium">
            {/* Phone Number Selection */}
            {phoneNumbers.length > 1 && (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                  1. Select Target Contact Number * ({phoneNumbers.length} Available)
                </label>
                <div className="space-y-1.5">
                  {phoneNumbers.map((numObj) => (
                    <label
                      key={numObj.raw}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        selectedNumber === numObj.raw
                          ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                          : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="target_number"
                          value={numObj.raw}
                          checked={selectedNumber === numObj.raw}
                          onChange={() => setSelectedNumber(numObj.raw)}
                          className="accent-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-xs block font-mono text-white">{numObj.formatted}</span>
                          <span className="text-[9px] text-slate-400 uppercase font-mono">{numObj.label}</span>
                        </div>
                      </div>
                      {selectedNumber === numObj.raw && (
                        <FiCheckCircle className="text-emerald-400 shrink-0" size={16} />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* WhatsApp App Type Selection */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                {phoneNumbers.length > 1 ? '2. Choose WhatsApp Application *' : 'Select WhatsApp Application *'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* Standard WhatsApp */}
                <button
                  type="button"
                  onClick={() => setAppType('STANDARD')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-center ${
                    appType === 'STANDARD'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50 shadow-md'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  <FiSmartphone size={20} className={appType === 'STANDARD' ? 'text-emerald-400' : 'text-slate-400'} />
                  <span className="text-[10px] font-bold uppercase font-mono">WhatsApp</span>
                  <span className="text-[8px] text-slate-400">Regular App</span>
                </button>

                {/* WhatsApp Business */}
                <button
                  type="button"
                  onClick={() => setAppType('BUSINESS')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-center ${
                    appType === 'BUSINESS'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50 shadow-md'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  <FiBriefcase size={20} className={appType === 'BUSINESS' ? 'text-emerald-400' : 'text-slate-400'} />
                  <span className="text-[10px] font-bold uppercase font-mono">Business</span>
                  <span className="text-[8px] text-slate-400">WA Business</span>
                </button>

                {/* WhatsApp Web */}
                <button
                  type="button"
                  onClick={() => setAppType('WEB')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-center ${
                    appType === 'WEB'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50 shadow-md'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  <FiGlobe size={20} className={appType === 'WEB' ? 'text-emerald-400' : 'text-slate-400'} />
                  <span className="text-[10px] font-bold uppercase font-mono">WA Web</span>
                  <span className="text-[8px] text-slate-400">Browser Tab</span>
                </button>
              </div>
            </div>

            {/* Remember Choice Checkbox */}
            <div className="pt-1 flex items-center gap-2 border-t border-slate-800">
              <input
                type="checkbox"
                id="remember_wa_choice"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer rounded"
              />
              <label htmlFor="remember_wa_choice" className="text-[10px] text-slate-300 font-mono cursor-pointer select-none">
                Remember my choice for future WhatsApp messages
              </label>
            </div>

            {/* Launch Buttons */}
            <div className="flex space-x-3 pt-3">
              <button
                type="button"
                onClick={() => handleLaunchWhatsApp(appType)}
                className="flex-1 py-3 px-4 text-xs font-bold font-mono uppercase tracking-wider rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <FiMessageSquare size={14} /> Open WhatsApp →
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 text-xs font-bold font-mono uppercase tracking-wider rounded-xl text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
