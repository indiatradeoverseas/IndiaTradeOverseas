import axiosInstance from './axiosInstance';

export const managerChatApi = {
  getMessages: async (params = {}) => {
    const res = await axiosInstance.get('/chat/manager/messages', { params });
    return res.data;
  },

  sendMessage: async (payload) => {
    const res = await axiosInstance.post('/chat/manager/send', payload);
    return res.data;
  },

  getParticipants: async () => {
    const res = await axiosInstance.get('/chat/manager/participants');
    return res.data;
  },

  markRead: async (recipientId = 'GENERAL') => {
    const res = await axiosInstance.put('/chat/manager/read', { recipientId });
    return res.data;
  }
};
