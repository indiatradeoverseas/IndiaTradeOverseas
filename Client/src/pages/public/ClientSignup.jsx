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
            background: '#0B2D5B',
            color: '#FBF7EF',
            border: '1px solid #C99B38',
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
          background: '#0B2D5B',
          color: '#FBF7EF',
          border: '1px solid #ef4444',
          fontSize: '12px'
        },
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
        className="w-full max-w-xl bg-[#FBF7EF] border border-[#C99B38]/25 p-8 rounded shadow-sm relative"
      >
        {/* Fine Editorial Brand Rule */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#C99B38] via-[#E2C275] to-[#C99B38]" />

        <div className="text-center space-y-2 mb-6">
          <div className="flex justify-center mb-3">
            <div className="h-10 w-10 bg-[#0B2D5B] rounded-sm border border-[#C99B38]/20 flex items-center justify-center shadow-sm">
              <FiUserPlus className="h-4 w-4 text-[#C99B38]" />
            </div>
          </div>
          <h2 className="text-xl font-serif font-medium text-[#0B2D5B] tracking-wide">
            Client Account Registration
          </h2>
          <p className="text-[10px] text-[#C99B38] tracking-widest uppercase font-medium">
            India Trade Overseas Commercial Network
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Full Name Field */}
            <div className="relative group md:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <FiUser className="h-3.5 w-3.5 text-[#0B2D5B]/40 group-focus-within:text-[#C99B38] transition-colors" />
              </div>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Full Name"
                className="block w-full pl-9 pr-3 py-2.5 border border-[#0B2D5B]/15 rounded bg-white text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] transition-all"
              />
            </div>

            {/* Email Address Field */}
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

            {/* Phone Number Field */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <FiPhone className="h-3.5 w-3.5 text-[#0B2D5B]/40 group-focus-within:text-[#C99B38] transition-colors" />
              </div>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Contact Phone Number"
                className="block w-full pl-9 pr-3 py-2.5 border border-[#0B2D5B]/15 rounded bg-white text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] transition-all"
              />
            </div>

            {/* Company Name Field */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <FiBriefcase className="h-3.5 w-3.5 text-[#0B2D5B]/40 group-focus-within:text-[#C99B38] transition-colors" />
              </div>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Registered Company Name"
                className="block w-full pl-9 pr-3 py-2.5 border border-[#0B2D5B]/15 rounded bg-white text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] transition-all"
              />
            </div>

            {/* GSTIN Field */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <FiPercent className="h-3.5 w-3.5 text-[#0B2D5B]/40 group-focus-within:text-[#C99B38] transition-colors" />
              </div>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="GSTIN (Optional)"
                className="block w-full pl-9 pr-3 py-2.5 border border-[#0B2D5B]/15 rounded bg-white text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] transition-all cursor-text"
              />
            </div>

            {/* Business Type Selector */}
            <div className="relative group md:col-span-2">
              <select
                required
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                className="block w-full px-3 py-2.5 border border-[#0B2D5B]/15 rounded bg-white text-xs text-[#0B2D5B] focus:outline-none focus:border-[#C99B38] appearance-none cursor-pointer"
              >
                <option value="" disabled>Select Business Constitution *</option>
                <option value="Individual">Individual / Proprietorship</option>
                <option value="Partnership">Partnership Firm</option>
                <option value="Private Limited">Private Limited Company</option>
                <option value="Public Limited">Public Limited Company</option>
                <option value="Other">Other Enterprise Type</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#0B2D5B]/40">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Shipping Address Textarea */}
            <div className="relative group md:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 pt-2.5 flex items-start pointer-events-none z-10">
                <FiMapPin className="h-3.5 w-3.5 text-[#0B2D5B]/40 group-focus-within:text-[#C99B38] transition-colors" />
              </div>
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Official Shipping/Corporate Address"
                rows="2"
                className="block w-full pl-9 pr-3 py-2.5 border border-[#0B2D5B]/15 rounded bg-white text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] transition-all resize-none"
              />
            </div>
          </div>

          {/* Secure Password Field */}
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

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ y: -0.5 }}
            whileTap={{ y: 0 }}
            className="w-full bg-[#0B2D5B] text-[#FBF7EF] text-xs font-medium tracking-wider py-3 rounded border border-transparent hover:border-[#C99B38]/30 transition-all shadow-sm uppercase mt-2 cursor-pointer"
          >
            {loading ? 'Creating account...' : 'Create client account'}
          </motion.button>

          <p className="text-center text-[11px] text-[#0B2D5B]/70 pt-2 border-t border-[#0B2D5B]/5">
            Already have a client account?{' '}
            <Link to="/login" className="font-semibold text-[#C99B38] hover:underline inline-flex items-center gap-0.5 group">
              Sign in
              <FiArrowRight className="h-2.5 w-2.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default ClientSignup;