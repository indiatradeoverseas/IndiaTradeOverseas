const ItoAdsOrder = require('./itoAdsOrder.model');
const { ok, fail } = require('../../utils/response');

// Public: create order after successful payment verification
const createItoAdsOrder = async (req, res, next) => {
  try {
    const {
      name, email, phone, company, billingAddress, billingState, gstin,
      plan, amount, currency,
      razorpayOrderId, razorpayPaymentId, razorpaySignature,
      consent, notes
    } = req.body;

    if (!name || !email || !phone || !plan || !amount) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Missing required fields.', [], req);
    }

    const order = await ItoAdsOrder.create({
      name, email, phone, company, billingAddress, billingState, gstin,
      plan, amount, currency: currency || 'INR',
      razorpayOrderId, razorpayPaymentId, razorpaySignature,
      status: 'paid',
      consent: !!consent,
      notes
    });

    return ok(res, order, 'ITO Ads order recorded successfully.', 201, req);
  } catch (error) {
    next(error);
  }
};

// Admin: get all orders
const getAllItoAdsOrders = async (req, res, next) => {
  try {
    const orders = await ItoAdsOrder.find().sort({ createdAt: -1 });
    return ok(res, orders, 'ITO Ads orders fetched.', 200, req);
  } catch (error) {
    next(error);
  }
};

// Admin: update status
const updateItoAdsOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['pending','paid','failed','refunded'].includes(status)) {
      return fail(res, 400, 'INVALID_STATUS', 'Invalid status.', [], req);
    }
    const order = await ItoAdsOrder.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) return fail(res, 404, 'NOT_FOUND', 'Order not found.', [], req);
    return ok(res, order, 'Status updated.', 200, req);
  } catch (error) {
    next(error);
  }
};

// Admin: delete
const deleteItoAdsOrder = async (req, res, next) => {
  try {
    const order = await ItoAdsOrder.findByIdAndDelete(req.params.id);
    if (!order) return fail(res, 404, 'NOT_FOUND', 'Order not found.', [], req);
    return ok(res, null, 'Order deleted.', 200, req);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createItoAdsOrder,
  getAllItoAdsOrders,
  updateItoAdsOrderStatus,
  deleteItoAdsOrder
};