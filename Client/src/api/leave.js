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

  async reviewLeave(id, status, reviewNote) {
    const response = await axiosInstance.patch(`/leaves/${id}/review`, { status, reviewNote });
    return response.data;
  },

  async cancelLeave(id) {
    const response = await axiosInstance.patch(`/leaves/${id}/cancel`);
    return response.data;
  }
};
