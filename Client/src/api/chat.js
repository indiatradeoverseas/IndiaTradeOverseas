import axiosInstance from './axiosInstance';

export const chatApi = {
  async initSession(clientName, clientEmail = '') {
    const response = await axiosInstance.post('/chat/sessions', { clientName, clientEmail });
    return response.data;
  },

  async getMessages(sessionId) {
    const response = await axiosInstance.get(`/chat/sessions/${sessionId}/messages`);
    return response.data;
  },

  async sendMessage(sessionId, message) {
    const response = await axiosInstance.post(`/chat/sessions/${sessionId}/messages`, { message });
    return response.data;
  },

  
  async getAdminSessions() {
    const response = await axiosInstance.get('/chat/admin/sessions');
    return response.data;
  },

  async sendAdminReply(sessionId, message) {
    const response = await axiosInstance.post(`/chat/admin/sessions/${sessionId}/messages`, { message });
    return response.data;
  },

  async resolveSession(sessionId) {
    const response = await axiosInstance.patch(`/chat/admin/sessions/${sessionId}/resolve`);
    return response.data;
  }
};
