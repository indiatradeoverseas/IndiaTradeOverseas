import React, { createContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = authApi.getToken();
    if (token) {
      try {
        const response = await authApi.getMe();
        if (response.success) {
          setUser(response.data.user);
        } else {
          authApi.logout();
        }
      } catch (error) {
        authApi.logout();
      }
    }
    setLoading(false);
  };

  const login = async (credentials) => {
    const deviceHash = localStorage.getItem('deviceHash');
    const response = await authApi.login({ ...credentials, deviceHash });
    if (response.success && !response.data.requiresOtp) {
      setUser(response.data.user);
    }
    return response;
  };

  const verifyOtp = async (otpData) => {
    const deviceHash = localStorage.getItem('deviceHash');
    const response = await authApi.verifyOtp({ ...otpData, deviceHash });
    if (response.success && !response.data.requiresDeviceApproval) {
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
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyOtp, register, verifyEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};