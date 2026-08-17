import axiosInstance from './axiosInstance';

export const taskApi = {
  async getTasks(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/tasks${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async createTask(taskData) {
    const response = await axiosInstance.post('/tasks', taskData);
    return response.data;
  },

  async updateTaskStatus(taskId, status, remarks) {
    const response = await axiosInstance.patch(`/tasks/${taskId}`, { status, remarks });
    return response.data;
  },

  async deleteTask(taskId) {
    const response = await axiosInstance.delete(`/tasks/${taskId}`);
    return response.data;
  }
};
