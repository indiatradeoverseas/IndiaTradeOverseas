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
            style: { borderRadius: '4px', background: '#0B2D5B', color: '#FBF7EF', border: '1px solid #C99B38' }
          });
          navigate('/device-pending');
        } else {
          toast.success('Welcome back, client!', {
            icon: '🤝',
            style: { borderRadius: '4px', background: '#0B2D5B', color: '#FBF7EF', border: '1px solid #C99B38' }
          });
          navigate('/');
        }
      }
    } catch (error) {
      if (error.response?.data?.errorCode === 'EMAIL_NOT_VERIFIED') {
        localStorage.setItem('verificationEmail', formData.email);
        toast.error('Email not verified. Redirecting to verification page.', {
          style: { borderRadius: '4px', background: '#0B2D5B', color: '#FBF7EF', border: '1px solid #ef4444' }
        });
        navigate('/verify-email');
        return;
      }
      const errorMsg = error.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMsg, { 
        style: { borderRadius: '4px', background: '#0B2D5B', color: '#FBF7EF', border: '1px solid #ef4444' } 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF7EF] py-16 px-4 relative overflow-hidden font-sans antialiased">
      
      {/* Structural ambient backdrops without background discoloration masks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C99B38]/5 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#0B2D5B]/5 rounded-full filter blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "linear", duration: 0.4 }}
        className="w-full max-w-sm bg-[#FBF7EF] border border-[#C99B38]/25 p-8 rounded shadow-sm relative"
      >
        {/* Fine Editorial Brand Rule */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#C99B38] via-[#E2C275] to-[#C99B38]" />

        <div className="text-center space-y-2 mb-8">
          <div className="flex justify-center mb-3">
            <div className="h-10 w-10 bg-[#0B2D5B] rounded-sm border border-[#C99B38]/20 flex items-center justify-center shadow-sm">
              <FiBriefcase className="h-4 w-4 text-[#C99B38]" />
            </div>
          </div>
          <h2 className="text-xl font-serif font-medium text-[#0B2D5B] tracking-wide">
            Client Hub Login
          </h2>
          <p className="text-[10px] text-[#C99B38] tracking-widest uppercase font-medium">
            India Trade Overseas Secure Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3.5">
            {/* Minimalist Corporate Input Field */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <FiMail className="h-3.5 w-3.5 text-[#0B2D5B]/40 group-focus-within:text-[#C99B38] transition-colors" />
              </div>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Corporate Email Address"
                className="block w-full pl-9 pr-3 py-2.5 border border-[#0B2D5B]/15 rounded bg-white text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] transition-all"
              />
            </div>

            {/* Minimalist Password Input Field */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <FiLock className="h-3.5 w-3.5 text-[#0B2D5B]/40 group-focus-within:text-[#C99B38] transition-colors" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Account Password"
                className="block w-full pl-9 pr-10 py-2.5 border border-[#0B2D5B]/15 rounded bg-white text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#0B2D5B]/40 hover:text-[#0B2D5B] transition-colors"
              >
                {showPassword ? <FiEyeOff className="h-3.5 w-3.5" /> : <FiEye className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-[11px] font-medium text-[#C99B38] hover:underline tracking-wide transition">
                Forgot password?
              </Link>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ y: -0.5 }}
            whileTap={{ y: 0 }}
            className="w-full mt-2 bg-[#0B2D5B] text-[#FBF7EF] text-xs font-medium tracking-wider py-3 rounded border border-transparent hover:border-[#C99B38]/30 transition-all shadow-sm uppercase"
          >
            {loading ? 'Authenticating Terminal...' : 'Sign In'}
          </motion.button>
        </form>

        <div className="text-center text-[11px] text-[#0B2D5B]/70 space-y-1.5 border-t border-[#0B2D5B]/5 mt-6 pt-4">
          <p>
            Need employee access?{' '}
            <Link to="/employee-login" className="font-semibold text-[#C99B38] hover:underline">
              Employee login
            </Link>
          </p>
          <p>
            Create a new account?{' '}
            <Link to="/client-signup" className="font-semibold text-[#0B2D5B] hover:underline inline-flex items-center gap-0.5 group">
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