import axiosInstance from './axiosInstance';

export const employeesApi = {
  async getEmployees(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/employees${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async getEmployeeStatus(id) {
    const response = await axiosInstance.get(`/employees/${id}/status`);
    return response.data;
  },

  async updateEmployeeStatus(id, status, currentActivity) {
    const response = await axiosInstance.post(`/employees/${id}/status`, { status, currentActivity });
    return response.data;
  },

  async getEmployeesCount(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/employees/count${queryString ? `?${queryString}` : ''}`);
    return response.data;
  }
};
