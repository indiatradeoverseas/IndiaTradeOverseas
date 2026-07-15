import axiosInstance from './axiosInstance';

export const distributorApi = {
  /**
   * 1. Register Distributor (Public)
   * Initiates distributor onboarding, uploads the necessary verification files,
   * and triggers a 6-digit verification OTP to the applicant's email address.
   * 
   * @param {FormData} 
   * @returns {Promise<Object>} 
   */
  registerDistributor: async (formData) => {
    const response = await axiosInstance.post('/distributors', formData);
    return response.data;
  },

  verifyOtp: async (distributorId, otp) => {
    const response = await axiosInstance.post('/distributors/verify-otp', {
      distributorId,
      otp
    });
    return response.data;
  },

  getDistributors: async () => {
    const response = await axiosInstance.get('/distributors');
    return response.data;
  },

  toggleVerify: async (id) => {
    const response = await axiosInstance.patch(`/distributors/${id}/verify`);
    return response.data;
  },

  deleteDistributor: async (id) => {
    const response = await axiosInstance.delete(`/distributors/${id}`);
    return response.data;
  },

  downloadGstCertificate: async (id, originalName) => {
    const response = await axiosInstance.get(`/distributors/${id}/gst-certificate`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', originalName || 'gst_certificate.pdf');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  downloadUdyamCertificate: async (id, originalName) => {
    const response = await axiosInstance.get(`/distributors/${id}/udyam-certificate`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', originalName || 'udyam_certificate.pdf');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};