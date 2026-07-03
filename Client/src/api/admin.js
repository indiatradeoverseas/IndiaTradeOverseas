import axiosInstance from './axiosInstance';

export const adminApi = {
  async getDashboardSummary() {
    const response = await axiosInstance.get('/admin/dashboard/summary');
    return response.data;
  },

  async getPipeline() {
    const response = await axiosInstance.get('/admin/dashboard/pipeline');
    return response.data;
  },

  async getEmployeePerformance() {
    const response = await axiosInstance.get('/admin/dashboard/employee-performance');
    return response.data;
  },

  async getSecurityAlerts() {
    const response = await axiosInstance.get('/security/alerts');
    return response.data;
  },

  async getQuotationQueue() {
    const response = await axiosInstance.get('/admin/dashboard/quotation-queue');
    return response.data;
  },

  async getUsers() {
    const response = await axiosInstance.get('/admin/users');
    return response.data;
  },

  async createUser(userData) {
    const response = await axiosInstance.post('/users', userData);
    return response.data;
  },

  async assignLead(leadId, assignData) {
    const response = await axiosInstance.patch(`/admin/leads/${leadId}/assign`, assignData);
    return response.data;
  },

  async deactivateUser(userId) {
    const response = await axiosInstance.patch(`/admin/users/${userId}/deactivate`);
    return response.data;
  },

  async activateUser(userId) {
    const response = await axiosInstance.patch(`/admin/users/${userId}/activate`);
    return response.data;
  },

  async updateUserRole(userId, role) {
    const response = await axiosInstance.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  async updateUserDepartment(userId, department) {
    const response = await axiosInstance.patch(`/admin/users/${userId}/department`, { department });
    return response.data;
  },

  async updateExportPermission(userId, exportPermission) {
    const response = await axiosInstance.patch(`/admin/users/${userId}/export-permission`, { exportPermission });
    return response.data;
  },

  async updateProductUploadPermission(userId, productUploadPermission) {
    const response = await axiosInstance.patch(`/admin/users/${userId}/product-upload-permission`, { productUploadPermission });
    return response.data;
  },

  async updateLeadPermission(userId, leadPermission) {
    const response = await axiosInstance.patch(`/admin/users/${userId}/lead-permission`, { leadPermission });
    return response.data;
  },

  async updateDocumentPermission(userId, documentPermission) {
    const response = await axiosInstance.patch(`/admin/users/${userId}/document-permission`, { documentPermission });
    return response.data;
  },

  async updateTaskPermission(userId, taskPermission) {
    const response = await axiosInstance.patch(`/admin/users/${userId}/task-permission`, { taskPermission });
    return response.data;
  },

  async updateDispatchPermission(userId, dispatchPermission) {
    const response = await axiosInstance.patch(`/admin/users/${userId}/dispatch-permission`, { dispatchPermission });
    return response.data;
  },

  async updatePaymentPermission(userId, paymentPermission) {
    const response = await axiosInstance.patch(`/admin/users/${userId}/payment-permission`, { paymentPermission });
    return response.data;
  },

  async updateQuotationPermission(userId, quotationPermission) {
    const response = await axiosInstance.patch(`/admin/users/${userId}/quotation-permission`, { quotationPermission });
    return response.data;
  },

  async updateJobPermission(userId, jobPermission) {
    const response = await axiosInstance.patch(`/admin/users/${userId}/job-permission`, { jobPermission });
    return response.data;
  },

  async getAuditLogs(limit = 100) {
    const response = await axiosInstance.get(`/admin/audit-logs?limit=${limit}`);
    return response.data;
  },

  async resolveSecurityAlert(alertId) {
    const response = await axiosInstance.patch(`/admin/security/alerts/${alertId}/resolve`);
    return response.data;
  },

  async deleteUser(userId) {
    const response = await axiosInstance.delete(`/admin/users/${userId}`);
    return response.data;
  },

  async deleteLead(leadId) {
    const response = await axiosInstance.delete(`/admin/leads/${leadId}`);
    return response.data;
  },

  async getDevices() {
    const response = await axiosInstance.get('/admin/devices');
    return response.data;
  },

  async approveDevice(deviceId) {
    const response = await axiosInstance.patch(`/admin/devices/${deviceId}/approve`);
    return response.data;
  },

  async revokeDevice(deviceId) {
    const response = await axiosInstance.patch(`/admin/devices/${deviceId}/revoke`);
    return response.data;
  },

  async revealField(revealData) {
    const response = await axiosInstance.post('/security/reveal', revealData);
    return response.data;
  },

  async logExportAttempt(exportData) {
    const response = await axiosInstance.post('/security/export-attempt', exportData);
    return response.data;
  }
};
