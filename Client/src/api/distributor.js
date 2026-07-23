import axiosInstance from './axiosInstance';

export const distributorApi = {
  /**
   * 1. Register Distributor (Public)
   */
  registerDistributor: async (formData) => {
    const response = await axiosInstance.post('/distributors', formData);
    return response.data;
  },

  resendOtp: async (emailOrId) => {
    const payload = emailOrId.includes('@')
      ? { email: emailOrId }
      : { distributorId: emailOrId };

    const response = await axiosInstance.post('/distributors/resend-otp', payload);
    return response.data;
  },

  verifyOtp: async (distributorId, otp) => {
    const response = await axiosInstance.post('/distributors/verify-otp', {
      distributorId,
      otp
    });
    return response.data;
  },

  createProposal: async (proposalData) => {
    const response = await axiosInstance.post('/distributors/proposals', proposalData, {
      headers: { 'X-Portal-Context': 'customer' }
    });
    return response.data;
  },

  getActiveProposalsAdmin: async () => {
    const response = await axiosInstance.get('/distributors/proposals/active', {
      headers: { 'X-Portal-Context': 'admin' }
    });
    return response.data;
  },

  getDistributorProposalsCustomer: async (distributorId, division) => {
    const token = localStorage.getItem('distributor_token');
  
    if (!token || token === 'undefined') {
      console.warn("No valid distributor token found in storage.");
      return { success: false, data: [] };
    }
    const query = division ? `?division=${division}` : '';
  
    const response = await axiosInstance.get(`/distributors/proposals/distributor/${distributorId}${query}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Portal-Context': 'customer'
      }
    });
    return response.data;
  },

  getActiveProposals: async () => {
    const response = await axiosInstance.get('/distributors/proposals/active');
    return response.data;
  },

  updateProposalStatus: async (id, status) => {
    const response = await axiosInstance.patch(`/distributors/proposals/${id}/status`, { status }, {
      headers: { 'X-Portal-Context': 'admin' }
    });
    return response.data;
  },

  // 🟢 FIXED: Handles both object payload { amount, lotId, quantity } and positional arguments safely
  createRazorpayOrder: async (paymentData, lotIdArg, quantityArg) => {
    let payload;
    if (typeof paymentData === 'object' && paymentData !== null) {
      payload = paymentData;
    } else {
      payload = { 
        amount: paymentData, 
        lotId: lotIdArg, 
        quantity: quantityArg 
      };
    }

    const response = await axiosInstance.post('/distributors/payments/razorpay/create-order', payload, {
      headers: { 'X-Portal-Context': 'customer' }
    });
    return response.data;
  },
  
  verifyRazorpayPayment: async (paymentPayload) => {
    const response = await axiosInstance.post('/distributors/payments/razorpay/verify-payment', paymentPayload, {
      headers: { 'X-Portal-Context': 'customer' }
    });
    return response.data;
  },

  getDistributorStatus: async (id) => {
    const response = await axiosInstance.get(`/distributors/status/${id}`, {
      headers: { 'X-Portal-Context': 'customer' }
    });
    return response.data;
  },

  getDistributors: async () => {
    const response = await axiosInstance.get('/distributors', {
      headers: { 'X-Portal-Context': 'admin' }
    });
    return response.data;
  },

  toggleVerify: async (id) => {
    const response = await axiosInstance.patch(`/distributors/${id}/verify`, {}, {
      headers: { 'X-Portal-Context': 'admin' }
    });
    return response.data;
  },

  deleteDistributor: async (id) => {
    const response = await axiosInstance.delete(`/distributors/${id}`, {
      headers: { 'X-Portal-Context': 'admin' }
    });
    return response.data;
  },

  downloadGstCertificate: async (id, originalName) => {
    const response = await axiosInstance.get(`/distributors/${id}/gst-certificate`, {
      responseType: 'blob',
      headers: { 'X-Portal-Context': 'admin' }
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
      responseType: 'blob',
      headers: { 'X-Portal-Context': 'admin' }
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