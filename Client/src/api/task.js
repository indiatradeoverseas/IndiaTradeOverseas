import axiosInstance from './axiosInstance';

export const taskApi = {
  async getTasks(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/tasks${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async createTask(taskData) {
    // Support both plain JSON and FormData (when file is attached)
    const isFormData = taskData instanceof FormData;
    const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    const response = await axiosInstance.post('/tasks', taskData, config);
    return response.data;
  },

  async updateTaskStatus(taskId, status, remarks) {
    const response = await axiosInstance.patch(`/tasks/${taskId}`, { status, remarks });
    return response.data;
  },

  async deleteTask(taskId) {
    const response = await axiosInstance.delete(`/tasks/${taskId}`);
    return response.data;
  },

  async getEmployeesByDepartment(department) {
    const params = department ? `?department=${department}` : '';
    const response = await axiosInstance.get(`/tasks/employees${params}`);
    return response.data;
  }
};
