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

  async getAllEmployees() {
    const response = await axiosInstance.get('/employee/all');
    return response.data;
  },

  async createEmployee(employeeData) {
    const response = await axiosInstance.post('/employee', employeeData);
    return response.data;
  },

  async updateEmployee(id, employeeData) {
    const response = await axiosInstance.patch(`/employee/${id}`, employeeData);
    return response.data;
  },

  async deleteEmployee(id) {
    const response = await axiosInstance.delete(`/employee/${id}`);
    return response.data;
  },

  async signup(employeeData) {
    const response = await axiosInstance.post('/employee/signup', employeeData);
    return response.data;
  },

  // New: Self-registration for employees (creates pending verification)
  async requestSignup(employeeData) {
    const response = await axiosInstance.post('/employee/signup/request', employeeData);
    return response.data;
  },

  // New: Send OTP for signup
  async sendSignupOtp(employeeData) {
    const response = await axiosInstance.post('/employee/signup/send-otp', employeeData);
    return response.data;
  },

  // New: Verify OTP and create pending employee
  async verifySignupOtp(employeeData) {
    const response = await axiosInstance.post('/employee/signup/verify-otp', employeeData);
    return response.data;
  },

  // New: HR/Admin - Get pending employees
  async getPendingEmployees() {
    const response = await axiosInstance.get('/employee/pending');
    return response.data;
  },

  // New: HR/Admin - Approve pending employee
  async approvePendingEmployee(id) {
    const response = await axiosInstance.post(`/employee/pending/${id}/approve`);
    return response.data;
  },

  // New: HR/Admin - Reject pending employee
  async rejectPendingEmployee(id, reason) {
    const response = await axiosInstance.post(`/employee/pending/${id}/reject`, { reason });
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
