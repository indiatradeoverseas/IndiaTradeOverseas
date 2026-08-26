import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield, FiUser, FiBriefcase, FiX, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { pushDataLayerEvent } from '../../utils/analytics';
import { employeeSignupApi } from '../../api/employee-signup';

const DEPARTMENTS = [
  { value: 'SALES', label: 'Sales' },
  { value: 'HR', label: 'Human Resources' },
  { value: 'IT', label: 'Information Technology' },
  { value: 'ADMIN', label: 'Administration' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'MARKETING', label: 'Marketing' }
];

const POSITIONS_BY_DEPT = {
  SALES: ['Sales Executive', 'Sales Manager', 'Business Development Executive', 'Account Manager'],
  HR: ['HR Executive', 'HR Manager', 'Recruiter', 'HR Business Partner'],
  IT: ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer', 'QA Engineer', 'IT Support'],
  ADMIN: ['Admin Executive', 'Office Manager', 'Executive Assistant', 'Administrative Assistant'],
  FINANCE: ['Accountant', 'Finance Analyst', 'Finance Manager', 'Accounts Payable/Receivable'],
  OPERATIONS: ['Operations Executive', 'Operations Manager', 'Logistics Coordinator', 'Supply Chain Analyst'],
  MARKETING: ['Marketing Executive', 'Marketing Manager', 'Content Writer', 'SEO Specialist', 'Social Media Manager']
};

const EmployeeLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  
  // Signup modal state
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupStep, setSignupStep] = useState('form'); // 'form' | 'otp'
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupFormData, setSignupFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: 'IT',
    position: 'Frontend Developer',
    phone: ''
  });
  const [signupErrors, setSignupErrors] = useState({});
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpSentTo, setOtpSentTo] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pendingSignupData, setPendingSignupData] = useState(null);

  const { employeeLogin } = useAuth();
  const navigate = useNavigate();

  // ... rest of the code

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await employeeLogin(formData);
      if (response.success) {
        if (response.data?.requiresDeviceApproval) {
          toast.success('Credentials verified! Device approval is pending.', {
            icon: '🕒',
            style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #C5CBD3' }
          });
          navigate('/device-pending');
        } else {
          toast.success('Welcome back, employee!', {
            icon: '👋',
            style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #C5CBD3' }
          });
          pushDataLayerEvent('login', { method: 'employee' });
          const role = response.data?.employee?.role;
          if (role === 'HR_MANAGER') {
            navigate('/crm/hr/manager');
          } else if (role === 'HR_EXECUTIVE' || role === 'HR') {
            navigate('/crm/hr/executive');
          } else {
            navigate('/crm/dashboard');
          }
        }
      }
    } catch (error) {
      if (error.response?.data?.errorCode === 'EMAIL_NOT_VERIFIED') {
        localStorage.setItem('verificationEmail', formData.email);
        toast.error('Email not verified. Redirecting to verification page.', {
          style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #ef4444' }
        });
        navigate('/verify-email');
        return;
      }
      const errorMsg = error.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMsg, { 
        style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #ef4444' } 
      });
    } finally {
      setLoading && setLoading(false);
    }
  };

  // Signup form handlers
  const validateSignupField = (name, value) => {
    let error = '';
    if (name === 'name' && !value.trim()) error = 'Full name is required';
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) error = 'Invalid email format';
      // Check domain
      if (value && !value.endsWith('@indiatradeoverseas.com')) {
        error = 'Email must be @indiatradeoverseas.com domain';
      }
    }
    if (name === 'password') {
      if (value && value.length < 8) error = 'Password must be at least 8 characters';
      if (value && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(value)) {
        error = 'Password must contain uppercase, lowercase, number, and special character';
      }
    }
    if (name === 'phone' && value) {
      const phoneRegex = /^[6-9]\d{9}$/;
      const cleanPhone = value.replace(/[^0-9]/g, '').slice(-10);
      if (!phoneRegex.test(cleanPhone)) error = 'Phone must be 10 digits starting with 6-9';
    }
    setSignupErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'department') {
      // Reset position when department changes
      setSignupFormData(prev => ({ 
        ...prev, 
        [name]: value,
        position: POSITIONS_BY_DEPT[value]?.[0] || ''
      }));
    }
    validateSignupField(name, value);
  };

  const handleSignupBlur = (e) => {
    const { name, value } = e.target;
    validateSignupField(name, value);
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    let isValid = true;
    Object.keys(signupFormData).forEach(key => {
      if (!validateSignupField(key, signupFormData[key])) {
        isValid = false;
      }
    });
    
    if (!isValid) {
      toast.error('Please fix the errors above');
      return;
    }

    setSignupLoading(true);
    try {
      // Step 1: Send OTP to email
      const response = await employeeSignupApi.sendSignupOtp(signupFormData);
      if (response.success) {
        // Store the form data for later use after OTP verification
        setPendingSignupData(signupFormData);
        setOtpSentTo(signupFormData.email);
        setSignupStep('otp');
        setOtpCode(['', '', '', '', '', '']);
        setOtpError('');
        startResendCooldown();
        toast.success('OTP sent to your email. Please verify.', {
          icon: '📧',
          style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #C89A54' }
        });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to send OTP. Please try again.';
      toast.error(errorMsg, { 
        style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #ef4444' } 
      });
    } finally {
      setSignupLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !pendingSignupData) return;
    setSignupLoading(true);
    try {
      const response = await employeeSignupApi.sendSignupOtp(pendingSignupData);
      if (response.success) {
        setOtpCode(['', '', '', '', '', '']);
        setOtpError('');
        startResendCooldown();
        toast.success('OTP resent successfully');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value[0];
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    setOtpError('');
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
    // Auto-submit when all 6 digits filled
    if (newOtp.every(d => d !== '')) {
      handleOtpVerify();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setOtpCode(digits);
      setOtpError('');
      // Trigger verification after a brief moment
      setTimeout(() => handleOtpVerify(), 100);
    }
  };

  const handleOtpVerify = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      setOtpError('Please enter the 6-digit code');
      return;
    }
    if (!pendingSignupData) {
      setOtpError('Session expired. Please try again.');
      return;
    }

    setSignupLoading(true);
    setOtpError('');
    try {
      // Step 2: Verify OTP and create employee with ACTIVE status
      const response = await employeeSignupApi.verifySignupOtp({
        ...pendingSignupData,
        otp: code
      });
      if (response.success) {
        // Store token and user data for auto-login
        if (response.data?.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.employee));
          localStorage.setItem('isEmployeeAuth', 'true');
        }
        
        toast.success('Registration successful! Welcome to India Trade Overseas.', {
          icon: '✅',
          style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #56A587' },
          duration: 3000
        });
        
        setShowSignupModal(false);
        setSignupStep('form');
        // Reset form
        setSignupFormData({
          name: '',
          email: '',
          password: '',
          department: 'IT',
          position: 'Frontend Developer',
          phone: ''
        });
        setSignupErrors({});
        setPendingSignupData(null);
        setOtpCode(['', '', '', '', '', '']);
        setOtpSentTo('');

        // Redirect based on role
        const role = response.data?.employee?.role;
        if (role === 'HR_MANAGER') {
          navigate('/crm/hr/manager');
        } else if (role === 'HR_EXECUTIVE' || role === 'HR') {
          navigate('/crm/hr/executive');
        } else {
          navigate('/crm/dashboard');
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Invalid or expired OTP';
      setOtpError(errorMsg);
    } finally {
      setSignupLoading(false);
    }
  };

  const openSignupModal = () => {
    setShowSignupModal(true);
    setSignupStep('form');
    setPendingSignupData(null);
    setOtpCode(['', '', '', '', '', '']);
    setOtpError('');
    setOtpSentTo('');
    setResendCooldown(0);
    document.body.style.overflow = 'hidden';
  };

  const closeSignupModal = () => {
    setShowSignupModal(false);
    setSignupStep('form');
    setPendingSignupData(null);
    setOtpCode(['', '', '', '', '', '']);
    setOtpError('');
    setOtpSentTo('');
    setResendCooldown(0);
    document.body.style.overflow = 'unset';
  };

  return (
    <div className="min-h-screen flex bg-[#040A12] font-sans antialiased text-[#C5CBD3] relative overflow-hidden">
      
      {/* MOBILE ONLY BACKGROUND IMAGE & CINEMATIC OVERLAY */}
      <div className="absolute inset-0 lg:hidden z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#040A12]/20 z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/80 via-transparent to-[#040A12] z-10" />
        <img 
          src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1000&q=70" 
          alt="Cinematic port background"
          className="w-full h-full object-cover filter brightness-[1] contrast-[1.12] saturate-[0.60]"
        />
      </div>

      {/* LEFT COLUMN: Employee Terminal Authentication */}
      <div className="w-full lg:w-[45%] flex flex-col justify-between p-8 md:p-12 min-h-screen relative z-10 bg-transparent lg:bg-[#040A12] border-r border-[#C5CBD3]/10">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-20">
          <div className="h-9 w-9 bg-[#0E1116] border border-[#C5CBD3]/30 flex items-center justify-center rounded-sm">
            <FiShield className="h-4 w-4 text-[#C5CBD3]" />
          </div>
          <div>
            <h1 className="text-sm font-serif font-medium text-[#F2F4F7] tracking-wider uppercase">
              India Trade Overseas
            </h1>
            <p className="text-[9px] text-[#6D7886] tracking-widest uppercase">Infrastructure</p>
          </div>
        </div>

        {/* Central Form Container */}
        <div className="max-w-sm w-full mx-auto my-auto py-12 relative z-20">
          
          {/* Header Texts with Entrance Motion */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "linear", duration: 0.5, delay: 0.1 }}
            className="space-y-2 mb-8"
          >
            <h2 className="text-3xl font-serif text-[#F2F4F7] font-light tracking-tight">
              Employee Terminal
            </h2>
            <p className="text-xs text-[#f5f5f5] font-light leading-relaxed">
              Authorized personnel only. Access internal management loops, trade networks, and logistics logs.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "linear", duration: 0.5, delay: 0.2 }}
              className="space-y-3.5"
            >
              {/* Minimalist Corporate Input Field */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                  <FiMail className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#F2F4F7] transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enterprise Email Address"
                  className="block w-full pl-10 pr-4 py-3 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                />
              </div>

              {/* Minimalist Password Input Field */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                  <FiLock className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#F2F4F7] transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Account Password"
                  className="block w-full pl-10 pr-10 py-3 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6D7886] hover:text-[#F2F4F7] transition-colors"
                >
                  {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex justify-end pt-1">
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-[#6D7886] hover:text-[#F2F4F7] hover:underline font-light transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
            </motion.div>

            {/* Submission Button */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "linear", duration: 0.5, delay: 0.35 }}
            >
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#F2F4F7] hover:bg-[#C5CBD3] text-[#0E1116] text-xs font-semibold tracking-widest py-3.5 rounded-sm transition-all shadow-md uppercase cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? 'Establishing Link...' : 'Sign In'}
                {!loading && <FiArrowRight className="h-3.5 w-3.5" />}
              </button>
            </motion.div>
          </form>

          {/* Navigation Links Footer */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-left text-xs text-[#6D7886] space-y-2 border-t border-[#C5CBD3]/10 mt-8 pt-6"
          >
            <p className="font-light">
              Need a client account?{' '}
              <Link to="/login" className="font-medium text-[#C5CBD3] hover:text-[#F2F4F7] hover:underline">
                Client login
              </Link>
              {' / '}
              <Link to="/client-signup" className="font-medium text-[#C5CBD3] hover:text-[#F2F4F7] hover:underline inline-flex items-center gap-0.5 group">
                Client signup
                <FiArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </p>
            <p className="font-light">
              Administrator?{' '}
              <Link to="/admin-login" className="font-medium text-[#C5CBD3] hover:text-[#F2F4F7] hover:underline">
                Admin login
              </Link>
            </p>
            <p className="font-light">
              Don't have an account?{' '}
              <button 
                onClick={openSignupModal}
                className="font-medium text-#C89A54 hover:underline inline-flex items-center gap-0.5 group"
              >
                Sign Up
                <FiArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </p>
          </motion.div>
        </div>

        {/* Global Protection Notice */}
        <div className="text-[10px] text-[#6D7886]/60 leading-relaxed font-light relative z-20">
          &copy; 2026 India Trade Overseas. All rights reserved. Protected Environment Terminal.
        </div>
      </div>

      {/* RIGHT COLUMN: Cinematic Port Operations Visual Asset */}
      <div className="hidden lg:block lg:w-[55%] relative h-screen bg-[#040A12]">
        
        {/* Dark Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#040A12] via-[#040A12]/20 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#040A12]/90 z-10 pointer-events-none" />
        
        {/* Background Image of Industrial Port Operations */}
        <img 
          src="./images/ito_images/ito_10.jpeg" 
          alt="Cinematic international port loading operation"
          className="w-full h-full object-cover filter brightness-[1.2] contrast-[1.18] saturate-[0.70] pointer-events-none select-none"
        />

        {/* Floating Infrastructure Stat Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ cubicBezier: [0.22, 1, 0.36, 1], duration: 1, delay: 0.4 }}
          className="absolute bottom-12 right-12 bg-[#0E1116]/80 backdrop-blur-md border border-[#C5CBD3]/20 p-6 rounded-sm max-w-sm z-20"
        >
          <p className="text-[10px] tracking-widest text-[#C5CBD3] font-semibold uppercase mb-1">
            Core Infrastructure
          </p>
          <h3 className="text-lg font-serif text-[#F2F4F7] font-medium leading-snug mb-2">
            "Industrial Scale & Operational Excellence."
          </h3>
          <p className="text-xs text-[#6D7886] font-light leading-relaxed">
            Secure administrative console linked with our global freight logistics, bulk supply terminals, and regional distribution assets[cite: 1].
          </p>
        </motion.div>
      </div>

      {/* Signup Modal */}
      <AnimatePresence>
        {showSignupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={closeSignupModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-md bg-[#0E1116] border border-[#C5CBD3]/20 rounded-sm shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#C5CBD3]/10 bg-[#040A12]/50">
                <h3 id="signup-modal-title" className="text-sm font-serif text-[#F2F4F7] font-medium tracking-tight">
                  Employee Registration Request
                </h3>
                <button
                  onClick={closeSignupModal}
                  className="p-1 text-[#6D7886] hover:text-[#F2F4F7] transition-colors"
                  aria-label="Close signup modal"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <p className="text-xs text-[#6D7886] font-light">
                  Fill in your details to request an employee account. Your request will be reviewed by HR.
                </p>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider text-[#6D7886] font-bold">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={signupFormData.name}
                    onChange={handleSignupChange}
                    onBlur={handleSignupBlur}
                    placeholder="Enter your full name"
                    className={`w-full bg-[#040A12] border px-3 py-2 text-white outline-none rounded-sm text-sm ${
                      signupErrors.name ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20 focus:border-#C89A54'
                    }`}
                  />
                  {signupErrors.name && <span className="text-[9px] text-[var(--crm-danger)] block">{signupErrors.name}</span>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider text-[#6D7886] font-bold">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={signupFormData.email}
                    onChange={handleSignupChange}
                    onBlur={handleSignupBlur}
                    placeholder="your@company.com"
                    className={`w-full bg-[#040A12] border px-3 py-2 text-white outline-none rounded-sm text-sm ${
                      signupErrors.email ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20 focus:border-#C89A54'
                    }`}
                  />
                  {signupErrors.email && <span className="text-[9px] text-[var(--crm-danger)] block">{signupErrors.email}</span>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider text-[#6D7886] font-bold">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={signupFormData.password}
                      onChange={handleSignupChange}
                      onBlur={handleSignupBlur}
                      placeholder="Min 8 chars, upper, lower, number, special"
                      className={`w-full bg-[#040A12] border px-3 py-2 text-white outline-none rounded-sm text-sm pr-10 ${
                        signupErrors.password ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20 focus:border-#C89A54'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6D7886] hover:text-[#F2F4F7]"
                    >
                      {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupErrors.password && <span className="text-[9px] text-[var(--crm-danger)] block">{signupErrors.password}</span>}
                  <p className="text-[8px] text-[#6D7886]/70">Min 8 characters with uppercase, lowercase, number & special character</p>
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider text-[#6D7886] font-bold">Department *</label>
                  <select
                    name="department"
                    required
                    value={signupFormData.department}
                    onChange={handleSignupChange}
                    className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-#C89A54 px-3 py-2 text-white outline-none rounded-sm text-sm cursor-pointer"
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept.value} value={dept.value}>{dept.label}</option>
                    ))}
                  </select>
                </div>

                {/* Position */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider text-[#6D7886] font-bold">Position / Role *</label>
                  <select
                    name="position"
                    required
                    value={signupFormData.position}
                    onChange={handleSignupChange}
                    className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-#C89A54 px-3 py-2 text-white outline-none rounded-sm text-sm cursor-pointer"
                  >
                    {POSITIONS_BY_DEPT[signupFormData.department]?.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>

                {/* Phone (Optional) */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider text-[#6D7886] font-bold">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    name="phone"
                    value={signupFormData.phone}
                    onChange={handleSignupChange}
                    onBlur={handleSignupBlur}
                    placeholder="10-digit number (e.g. 9876543210)"
                    className={`w-full bg-[#040A12] border px-3 py-2 text-white outline-none rounded-sm text-sm ${
                      signupErrors.phone ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20 focus:border-#C89A54'
                    }`}
                  />
                  {signupErrors.phone && <span className="text-[9px] text-[var(--crm-danger)] block">{signupErrors.phone}</span>}
                </div>

                {/* STEP 1: Registration Form */}
              {signupStep === 'form' && (
                <form onSubmit={handleSignupSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                  <p className="text-xs text-[#6D7886] font-light">
                    Fill in your details to request an employee account. Your request will be reviewed by HR.
                  </p>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-wider text-[#6D7886] font-bold">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={signupFormData.name}
                      onChange={handleSignupChange}
                      onBlur={handleSignupBlur}
                      placeholder="Enter your full name"
                      className={`w-full bg-[#040A12] border px-3 py-2 text-white outline-none rounded-sm text-sm ${
                        signupErrors.name ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20 focus:border-#C89A54'
                      }`}
                    />
                    {signupErrors.name && <span className="text-[9px] text-[var(--crm-danger)] block">{signupErrors.name}</span>}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-wider text-[#6D7886] font-bold">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={signupFormData.email}
                      onChange={handleSignupChange}
                      onBlur={handleSignupBlur}
                      placeholder="your@indiatradeoverseas.com"
                      className={`w-full bg-[#040A12] border px-3 py-2 text-white outline-none rounded-sm text-sm ${
                        signupErrors.email ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20 focus:border-#C89A54'
                      }`}
                    />
                    {signupErrors.email && <span className="text-[9px] text-[var(--crm-danger)] block">{signupErrors.email}</span>}
                    <p className="text-[8px] text-[#6D7886]/70">Must be @indiatradeoverseas.com domain</p>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-wider text-[#6D7886] font-bold">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        required
                        value={signupFormData.password}
                        onChange={handleSignupChange}
                        onBlur={handleSignupBlur}
                        placeholder="Min 8 chars, upper, lower, number, special"
                        className={`w-full bg-[#040A12] border px-3 py-2 text-white outline-none rounded-sm text-sm pr-10 ${
                          signupErrors.password ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20 focus:border-#C89A54'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6D7886] hover:text-[#F2F4F7]"
                      >
                        {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signupErrors.password && <span className="text-[9px] text-[var(--crm-danger)] block">{signupErrors.password}</span>}
                    <p className="text-[8px] text-[#6D7886]/70">Min 8 characters with uppercase, lowercase, number & special character</p>
                  </div>

                  {/* Department */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-wider text-[#6D7886] font-bold">Department *</label>
                    <select
                      name="department"
                      required
                      value={signupFormData.department}
                      onChange={handleSignupChange}
                      className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-#C89A54 px-3 py-2 text-white outline-none rounded-sm text-sm cursor-pointer"
                    >
                      {DEPARTMENTS.map(dept => (
                        <option key={dept.value} value={dept.value}>{dept.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Position */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-wider text-[#6D7886] font-bold">Position / Role *</label>
                    <select
                      name="position"
                      required
                      value={signupFormData.position}
                      onChange={handleSignupChange}
                      className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-#C89A54 px-3 py-2 text-white outline-none rounded-sm text-sm cursor-pointer"
                    >
                      {POSITIONS_BY_DEPT[signupFormData.department]?.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>

                  {/* Phone (Optional) */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-wider text-[#6D7886] font-bold">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      name="phone"
                      value={signupFormData.phone}
                      onChange={handleSignupChange}
                      onBlur={handleSignupBlur}
                      placeholder="10-digit number (e.g. 9876543210)"
                      className={`w-full bg-[#040A12] border px-3 py-2 text-white outline-none rounded-sm text-sm ${
                        signupErrors.phone ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20 focus:border-#C89A54'
                      }`}
                    />
                    {signupErrors.phone && <span className="text-[9px] text-[var(--crm-danger)] block">{signupErrors.phone}</span>}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={signupLoading}
                    className="w-full mt-2 bg-[#C89A54] hover:bg-[#9A7639] text-[#0E1116] text-xs font-semibold tracking-widest py-3 rounded-sm transition-all shadow-md uppercase cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {signupLoading ? 'Sending OTP...' : 'Send OTP to Email'}
                    {!signupLoading && <FiArrowRight className="h-3.5 w-3.5" />}
                  </button>

                  <p className="text-center text-[9px] text-[#6D7886]/70 font-light">
                    By submitting, you agree to our terms. HR will verify your details and activate your account.
                  </p>
                </form>
              )}

              {/* STEP 2: OTP Verification */}
              {signupStep === 'otp' && (
                <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                  <p className="text-xs text-[#6D7886] font-light text-center">
                    We've sent a 6-digit code to <span className="text-[#F2F4F7] font-medium">{otpSentTo}</span>
                  </p>

                  {otpError && (
                    <div className="p-2 rounded-sm bg-[var(--crm-danger-bg)] border border-[var(--crm-danger)] text-[9px] text-[var(--crm-danger)] text-center">
                      {otpError}
                    </div>
                  )}

                  {/* OTP Input Fields */}
                  <div className="flex justify-center gap-1.5">
                    {[0,1,2,3,4,5].map((idx) => (
                      <input
                        key={idx}
                        id={`otp-${idx}`}
                        type="text"
                        maxLength={1}
                        value={otpCode[idx]}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                        onPaste={handleOtpPaste}
                        autoComplete="one-time-code"
                        className="w-10 h-12 bg-[#040A12] border border-[#C5CBD3]/20 focus:border-#C89A54 text-white text-center text-lg font-mono outline-none rounded-sm"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  {/* Verify Button */}
                  <button
                    type="button"
                    onClick={handleOtpVerify}
                    disabled={signupLoading}
                    className="w-full mt-2 bg-[#C89A54] hover:bg-[#9A7639] text-[#0E1116] text-xs font-semibold tracking-widest py-3 rounded-sm transition-all shadow-md uppercase cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {signupLoading ? 'Verifying...' : 'Verify & Submit'}
                    {!signupLoading && <FiArrowRight className="h-3.5 w-3.5" />}
                  </button>

                  {/* Resend OTP */}
                  <div className="text-center">
                    {resendCooldown > 0 ? (
                      <p className="text-[9px] text-[#6D7886]/70">
                        Resend code in {resendCooldown}s
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={signupLoading}
                        className="text-[9px] text-#C89A54 hover:underline font-medium"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <p className="text-center text-[9px] text-[#6D7886]/70 font-light">
                    Didn't receive the code? Check your spam folder.
                  </p>
                </div>
              )}
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeLogin;