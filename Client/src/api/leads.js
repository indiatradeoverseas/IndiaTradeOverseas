import axiosInstance from './axiosInstance';

export const leadsApi = {
  async createLead(leadData) {
    const response = await axiosInstance.post('/leads/from-chat', leadData);
    return response.data;
  },

  async getLeads(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(`/leads${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async getLeadById(id) {
    const response = await axiosInstance.get(`/leads/${id}`);
    return response.data;
  },

  async addActivity(leadId, activityData) {
    const response = await axiosInstance.post(`/leads/${leadId}/activity`, activityData);
    return response.data;
  },

  async updateStage(leadId, stageData) {
    const response = await axiosInstance.patch(`/leads/${leadId}/stage`, stageData);
    return response.data;
  },

  async assignLead(leadId, assignData) {
    const response = await axiosInstance.patch(`/admin/leads/${leadId}/assign`, assignData);
    return response.data;
  },

  async deleteLead(leadId) {
    const response = await axiosInstance.delete(`/admin/leads/${leadId}`);
    return response.data;
  }
  , 
  async getDueReminders(){
    const response = await axiosInstance.post('/leads/reminders/due');
    return response.data;
  }
};
