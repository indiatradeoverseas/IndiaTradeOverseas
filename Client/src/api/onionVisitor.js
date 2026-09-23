import axiosInstance from "./axiosInstance";

export const onionVisitorApi = {
  create: async (payload) => {
    const response =
      await axiosInstance.post(
        "/onion-visitors",
        payload
      );

    return response.data;
  },

  get: async (visitorId) => {
    const response =
      await axiosInstance.get(
        `/onion-visitors/${encodeURIComponent(
          visitorId
        )}`
      );

    return response.data;
  },

  createRazorpayOrder: async (
    visitorId
  ) => {
    const response =
      await axiosInstance.post(
        `/onion-visitors/${encodeURIComponent(
          visitorId
        )}/payments/razorpay/create-order`,
        {}
      );

    return response.data;
  },

  verifyPayment: async (
    visitorId,
    payload
  ) => {
    const response =
      await axiosInstance.post(
        `/onion-visitors/${encodeURIComponent(
          visitorId
        )}/payments/razorpay/verify-payment`,
        payload
      );

    return response.data;
  },

  list: async (limit = 500) => {
    const response =
      await axiosInstance.get(
        `/onion-visitors/crm/list?limit=${limit}`,
        {
          headers: {
            "X-Portal-Context":
              "admin",
          },
        }
      );

    return response.data;
  },
};