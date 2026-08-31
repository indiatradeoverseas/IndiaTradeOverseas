import axiosInstance from './axiosInstance';

export const notificationsApi = {
  async getNotifications() {
    const response = await axiosInstance.get('/dashboard/notifications');
    return response.data;
  },

  async markRead(notificationId) {
    const response = await axiosInstance.patch(`/dashboard/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllRead() {
    const response = await axiosInstance.patch('/dashboard/notifications/read-all');
    return response.data;
  },

  async sendMessage(payload) {
    const response = await axiosInstance.post('/notifications/send', payload);
    return response.data;
  },

  async deleteNotification(notificationId) {
    const response = await axiosInstance.delete(`/dashboard/notifications/${notificationId}`);
    return response.data;
  },

  async deleteAllNotifications() {
    const response = await axiosInstance.delete('/dashboard/notifications');
    return response.data;
  }
};
