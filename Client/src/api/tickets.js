import axiosInstance from './axiosInstance';

export const ticketsApi = {
  async createTicket(data) {
    const response = await axiosInstance.post('/tickets', data);
    return response.data;
  },

  async getTickets(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/tickets${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async getTicketById(id) {
    const response = await axiosInstance.get(`/tickets/${id}`);
    return response.data;
  },

  async updateStatus(id, status) {
    const response = await axiosInstance.patch(`/tickets/${id}/status`, { status });
    return response.data;
  },

  async assignTicket(id, assignedTo) {
    const response = await axiosInstance.patch(`/tickets/${id}/assign`, { assignedTo });
    return response.data;
  },

  async addComment(id, message) {
    const response = await axiosInstance.post(`/tickets/${id}/comment`, { message });
    return response.data;
  }
};
