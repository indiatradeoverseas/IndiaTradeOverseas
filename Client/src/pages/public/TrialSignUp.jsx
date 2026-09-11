import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiPhone, FiEye, FiEyeOff, FiArrowRight, FiZap, FiCheckCircle, FiClock, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { salesTrialApi } from '../../api/salesTrialApi';
import { useAuth } from '../../hooks/useAuth';

const TrialSignUp = () => {
  const navigate = useNavigate();
  const { trialSignup } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trialIdPreview, setTrialIdPreview] = useState('TRL001');
  const [step, setStep] = useState('FORM'); // 'FORM' | 'OTP_VERIFICATION' | 'VERIFIED_PENDING_APPROVAL'
  const [createdUser, setCreatedUser] = useState(null);
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [otpPreviewCode, setOtpPreviewCode] = useState('');
  const [resendingOtp, setResendingOtp] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: ''
  });

  useEffect(() => {
    fetchNextId();
  }, []);

  const fetchNextId = async () => {
    try {
      const res = await salesTrialApi.getNextTrialId();
      if (res && res.success && res.data?.nextTrialId) {
        setTrialIdPreview(res.data.nextTrialId);
      }
    } catch (err) {
      console.error('Failed to fetch next Trial ID preview:', err);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password) {
      toast.error('Please fill in all mandatory fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await salesTrialApi.signupTrialUser({
        ...formData,
        trialId: trialIdPreview
      });

      if (response && response.success) {
        if (response.data?.otpPreview) {
          setOtpPreviewCode(response.data.otpPreview);
        }
        setStep('OTP_VERIFICATION');
        toast.success('OTP sent to your email address! Please enter 6-digit code. 📩', {
          style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #3B82F6' }
        });
      }
    } catch (error) {
      console.error('Trial signup error:', error);
      const errorMsg = error.response?.data?.message || 'Registration failed. Please check your details and try again.';
      toast.error(errorMsg, {
        style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #ef4444' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCodeInput.trim() || otpCodeInput.trim().length < 4) {
      toast.error('Please enter the valid 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const response = await salesTrialApi.verifyTrialOtp({
        email: formData.email,
        otp: otpCodeInput.trim()
      });

      if (response && response.success) {
        const userObj = response.data?.trialUser || { trialId: trialIdPreview, fullName: formData.fullName, email: formData.email };
        setCreatedUser(userObj);
        setStep('VERIFIED_PENDING_APPROVAL');
        toast.success('OTP Verified! Your profile has been sent to HR Manager for approval. 🎉', {
          style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #10B981' }
        });
      }
    } catch (error) {
      console.error('OTP Verification Error:', error);
      const errorMsg = error.response?.data?.message || 'Invalid OTP code. Please try again.';
      toast.error(errorMsg, {
        style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #ef4444' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendingOtp(true);
    try {
      const res = await salesTrialApi.resendTrialOtp({ email: formData.email });
      if (res && res.success) {
        if (res.data?.otpPreview) {
          setOtpPreviewCode(res.data.otpPreview);
        }
        toast.success('A new 6-digit OTP has been sent to your email address! 📧');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResendingOtp(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#040A12] font-sans antialiased text-[#C5CBD3] relative overflow-hidden">
      
      {/* MOBILE BACKGROUND OVERLAY */}
      <div className="absolute inset-0 lg:hidden z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#040A12]/85 z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/90 via-transparent to-[#040A12] z-10" />
        <img 
          src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1000&q=70" 
          alt="Cinematic background"
          className="w-full h-full object-cover filter brightness-[1] contrast-[1.12] saturate-[0.60]"
        />
      </div>

      {/* LEFT COLUMN: Registration Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-between p-8 md:p-12 min-h-screen relative z-10 bg-transparent lg:bg-[#040A12] border-r border-[#C5CBD3]/10">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-20">
          <div className="h-9 w-9 bg-[#0E1116] border border-[#3B82F6]/40 flex items-center justify-center rounded-sm shadow-md">
            <FiZap className="h-4 w-4 text-[#3B82F6]" />
          </div>
          <div>
            <h1 className="text-sm font-serif font-medium text-[#F2F4F7] tracking-wider uppercase">
              India Trade Overseas
            </h1>
            <p className="text-[9px] text-[#3B82F6] tracking-widest uppercase font-semibold">Sales Trial Terminal</p>
          </div>
        </div>

        {/* Central Container */}
        <div className="max-w-sm w-full mx-auto my-auto py-8 relative z-20">
          
          {step === 'VERIFIED_PENDING_APPROVAL' ? (
            /* SUCCESS / PENDING HR APPROVAL CARD */
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-[#0E1116] border border-emerald-500/50 rounded-sm p-6 space-y-5 shadow-2xl text-left font-sans"
            >
              <div className="flex items-center gap-3 border-b border-[#C5CBD3]/10 pb-4">
                <div className="h-10 w-10 rounded bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center text-emerald-400">
                  <FiCheckCircle size={22} />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-widest block">OTP VERIFIED & SUBMITTED</span>
                  <h3 className="text-base font-serif font-semibold text-[#F2F4F7]">Awaiting HR Approval</h3>
                </div>
              </div>

              <div className="space-y-2 text-xs text-[#A0AEC0] font-light leading-relaxed">
                <p>
                  Congratulations, <strong className="text-[#F2F4F7] font-semibold">{createdUser?.fullName || formData.fullName}</strong>! Your email address has been verified successfully.
                </p>

                <div className="p-3 bg-[#040A12] border border-[#C5CBD3]/15 rounded text-[11px] font-mono space-y-1.5 my-3">
                  <div className="flex justify-between">
                    <span className="text-[#6D7886]">Assigned ID:</span>
                    <span className="text-amber-400 font-bold">{createdUser?.trialId || trialIdPreview}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6D7886]">Verified Email:</span>
                    <span className="text-emerald-400 font-semibold">{createdUser?.email || formData.email}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#C5CBD3]/10">
                    <span className="text-[#6D7886]">Profile Status:</span>
                    <span className="text-amber-300 font-bold uppercase">PENDING_APPROVAL (HR)</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded text-[10px] text-amber-200/90 leading-relaxed font-sans">
                  🛡️ <strong>HR Manager Action Required:</strong> Your profile is now visible in the HR Manager Dashboard under <strong>Pending Registrations</strong>. You will be able to log in as soon as HR approves your account.
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/trial-login"
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold tracking-widest py-3 rounded-sm transition-all shadow-lg shadow-blue-900/30 uppercase cursor-pointer flex items-center justify-center gap-2 font-mono"
                >
                  Proceed to Trial Login &rarr;
                </Link>
              </div>
            </motion.div>
          ) : step === 'OTP_VERIFICATION' ? (
            /* OTP VERIFICATION STEP */
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-[#0E1116] border border-[#3B82F6]/40 rounded-sm p-6 space-y-5 shadow-2xl text-left font-sans"
            >
              <div className="flex items-center justify-between border-b border-[#C5CBD3]/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#60A5FA]">
                    <FiShield size={20} />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-[#60A5FA] font-bold uppercase tracking-widest block">STEP 2 OF 2</span>
                    <h3 className="text-base font-serif font-semibold text-[#F2F4F7]">Verify Email OTP</h3>
                  </div>
                </div>
                <button
                  onClick={() => setStep('FORM')}
                  className="text-[10px] font-mono text-[#6D7886] hover:text-[#F2F4F7] underline cursor-pointer"
                >
                  Edit Email
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-[#A0AEC0] font-light leading-relaxed">
                  We have sent a 6-digit OTP code to <strong className="text-[#F2F4F7] font-mono">{formData.email}</strong>. Please enter the OTP to verify your account.
                </p>

                <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-wider font-mono text-[#6D7886] font-bold">
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCodeInput}
                      onChange={(e) => setOtpCodeInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 123456"
                      className="block w-full text-center py-3 text-lg tracking-[0.4em] font-mono border border-[#3B82F6]/50 rounded-sm bg-[#040A12] text-amber-400 placeholder-[#6D7886]/40 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/50 transition-all font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold tracking-widest py-3 rounded-sm transition-all shadow-lg shadow-blue-900/30 uppercase cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 font-mono"
                  >
                    {loading ? 'Verifying OTP Code...' : 'Verify OTP & Send to HR'}
                    {!loading && <FiArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </form>

                <div className="flex items-center justify-between pt-2 border-t border-[#C5CBD3]/10 text-[11px]">
                  <span className="text-[#6D7886]">Didn't receive code?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendingOtp}
                    className="text-[#60A5FA] hover:text-white font-mono font-medium underline disabled:opacity-50 cursor-pointer"
                  >
                    {resendingOtp ? 'Resending...' : 'Resend OTP Email'}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* SIGNUP FORM */
            <>
              {/* Header Texts */}
              <motion.div 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-2 mb-6"
              >
                <div className="flex justify-between items-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[10px] font-semibold text-[#60A5FA] uppercase tracking-wider">
                    <FiZap className="h-3 w-3" />
                    Trial Self-Registration
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
                    ID: {trialIdPreview}
                  </span>
                </div>
                
                <h2 className="text-3xl font-serif text-[#F2F4F7] font-light tracking-tight">
                  Trial Sign Up
                </h2>
                <p className="text-xs text-[#A0AEC0] font-light leading-relaxed">
                  Apply for a Sales Trial Executive position. OTP verification required before HR Manager approval.
                </p>
              </motion.div>

              <form onSubmit={handleFormSubmit} className="space-y-3.5">
                <motion.div 
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="space-y-3"
                >
                  {/* Full Name */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                      <FiUser className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#3B82F6] transition-colors" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Full Name (e.g. Rahul Sharma)"
                      className="block w-full pl-10 pr-4 py-2.5 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/90 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#3B82F6]/60 focus:ring-1 focus:ring-[#3B82F6]/30 transition-all font-sans"
                    />
                  </div>

                  {/* Email */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                      <FiMail className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#3B82F6] transition-colors" />
                    </div>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Email Address"
                      className="block w-full pl-10 pr-4 py-2.5 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/90 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#3B82F6]/60 focus:ring-1 focus:ring-[#3B82F6]/30 transition-all font-mono"
                    />
                  </div>

                  {/* Phone */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                      <FiPhone className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#3B82F6] transition-colors" />
                    </div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Phone Number (10 digits)"
                      className="block w-full pl-10 pr-4 py-2.5 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/90 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#3B82F6]/60 focus:ring-1 focus:ring-[#3B82F6]/30 transition-all font-mono"
                    />
                  </div>

                  {/* Password */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                      <FiLock className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#3B82F6] transition-colors" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Password"
                      className="block w-full pl-10 pr-10 py-2.5 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/90 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#3B82F6]/60 focus:ring-1 focus:ring-[#3B82F6]/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6D7886] hover:text-[#F2F4F7] transition-colors"
                    >
                      {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="pt-1"
                >
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold tracking-widest py-3 rounded-sm transition-all shadow-lg shadow-blue-900/30 uppercase cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 font-mono"
                  >
                    {loading ? 'Sending OTP Code...' : `Register & Send Verification OTP`}
                    {!loading && <FiArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </motion.div>
              </form>

              {/* Navigation Links Footer */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-left text-xs text-[#6D7886] space-y-2 border-t border-[#C5CBD3]/10 mt-6 pt-5"
              >
                <p className="font-light">
                  Already registered for Sales Trial?{' '}
                  <Link to="/trial-login" className="font-medium text-[#60A5FA] hover:text-white hover:underline font-mono">
                    Login to Sales Trial Desk &rarr;
                  </Link>
                </p>
                <p className="font-light">
                  Need full employee access?{' '}
                  <Link to="/employee-login" className="font-medium text-[#C5CBD3] hover:text-[#F2F4F7] hover:underline">
                    Employee login
                  </Link>
                </p>
              </motion.div>
            </>
          )}
        </div>

        {/* Global Footer Notice */}
        <div className="text-[10px] text-[#6D7886]/60 leading-relaxed font-light relative z-20">
          &copy; 2026 India Trade Overseas. All rights reserved. Sales Trial Evaluation System.
        </div>
      </div>

      {/* RIGHT COLUMN: Visual Showcase */}
      <div className="hidden lg:block lg:w-[55%] relative h-screen bg-[#040A12]">
        <div className="absolute inset-0 bg-gradient-to-r from-[#040A12] via-[#040A12]/30 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#040A12]/90 z-10 pointer-events-none" />
        
        <img 
          src="./images/ito_images/ito_10.jpeg" 
          alt="Sales Trial Operations background"
          className="w-full h-full object-cover filter brightness-[1.1] contrast-[1.15] saturate-[0.65] pointer-events-none select-none"
        />

        {/* Info Card Overlay */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="absolute bottom-12 right-12 bg-[#0E1116]/85 backdrop-blur-md border border-[#3B82F6]/30 p-6 rounded-sm max-w-sm z-20 shadow-2xl text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-[10px] tracking-widest text-[#60A5FA] font-semibold uppercase font-mono">
              Sales Trial Executive Evaluation
            </p>
          </div>
          <h3 className="text-lg font-serif text-[#F2F4F7] font-medium leading-snug mb-2">
            "Self-Register to Begin Evaluation."
          </h3>
          <p className="text-xs text-[#94A3B8] font-light leading-relaxed">
            Your application will be routed to HR Managers and Sales Managers. Upon approval, your credentials become active to receive live leads.
          </p>
        </motion.div>
      </div>

    </div>
  );
};

export default TrialSignUp;
