const dispatchService = require('./dispatch.service');
// ✅ Safely handle standard response utility exports (ok, fail)
const { ok, fail } = require('../../utils/response');

exports.createDispatch = async (req, res) => {
  try {
    const result = await dispatchService.createDispatch(req.body);
    return ok(res, result, 'Dispatch created successfully', 201, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.getAllDispatches = async (req, res) => {
  try {
    const dispatches = await dispatchService.getAllDispatches(req.query);
    return ok(res, { dispatches }, 'Dispatches fetched successfully', 200, req);
  } catch (error) {
    return fail(res, 500, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.getDispatchById = async (req, res) => {
  try {
    const dispatch = await dispatchService.getDispatchById(req.params.id);
    if (!dispatch) {
      return fail(res, 404, 'NOT_FOUND', 'Dispatch record not found', [], req);
    }
    return ok(res, dispatch, 'Dispatch record fetched', 200, req);
  } catch (error) {
    return fail(res, 500, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const result = await dispatchService.updateDispatchStatus(req.params.id, status, req.body);
    return ok(res, result, 'Dispatch status updated successfully', 200, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.updateDispatch = async (req, res) => {
  try {
    const dispatch = await dispatchService.updateDispatch(req.params.id, req.body);
    return ok(res, dispatch, 'Dispatch updated successfully', 200, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.uploadPOD = async (req, res) => {
  try {
    const podFileUrl = req.body.proofDocumentId || req.body.podFileUrl;
    const userId = req.user?._id || req.user?.id;
    const result = await dispatchService.updatePOD(req.params.id, podFileUrl, userId);
    return ok(res, result, 'POD updated successfully', 200, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.completeTrip = async (req, res) => {
  try {
    const result = await dispatchService.completeDispatch(req.params.id);
    return ok(res, result, 'Trip marked as completed', 200, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.getAdminSummary = async (req, res) => {
  try {
    const summary = await dispatchService.getDashboardTransportSummary();
    return ok(res, summary, 'Transport dashboard summary fetched', 200, req);
  } catch (error) {
    return fail(res, 500, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.sendEmergencySOS = async (req, res) => {
  try {
    const result = await dispatchService.processEmergencySOS(req.body, req.user);
    return ok(res, result, 'Emergency SOS alert dispatched to Transport Manager', 200, req);
  } catch (error) {
    return fail(res, 500, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.logExpense = async (req, res) => {
  try {
    const result = await dispatchService.logExpense(req.params.id, req.body);
    return ok(res, result, 'Trip expense logged successfully', 200, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

// ─── PHASE 4.1 ENHANCEMENT CONTROLLERS ──────────────────────────────────────

exports.acknowledgeEmergencySOS = async (req, res) => {
  try {
    const sosId = req.params.sosId || req.body.sosId;
    const result = await dispatchService.acknowledgeBreakdownAlert(sosId, req.user);
    return ok(res, result, 'Breakdown SOS acknowledged by Transport Manager', 200, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.submitPaymentProof = async (req, res) => {
  try {
    const result = await dispatchService.submitPaymentProof(req.params.id, req.body, req.user);
    return ok(res, result, 'Payment proof submitted successfully', 200, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.verifyPaymentProof = async (req, res) => {
  try {
    const result = await dispatchService.verifyPaymentProof(req.params.id, req.user);
    return ok(res, result, 'Payment proof verified by Finance/Manager', 200, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.recordStartOdometer = async (req, res) => {
  try {
    const result = await dispatchService.recordStartOdometer(req.params.id, req.body, req.user);
    return ok(res, result, 'Start odometer reading recorded', 200, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.recordEndOdometer = async (req, res) => {
  try {
    const result = await dispatchService.recordEndOdometer(req.params.id, req.body, req.user);
    return ok(res, result, 'End odometer reading recorded and distance computed', 200, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.addFuelLog = async (req, res) => {
  try {
    const result = await dispatchService.addFuelLog(req.params.id, req.body, req.user);
    return ok(res, result, 'Fuel stop logged and profitability recalculated', 200, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.submitDepartureImages = async (req, res) => {
  try {
    const result = await dispatchService.submitDepartureImages(req.params.id, req.body, req.user);
    return ok(res, result, 'Departure verification photos submitted', 200, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.submitDeliveryImages = async (req, res) => {
  try {
    const result = await dispatchService.submitDeliveryImages(req.params.id, req.body, req.user);
    return ok(res, result, 'Delivery verification photos submitted', 200, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

// ─── WORK UPDATE LOG PERSISTENCE ──────────────────────────────────────────

exports.createWorkUpdate = async (req, res) => {
  try {
    const result = await dispatchService.createWorkUpdate(req.body);
    return ok(res, result, 'Work update saved to MongoDB', 201, req);
  } catch (error) {
    return fail(res, 400, 'DISPATCH_ERROR', error.message, [], req);
  }
};

exports.getWorkUpdates = async (req, res) => {
  try {
    const { driverId, driverName } = req.query;
    const updates = await dispatchService.getWorkUpdates(driverId, driverName);
    return ok(res, { workUpdates: updates }, 'Work updates fetched from MongoDB', 200, req);
  } catch (error) {
    return fail(res, 500, 'DISPATCH_ERROR', error.message, [], req);
  }
};