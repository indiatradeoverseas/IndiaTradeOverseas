import axiosInstance from './axiosInstance';

export const employeeProfileApi = {
  async getMyProfile() {
    const response = await axiosInstance.get('/users/me/profile');
    return response.data;
  },

  async updateMyProfile(data) {
    const response = await axiosInstance.patch('/users/me/profile', data);
    return response.data;
  },

  async uploadMyDocument(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post('/users/me/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async getMyDocuments() {
    const response = await axiosInstance.get('/users/me/documents');
    return response.data;
  },

  async getEmployeeProfile(id) {
    const response = await axiosInstance.get(`/users/${id}/profile`);
    return response.data;
  },

  async updateEmployeeProfile(id, data) {
    const response = await axiosInstance.patch(`/users/${id}/profile`, data);
    return response.data;
  },

  async revealEmployeeField(id, field, reason) {
    const response = await axiosInstance.post(`/users/${id}/profile/reveal`, { field, reason });
    return response.data;
  },

  async updateEmploymentStatus(id, employmentStatus, note, effectiveDate) {
    const response = await axiosInstance.patch(`/users/${id}/employment-status`, { employmentStatus, note, effectiveDate });
    return response.data;
  },

  async getEmployeeDocuments(id) {
    const response = await axiosInstance.get(`/users/${id}/documents`);
    return response.data;
  },

  async downloadDocument(id) {
    const response = await axiosInstance.get(`/documents/${id}/download`, { responseType: 'blob' });
    return response.data;
  },

  async uploadMyProfileImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axiosInstance.patch('/users/me/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};
