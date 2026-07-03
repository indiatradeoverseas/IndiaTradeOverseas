import axiosInstance from './axiosInstance';

export const documentsApi = {
  async getDocuments() {
    const response = await axiosInstance.get('/documents');
    return response.data;
  },

  async uploadDocument(formData) {
    const response = await axiosInstance.post('/documents/upload', formData);
    return response.data;
  },

  async updateAccessLevel(id, accessLevel) {
    const response = await axiosInstance.patch(`/documents/${id}/access-level`, { accessLevel });
    return response.data;
  },

  async deleteDocument(id) {
    const response = await axiosInstance.delete(`/documents/${id}`);
    return response.data;
  },

  async downloadDocument(id) {
    const response = await axiosInstance.get(`/documents/${id}/download`, { responseType: 'blob' });
    return response.data;
  }
};
