import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiUserPlus, FiArrowRight, FiBriefcase, FiPercent, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ClientSignup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    companyName: '',
    gstin: '',
    businessType: '',
    address: '',
  });

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const mockEmployeeId = `CL_${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 10)}`;
      const payload = {
        ...formData,
        employeeId: mockEmployeeId
      };
      const response = await register(payload);
      if (response.success) {
        toast.success('Client account created successfully! Verification OTP sent to your email. 🎉', {
          style: {
            borderRadius: '4px',
            background: '#0E1116',
            color: '#F2F4F7',
            border: '1px solid #C5CBD3',
            fontSize: '12px'
          },
        });
        localStorage.setItem('verificationEmail', formData.email);
        navigate('/verify-email');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Registration failed. Make sure your email is unique.';
      toast.error(errorMsg, {
        style: {
          borderRadius: '4px',
          background: '#0E1116',
          color: '#F2F4F7',
          border: '1px solid #ef4444',
          fontSize: '12px'
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#040A12] font-sans antialiased text-[#C5CBD3] relative overflow-hidden">
      
      {/* MOBILE ONLY BACKGROUND IMAGE & CINEMATIC OVERLAY */}
      <div className="absolute inset-0 lg:hidden z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#040A12]/30 z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/80 via-transparent to-[#040A12] z-10" />
        <img 
          src="./images/ito_images/ito_5.png" 
          alt="Cinematic port background"
          className="w-full h-full object-cover filter brightness-[1.2] contrast-[1.18] saturate-[0.60]"
        />
      </div>

      {/* LEFT COLUMN: Registration Controls */}
      <div className="w-full lg:w-[50%] flex flex-col justify-between p-8 md:p-12 min-h-screen overflow-y-auto relative z-10 bg-transparent lg:bg-[#040A12] border-r border-[#C5CBD3]/10 custom-scrollbar">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8 lg:mb-4 relative z-20">
          <div className="h-9 w-9 bg-[#0E1116] border border-[#C5CBD3]/30 flex items-center justify-center rounded-sm">
            <FiUserPlus className="h-4 w-4 text-[#C5CBD3]" />
          </div>
          <div>
            <h1 className="text-sm font-serif font-medium text-[#F2F4F7] tracking-wider uppercase">
              India Trade Overseas
            </h1>
            <p className="text-[9px] text-[#6D7886] tracking-widest uppercase">Commercial Network</p>
          </div>
        </div>

        {/* Central Form Container */}
        <div className="max-w-md w-full mx-auto my-auto py-6 relative z-20">
          
          {/* Header Texts with Entrance Motion */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "linear", duration: 0.5, delay: 0.1 }}
            className="space-y-2 mb-6"
          >
            <h2 className="text-3xl font-serif text-[#F2F4F7] font-light tracking-tight">
              Create Client Account
            </h2>
            <p className="text-xs text-[#6D7886] font-light leading-relaxed">
              Register your enterprise identity below to initiate direct bulk allocations and coordinate end-to-end global trade logistics[cite: 1].
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "linear", duration: 0.5, delay: 0.2 }}
              className="space-y-3.5"
            >
              
              {/* Full Name Field */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                  <FiUser className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#F2F4F7] transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Full Name"
                  className="block w-full pl-10 pr-4 py-3 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                />
              </div>

              {/* Grid Wrapper for Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                
                {/* Email Address Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <FiMail className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#F2F4F7] transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Corporate Email Address"
                    className="block w-full pl-10 pr-4 py-3 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  />
                </div>

                {/* Phone Number Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <FiPhone className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#F2F4F7] transition-colors" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Contact Phone Number"
                    className="block w-full pl-10 pr-4 py-3 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  />
                </div>

                {/* Company Name Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <FiBriefcase className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#F2F4F7] transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Registered Company Name"
                    className="block w-full pl-10 pr-4 py-3 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  />
                </div>

                {/* GSTIN Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <FiPercent className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#F2F4F7] transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    placeholder="GSTIN (Optional)"
                    className="block w-full pl-10 pr-4 py-3 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all cursor-text"
                  />
                </div>

              </div>

              {/* Business Type Selector */}
              <div className="relative group">
                <select
                  required
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  className="block w-full px-3.5 py-3 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/90 backdrop-blur-sm text-xs text-[#F2F4F7] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 appearance-none cursor-pointer"
                >
                  <option value="" disabled className="bg-[#0E1116] text-[#6D7886]">Select Business Constitution *</option>
                  <option value="Individual" className="bg-[#0E1116] text-[#C5CBD3]">Individual / Proprietorship</option>
                  <option value="Partnership" className="bg-[#0E1116] text-[#C5CBD3]">Partnership Firm</option>
                  <option value="Private Limited" className="bg-[#0E1116] text-[#C5CBD3]">Private Limited Company</option>
                  <option value="Public Limited" className="bg-[#0E1116] text-[#C5CBD3]">Public Limited Company</option>
                  <option value="Other" className="bg-[#0E1116] text-[#C5CBD3]">Other Enterprise Type</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#6D7886]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Shipping Address Textarea */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 pt-3 flex items-start pointer-events-none z-10">
                  <FiMapPin className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#F2F4F7] transition-colors" />
                </div>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Official Shipping/Corporate Address"
                  rows="2"
                  className="block w-full pl-10 pr-4 py-3 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all resize-none"
                />
              </div>

              {/* Secure Password Field */}
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
                {loading ? 'Registering Credentials...' : 'Create client account'}
                {!loading && <FiArrowRight className="h-3.5 w-3.5" />}
              </button>
            </motion.div>
          </form>

          {/* Navigation Links Footer */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-left text-xs text-[#6D7886] space-y-2 border-t border-[#C5CBD3]/10 mt-6 pt-5"
          >
            <p className="font-light">
              Already have a client account?{' '}
              <Link to="/login" className="font-medium text-[#C5CBD3] hover:text-[#F2F4F7] hover:underline inline-flex items-center gap-0.5 group">
                Sign in
                <FiArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Global Protection Notice */}
        <div className="text-[10px] text-[#6D7886]/60 leading-relaxed font-light mt-4 pt-4 border-t border-[#C5CBD3]/5 relative z-20">
          &copy; 2026 India Trade Overseas. All rights reserved. Protected Environment Terminal[cite: 1].
        </div>
      </div>

      {/* RIGHT COLUMN: Cinematic Visual Asset */}
      <div className="hidden lg:block lg:w-[50%] relative h-screen bg-[#040A12]">
        
        {/* Port Overlay Masks and Shadows */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#040A12] via-[#040A12]/20 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#040A12]/90 z-10 pointer-events-none" />
        
        {/* Container Ship Background Image */}
        <img 
          src="./images/ito_images/ito_4.png" 
          alt="Cinematic international port loading operation"
          className="w-full h-full object-cover filter brightness-[1.2] contrast-[1.18] saturate-[0.70] pointer-events-none select-none"
        />

        {/* Floating Stat Block Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ cubicBezier: [0.22, 1, 0.36, 1], duration: 1, delay: 0.4 }}
          className="absolute bottom-12 right-12 bg-[#0E1116]/80 backdrop-blur-md border border-[#C5CBD3]/20 p-6 rounded-sm max-w-sm z-20"
        >
          <p className="text-[10px] tracking-widest text-[#C5CBD3] font-semibold uppercase mb-1">
            Institutional Registry
          </p>
          <h3 className="text-lg font-serif text-[#F2F4F7] font-medium leading-snug mb-2">
            "Where Quality Meets Global Demand."
          </h3>
          <p className="text-xs text-[#6D7886] font-light leading-relaxed">
            Joining our trade loop guarantees structured contract management, verified product specs, and priority cargo dispatch through our secure container fleet[cite: 1].
          </p>
        </motion.div>
      </div>

    </div>
  );
};

export default ClientSignup;