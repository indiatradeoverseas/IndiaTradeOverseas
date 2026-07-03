import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth';
import { FiSmartphone, FiAlertTriangle, FiRefreshCw, FiLogOut, FiActivity } from 'react-icons/fi';
import toast from 'react-hot-toast';

const DevicePending = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);

  const deviceHash = localStorage.getItem('deviceHash');

  const fetchDeviceStatus = async (showToast = false) => {
    try {
      if (showToast) setChecking(true);
      const response = await authApi.getSessions();

      if (response.success && response.data?.devices) {
        const currentDevice = response.data.devices.find(d => d.deviceHash === deviceHash);
        if (currentDevice) {
          setDeviceInfo(currentDevice);

          if (currentDevice.isApproved) {
            toast.success('Your device has been approved! Redirecting...', {
              style: { borderRadius: '10px', background: '#333', color: '#fff' }
            });
            setTimeout(() => {
              navigate('/crm/dashboard');
            }, 1500);
            return;
          } else if (showToast) {
            toast.error('Device is still pending approval. Please wait or contact your Admin.');
          }
        } else {
          // If no matching device found, construct a placeholder info
          setDeviceInfo({
            deviceHash: deviceHash || 'N/A',
            deviceName: navigator.userAgent.split(') ')[0]?.split('(')[1] || 'Unknown Browser/Device',
            ipAddress: 'Detecting...',
            isApproved: false
          });
          if (showToast) {
            toast.error('Device not registered. Please try logging in again.');
          }
        }
      }
    } catch (error) {
      console.error('Error checking device status:', error);
      if (showToast) {
        toast.error('Unable to fetch device status. Please check your network connection.');
      }
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  useEffect(() => {
    const token = authApi.getToken();
    if (!token) {
      navigate('/employee-login');
      return;
    }
    fetchDeviceStatus();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/employee-login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-xl p-8 rounded-[2rem] border border-slate-200 shadow-2xl relative z-10">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-amber-500 rounded-2xl blur-lg opacity-75"></div>
              <div className="relative h-16 w-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                <FiAlertTriangle className="h-8 w-8 text-white animate-bounce" />
              </div>
            </div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Device Approval Pending
          </h2>
          <p className="mt-3 text-sm text-gray-500 leading-relaxed">
            Your device is registered but requires admin approval before you can access the dashboard.
          </p>
        </div>

        {deviceInfo && (
          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FiSmartphone className="text-amber-500" />
              Device Details
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">Name:</span>
                <span className="text-slate-800 font-semibold truncate max-w-[200px]" title={deviceInfo.deviceName}>
                  {deviceInfo.deviceName || 'Browser/Unknown'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">IP Address:</span>
                <span className="text-slate-800 font-mono">{deviceInfo.ipAddress || 'Detecting...'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">Hash ID:</span>
                <span className="text-slate-800 font-mono text-xs">{deviceHash ? `${deviceHash.slice(0, 10)}...${deviceHash.slice(-6)}` : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-medium text-slate-500">Status:</span>
                <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                  <FiActivity className="animate-spin text-xs" />
                  Pending Approval
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => fetchDeviceStatus(true)}
            disabled={checking}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-700 hover:to-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-70 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/25 cursor-pointer"
          >
            <FiRefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking approval...' : 'Check Approval Status'}</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-slate-200 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <FiLogOut className="h-4 w-4" />
            <span>Logout / Sign In Different Account</span>
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-400">Device verification security enabled</span>
          </div>

        </div>
        <p className='text-center text-xs text-gray-400'>If Your Not Employee in ITO, Don't try to EmployeeLogin or EmployeeSignup </p>
      </div>
    </div>
  );
};

export default DevicePending;
