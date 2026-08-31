import axiosInstance from './axiosInstance';

export const sharedFilesApi = {
  async shareFile(formData) {
    const response = await axiosInstance.post('/shared-files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async getSharedFiles(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/shared-files${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async downloadFile(id) {
    const response = await axiosInstance.get(`/shared-files/${id}/download`, {
      responseType: 'blob'
    });
    return response;
  },

  async deleteSharedFile(id) {
    const response = await axiosInstance.delete(`/shared-files/${id}`);
    return response.data;
  },

  getDownloadUrl(id) {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${baseUrl}/shared-files/${id}/download`;
  }
};
