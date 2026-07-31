import axiosInstance from './axiosInstance';

export const attendanceApi = {
  async checkIn() {
    const response = await axiosInstance.post('/attendance/check-in');
    return response.data;
  },

  async checkOut() {
    const response = await axiosInstance.post('/attendance/check-out');
    return response.data;
  },

  async startLunch() {
    const response = await axiosInstance.post('/attendance/lunch-start');
    return response.data;
  },

  async endLunch() {
    const response = await axiosInstance.post('/attendance/lunch-end');
    return response.data;
  },

  async getMyToday() {
    const response = await axiosInstance.get('/attendance/me/today');
    return response.data;
  },

  async getReport(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/attendance/report${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async getMyHistory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/attendance/me/history${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async cleanupOrphaned() {
    const response = await axiosInstance.delete('/attendance/cleanup-orphaned');
    return response.data;
  }
};
