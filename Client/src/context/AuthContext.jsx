import React, { createContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';
import { employeeSignupApi } from '../api/employee-signup';
import { socketService } from '../services/socket';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      socketService.connect(user);
    }
    return () => {
      socketService.disconnect();
    };
  }, [user]);

  const checkAuth = async () => {
    const token = authApi.getToken();
    if (token) {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        const isEmployeeAuth = localStorage.getItem('isEmployeeAuth');
        const EMPLOYEE_ROLES = [
          'EMPLOYEE', 'HR_EXECUTIVE', 'HR_MANAGER', 'ADMIN', 'MANAGER', 'HR', 
          'SALES_EXECUTIVE', 'SALES_MANAGER', 'SALES', 'PROCUREMENT', 'ACCOUNTS', 
          'IT', 'TRANSPORT', 'FINANCE', 'FINANCE_MANAGER', 'FINANCE_EXECUTIVE', 
          'ACCOUNTS_MANAGER'
        ];
        const isEmployee = isEmployeeAuth !== null
          ? isEmployeeAuth === 'true'
          : (storedUser && (
              EMPLOYEE_ROLES.includes(storedUser.role) ||
              (storedUser.employeeId && !storedUser.employeeId.startsWith('CL_'))
            ));

        let response;
        if (isEmployee) {
          response = await employeeSignupApi.getMe();
          if (response.success) {
            setUser(response.data.employee);
          } else {
            // getMe returned but was not successful — token may be invalid
            logout();
          }
        } else {
          response = await authApi.getMe();
          if (response.success) {
            setUser(response.data.user);
          } else {
            logout();
          }
        }
      } catch (error) {
        const status = error?.response?.status;
        if (status === 401) {
          // Definitive auth failure — the axios interceptor already handles redirect
          // for auth endpoints, so just clear local state without calling logout() again
          setUser(null);
        } else {
          // Network error, 500, or other transient issue — use stored user as fallback
          const storedUser = JSON.parse(localStorage.getItem('user'));
          if (storedUser) {
            console.warn('[AuthContext] getMe failed with non-auth error, using cached user:', error?.message);
            setUser(storedUser);
          } else {
            logout();
          }
        }
      }
    }
    setLoading(false);
  };

  const login = async (credentials) => {
    const deviceHash = localStorage.getItem('deviceHash');
    const response = await authApi.login({ ...credentials, deviceHash });
    if (response.success && !response.data.requiresOtp) {
      localStorage.setItem('isEmployeeAuth', 'false');
      setUser(response.data.user);
    }
    return response;
  };

  const employeeLogin = async (credentials) => {
    const response = await employeeSignupApi.login(credentials);
    if (response.success) {
      localStorage.setItem('isEmployeeAuth', 'true');
      setUser(response.data.employee);
    }
    return response;
  };

  const adminLogin = async (credentials) => {
    const response = await authApi.adminLogin(credentials);
    if (response.success) {
      localStorage.setItem('isEmployeeAuth', 'false');
      setUser(response.data.user);
    }
    return response;
  };

  const googleLogin = async ({ credential, portal }) => {
    const response = await authApi.googleLogin({ credential, portal });
    if (response.success) {
      localStorage.setItem('isEmployeeAuth', 'false');
      setUser(response.data.user);
    }
    return response;
  };

  const adminGoogleLogin = async ({ credential }) => {
    const response = await authApi.adminGoogleLogin({ credential });
    if (response.success) {
      localStorage.setItem('isEmployeeAuth', 'false');
      setUser(response.data.user);
    }
    return response;
  };

  const verifyOtp = async (otpData) => {
    const deviceHash = localStorage.getItem('deviceHash');
    const response = await authApi.verifyOtp({ ...otpData, deviceHash });
    if (response.success && !response.data.requiresDeviceApproval) {
      localStorage.setItem('isEmployeeAuth', 'false');
      setUser(response.data.user);
    }
    return response;
  };

  const register = async (userData) => {
    const response = await authApi.register(userData);
    if (response.success) {
      setUser(response.data.user);
    }
    return response;
  };

  const verifyEmail = async (email, otp) => {
    const response = await authApi.verifyEmail(email, otp);
    if (response.success) {
      setUser(response.data.user);
    }
    return response;
  };

  const logout = () => {
    authApi.logout();
    localStorage.removeItem('isEmployeeAuth');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, employeeLogin, adminLogin, googleLogin, adminGoogleLogin, verifyOtp, register, verifyEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};