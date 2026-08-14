import axiosInstance from './axiosInstance';

export const employeeSignupApi = {
  async getNextId() {
    const response = await axiosInstance.get('/employee/next-id');
    return response.data;
  },

  async getListManagers() {
    const response = await axiosInstance.get('/employee/list-managers');
    return response.data;
  },

  async signup(employeeData) {
    const response = await axiosInstance.post('/employee/signup', employeeData);
    return response.data;
  },

  async login(credentials) {
    const response = await axiosInstance.post('/employee/auth/login', credentials);
    if (response.data.success && response.data.data?.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.employee));
    }
    return response.data;
  },

  async getMe() {
    const response = await axiosInstance.get('/employee/me');
    return response.data;
  }
};
