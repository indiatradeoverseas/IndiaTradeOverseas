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
  },

  /**
   * Send voice or text command for intent parsing & RBAC authorization
   * @param {string} userCommand 
   */
  async sendVoiceOrTextCommand(userCommand) {
    const response = await axiosInstance.post('/ai/command', {
      userCommand
    });
    return response.data;
  },

  /**
   * Get dynamic role-based greeting for logged in user
   */
  async getRoleGreeting() {
    const response = await axiosInstance.get('/ai/greeting');
    return response.data;
  }
};
