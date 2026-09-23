import axiosInstance from "./axiosInstance";

export const onionVisitorApi = {
  create: async (payload) =>
    (
      await axiosInstance.post(
        "/onion-visitors",
        payload
      )
    ).data,

  get: async (visitorId) =>
    (
      await axiosInstance.get(
        `/onion-visitors/${encodeURIComponent(
          visitorId
        )}`
      )
    ).data,

  createRazorpayOrder: async (visitorId) =>
    (
      await axiosInstance.post(
        `/onion-visitors/${encodeURIComponent(
          visitorId
        )}/payments/razorpay/create-order`,
        {}
      )
    ).data,

  verifyPayment: async (
    visitorId,
    payload
  ) =>
    (
      await axiosInstance.post(
        `/onion-visitors/${encodeURIComponent(
          visitorId
        )}/payments/razorpay/verify-payment`,
        payload
      )
    ).data,

  list: async (limit = 500) =>
    (
      await axiosInstance.get(
        `/onion-visitors/crm/list?limit=${limit}`,
        {
          headers: {
            "X-Portal-Context": "admin",
          },
        }
      )
    ).data,
};