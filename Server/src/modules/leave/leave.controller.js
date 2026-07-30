const leaveService = require('./leave.service');
const { ok, fail } = require('../../utils/response');

const ERROR_MESSAGES = {
  INVALID_DATE_RANGE: 'Please provide a valid date range',
  PAID_LEAVE_SINGLE_MONTH_ONLY: 'Paid leave must start and end within the same month',
  PAID_LEAVE_SINGLE_DAY_ONLY: 'Paid leave can only be requested for a single day',
  PAID_LEAVE_ALREADY_USED_THIS_MONTH: 'You have already used your paid leave for this month',
  EMERGENCY_LEAVE_SINGLE_YEAR_ONLY: 'Emergency leave must start and end within the same year',
  EMERGENCY_LEAVE_BALANCE_EXCEEDED: 'This request exceeds your remaining emergency leave balance for the year',
  INVALID_LEAVE_TYPE: 'Invalid leave type',
  LEAVE_NOT_FOUND: 'Leave request not found',
  OWNERSHIP_FORBIDDEN: 'Access denied: you are not authorized to perform this action',
  INVALID_STATUS: 'Status must be APPROVED or REJECTED',
  LEAVE_ALREADY_REVIEWED: 'This leave request has already been reviewed',
  LEAVE_NOT_CANCELLABLE: 'Only pending leave requests can be cancelled'
};

function handleKnownError(error, res, req) {
  if (ERROR_MESSAGES[error.message]) {
    const status = error.message === 'LEAVE_NOT_FOUND' ? 404
      : error.message === 'OWNERSHIP_FORBIDDEN' ? 403
      : 400;
    return fail(res, status, error.message, ERROR_MESSAGES[error.message]);
  }
  return null;
}

async function createLeave(req, res, next) {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    if (!leaveType || !startDate || !endDate || !reason) {
      return fail(res, 400, 'VALIDATION_FAILED', 'leaveType, startDate, endDate and reason are required');
    }
    const leave = await leaveService.applyForLeave({ leaveType, startDate, endDate, reason }, req.user);
    return ok(res, { leave }, 'Leave request submitted successfully', 201, req);
  } catch (error) {
    if (handleKnownError(error, res, req)) return;
    next(error);
  }
}

async function getMyBalance(req, res, next) {
  try {
    const balance = await leaveService.getMyLeaveBalance(req.user);
    return ok(res, { balance }, 'Leave balance retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function listLeaves(req, res, next) {
  try {
    const leaves = await leaveService.listLeaves(req.user, req.query);
    return ok(res, { leaves }, 'Leave requests retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getLeaveById(req, res, next) {
  try {
    const leave = await leaveService.getLeaveById(req.params.id, req.user);
    return ok(res, { leave }, 'Leave request retrieved', 200, req);
  } catch (error) {
    if (handleKnownError(error, res, req)) return;
    next(error);
  }
}

async function reviewLeave(req, res, next) {
  try {
    const { status, reviewNote } = req.body;
    if (!status) return fail(res, 400, 'VALIDATION_FAILED', 'status is required');
    const leave = await leaveService.reviewLeave(req.params.id, { status, reviewNote }, req.user);
    return ok(res, { leave }, 'Leave request reviewed', 200, req);
  } catch (error) {
    if (handleKnownError(error, res, req)) return;
    next(error);
  }
}

async function cancelLeave(req, res, next) {
  try {
    const leave = await leaveService.cancelLeave(req.params.id, req.user);
    return ok(res, { leave }, 'Leave request cancelled', 200, req);
  } catch (error) {
    if (handleKnownError(error, res, req)) return;
    next(error);
  }
}

module.exports = {
  createLeave,
  getMyBalance,
  listLeaves,
  getLeaveById,
  reviewLeave,
  cancelLeave
};
