import axiosInstance from './axiosInstance';

export const paymentsApi = {
  async getPayments() {
    const response = await axiosInstance.get('/payments');
    return response.data;
  },

  async getOutstandingPayments() {
    const response = await axiosInstance.get('/payments/outstanding');
    return response.data;
  },

  async createPayment(paymentData) {
    const response = await axiosInstance.post('/payments', paymentData);
    return response.data;
  },

  async updatePaymentStatus(id, status) {
    const response = await axiosInstance.patch(`/payments/${id}`, { paymentStatus: status });
    return response.data;
  }
};
