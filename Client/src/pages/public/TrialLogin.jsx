import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { FiUser, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { pushDataLayerEvent } from '../../utils/analytics';

const TrialLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ emailOrTrialId: '', password: '' });

  const { trialLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await trialLogin(formData);
      if (response && response.success) {
        toast.success('Welcome back, Sales Trial Executive!', {
          icon: '⚡',
          style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #3B82F6' }
        });
        if (pushDataLayerEvent) {
          pushDataLayerEvent('login', { method: 'sales_trial' });
        }
        navigate('/crm/trial-dashboard');
      }
    } catch (error) {
      console.error('Trial login error:', error);
      const errorMsg = error.response?.data?.message || 'Login failed. Please check your Trial ID / Email and password.';
      toast.error(errorMsg, { 
        style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #ef4444' } 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#040A12] font-sans antialiased text-[#C5CBD3] relative overflow-hidden">
      
      {/* MOBILE BACKGROUND OVERLAY */}
      <div className="absolute inset-0 lg:hidden z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#040A12]/80 z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/90 via-transparent to-[#040A12] z-10" />
        <img 
          src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1000&q=70" 
          alt="Cinematic port background"
          className="w-full h-full object-cover filter brightness-[1] contrast-[1.12] saturate-[0.60]"
        />
      </div>

      {/* LEFT COLUMN: Trial Authentication Form */}
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

        {/* Central Form Container */}
        <div className="max-w-sm w-full mx-auto my-auto py-12 relative z-20">
          
          {/* Header Texts */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-2 mb-8"
          >
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[10px] font-semibold text-[#60A5FA] uppercase tracking-wider mb-2">
              <FiZap className="h-3 w-3" />
              Trial Access Portal
            </div>
            <h2 className="text-3xl font-serif text-[#F2F4F7] font-light tracking-tight">
              Trial Login
            </h2>
            <p className="text-xs text-[#A0AEC0] font-light leading-relaxed">
              Enter your Sales Trial ID (e.g. <span className="text-[#60A5FA] font-mono font-medium">TRL001</span>) or registered email address to access your trial desk.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-3.5"
            >
              {/* Trial ID / Email Input Field */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                  <FiUser className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#3B82F6] transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.emailOrTrialId}
                  onChange={(e) => setFormData({ ...formData, emailOrTrialId: e.target.value })}
                  placeholder="Trial ID (TRL001) or Email"
                  className="block w-full pl-10 pr-4 py-3 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/90 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#3B82F6]/60 focus:ring-1 focus:ring-[#3B82F6]/30 transition-all font-mono"
                />
              </div>

              {/* Password Input Field */}
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
                  className="block w-full pl-10 pr-10 py-3 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/90 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#3B82F6]/60 focus:ring-1 focus:ring-[#3B82F6]/30 transition-all"
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
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold tracking-widest py-3.5 rounded-sm transition-all shadow-lg shadow-blue-900/30 uppercase cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating Trial Account...' : 'Sign In to Trial Desk'}
                {!loading && <FiArrowRight className="h-3.5 w-3.5" />}
              </button>
            </motion.div>
          </form>

          {/* Navigation Links Footer */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-left text-xs text-[#6D7886] space-y-2 border-t border-[#C5CBD3]/10 mt-8 pt-6"
          >
            <p className="font-light">
              Need trial access?{' '}
              <Link to="/trial-signup" className="font-medium text-[#60A5FA] hover:text-[#F2F4F7] hover:underline inline-flex items-center gap-0.5 group">
                Trial signup
                <FiArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </p>
            <p className="font-light">
              Need employee access?{' '}
              <Link to="/employee-login" className="font-medium text-[#C5CBD3] hover:text-[#F2F4F7] hover:underline">
                Employee login
              </Link>
              {' / '}
              <Link to="/admin-login" className="font-medium text-[#C5CBD3] hover:text-[#F2F4F7] hover:underline">
                Admin login
              </Link>
            </p>
            <p className="font-light">
              Create a client account?{' '}
              <Link to="/client-signup" className="font-medium text-[#C5CBD3] hover:text-[#F2F4F7] hover:underline inline-flex items-center gap-0.5 group">
                Client signup
                <FiArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </p>
            <p className="font-light">
              Have a client account?{' '}
              <Link to="/login" className="font-medium text-[#C5CBD3] hover:text-[#F2F4F7] hover:underline">
                Client login
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Global Footer Notice */}
        <div className="text-[10px] text-[#6D7886]/60 leading-relaxed font-light relative z-20">
          &copy; 2026 India Trade Overseas. All rights reserved. Sales Trial Evaluation System.
        </div>
      </div>

      {/* RIGHT COLUMN: Visual Background Showcase */}
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
          className="absolute bottom-12 right-12 bg-[#0E1116]/85 backdrop-blur-md border border-[#3B82F6]/30 p-6 rounded-sm max-w-sm z-20 shadow-2xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-[#3B82F6] animate-pulse" />
            <p className="text-[10px] tracking-widest text-[#60A5FA] font-semibold uppercase">
              Sales Trial Executive Console
            </p>
          </div>
          <h3 className="text-lg font-serif text-[#F2F4F7] font-medium leading-snug mb-2">
            "Track Assigned Leads &amp; Collaborate Real-Time."
          </h3>
          <p className="text-xs text-[#94A3B8] font-light leading-relaxed">
            Directly interface with Sales Managers, manage assigned pipeline leads, complete daily task checklists, and receive real-time updates.
          </p>
        </motion.div>
      </div>

    </div>
  );
};

export default TrialLogin;
