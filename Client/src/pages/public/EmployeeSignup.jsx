import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FiBriefcase, FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiUserPlus, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

const EmployeeSignup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ employeeId: '', fullName: '', email: '', phone: '', password: '', role: '', department: '' });

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allowedRoles = ['ADMIN', 'MANAGER', 'HR'];
    const allowedDepts = ['ADMIN', 'HR'];

    if (!allowedRoles.includes(formData.role)) {
      toast.error('Registration is restricted to Admin, Manager, and HR roles only.');
      return;
    }
    if (!allowedDepts.includes(formData.department)) {
      toast.error('Registration is restricted to Admin and HR departments only.');
      return;
    }

    setLoading(true);
    try {
      const response = await register(formData);
      if (response.success) {
        toast.success('Employee account created successfully! Verification OTP sent to your email. 🎉', {
          style: { borderRadius: '10px', background: '#333', color: '#fff' }
        });
        localStorage.setItem('verificationEmail', formData.email);
        navigate('/verify-email');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(errorMsg, { style: { borderRadius: '10px', background: '#333', color: '#fff' } });
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'HR', label: 'HR' }
  ];

  const departmentOptions = [
    { value: 'ADMIN', label: 'Admin Department' },
    { value: 'HR', label: 'HR Department' }
  ];

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
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Employee Signup</h2>
          <p className="text-sm text-slate-500">Create your employee account with a fresh sky-blue onboarding experience.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiBriefcase className="h-5 w-5 text-sky-500" />
              </div>
              <input
                type="text"
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="Enter Your Employee ID"
                className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div className="relative group">
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
                placeholder="Enter Your Email Address"
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
                placeholder="Enter Your Phone Number"
                className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiShield className="h-5 w-5 text-sky-500" />
              </div>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent appearance-none"
              >
                <option value="" disabled>Select Role *</option>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiTag className="h-5 w-5 text-sky-500" />
              </div>
              <select
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent appearance-none"
              >
                <option value="" disabled>Select Department *</option>
                {departmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 disabled:opacity-70"
          >
            {loading ? 'Creating account...' : 'Create employee account'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already have an employee account?{' '}
            <Link to="/employee-login" className="font-semibold text-sky-600 hover:text-sky-500">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default EmployeeSignup;
