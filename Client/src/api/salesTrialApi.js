import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const salesTrialApi = {
  // Auth & Account Creation
  createTrialUser: async (data) => {
    const response = await axios.post(`${API_URL}/sales-trial/auth/create`, data, getAuthHeaders());
    return response.data;
  },

  signupTrialUser: async (data) => {
    const response = await axios.post(`${API_URL}/sales-trial/auth/signup`, data);
    return response.data;
  },

  verifyTrialOtp: async (data) => {
    const response = await axios.post(`${API_URL}/sales-trial/auth/verify-otp`, data);
    return response.data;
  },

  resendTrialOtp: async (data) => {
    const response = await axios.post(`${API_URL}/sales-trial/auth/resend-otp`, data);
    return response.data;
  },

  approveTrialUser: async (id) => {
    const response = await axios.put(`${API_URL}/sales-trial/auth/approve/${id}`, {}, getAuthHeaders());
    return response.data;
  },

  rejectTrialUser: async (id) => {
    const response = await axios.put(`${API_URL}/sales-trial/auth/reject/${id}`, {}, getAuthHeaders());
    return response.data;
  },

  loginTrialUser: async (credentials) => {
    const response = await axios.post(`${API_URL}/sales-trial/auth/login`, credentials);
    return response.data;
  },

  getNextTrialId: async () => {
    const response = await axios.get(`${API_URL}/sales-trial/auth/next-id`);
    return response.data;
  },

  getTrialUsers: async () => {
    const response = await axios.get(`${API_URL}/sales-trial/users`, getAuthHeaders());
    return response.data;
  },

  // Task Assignment
  assignTaskToTrialUser: async (taskData) => {
    const response = await axios.post(`${API_URL}/sales-trial/tasks/assign`, taskData, getAuthHeaders());
    return response.data;
  },

  // Chat
  sendTrialChatMessage: async (chatData) => {
    const response = await axios.post(`${API_URL}/sales-trial/chat/send`, chatData, getAuthHeaders());
    return response.data;
  },

  getTrialChatHistory: async (trialUserId = '') => {
    const response = await axios.get(`${API_URL}/sales-trial/chat/history/${trialUserId}`, getAuthHeaders());
    return response.data;
  },

  markTrialChatRead: async (trialUserId) => {
    const response = await axios.put(`${API_URL}/sales-trial/chat/read/${trialUserId}`, {}, getAuthHeaders());
    return response.data;
  }
};
