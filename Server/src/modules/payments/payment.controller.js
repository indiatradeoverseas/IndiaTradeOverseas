const mongoose = require('mongoose');
const paymentService = require('./payment.service');
const { ok, fail } = require('../../utils/response');

async function createPayment(req, res, next) {
  try {
    const { leadId, totalAmount, advanceAmount } = req.body;
    if (!leadId || totalAmount === undefined || totalAmount === null || totalAmount === '') {
      return fail(res, 400, 'VALIDATION_FAILED', 'leadId and totalAmount are required');
    }

    if (!mongoose.isValidObjectId(leadId)) {
      return fail(res, 400, 'VALIDATION_FAILED', 'leadId must be a valid identifier');
    }

    const parsedTotalAmount = Number(totalAmount);
    if (Number.isNaN(parsedTotalAmount) || parsedTotalAmount <= 0) {
      return fail(res, 400, 'VALIDATION_FAILED', 'totalAmount must be a valid positive number');
    }

    const parsedAdvanceAmount = Number(advanceAmount || 0);
    if (advanceAmount !== undefined && advanceAmount !== null && advanceAmount !== '' && Number.isNaN(parsedAdvanceAmount)) {
      return fail(res, 400, 'VALIDATION_FAILED', 'advanceAmount must be a valid number');
    }

    const payment = await paymentService.createPayment({
      ...req.body,
      leadId,
      totalAmount: parsedTotalAmount,
      advanceAmount: parsedAdvanceAmount,
      actorId: req.user._id
    });
    return ok(res, { payment }, 'Payment created successfully', 201, req);
  } catch (error) {
    if (error.message === 'LEAD_NOT_FOUND') return fail(res, 404, 'VALIDATION_FAILED', 'Lead not found');
    next(error);
  }
}

async function getPaymentsList(req, res, next) {
  try {
    const payments = await paymentService.listPayments(req.user);
    return ok(res, { payments }, 'Payments retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getOutstandingPayments(req, res, next) {
  try {
    const payments = await paymentService.listOutstandingPayments(req.user);
    return ok(res, { payments }, 'Outstanding payments list retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const payment = await paymentService.updatePaymentStatus({
      id: req.params.id,
      ...req.body,
      actorId: req.user._id
    });
    return ok(res, { payment }, 'Payment details updated successfully', 200, req);
  } catch (error) {
    if (error.message === 'PAYMENT_NOT_FOUND') return fail(res, 404, 'VALIDATION_FAILED', 'Payment not found');
    next(error);
  }
}

async function triggerReminder(req, res, next) {
  try {
    const payment = await paymentService.triggerPaymentReminder(req.params.id, req.user._id);
    return ok(res, { reminderCount: payment.reminderCount }, 'Payment reminder triggered successfully', 200, req);
  } catch (error) {
    if (error.message === 'PAYMENT_NOT_FOUND') return fail(res, 404, 'VALIDATION_FAILED', 'Payment not found');
    next(error);
  }
}

module.exports = {
  createPayment,
  getPaymentsList,
  getOutstandingPayments,
  updateStatus,
  triggerReminder
};



