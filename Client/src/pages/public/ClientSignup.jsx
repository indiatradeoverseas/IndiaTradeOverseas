import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiUserPlus, FiArrowRight, FiBriefcase, FiPercent, FiMapPin, FiTrendingUp } from 'react-icons/fi';
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
            borderRadius: '10px',
            background: '#0f172a',
            color: '#fff',
          },
        });
        localStorage.setItem('verificationEmail', formData.email);
        navigate('/verify-email');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Registration failed. Make sure your email is unique.';
      toast.error(errorMsg, {
        style: {
          borderRadius: '10px',
          background: '#0f172a',
          color: '#fff',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-sky-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 bg-white/95 backdrop-blur-xl p-8 rounded-[2rem] border border-sky-200 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-sky-100 rounded-full blur-3xl opacity-80"></div>
        <div className="relative z-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative rounded-3xl bg-gradient-to-br from-sky-600 to-cyan-500 p-5 shadow-xl">
              <FiUserPlus className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Client Signup</h2>
          <p className="text-sm text-slate-500">Register for client access.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative group md:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiUser className="h-5 w-5 text-sky-500" />
              </div>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Enter Your Full Name"
                className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="h-5 w-5 text-sky-500" />
              </div>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter Your Email address"
                className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiPhone className="h-5 w-5 text-sky-500" />
              </div>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter Your Phone number"
                className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiBriefcase className="h-5 w-5 text-sky-500" />
              </div>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Enter Your Company Name"
                className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            {/* GSTIN */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiPercent className="h-5 w-5 text-sky-500" />
              </div>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="Enter Your GSTIN (Optional)"
                className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div className="relative group md:col-span-2">
              <select
                required
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent appearance-none"
              >
                <option value="" disabled>Select Your Business Type *</option>
                <option value="Individual">Individual / Proprietorship</option>
                <option value="Partnership">Partnership</option>
                <option value="Private Limited">Private Limited</option>
                <option value="Public Limited">Public Limited</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="relative group md:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 pt-3 flex items-start pointer-events-none">
                <FiMapPin className="h-5 w-5 text-sky-500" />
              </div>
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter Your Shipping Address"
                rows="2"
                className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiLock className="h-5 w-5 text-sky-500" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter Your Password"
              className="block w-full pl-10 pr-12 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 disabled:opacity-70 cursor-pointer"
          >
            {loading ? 'Creating account...' : 'Create client account'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already have a client account?{' '}
            <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-500">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ClientSignup;
