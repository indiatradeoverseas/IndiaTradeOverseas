import axiosInstance from './axiosInstance';

export const careersApi = {
  // Candidate Application Actions
  applyJob: async (formData) => {
    const response = await axiosInstance.post('/careers', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  getApplications: async () => {
    const response = await axiosInstance.get('/careers');
    return response.data;
  },

  updateApplicationStatus: async (id, status) => {
    const response = await axiosInstance.patch(`/careers/${id}/status`, { status });
    return response.data;
  },

  downloadResume: async (id, originalName) => {
    const response = await axiosInstance.get(`/careers/${id}/resume`, {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', originalName || 'resume.pdf');
    document.body.appendChild(link);
    link.click();
    
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Job Openings Actions
  getJobs: async () => {
    const response = await axiosInstance.get('/careers/jobs');
    return response.data;
  },

  getAllJobs: async () => {
    const response = await axiosInstance.get('/careers/jobs/all');
    return response.data;
  },

  createJob: async (jobData) => {
    const response = await axiosInstance.post('/careers/jobs', jobData);
    return response.data;
  },

  updateJob: async (id, jobData) => {
    const response = await axiosInstance.put(`/careers/jobs/${id}`, jobData);
    return response.data;
  },

  deleteJob: async (id) => {
    const response = await axiosInstance.delete(`/careers/jobs/${id}`);
    return response.data;
  }
};
