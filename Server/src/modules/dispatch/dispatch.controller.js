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
    const result = await dispatchService.updateStatus(req.params.id, status);
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