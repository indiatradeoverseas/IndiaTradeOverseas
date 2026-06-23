import axiosInstance from './axiosInstance';

export const dispatchesApi = {
  async getDispatches() {
    const response = await axiosInstance.get('/dispatch');
    return response.data;
  },

  async createDispatch(dispatchData) {
    const response = await axiosInstance.post('/dispatch', dispatchData);
    return response.data;
  },

  async updateDispatchStatus(id, status) {
    const response = await axiosInstance.patch(`/dispatch/${id}`, { status });
    return response.data;
  }
};
