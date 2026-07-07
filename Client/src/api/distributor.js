import axiosInstance from './axiosInstance';

export const distributorApi = {
  /**
   * 1. Register Distributor (Public)
   * Initiates distributor onboarding, uploads the GST/Udyam files,
   * and triggers a 6-digit verification OTP to the applicant's email.
   * * @param {FormData} formData - Multi-part form payload containing name, email, mobile, address, gstCertificate, and udyamCertificate
   * @returns {Promise<Object>} API response data object containing success status and distributorId
   */
  registerDistributor: async (formData) => {
    const response = await axiosInstance.post('/distributors', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * 2. Verify Distributor OTP (Public)
   * Submits the 6-digit security pin to verify the applicant's identity
   * and unlock access permissions.
   * * @param {String} distributorId - Unique MongoDB tracking identification string generated during Step 1
   * @param {String} otp - The 6-digit passcode sent to the user's email address
   * @returns {Promise<Object>} API response data object containing verification confirmation status
   */
  verifyOtp: async (distributorId, otp) => {
    const response = await axiosInstance.post('/distributors/verify-otp', {
      distributorId,
      otp
    });
    return response.data;
  },

  /**
   * 3. Get All Distributors (Protected)
   * Retrieves a list of all registered business accounts sorted by newest entry first.
   * Requires role permissions: ADMIN, MANAGER, or HR.
   */
  getDistributors: async () => {
    const response = await axiosInstance.get('/distributors');
    return response.data;
  },

  /**
   * 4. Toggle Verification Status (Protected)
   * Switches the 'isVerified' boolean flag layout state inside the database.
   * Requires role permissions: ADMIN, MANAGER, or HR.
   */
  toggleVerify: async (id) => {
    const response = await axiosInstance.patch(`/distributors/${id}/verify`);
    return response.data;
  },

  /**
   * 5. Delete Distributor Record (Protected)
   * Drops the target profile entry from the collection and purges files from the disk storage.
   * Requires role permissions: ADMIN, MANAGER, or HR.
   */
  deleteDistributor: async (id) => {
    const response = await axiosInstance.delete(`/distributors/${id}`);
    return response.data;
  },

  /**
   * 6. Download GST Document Stream (Protected)
   * Downloads the compiled certificate file payload directly into the client viewport container.
   */
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

  /**
   * 7. Download Udyam Document Stream (Protected)
   * Downloads the uploaded Udyam business certificate array blob into local client storage.
   */
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