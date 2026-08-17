import axiosInstance from './axiosInstance';

export const leaveApi = {
  async applyForLeave(data) {
    const response = await axiosInstance.post('/leaves', data);
    return response.data;
  },

  async getMyBalance() {
    const response = await axiosInstance.get('/leaves/balance/me');
    return response.data;
  },

  async getLeaves(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/leaves${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async getLeaveById(id) {
    const response = await axiosInstance.get(`/leaves/${id}`);
    return response.data;
  },

  async reviewLeave(id, status, hrRemarks) {
    // Maps both hrRemarks and reviewNote for backwards compatibility
    const response = await axiosInstance.patch(`/leaves/${id}/review`, { 
      status, 
      hrRemarks,
      reviewNote: hrRemarks 
    });
    return response.data;
  },

  async cancelLeave(id) {
    const response = await axiosInstance.patch(`/leaves/${id}/cancel`);
    return response.data;
  },

  // HR Settings management
  async getHRSettings() {
    const response = await axiosInstance.get('/leaves/settings');
    return response.data;
  },

  async updateHRSettings(settingsData) {
    const response = await axiosInstance.put('/leaves/settings', settingsData);
    return response.data;
  },

  // Employee balances list (HR view)
  async getAllBalances(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/leaves/balances${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  // Leave audit log trail
  async getAuditLogs() {
    const response = await axiosInstance.get('/leaves/audit-logs');
    return response.data;
  },

  // Trigger monthly reset manual action
  async triggerMonthlyReset(month) {
    const response = await axiosInstance.post('/leaves/reset', { month });
    return response.data;
  }
};
