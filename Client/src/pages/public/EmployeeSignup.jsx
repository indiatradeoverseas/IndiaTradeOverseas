import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { FiBriefcase, FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield, FiTag, FiUserPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { pushDataLayerEvent } from '../../utils/analytics';

const toastStyle = { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #C5CBD3' };
const toastErrorStyle = { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #ef4444' };

const EmployeeSignup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    employeeId: '', 
    fullName: '', 
    email: '', 
    phone: '', 
    password: '', 
    role: '', 
    department: '' 
  });

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await register(formData);
      if (response.success) {
        toast.success('Employee account created successfully! Verification OTP sent to your email.', {
          icon: '🎉',
          style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #C5CBD3' }
        });
        pushDataLayerEvent('sign_up', { method: 'employee', role: formData.role || undefined });
        localStorage.setItem('verificationEmail', formData.email);
        navigate('/verify-email');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(errorMsg, { 
        style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #ef4444' } 
      });
    } finally {
      setLoading(false);
    }
  };

  // Designation / Role Options
  const roleOptions = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'FOUNDER', label: 'Founder' },
    { value: 'HR_EXECUTIVE', label: 'HR Executive' },
    { value: 'SOFTWARE_ENGINEER', label: 'Software Engineer' },
    { value: 'SENIOR_SOFTWARE_ENGINEER', label: 'Senior Software Engineer' },
    { value: 'FRONTEND_DEVELOPER', label: 'Frontend Developer' },
    { value: 'BACKEND_DEVELOPER', label: 'Backend Developer' },
    { value: 'FULL_STACK_DEVELOPER', label: 'Full Stack Developer' },
    { value: 'DEVOPS_ENGINEER', label: 'DevOps Engineer' },
    { value: 'DATA_ANALYST', label: 'Data Analyst' },
    { value: 'DATA_SCIENTIST', label: 'Data Scientist' },
    { value: 'PRODUCT_MANAGER', label: 'Product Manager' },
    { value: 'PROJECT_MANAGER', label: 'Project Manager' },
    { value: 'SALES_EXECUTIVE', label: 'Sales Executive' },
    { value: 'SALES_MANAGER', label: 'Sales Manager' },
    { value: 'MARKETING_EXECUTIVE', label: 'Marketing Executive' },
    { value: 'DIGITAL_MARKETING', label: 'Digital Marketing' },
    { value: 'SEO_SPECIALIST', label: 'SEO Specialist' },
    { value: 'CONTENT_WRITER', label: 'Content Writer' },
    { value: 'GRAPHIC_DESIGNER', label: 'Graphic Designer' },
    { value: 'UI_UX_DESIGNER', label: 'UI/UX Designer' },
    { value: 'FINANCE_MANAGER', label: 'Finance Manager' },
    { value: 'ACCOUNTANT', label: 'Accountant' },
    { value: 'HR_MANAGER', label: 'HR Manager' },
    { value: 'RECRUITER', label: 'Recruiter' },
    { value: 'TALENT_ACQUISITION', label: 'Talent Acquisition' },
    { value: 'OPERATIONS_MANAGER', label: 'Operations Manager' },
    { value: 'LOGISTICS_COORDINATOR', label: 'Logistics Coordinator' },
    { value: 'SUPPORT_EXECUTIVE', label: 'Support Executive' },
    { value: 'CUSTOMER_SERVICE', label: 'Customer Service' },
    { value: 'QUALITY_ANALYST', label: 'Quality Analyst' },
    { value: 'QA_ENGINEER', label: 'QA Engineer' },
    { value: 'BUSINESS_ANALYST', label: 'Business Analyst' },
    { value: 'EXECUTIVE', label: 'Executive' },
    { value: 'TRAINEE', label: 'Trainee' },
    { value: 'INTERN', label: 'Intern' }
  ];

  // Department Options
  const departmentOptions = [
    { value: 'ADMIN', label: 'Admin Department' },
    { value: 'FOUNDER', label: 'Founder Department' },
    { value: 'HR', label: 'HR Department' },
    { value: 'TRANSPORT', label: 'Transport Department' },
    { value: 'IT', label: 'IT Department' },
    { value: 'FINANCE', label: 'Finance Department' },
    { value: 'SALES', label: 'Sales Department' },
    { value: 'MARKETING', label: 'Marketing Department' },
    { value: 'OPERATIONS', label: 'Operations Department' },
    { value: 'LOGISTICS', label: 'Logistics Department' },
    { value: 'SUPPORT', label: 'Support Department' },
    { value: 'ACCOUNTS', label: 'Accounts Department' },
    { value: 'PURCHASE', label: 'Purchase Department' },
    { value: 'INVENTORY', label: 'Inventory Department' },
    { value: 'QUALITY', label: 'Quality Department' },
    { value: 'PRODUCT', label: 'Product Department' },
    { value: 'DESIGN', label: 'Design Department' },
    { value: 'CONTENT', label: 'Content Department' },
    { value: 'LEGAL', label: 'Legal Department' },
    { value: 'COMPLIANCE', label: 'Compliance Department' },
    { value: 'STRATEGY', label: 'Strategy Department' },
    { value: 'RESEARCH', label: 'Research Department' },
    { value: 'DEVELOPMENT', label: 'Development Department' }
  ];

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

      {/* LEFT COLUMN: Employee Registration Terminal */}
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
        <div className="max-w-sm w-full mx-auto my-auto py-8 relative z-20">
          
          {/* Header Texts with Entrance Motion */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "linear", duration: 0.5, delay: 0.1 }}
            className="space-y-2 mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-[#0E1116] border border-[#C5CBD3]/20 flex items-center justify-center rounded-sm">
                <FiUserPlus className="h-5 w-5 text-[#C5CBD3]" />
              </div>
              <div>
                <h2 className="text-2xl font-serif text-[#F2F4F7] font-light tracking-tight">
                  Employee Registration
                </h2>
                <p className="text-[10px] text-[#6D7886] font-light tracking-widest uppercase">
                  Onboard New Personnel
                </p>
              </div>
            </div>
            <p className="text-xs text-[#f5f5f5] font-light leading-relaxed">
              Create employee accounts for internal management loops, trade networks, and logistics logs.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "linear", duration: 0.5, delay: 0.2 }}
              className="space-y-3"
            >
              {/* Grid Layout for two columns on larger screens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Employee ID Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <FiBriefcase className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#F2F4F7] transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="Employee ID"
                    className="block w-full pl-10 pr-3 py-2.5 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  />
                </div>

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
                    className="block w-full pl-10 pr-3 py-2.5 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  />
                </div>

                {/* Email Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <FiMail className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#F2F4F7] transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email Address"
                    className="block w-full pl-10 pr-3 py-2.5 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  />
                </div>

                {/* Phone Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <FiPhone className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#F2F4F7] transition-colors" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone Number"
                    className="block w-full pl-10 pr-3 py-2.5 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                  <FiLock className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#F2F4F7] transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Password"
                  className="block w-full pl-10 pr-10 py-2.5 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6D7886] hover:text-[#F2F4F7] transition-colors"
                >
                  {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>

              {/* Designation & Department - Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Designation / Role Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <FiShield className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#F2F4F7] transition-colors" />
                  </div>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2.5 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all appearance-none"
                  >
                    <option value="" disabled>Select Designation *</option>
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-[#0E1116]">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <FiTag className="h-4 w-4 text-[#6D7886] group-focus-within:text-[#F2F4F7] transition-colors" />
                  </div>
                  <select
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2.5 border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 backdrop-blur-sm text-xs text-[#F2F4F7] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all appearance-none"
                  >
                    <option value="" disabled>Select Department *</option>
                    {departmentOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-[#0E1116]">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
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
                className="w-full mt-1 bg-[#F2F4F7] hover:bg-[#C5CBD3] text-[#0E1116] text-xs font-semibold tracking-widest py-3 rounded-sm transition-all shadow-md uppercase cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? 'Creating Account...' : 'Register Employee'}
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
              Already have an employee account?{' '}
              <Link to="/employee-login" className="font-medium text-[#C5CBD3] hover:text-[#F2F4F7] hover:underline inline-flex items-center gap-0.5 group">
                Sign in
                <FiArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </p>
            <p className="font-light">
              Need a client account?{' '}
              <Link to="/login" className="font-medium text-[#C5CBD3] hover:text-[#F2F4F7] hover:underline">
                Client login
              </Link>
              {' / '}
              <Link to="/client-signup" className="font-medium text-[#C5CBD3] hover:text-[#F2F4F7] hover:underline">
                Client signup
              </Link>
            </p>
            <p className="font-light">
              Administrator?{' '}
              <Link to="/admin-login" className="font-medium text-[#C5CBD3] hover:text-[#F2F4F7] hover:underline">
                Admin login
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
            Workforce Expansion
          </p>
          <h3 className="text-lg font-serif text-[#F2F4F7] font-medium leading-snug mb-2">
            "Onboard &amp; Empower Talent."
          </h3>
          <p className="text-xs text-[#6D7886] font-light leading-relaxed">
            Register new employees to strengthen our global freight logistics, bulk supply terminals, and regional distribution assets.
          </p>
        </motion.div>
      </div>

    </div>
  );
};

export default EmployeeSignup;