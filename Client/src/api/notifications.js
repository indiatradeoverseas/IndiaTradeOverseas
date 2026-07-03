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
  }
};
