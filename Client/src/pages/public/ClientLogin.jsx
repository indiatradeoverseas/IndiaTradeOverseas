import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
            style: { borderRadius: '10px', background: '#333', color: '#fff' }
          });
          navigate('/device-pending');
        } else {
          toast.success('Welcome back, client!', {
            icon: '🤝',
            style: { borderRadius: '10px', background: '#333', color: '#fff' }
          });
          navigate('/');
        }
      }
    } catch (error) {
      if (error.response?.data?.errorCode === 'EMAIL_NOT_VERIFIED') {
        localStorage.setItem('verificationEmail', formData.email);
        toast.error('Email not verified. Redirecting to verification page.', {
          style: { borderRadius: '10px', background: '#333', color: '#fff' }
        });
        navigate('/verify-email');
        return;
      }
      const errorMsg = error.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMsg, { style: { borderRadius: '10px', background: '#333', color: '#fff' } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-blur-xl p-8 rounded-[2rem] border border-purple-200 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-purple-100 rounded-full blur-3xl opacity-80"></div>
        <div className="relative z-10">
          <div className="flex justify-center mb-4">
            <div className="relative rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-500 p-5 shadow-xl">
              <FiBriefcase className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-center text-3xl font-bold text-slate-900 mb-2">Client Login</h2>
          <p className="text-center text-sm text-slate-500">Sign in to access client resources.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 relative z-10">
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter Your Email address"
                className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-purple-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
              />
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter Your Password"
                className="block w-full pl-10 pr-12 py-3 rounded-2xl border border-purple-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>
            <div className="flex justify-end text-xs">
              <Link to="/forgot-password" className="font-semibold text-fuchsia-600 hover:text-fuchsia-500 transition">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 hover:shadow-fuchsia-500/30 disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="text-center text-sm text-slate-500">
          <p>
            Need employee access?{' '}
            <Link to="/employee-login" className="font-semibold text-fuchsia-600 hover:text-fuchsia-500">
              Employee login
            </Link>
          </p>
          <p>
            Create a new Account?{' '}
            <Link to="/client-signup" className="font-semibold text-sky-600 hover:text-sky-500">
              Client signup
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;
