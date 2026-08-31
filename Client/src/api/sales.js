import axiosInstance from './axiosInstance';

export const salesApi = {
  async getMyPerformance(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/sales/performance/me${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async getMyTarget(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/sales/targets/me${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async setTarget(payload) {
    const response = await axiosInstance.post('/sales/targets', payload);
    return response.data;
  },

  async getTargets(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/sales/targets${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async getLeaderboard(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/sales/leaderboard${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async getStrategicInsights(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/sales/strategic-insights${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async getCoachingMessages() {
    const response = await axiosInstance.get('/sales/coaching-messages');
    return response.data;
  },

  async sendCoachingMessage(payload) {
    const response = await axiosInstance.post('/sales/coaching-messages', payload);
    return response.data;
  },

  async submitDailyWorkLog(payload) {
    const response = await axiosInstance.post('/sales/daily-work-logs', payload);
    return response.data;
  },

  async getDailyWorkLogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/sales/daily-work-logs${queryString ? `?${queryString}` : ''}`);
    return response.data;
  }
};
