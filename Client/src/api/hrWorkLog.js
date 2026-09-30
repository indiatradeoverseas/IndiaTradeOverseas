import axiosInstance from './axiosInstance';

export const hrWorkLogApi = {
  submitHrWorkLog: async (data) => {
    const res = await axiosInstance.post('/hr-work-log', data);
    return res.data;
  },
  getHrWorkLogs: async (params = {}) => {
    const res = await axiosInstance.get('/hr-work-log', { params });
    return res.data;
  }
};
