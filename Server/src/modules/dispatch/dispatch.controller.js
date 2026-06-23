const dispatchService = require('./dispatch.service');
const { ok, fail } = require('../../utils/response');

async function createTruck(req, res, next) {
  try {
    const { truckNo } = req.body;
    if (!truckNo) return fail(res, 400, 'VALIDATION_FAILED', 'truckNo is required');

    const truck = await dispatchService.createTruck(req.body);
    return ok(res, { truck }, 'Truck registered successfully', 201, req);
  } catch (error) {
    if (error.code === 11000) return fail(res, 400, 'VALIDATION_FAILED', 'Truck number already exists');
    next(error);
  }
}

async function getTrucks(req, res, next) {
  try {
    const trucks = await dispatchService.listTrucks();
    return ok(res, { trucks }, 'Trucks list retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function createDriver(req, res, next) {
  try {
    const { fullName, phone } = req.body;
    if (!fullName || !phone) return fail(res, 400, 'VALIDATION_FAILED', 'fullName and phone are required');

    const driver = await dispatchService.createDriver(req.body);
    return ok(res, { driver }, 'Driver registered successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

async function getDrivers(req, res, next) {
  try {
    const drivers = await dispatchService.listDrivers();
    return ok(res, { drivers }, 'Drivers list retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function createDispatch(req, res, next) {
  try {
    const { leadId, truckNo } = req.body;
    if (!leadId) return fail(res, 400, 'VALIDATION_FAILED', 'leadId is required');

    const dispatch = await dispatchService.createDispatch({
      ...req.body,
      actorId: req.user._id
    });
    return ok(res, { dispatch }, 'Dispatch created successfully', 201, req);
  } catch (error) {
    if (error.message === 'LEAD_NOT_FOUND') return fail(res, 404, 'VALIDATION_FAILED', 'Lead not found');
    next(error);
  }
}

async function getDispatches(req, res, next) {
  try {
    const dispatches = await dispatchService.listDispatches(req.user);
    return ok(res, { dispatches }, 'Dispatches list retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const status = req.body.status || req.body.dispatchStatus;
    const { remarks } = req.body;
    if (!status) return fail(res, 400, 'VALIDATION_FAILED', 'status is required');

    const dispatch = await dispatchService.updateDispatchStatus({
      id: req.params.id,
      status,
      remarks,
      actorId: req.user._id
    });
    return ok(res, { dispatch }, 'Dispatch status updated successfully', 200, req);
  } catch (error) {
    if (error.message === 'DISPATCH_NOT_FOUND') return fail(res, 404, 'VALIDATION_FAILED', 'Dispatch not found');
    next(error);
  }
}

async function uploadProof(req, res, next) {
  try {
    if (!req.body.proofDocumentId) return fail(res, 400, 'VALIDATION_FAILED', 'proofDocumentId is required');
    const dispatch = await dispatchService.uploadDispatchProof({
      id: req.params.id,
      proofDocumentId: req.body.proofDocumentId,
      actorId: req.user._id
    });
    return ok(res, { dispatch }, 'Dispatch proof saved successfully', 200, req);
  } catch (error) {
    if (error.message === 'DISPATCH_NOT_FOUND') return fail(res, 404, 'VALIDATION_FAILED', 'Dispatch not found');
    next(error);
  }
}

module.exports = {
  createTruck,
  getTrucks,
  createDriver,
  getDrivers,
  createDispatch,
  getDispatches,
  updateStatus,
  uploadProof
};
