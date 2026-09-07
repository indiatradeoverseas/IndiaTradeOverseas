import axiosInstance from './axiosInstance';

export const payslipApi = {
  async uploadPayslip(formData) {
    const response = await axiosInstance.post('/payslips', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async generatePayslip(payslipData) {
    const response = await axiosInstance.post('/payslips/generate', payslipData);
    return response.data;
  },

  async getEmployeePayslips(employeeId) {
    const response = await axiosInstance.get(`/payslips/employee/${employeeId}`);
    return response.data;
  },

  async downloadPayslip(id) {
    const response = await axiosInstance.get(`/payslips/${id}/download`, {
      responseType: 'blob'
    });
    return response;
  },

  async deletePayslip(id) {
    const response = await axiosInstance.delete(`/payslips/${id}`);
    return response.data;
  }
};
