import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth';
import { FiCheckCircle, FiShield, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

const VerifyEmail = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();

  useEffect(() => {
    const storedEmail = localStorage.getItem('verificationEmail');
    if (!storedEmail) {
      toast.error('No pending email verification found. Redirecting to login.');
      navigate('/login');
    } else {
      setEmail(storedEmail);
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyEmail(email, otp);
      if (response.success) {
        toast.success('Email verified successfully! Welcome! 🎉', {
          style: { borderRadius: '10px', background: '#333', color: '#fff' }
        });
        
        
        localStorage.removeItem('verificationEmail');
        
        const user = response.data?.user;
        const isClient = user?.employeeId && user.employeeId.startsWith('CL_');

        if (isClient) {
          navigate('/');
        } else {
          navigate('/crm/dashboard');
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Verification failed. Please check the code.';
      toast.error(errorMsg, { style: { borderRadius: '10px', background: '#333', color: '#fff' } });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authApi.requestOtp({ email });
      toast.success('Verification OTP resent successfully!');
    } catch (error) {
      toast.error('Failed to resend OTP. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-sky-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-sky-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-blur-xl p-8 rounded-[2rem] border border-sky-200 shadow-2xl relative z-10 text-center">
        <div className="flex justify-center mb-4">
          <div className="relative rounded-3xl bg-gradient-to-br from-violet-600 to-sky-500 p-5 shadow-xl">
            <FiShield className="h-8 w-8 text-white" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-slate-900 mb-2">Verify Your Email</h2>
        <p className="text-sm text-slate-500 mb-6">
          We have sent a 6-digit OTP verification code to <br />
          <span className="font-semibold text-slate-700">{email}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="block w-full pl-10 pr-3 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-center font-mono text-xl tracking-[0.5em]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 disabled:opacity-70 cursor-pointer"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-sm text-slate-500">
          <p>
            Didn't receive the email?{' '}
            <button
              type="button"
              onClick={handleResend}
              className="font-semibold text-sky-600 hover:text-sky-500 focus:outline-none cursor-pointer bg-transparent border-none"
            >
              Resend OTP
            </button>
          </p>
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

export default VerifyEmail;
