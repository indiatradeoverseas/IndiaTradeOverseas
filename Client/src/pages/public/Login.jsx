import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth';
import { motion } from 'framer-motion';
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiShield,
  FiArrowRight
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login(formData);
      if (response.success) {
        toast.success('Welcome back!', {
          icon: '🎉',
          style: { borderRadius: '6px', background: '#0B2D5B', color: '#FBF7EF', border: '1px solid #C99B38' }
        });
        navigate('/crm/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMsg = error.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMsg, {
        style: { borderRadius: '6px', background: '#0B2D5B', color: '#FBF7EF', border: '1px solid #ef4444' }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF7EF] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans antialiased">
      
      {/* Background Decor - Refined geometric tinting with zero blue color-masking overlays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C99B38]/5 rounded-bl-full filter blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#0B2D5B]/5 rounded-tr-full filter blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="max-w-md w-full space-y-8 relative z-10 bg-[#FBF7EF] border border-[#C99B38]/30 p-8 sm:p-10 rounded-lg shadow-xl"
      >
        {/* Top Gold Border strip alignment matching the shared dynamic Enquiry overlays */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C99B38] via-[#E2C275] to-[#C99B38] rounded-t-lg" />

        <div className="text-center">
          <div className="flex justify-center mb-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative h-14 w-14 bg-[#0B2D5B] rounded border border-[#C99B38]/30 flex items-center justify-center shadow-md"
            >
              <FiShield className="h-6 w-6 text-[#C99B38]" />
            </motion.div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#0B2D5B] tracking-wide">
            Internal Portal Access
          </h2>
          <p className="text-xs text-[#C99B38] tracking-widest uppercase mt-1.5">
            India Trade Overseas CRM
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleLoginSubmit}>
          <div className="space-y-4">
            {/* Corporate Email Address Field */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <FiMail className="h-4 w-4 text-[#0B2D5B]/40 group-focus-within:text-[#C99B38] transition-colors duration-200" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="block w-full pl-10 pr-3 py-3 border border-[#0B2D5B]/20 rounded bg-white placeholder-[#0B2D5B]/30 text-[#0B2D5B] focus:outline-none focus:border-[#C99B38] focus:ring-0 transition-all text-sm"
                placeholder="Email address"
              />
            </div>

            {/* Secure Password Field */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <FiLock className="h-4 w-4 text-[#0B2D5B]/40 group-focus-within:text-[#C99B38] transition-colors duration-200" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="block w-full pl-10 pr-12 py-3 border border-[#0B2D5B]/20 rounded bg-white placeholder-[#0B2D5B]/30 text-[#0B2D5B] focus:outline-none focus:border-[#C99B38] focus:ring-0 transition-all text-sm"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#0B2D5B]/40 hover:text-[#0B2D5B] transition-colors duration-200"
              >
                {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Secure Processing Trigger Action */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.99 }}
            className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded text-[#FBF7EF] bg-[#0B2D5B] hover:bg-[#0B2D5B]/90 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#FBF7EF] border-t-transparent"></div>
                <span>Verifying Credentials...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </motion.button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-[#0B2D5B]/70">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="font-semibold text-[#C99B38] hover:text-[#C99B38]/80 transition-colors inline-flex items-center gap-1 group"
            >
              Create account
              <FiArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </p>
        </div>

        {/* Global Structural Disclaimers and compliance anchors */}
        <p className="text-center text-[11px] text-[#0B2D5B]/40 border-t border-[#0B2D5B]/5 pt-4">
          By signing in, you agree to our{' '}
          <a href="#" className="text-[#C99B38] hover:underline">Terms</a> and{' '}
          <a href="#" className="text-[#C99B38] hover:underline">Privacy Policy</a>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;