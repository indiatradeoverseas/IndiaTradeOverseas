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

    const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', originalName || 'resume.pdf');
    document.body.appendChild(link);
    link.click();

    link.parentNode.removeChild(link);
    // Delay revocation so mobile/slower browsers have time to actually start
    // the download before the blob URL is invalidated.
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  },

  // Opens the resume inline in a new tab instead of forcing a download.
  // `targetWindow` should be a window opened synchronously on the click
  // (before this await) so browsers don't block it as a popup.
  viewResume: async (id, targetWindow) => {
    const response = await axiosInstance.get(`/careers/${id}/resume`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    if (targetWindow && !targetWindow.closed) {
      targetWindow.location.href = url;
    } else {
      window.open(url, '_blank');
    }
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
