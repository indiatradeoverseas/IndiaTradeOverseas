import axiosInstance from './axiosInstance';

export const quotationsApi = {
  async requestQuotation(data) {
    const response = await axiosInstance.post('/quotations/request', data);
    return response.data;
  },

  async getPendingQuotations(params = {}) {
    const response = await axiosInstance.get('/quotations/pending', { params });
    return response.data;
  },

  async approveQuotation(id, data) {
    const response = await axiosInstance.patch(`/quotations/${id}/approve`, data);
    return response.data;
  },

  async rejectQuotation(id, data) {
    const response = await axiosInstance.patch(`/quotations/${id}/reject`, data);
    return response.data;
  },

  async bulkApproveQuotations(data) {
    const response = await axiosInstance.patch('/quotations/bulk-approve', data);
    return response.data;
  },

  async bulkRejectQuotations(data) {
    const response = await axiosInstance.patch('/quotations/bulk-reject', data);
    return response.data;
  }
};
