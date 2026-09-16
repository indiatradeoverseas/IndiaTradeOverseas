import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { FiPhone, FiCheckCircle, FiShield, FiArrowRight, FiX } from 'react-icons/fi';
import { pushDataLayerEvent } from '../../utils/analytics';
import { softLeadsApi } from '../../api/leads';

const PHONE_RE = /^[+]?[\d\s\-\(\)]{10,}$/;

export default function SoftGate({ 
  division, 
  requirement, 
  theme, 
  onSuccess, 
  onClose,
  onProgressiveDetails 
}) {
  const [step, setStep] = useState('phone'); // 'phone' | 'success' | 'progressive'
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leadId, setLeadId] = useState(null);
  const [error, setError] = useState('');
  const phoneInputRef = useRef(null);

  useEffect(() => {
    phoneInputRef.current?.focus();
    pushDataLayerEvent('view_soft_gate', { division, requirement });
  }, [division, requirement]);

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) return digits;
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setError('');
  };

  const validatePhone = () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return false;
    }
    if (!consent) {
      setError('Please provide consent to be contacted');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validatePhone()) return;

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        division,
        product: requirement.product,
        productDetails: requirement.productDetails || {},
        quantity: requirement.quantity,
        quantityUnit: requirement.quantityUnit,
        destination: requirement.destination?.city || requirement.destination || '',
        pin: requirement.destination?.pin || requirement.pin || '',
        timeline: requirement.timeline,
        eligibility: requirement.eligibility,
        phone: phone.replace(/\D/g, ''),
        consent: true,
        attribution: {
          utm_source: new URLSearchParams(window.location.search).get('utm_source') || '',
          utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || '',
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || '',
          utm_content: new URLSearchParams(window.location.search).get('utm_content') || '',
          referrer: document.referrer,
          sessionId: sessionStorage.getItem('sessionId') || '',
        },
      };

      const res = await softLeadsApi.createSoftLead(payload);
      
      if (res.success) {
        const newLeadId = res.data.leadId;
        setLeadId(newLeadId);
        pushDataLayerEvent('lead_created', { 
          division, 
          leadId: newLeadId, 
          requirement,
          phone: phone.replace(/\D/g, '').slice(-4) 
        });
        setStep('success');
        toast.success('Enquiry submitted! We\'ll contact you shortly.');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to submit enquiry. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueToProgressive = () => {
    setStep('progressive');
    pushDataLayerEvent('qualification_completed', { division, leadId });
  };

  const handleProgressiveSubmit = async (details) => {
    try {
      await softLeadsApi.updateSoftLeadDetails(leadId, details);
      pushDataLayerEvent('qualified_lead', { division, leadId, details });
      onProgressiveDetails?.(details);
      toast.success('Details saved successfully!');
    } catch (err) {
      toast.error('Failed to save details. You can update them later.');
    }
  };

  const handleClose = () => {
    onClose?.();
    pushDataLayerEvent('soft_gate_closed', { division, step, leadId });
  };

  const requirementSummary = (
    <div className="mb-6 p-4 rounded-xl border bg-primary/5 dark:bg-primary/10">
      <p className="text-xs font-mono uppercase tracking-wider text-primary mb-2">YOUR REQUIREMENT</p>
      <p className="text-sm font-medium text-neutral-900 dark:text-white">
        {requirement.product} • {requirement.quantity} • {requirement.destination?.location || requirement.destination} • {requirement.timeline}
      </p>
    </div>
  );

  const t = theme || {
    bg: '#37424B',
    panelBg: '#2B333A',
    accent: '#C5A059',
    accentText: '#20262B',
    text: '#F4F2EE',
    muted: '#A89E8E',
    border: '#4A545E',
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto py-10 px-4"
        style={{ backgroundColor: t.bg }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="soft-gate-title"
      >
        <div className="relative z-10 w-full max-w-md">
          <motion.div
            className="relative w-full rounded-xl border shadow-2xl overflow-hidden"
            style={{ backgroundColor: t.panelBg, borderColor: t.border }}
          >
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 z-10 p-1 rounded-lg hover:bg-neutral-800/50 transition-colors"
              style={{ color: t.muted }}
              aria-label="Close"
            >
              <FiX size={20} />
            </button>

            <div className="px-7 pt-8 pb-2 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-widest mb-5"
                style={{ borderColor: `${t.accent}66`, color: t.accent, backgroundColor: `${t.accent}14` }}>
                <FiShield size={11} /> {division} Enquiry
              </div>
              <h2 id="soft-gate-title" className="text-2xl font-bold tracking-tight mb-2" style={{ color: t.text }}>
                {step === 'phone' ? 'Get Current Price & Availability' : step === 'success' ? 'Enquiry Submitted!' : 'Add Details (Optional)'}
              </h2>
              <p className="text-xs leading-relaxed max-w-[34ch] mx-auto" style={{ color: t.muted }}>
                {step === 'phone' 
                  ? 'Enter your WhatsApp/mobile number to receive commercial pricing'
                  : step === 'success'
                  ? 'Your enquiry has been recorded. Our team will contact you within 24 hours.'
                  : 'Help us serve you better by adding a few more details'}
              </p>
            </div>

            <div className="px-7 pb-8 pt-5">
              {step === 'phone' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {requirementSummary}
                  
                  <div className="relative">
                    <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" size={14} style={{ color: t.muted }} />
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      placeholder="WhatsApp / Mobile Number *"
                      value={phone}
                      onChange={handlePhoneChange}
                      disabled={submitting}
                      className="w-full h-[50px] rounded-lg border outline-none text-base transition-colors placeholder:text-sm"
                      style={{
                        backgroundColor: t.bg,
                        borderColor: error ? '#ef4444' : t.border,
                        color: t.text,
                        paddingLeft: '2.5rem',
                        paddingRight: '1rem'
                      }}
                      autoComplete="tel"
                      aria-describedby={error ? 'phone-error' : undefined}
                    />
                  </div>

                  {error && (
                    <motion.p id="phone-error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-sm" style={{ color: '#ef4444' }}>
                      {error}
                    </motion.p>
                  )}

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-primary text-primary focus:ring-primary focus:ring-2"
                      style={{ accentColor: t.accent }}
                    />
                    <span className="text-xs leading-relaxed" style={{ color: t.muted }}>
                      I agree to be contacted by India Trade Overseas regarding this commercial enquiry and acknowledge the{' '}
                      <a href="/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-primary" style={{ color: t.accent }}>
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={submitting || !consent}
                    className="w-full h-[50px] mt-2 flex items-center justify-center gap-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-60 cursor-pointer"
                    style={{ backgroundColor: t.accent, color: t.accentText || t.panelBg }}
                  >
                    {submitting ? (
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Get Current Price</span>
                        <FiArrowRight size={14} />
                      </>
                    )}
                  </button>

                  <p className="text-center text-[10px] pt-1" style={{ color: t.muted }}>
                    No OTP required • We respect your privacy • Unsubscribe anytime
                  </p>
                </form>
              )}

              {step === 'success' && (
                <div className="space-y-5 text-center">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center border" style={{ borderColor: `${t.accent}66`, color: t.accent, backgroundColor: `${t.accent}14` }}>
                      <FiCheckCircle size={24} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold" style={{ color: t.text }}>Enquiry Submitted</h4>
                    <p className="text-sm" style={{ color: t.muted }}>Lead ID: <span className="font-mono">{leadId}</span></p>
                    <p className="text-sm" style={{ color: t.muted }}>We\'ll contact you on <span className="font-mono">{phone}</span> within 24 hours</p>
                  </div>
                  
                  <button
                    onClick={handleContinueToProgressive}
                    className="w-full h-[50px] flex items-center justify-center gap-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                    style={{ backgroundColor: t.accent, color: t.accentText || t.panelBg }}
                  >
                    <span>Add More Details (Optional)</span>
                    <FiArrowRight size={14} />
                  </button>

                  <button
                    onClick={() => onSuccess?.(leadId, requirement)}
                    className="w-full h-[50px] flex items-center justify-center gap-2 rounded-lg border font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                    style={{ borderColor: t.border, color: t.text }}
                  >
                    <span>Continue to Product Page</span>
                  </button>
                </div>
              )}

              {step === 'progressive' && (
                <ProgressiveDetailsForm
                  leadId={leadId}
                  division={division}
                  theme={t}
                  onSubmit={handleProgressiveSubmit}
                  onSkip={() => onSuccess?.(leadId, requirement)}
                />
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ProgressiveDetailsForm({ leadId, division, theme, onSubmit, onSkip }) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    gst: '',
    detailedSpec: '',
    paymentTerms: '',
    billingAddress: '',
    shippingAddress: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const t = theme;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border-t pt-4" style={{ borderColor: t.border }}>
        <h4 className="text-sm font-medium mb-4" style={{ color: t.text }}>Additional Details (Optional)</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <input
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            className="col-span-2 px-4 py-3 rounded-lg border outline-none text-sm transition-colors placeholder:text-sm"
            style={{ backgroundColor: t.bg, borderColor: t.border, color: t.text }}
          />
          <input
            name="company"
            placeholder="Company Name"
            value={formData.company}
            onChange={handleChange}
            className="px-4 py-3 rounded-lg border outline-none text-sm transition-colors placeholder:text-sm"
            style={{ backgroundColor: t.bg, borderColor: t.border, color: t.text }}
          />
          <input
            name="email"
            type="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            className="px-4 py-3 rounded-lg border outline-none text-sm transition-colors placeholder:text-sm"
            style={{ backgroundColor: t.bg, borderColor: t.border, color: t.text }}
          />
          <input
            name="gst"
            placeholder="GST Number (Optional)"
            value={formData.gst}
            onChange={handleChange}
            className="px-4 py-3 rounded-lg border outline-none text-sm transition-colors placeholder:text-sm"
            style={{ backgroundColor: t.bg, borderColor: t.border, color: t.text }}
          />
        </div>

        <textarea
          name="detailedSpec"
          placeholder="Detailed specifications, quality requirements, etc."
          value={formData.detailedSpec}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-3 rounded-lg border outline-none text-sm transition-colors placeholder:text-sm resize-none"
          style={{ backgroundColor: t.bg, borderColor: t.border, color: t.text }}
        />

        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={onSkip}
            className="px-6 py-3 rounded-lg border font-medium text-sm transition-colors"
            style={{ borderColor: t.border, color: t.text }}
          >
            Skip & Continue
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-60 cursor-pointer flex items-center gap-2"
            style={{ backgroundColor: t.accent, color: t.accentText || t.panelBg }}
          >
            {submitting ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </div>
    </form>
  );
}