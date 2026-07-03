import axiosInstance from './axiosInstance';

export const dashboardApi = {
  async getSummary() {
    const response = await axiosInstance.get('/dashboard/summary');
    return response.data;
  },

  async getDashboardSummary() {
    return this.getSummary();
  },

  async getHistory() {
    const response = await axiosInstance.get('/dashboard/history');
    return response.data;
  }
};
