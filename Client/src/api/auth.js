import axiosInstance from './axiosInstance';

export const authApi = {
  async register(userData) {
    const response = await axiosInstance.post('/auth/register', userData);
    if (response.data.success && response.data.data?.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  async login(credentials) {
    const response = await axiosInstance.post('/auth/login', credentials);
    if (response.data.success && response.data.data?.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  async getMe() {
    const response = await axiosInstance.get('/auth/me');
    return response.data;
  },

  async verifyOtp(otpData) {
    const response = await axiosInstance.post('/auth/verify-otp', otpData);
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  async verifyEmail(email, otp) {
    const response = await axiosInstance.post('/auth/verify-email', { email, otp });
    if (response.data.success && response.data.data?.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  async requestOtp(emailData) {
    const response = await axiosInstance.post('/auth/request-otp', emailData);
    return response.data;
  },

  async getSessions() {
    const response = await axiosInstance.get('/auth/sessions');
    return response.data;
  },

  async requestDeviceApproval(deviceData) {
    const response = await axiosInstance.post('/auth/device/request-approval', deviceData);
    return response.data;
  },

  async forgotPassword(email) {
    const response = await axiosInstance.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(email, otp, newPassword) {
    const response = await axiosInstance.post('/auth/reset-password', { email, otp, newPassword });
    return response.data;
  },

  getToken() {
    return localStorage.getItem('token');
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};
