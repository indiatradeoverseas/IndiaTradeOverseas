import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { FiMail, FiLock, FiEye, FiEyeOff, FiCheckCircle, FiShield, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.forgotPassword(email);
      if (response.success) {
        toast.success('Password reset OTP sent to your email! ✉️');
        setStep(2);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to send OTP. Please check your email.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit OTP code.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.resetPassword(email, otp, newPassword);
      if (response.success) {
        toast.success('Password reset successfully! Redirecting to login... 🎉');
        navigate('/login');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to reset password. Please verify the OTP.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-sky-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-sky-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-blur-xl p-8 rounded-[2rem] border border-sky-200 shadow-2xl relative z-10">
        <div className="flex justify-center mb-4">
          <div className="relative rounded-3xl bg-gradient-to-br from-violet-600 to-sky-500 p-5 shadow-xl">
            <FiShield className="h-8 w-8 text-white" />
          </div>
        </div>

        {step === 1 ? (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-2 font-sans">Forgot Password</h2>
              <p className="text-sm text-slate-500 mb-6">
                Enter your registered email address to receive a 6-digit verification code.
              </p>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Your Email Address"
                  className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 disabled:opacity-70 cursor-pointer transition"
              >
                {loading ? 'Sending OTP...' : 'Send Verification OTP'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-2 font-sans">Reset Password</h2>
              <p className="text-sm text-slate-500 mb-6">
                Enter the OTP sent to <span className="font-semibold text-slate-700">{email}</span> along with your new password.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiCheckCircle className="h-5 w-5 text-sky-500" />
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-Digit OTP"
                  className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-center font-mono text-lg tracking-[0.3em]"
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password (min 6 chars)"
                  className="block w-full pl-10 pr-12 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
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
                  <FiLock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className="block w-full pl-10 pr-12 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 disabled:opacity-70 cursor-pointer transition"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 flex flex-col items-center gap-3 text-sm text-slate-500 text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-medium text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 group focus:outline-none cursor-pointer bg-transparent border-none"
          >
            Back to login
            <FiArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
