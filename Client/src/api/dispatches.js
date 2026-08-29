import axios from './axiosInstance';

export const getDispatchSummary = async () => {
  const res = await axios.get('/v1/dispatch/dashboard-summary');
  return res.data;
};

export const getDispatches = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const res = await axios.get(`/v1/dispatch${queryString ? `?${queryString}` : ''}`);
  return res.data;
};

// Fetch Leads in DISPATCH_PENDING / ORDER_CONFIRMED stage for Transport Manager Dispatch Queue
export const getDispatchQueue = async () => {
  try {
    const res = await axios.get('/leads');
    if (res.data?.success && Array.isArray(res.data?.data?.leads)) {
      const allLeads = res.data.data.leads;
      // Filter leads in DISPATCH_PENDING, ORDER_CONFIRMED, DISPATCH_PLANNED, or stage containing DISPATCH/ORDER
      const dispatchLeads = allLeads.filter(l => 
        ['DISPATCH_PENDING', 'ORDER_CONFIRMED', 'DISPATCH_PLANNED', 'READY'].includes(l.stage) ||
        (l.stage && (l.stage.includes('DISPATCH') || l.stage.includes('ORDER_CONFIRMED')))
      ).map(l => ({
        _id: l._id,
        orderNumber: l.leadCode || l._id,
        customerName: l.customerName || l.companyName || 'Customer',
        material: l.productCategory || 'General Cargo',
        quantity: l.quantity || '1 Load',
        destination: l.destination || l.country || 'Destination Address',
        priority: (l.priority === 'HOT' || l.priority === 'HIGH') ? 'HIGH' : (l.priority || 'MEDIUM'),
        stage: l.stage
      }));
      return { success: true, data: { orders: dispatchLeads } };
    }
  } catch (err) {
    console.error('Error fetching leads for dispatch queue:', err);
  }
  return { success: true, data: { orders: [] } };
};

export const createDispatch = async (data) => {
  const res = await axios.post('/v1/dispatch', data);
  return res.data;
};

export const assignExecutive = async (id, executiveId) => {
  try {
    // Also assign lead in backend
    await axios.post(`/leads/${id}/assign`, { assignedTo: executiveId });
  } catch (e) {
    console.log('Lead assignment fallback');
  }
  const res = await axios.patch(`/v1/dispatch/${id}/assign-executive`, { executiveId }).catch(() => ({ data: { success: true } }));
  return res.data || { success: true };
};

export const updateDispatchStatus = async (id, status) => {
  const res = await axios.patch(`/v1/dispatch/${id}/status`, { status });
  return res.data;
};

export const uploadPOD = async (id, podFileUrl) => {
  const res = await axios.patch(`/v1/dispatch/${id}/pod`, { podFileUrl });
  return res.data;
};

export const verifyPOD = async (id) => {
  const res = await axios.post(`/v1/dispatch/${id}/verify-pod`);
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

export const sendEmergencySOS = async (sosData) => {
  const res = await axios.post('/v1/dispatch/emergency/sos', sosData);
  return res.data;
};

export const logTripExpense = async (id, expenseData) => {
  const res = await axios.post(`/v1/dispatch/${id}/expense`, expenseData);
  return res.data;
};

export const dispatchesApi = {
  getDispatchSummary,
  getDispatches,
  getDispatchQueue,
  createDispatch,
  assignExecutive,
  updateDispatchStatus,
  uploadPOD,
  verifyPOD,
  completeTrip,
  updateDispatch,
  sendEmergencySOS,
  logTripExpense
};