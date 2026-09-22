import axiosInstance from './axiosInstance';

export const employeeActivityApi = {
  // 1. Send active session heartbeat
  sendHeartbeat: async () => {
    try {
      const response = await axiosInstance.post('/employee-activity/heartbeat');
      return response.data;
    } catch (error) {
      console.warn('Heartbeat error:', error);
      return { success: false, message: error.message };
    }
  },

  // 2. Log a specific CRM action manually or automatically
  logAction: async (actionCategory, details = '', metadata = {}) => {
    try {
      const response = await axiosInstance.post('/employee-activity/log-action', {
        actionCategory,
        details,
        metadata
      });
      return response.data;
    } catch (error) {
      console.warn('Log CRM action error:', error);
      return { success: false, message: error.message };
    }
  },

  // 3. Get live employee statuses (Green dot, shift hours, inactive time)
  getLiveStatuses: async () => {
    try {
      const response = await axiosInstance.get('/employee-activity/live-status');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch live employee statuses:', error);
      return { success: false, data: { employees: [] }, message: error.message };
    }
  },

  // 4. Get activity reports (daily, weekly, monthly, employee & dept breakdown)
  getReports: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/employee-activity/reports', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch activity reports:', error);
      return { success: false, message: error.message };
    }
  },

  // 5. Get official 6:00 PM shift end report
  get6PMReport: async () => {
    try {
      const response = await axiosInstance.get('/employee-activity/6pm-report');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch 6:00 PM report:', error);
      return { success: false, message: error.message };
    }
  },

  // 6. Download export CSV report
  exportReportCSV: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/employee-activity/export', {
        params,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `employee-activity-report-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return { success: true };
    } catch (error) {
      console.error('Failed to export CSV activity report:', error);
      return { success: false, message: error.message };
    }
  }
};
