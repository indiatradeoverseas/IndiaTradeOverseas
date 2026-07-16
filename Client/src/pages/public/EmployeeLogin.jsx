import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';

const EmployeeLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await login(formData);
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
          navigate('/crm/dashboard');
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
            "Industrial Scale &amp; Operational Excellence."
          </h3>
          <p className="text-xs text-[#6D7886] font-light leading-relaxed">
            Secure administrative console linked with our global freight logistics, bulk supply terminals, and regional distribution assets[cite: 1].
          </p>
        </motion.div>
      </div>

    </div>
  );
};

export default EmployeeLogin;