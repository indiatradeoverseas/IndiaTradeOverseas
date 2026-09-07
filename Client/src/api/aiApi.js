import axiosInstance from './axiosInstance';

export const aiApi = {
  /**
   * Send messages to NVIDIA Nemotron AI assistant backend
   * @param {Array<{role: string, content: string}>} messages 
   * @param {Object} userContext 
   */
  async sendMessage(messages, userContext = {}) {
    const response = await axiosInstance.post('/ai/chat', {
      messages,
      userContext
    });
    return response.data;
  }
};
