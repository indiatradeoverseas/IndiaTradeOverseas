import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { FiUser, FiMail, FiPhone, FiMapPin, FiArrowRight, FiShield, FiKey, FiCheckCircle } from 'react-icons/fi';

import { distributorApi } from '../../api/distributor';
import { pushDataLayerEvent } from '../../utils/analytics';
import GateMascot from './GateMascot';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Full-page, theme-driven entry gate shown before any page content on
 * Stone/Rice/Prakriti (requireOtp=true — collects Name/Email/Phone/City/State,
 * registers + verifies a lightweight "quick gate" Distributor via OTP, then
 * calls onVerified(distributorId, token)) and on Careers (requireOtp=false —
 * client-side only, no distributor/API involvement, calls onComplete(values)).
 *
 * The component never touches localStorage itself — the host page owns its
 * own storage keys in its onVerified/onComplete callback. It does fire one
 * generic funnel event of its own ('entry_gate_details_submitted', below)
 * since that step is identical on every page; the page-specific "verified"
 * conversion event (e.g. stone_distributor_verified) still lives in each
 * host page's onVerified/onComplete callback, same as before.
 */
export default function BuyerEntryGate({ theme, division, requireOtp, onVerified, onComplete, mascotSrc }) {
  const [step, setStep] = useState('details'); // 'details' | 'otp' | 'welcome'
  const [submitting, setSubmitting] = useState(false);
  const [distributorId, setDistributorId] = useState('');
  const [otp, setOtp] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', city: '', state: '' });
  const [pendingSession, setPendingSession] = useState(null);

  const firstName = form.fullName.trim().split(/\s+/)[0] || '';

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = () => {
    if (!form.fullName.trim() || form.fullName.trim().length < 2) return 'Please enter your full name.';
    if (!EMAIL_RE.test(form.email.trim())) return 'Please enter a valid email address.';
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 7) return 'Please enter a valid phone number.';
    if (!form.city.trim()) return 'City is required.';
    if (!form.state.trim()) return 'State is required.';
    return null;
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) return toast.error(validationError);

    if (!requireOtp) {
      pushDataLayerEvent('entry_gate_details_submitted', { division: division || 'CAREERS', otp_required: false });
      setStep('welcome');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', form.fullName);
      data.append('email', form.email);
      data.append('mobile', form.phone);
      data.append('city', form.city);
      data.append('state', form.state);
      data.append('division', division);
      data.append('registrationSource', 'QUICK_GATE');

      const res = await distributorApi.registerDistributor(data);
      if (res.success) {
        setDistributorId(res.data.distributorId);
        toast.success('Verification code sent to your email.');
        pushDataLayerEvent('entry_gate_details_submitted', { division, otp_required: true });
        setStep('otp');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return toast.error('Enter the 6-digit code sent to your email.');

    setSubmitting(true);
    try {
      const res = await distributorApi.verifyOtp(distributorId, otp);
      if (res.success) {
        const activeToken = res.token || res.data?.token || res.data?.accessToken;
        const activeId = res.data?.distributorId || res.data?._id || distributorId;
        setPendingSession({ id: activeId, token: activeToken });
        pushDataLayerEvent('entry_gate_otp_verified', { division });
        setStep('welcome');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', form.fullName);
      data.append('email', form.email);
      data.append('mobile', form.phone);
      data.append('city', form.city);
      data.append('state', form.state);
      data.append('division', division);
      data.append('registrationSource', 'QUICK_GATE');
      const res = await distributorApi.registerDistributor(data);
      if (res.success) {
        setDistributorId(res.data.distributorId);
        toast.success('A new code has been sent.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend the code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (requireOtp) {
      onVerified?.(pendingSession?.id, pendingSession?.token);
    } else {
      onComplete?.({ ...form });
    }
  };

  const t = theme;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto py-10 px-4 ${t.fontClass || 'font-sans'}`}
      style={{ backgroundColor: t.bg }}
    >
      {/* Ambient background accent */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.15]"
        style={{ background: `radial-gradient(circle at 20% 20%, ${t.accent}, transparent 45%), radial-gradient(circle at 80% 80%, ${t.accent}, transparent 40%)` }}
      />

      <div className={`relative z-10 w-full flex items-end justify-center ${mascotSrc ? 'max-w-3xl gap-0.5 sm:gap-1' : 'max-w-md'}`}>
        {mascotSrc && <GateMascot src={mascotSrc} alt="" />}
        <div className="w-full max-w-md shrink-0">
        <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full rounded-xl border shadow-2xl overflow-hidden"
          style={{ backgroundColor: t.panelBg, borderColor: t.border }}
        >
          <div className="px-7 pt-8 pb-2 text-center">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-widest mb-5"
              style={{ borderColor: `${t.accent}66`, color: t.accent, backgroundColor: `${t.accent}14` }}
            >
              <FiShield size={11} /> {t.eyebrow}
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: t.text }}>
              {step === 'details' ? t.headline : step === 'otp' ? 'Check Your Email' : `Welcome, ${firstName || 'there'}!`}
            </h2>
            <p className="text-xs leading-relaxed max-w-[34ch] mx-auto" style={{ color: t.muted }}>
              {step === 'details'
                ? t.subhead
                : step === 'otp'
                ? `We sent a 6-digit code to ${form.email}. Enter it below to continue.`
                : `You're verified and ready to explore ${t.eyebrow}.`}
            </p>
          </div>

          <div className="px-7 pb-8 pt-5">
            {step === 'details' ? (
              <form onSubmit={handleDetailsSubmit} className="space-y-3.5 text-xs">
                <Field icon={FiUser} placeholder="Full Name" value={form.fullName} onChange={set('fullName')} theme={t} />
                <Field icon={FiMail} placeholder="Email Address" type="email" value={form.email} onChange={set('email')} theme={t} />
                <Field icon={FiPhone} placeholder="Phone Number" type="tel" value={form.phone} onChange={set('phone')} theme={t} />
                <div className="grid grid-cols-2 gap-3">
                  <Field icon={FiMapPin} placeholder="City" value={form.city} onChange={set('city')} theme={t} />
                  <Field placeholder="State" value={form.state} onChange={set('state')} theme={t} />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-[50px] mt-2 flex items-center justify-center gap-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-60 cursor-pointer"
                  style={{ backgroundColor: t.accent, color: t.accentText || t.panelBg }}
                >
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{requireOtp ? 'Continue' : 'Enter'}</span>
                      <FiArrowRight size={14} />
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] pt-1" style={{ color: t.muted }}>
                  Takes less than 30 seconds. {requireOtp ? 'We just need to confirm your email.' : ''}
                </p>
              </form>
            ) : step === 'otp' ? (
              <form onSubmit={handleOtpSubmit} className="space-y-4 text-xs">
                <div className="flex justify-center">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center border"
                    style={{ borderColor: `${t.accent}66`, color: t.accent, backgroundColor: `${t.accent}14` }}
                  >
                    <FiKey size={16} />
                  </div>
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="0 0 0 0 0 0"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-lg font-mono tracking-[0.4em] rounded-lg py-3 border outline-none"
                  style={{ backgroundColor: t.bg, borderColor: t.border, color: t.text }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-[50px] flex items-center justify-center gap-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-60 cursor-pointer"
                  style={{ backgroundColor: t.accent, color: t.accentText || t.panelBg }}
                >
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Verify & Continue'
                  )}
                </button>
                <div className="flex items-center justify-between text-[10px] pt-1" style={{ color: t.muted }}>
                  <button type="button" onClick={() => setStep('details')} className="underline underline-offset-2 cursor-pointer">
                    Edit details
                  </button>
                  <button type="button" onClick={handleResend} disabled={submitting} className="underline underline-offset-2 cursor-pointer disabled:opacity-50">
                    Resend code
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5 text-center">
                <div className="flex justify-center">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center border"
                    style={{ borderColor: `${t.accent}66`, color: t.accent, backgroundColor: `${t.accent}14` }}
                  >
                    <FiCheckCircle size={24} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full h-[50px] flex items-center justify-center gap-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                  style={{ backgroundColor: t.accent, color: t.accentText || t.panelBg }}
                >
                  <span>Continue</span>
                  <FiArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </motion.div>
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, theme, ...inputProps }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: theme.muted }}
        />
      )}
      <input
        required
        {...inputProps}
        className="w-full h-[50px] rounded-lg border outline-none text-base transition-colors placeholder:text-sm"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          color: theme.text,
          paddingLeft: Icon ? '2.5rem' : '1rem',
          paddingRight: '1rem'
        }}
      />
    </div>
  );
}
