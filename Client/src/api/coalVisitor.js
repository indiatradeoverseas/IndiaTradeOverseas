import axiosInstance from './axiosInstance';

export const coalVisitorApi = {
  create: async (payload) =>
    (
      await axiosInstance.post(
        '/coal-visitors',
        payload
      )
    ).data,

  get: async (visitorId) =>
    (
      await axiosInstance.get(
        `/coal-visitors/${encodeURIComponent(
          visitorId
        )}`
      )
    ).data,

  createRazorpayOrder: async (
    visitorId
  ) =>
    (
      await axiosInstance.post(
        `/coal-visitors/${encodeURIComponent(
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
        `/coal-visitors/${encodeURIComponent(
          visitorId
        )}/payments/razorpay/verify-payment`,
        payload
      )
    ).data,

  list: async (limit = 500) =>
    (
      await axiosInstance.get(
        `/coal-visitors/crm/list?limit=${limit}`,
        {
          headers: {
            'X-Portal-Context':
              'admin',
          },
        }
      )
    ).data,
};