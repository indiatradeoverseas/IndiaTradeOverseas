import axios from './axiosInstance';

// Individual functions
export const getDispatchSummary = async () => {
  const res = await axios.get('/v1/dispatch/dashboard-summary');
  return res.data;
};

export const getDispatches = async () => {
  const res = await axios.get('/v1/dispatch');
  return res.data;
};

export const createDispatch = async (data) => {
  const res = await axios.post('/v1/dispatch', data);
  return res.data;
};

export const updateDispatchStatus = async (id, status) => {
  const res = await axios.patch(`/v1/dispatch/${id}/status`, { status });
  return res.data;
};

export const uploadPOD = async (id, podFileUrl) => {
  const res = await axios.patch(`/v1/dispatch/${id}/pod`, { podFileUrl });
  return res.data;
};

export const completeTrip = async (id) => {
  const res = await axios.patch(`/v1/dispatch/${id}/complete`);
  return res.data;
};

export const updateDispatch = async (id, data) => {
  const res = await axios.patch(`/v1/dispatch/${id}`, data);
  return res.data;
};

// Unified object export expected by Dispatches.jsx
export const dispatchesApi = {
  getDispatchSummary,
  getDispatches,
  createDispatch,
  updateDispatchStatus,
  uploadPOD,
  completeTrip,
  updateDispatch
};