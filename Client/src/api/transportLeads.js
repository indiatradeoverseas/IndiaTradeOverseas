import axios from './axiosInstance';

export const getTransportLeads = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const res = await axios.get(`/transport-leads${queryString ? `?${queryString}` : ''}`);
  return res.data;
};

export const createTransportLead = async (data) => {
  const res = await axios.post('/transport-leads', data);
  return res.data;
};

export const bulkUploadTransportLeads = async (leads) => {
  const res = await axios.post('/transport-leads/bulk', { leads });
  return res.data;
};

export const assignMultipleDrivers = async (id, drivers) => {
  const res = await axios.patch(`/transport-leads/${id}/assign-drivers`, { drivers });
  return res.data;
};

export const updateTransportLeadStatus = async (id, status) => {
  const res = await axios.patch(`/transport-leads/${id}/status`, { status });
  return res.data;
};

export const deleteTransportLead = async (id) => {
  const res = await axios.delete(`/transport-leads/${id}`);
  return res.data;
};

export const transportLeadsApi = {
  getTransportLeads,
  createTransportLead,
  bulkUploadTransportLeads,
  assignMultipleDrivers,
  updateTransportLeadStatus,
  deleteTransportLead
};

export default transportLeadsApi;
