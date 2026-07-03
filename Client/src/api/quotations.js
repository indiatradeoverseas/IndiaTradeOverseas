import axiosInstance from './axiosInstance';

export const quotationsApi = {
  async requestQuotation(data) {
    const response = await axiosInstance.post('/quotations/request', data);
    return response.data;
  },

  async getPendingQuotations() {
    const response = await axiosInstance.get('/quotations/pending');
    return response.data;
  },

  async approveQuotation(id, data) {
    const response = await axiosInstance.patch(`/quotations/${id}/approve`, data);
    return response.data;
  },

  async rejectQuotation(id, data) {
    const response = await axiosInstance.patch(`/quotations/${id}/reject`, data);
    return response.data;
  }
};
