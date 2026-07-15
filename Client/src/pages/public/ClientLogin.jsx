import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiBriefcase } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ClientLogin = () => {
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
            style: { borderRadius: '4px', background: '#0C1F3F', color: '#FFFFFF', border: '1px solid #8FAADC' }
          });
          navigate('/device-pending');
        } else {
          toast.success('Welcome back, client!', {
            icon: '🤝',
            style: { borderRadius: '4px', background: '#0C1F3F', color: '#FFFFFF', border: '1px solid #8FAADC' }
          });
          navigate('/');
        }
      }
    } catch (error) {
      if (error.response?.data?.errorCode === 'EMAIL_NOT_VERIFIED') {
        localStorage.setItem('verificationEmail', formData.email);
        toast.error('Email not verified. Redirecting to verification page.', {
          style: { borderRadius: '4px', background: '#0C1F3F', color: '#FFFFFF', border: '1px solid #ef4444' }
        });
        navigate('/verify-email');
        return;
      }
      const errorMsg = error.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMsg, { 
        style: { borderRadius: '4px', background: '#0C1F3F', color: '#FFFFFF', border: '1px solid #ef4444' } 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C1F3F] py-16 px-4 relative overflow-hidden font-sans antialiased text-white">
      
      {/* Structural ambient backdrops without background discoloration masks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#2F5DA8]/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#8FAADC]/5 rounded-full filter blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "linear", duration: 0.4 }}
        className="w-full max-w-sm bg-[#0C1F3F] border border-[#8FAADC]/20 p-8 rounded shadow-sm relative"
      >
        {/* Fine Editorial Brand Rule */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#2F5DA8] via-[#8FAADC] to-[#2F5DA8]" />

        <div className="text-center space-y-2 mb-8">
          <div className="flex justify-center mb-3">
            <div className="h-10 w-10 bg-[#0C1F3F] rounded-sm border border-[#8FAADC]/30 flex items-center justify-center shadow-sm">
              <FiBriefcase className="h-4 w-4 text-[#8FAADC]" />
            </div>
          </div>
          <h2 className="text-xl font-serif font-medium text-white tracking-wide">
            Client Hub Login
          </h2>
          <p className="text-[10px] text-[#8FAADC] tracking-widest uppercase font-medium">
            India Trade Overseas Secure Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3.5">
            {/* Minimalist Corporate Input Field */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <FiMail className="h-3.5 w-3.5 text-[#8FAADC]/60 group-focus-within:text-[#8FAADC] transition-colors" />
              </div>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Corporate Email Address"
                className="block w-full pl-9 pr-3 py-2.5 border border-[#8FAADC]/30 rounded bg-[#0C1F3F] text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#8FAADC] transition-all"
              />
            </div>

            {/* Minimalist Password Input Field */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <FiLock className="h-3.5 w-3.5 text-[#8FAADC]/60 group-focus-within:text-[#8FAADC] transition-colors" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Account Password"
                className="block w-full pl-9 pr-10 py-2.5 border border-[#8FAADC]/30 rounded bg-[#0C1F3F] text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#8FAADC] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8FAADC]/60 hover:text-white transition-colors"
              >
                {showPassword ? <FiEyeOff className="h-3.5 w-3.5" /> : <FiEye className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-[11px] font-medium text-[#8FAADC] hover:text-white hover:underline tracking-wide transition">
                Forgot password?
              </Link>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ y: -0.5 }}
            whileTap={{ y: 0 }}
            className="w-full mt-2 bg-[#2F5DA8] hover:bg-[#8FAADC] text-white hover:text-[#0C1F3F] text-xs font-medium tracking-wider py-3 rounded border border-transparent transition-all shadow-sm uppercase cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Authenticating Terminal...' : 'Sign In'}
          </motion.button>
        </form>

        <div className="text-center text-[11px] text-white/70 space-y-1.5 border-t border-[#8FAADC]/10 mt-6 pt-4">
          <p>
            Need employee access?{' '}
            <Link to="/employee-login" className="font-semibold text-[#8FAADC] hover:text-white hover:underline">
              Employee login
            </Link>
          </p>
          <p>
            Create a new account?{' '}
            <Link to="/client-signup" className="font-semibold text-[#8FAADC] hover:text-white hover:underline inline-flex items-center gap-0.5 group">
              Client signup
              <FiArrowRight className="h-2.5 w-2.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ClientLogin;