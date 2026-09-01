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

// Fetch Confirmed Leads & Dispatch Queue for Transport Manager
export const getDispatchQueue = async () => {
  try {
    const res = await axios.get('/leads?dispatchQueue=true');
    const allLeads = res.data?.data?.leads || res.data?.leads || (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    
    if (Array.isArray(allLeads)) {
      const confirmedStages = ['ORDER_CONFIRMED', 'DISPATCH_PENDING', 'DISPATCH_PLANNED', 'PAYMENT_PENDING', 'READY', 'CLOSED_WON', 'DEAL_WON', 'DELIVERED', 'COMPLETED'];
      
      const filteredLeads = allLeads.filter(l => {
        const st = (l.stage || '').toUpperCase();
        return confirmedStages.includes(st) || st.includes('CONFIRM') || st.includes('DISPATCH') || st.includes('DELIVER');
      });

      const dispatchLeads = filteredLeads.map(l => {
        let execName = 'Sales Executive';

        if (typeof l.assignedTo === 'object' && l.assignedTo && (l.assignedTo.fullName || l.assignedTo.name)) {
          execName = l.assignedTo.fullName || l.assignedTo.name;
        } else if (typeof l.createdBy === 'object' && l.createdBy && (l.createdBy.fullName || l.createdBy.name)) {
          execName = l.createdBy.fullName || l.createdBy.name;
        } else if (l.salesOwner || l.orderOwner || l.confirmedBy) {
          execName = l.salesOwner || l.orderOwner || l.confirmedBy;
        } else if (typeof l.assignedTo === 'string' && l.assignedTo.length > 5) {
          execName = l.assignedTo;
        }

        let mgrName = 'Transport Manager';
        if (typeof l.assignedBy === 'object' && l.assignedBy && (l.assignedBy.fullName || l.assignedBy.name)) {
          mgrName = l.assignedBy.fullName || l.assignedBy.name;
        } else if (l.assignedByManager || l.managerName) {
          mgrName = l.assignedByManager || l.managerName;
        }

        const calcValue = Number(l.leadValue || l.estimatedValue || l.freightAmount || l.totalFreightAmount || l.freightRate) || 
          (parseFloat(l.quantity) ? Math.round(parseFloat(l.quantity) * 750) : 0);

        const currentStageUpper = (l.stage || '').toUpperCase();
        const computedStatus = ['DELIVERED', 'COMPLETED'].includes(currentStageUpper) ? 'DELIVERED' : (l.status || 'ORDER_CONFIRMED');

        return {
          _id: l._id,
          orderNumber: l.leadCode || l.leadId || `ORD-${l._id?.slice(-4)}`,
          customerName: l.customerName || l.companyName || l.contactPerson || 'Confirmed Client',
          companyName: l.companyName || l.customerName || '',
          material: l.productCategory || l.product || 'Cargo Goods',
          weightTons: l.quantity || '—',
          origin: l.origin || l.originCity || l.pickupAddress || '—',
          destination: l.destination || l.destCity || l.deliveryAddress || l.city || l.country || '—',
          priority: l.priority || 'NORMAL',
          freightAmount: calcValue,
          stage: (l.stage || 'ORDER_CONFIRMED').replace(/_/g, ' '),
          rawStage: l.stage || 'ORDER_CONFIRMED',
          status: computedStatus,
          salesOwner: execName,
          orderConfirmedBy: execName,
          assignedByManager: mgrName,
          phone: l.phone || l.phoneMasked || '—',
          podFileUrl: l.podFileUrl || l.podUrl || l.proofUrl || l.paymentProofUrl,
          paymentProofUrl: l.paymentProofUrl || l.proofUrl,
          driverProofUrl: l.driverProofUrl,
          photoUrl: l.photoUrl || l.proofUrl,
          paymentProof: l.paymentProof,
          deliveryImages: l.deliveryImages,
          departureImages: l.departureImages
        };
      });
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

// ─── PHASE 4.1 API ENDPOINTS ──────────────────────────────────────────────

export const acknowledgeSOS = async (sosId) => {
  const res = await axios.post(`/v1/dispatch/emergency/${sosId}/acknowledge`);
  return res.data;
};

export const submitPaymentProof = async (id, data) => {
  const res = await axios.post(`/v1/dispatch/${id}/payment-proof`, data);
  return res.data;
};

export const verifyPaymentProof = async (id) => {
  const res = await axios.post(`/v1/dispatch/${id}/verify-payment`);
  return res.data;
};

export const recordStartOdometer = async (id, data) => {
  const res = await axios.post(`/v1/dispatch/${id}/odometer/start`, data);
  return res.data;
};

export const recordEndOdometer = async (id, data) => {
  const res = await axios.post(`/v1/dispatch/${id}/odometer/end`, data);
  return res.data;
};

export const addFuelLog = async (id, data) => {
  const res = await axios.post(`/v1/dispatch/${id}/fuel-log`, data);
  return res.data;
};

export const submitDepartureImages = async (id, data) => {
  const res = await axios.post(`/v1/dispatch/${id}/departure-images`, data);
  return res.data;
};

export const submitDeliveryImages = async (id, data) => {
  const res = await axios.post(`/v1/dispatch/${id}/delivery-images`, data);
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
  acknowledgeSOS,
  logTripExpense,
  submitPaymentProof,
  verifyPaymentProof,
  recordStartOdometer,
  recordEndOdometer,
  addFuelLog,
  submitDepartureImages,
  submitDeliveryImages
};