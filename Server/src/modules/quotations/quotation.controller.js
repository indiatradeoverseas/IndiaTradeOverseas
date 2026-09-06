const quotationService = require('./quotation.service');
const { ok, fail } = require('../../utils/response');
const Quotation = require('./quotation.model');
const Lead = require('../leads/lead.model');

async function requestQuotation(req, res, next) {
  try {
    const { leadId, employeeRequestedPrice, marginNote, paymentTerms } = req.body;
    if (!leadId || !employeeRequestedPrice) {
      return fail(res, 400, 'VALIDATION_FAILED', 'leadId and employeeRequestedPrice are required');
    }

    const quotation = await quotationService.createQuotationRequest({
      ...req.body,
      actorId: req.user._id
    });

    return ok(res, { quotation }, 'Quotation request created successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

async function pendingQuotations(req, res, next) {
  try {
    let filter = {};
    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }
    const role = (req.user?.role || '').toUpperCase();
    if (role !== 'ADMIN' && role !== 'MANAGER' && !role.includes('MANAGER')) {
      const myLeads = await Lead.find({ assignedTo: req.user._id }).select('_id');
      const leadIds = myLeads.map(l => l._id);
      filter.leadId = { $in: leadIds };
    }

    const quotations = await Quotation.find(filter)
      .populate({
        path: 'leadId',
        populate: { path: 'assignedTo', select: 'fullName name email role' }
      })
      .populate('requestedBy', 'fullName name email role')
      .sort({ createdAt: -1 });

    const Employee = require('../employee/employee.model');
    const User = require('../users/user.model');

    const formattedQuotations = await Promise.all(
      quotations.map(async (q) => {
        const doc = q.toObject ? q.toObject() : q;
        let reqByObj = doc.requestedBy;

        if (reqByObj && typeof reqByObj !== 'object') {
          const userDoc = await User.findById(reqByObj).select('fullName name email');
          const empDoc = await Employee.findById(reqByObj).select('name fullName email');
          const found = userDoc || empDoc;
          if (found) {
            reqByObj = {
              _id: found._id,
              fullName: found.fullName || found.name,
              email: found.email
            };
          }
        }

        if (!reqByObj && q.requestedBy) {
          const empDoc = await Employee.findById(q.requestedBy).select('name fullName email');
          if (empDoc) {
            reqByObj = {
              _id: empDoc._id,
              fullName: empDoc.fullName || empDoc.name,
              email: empDoc.email
            };
          }
        }

        if (!reqByObj && doc.leadId && doc.leadId.assignedTo) {
          const assigned = doc.leadId.assignedTo;
          reqByObj = {
            _id: assigned._id || assigned,
            fullName: assigned.fullName || assigned.name || 'Ananya Patel',
            email: assigned.email
          };
        }

        doc.requestedBy = reqByObj;
        return doc;
      })
    );

    return ok(res, { quotations: formattedQuotations }, 'Quotations retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function approveQuotation(req, res, next) {
  try {
    const { approvedPrice } = req.body;
    const quotation = await quotationService.approveQuotation({
      id: req.params.id,
      approvedPrice,
      actorId: req.user._id
    });
    return ok(res, { quotation }, 'Quotation approved successfully', 200, req);
  } catch (error) {
    if (error.message === 'QUOTATION_NOT_FOUND') {
      return fail(res, 404, 'VALIDATION_FAILED', 'Quotation not found');
    }
    next(error);
  }
}

async function rejectQuotation(req, res, next) {
  try {
    const { marginNote } = req.body;
    const quotation = await quotationService.rejectQuotation({
      id: req.params.id,
      marginNote,
      actorId: req.user._id
    });
    return ok(res, { quotation }, 'Quotation rejected successfully', 200, req);
  } catch (error) {
    if (error.message === 'QUOTATION_NOT_FOUND') {
      return fail(res, 404, 'VALIDATION_FAILED', 'Quotation not found');
    }
    next(error);
  }
}

async function markSentToCustomer(req, res, next) {
  try {
    const quotation = await quotationService.sendToCustomer(req.params.id, req.user._id);
    return ok(res, { quotation }, 'Quotation status updated: Sent to Customer', 200, req);
  } catch (error) {
    if (error.message === 'QUOTATION_NOT_FOUND') {
      return fail(res, 404, 'VALIDATION_FAILED', 'Quotation not found');
    }
    next(error);
  }
}

async function getSummaryReport(req, res, next) {
  try {
    const summary = await quotationService.getQuotationSummary();
    return ok(res, summary, 'Quotation summary report retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function bulkApproveQuotations(req, res, next) {
  try {
    const { quotationIds, approvedPrice } = req.body;
    const result = await quotationService.bulkApproveQuotations({
      quotationIds,
      approvedPrice,
      actorId: req.user._id
    });
    return ok(res, result, `Successfully approved ${result.approvedCount} quotations`, 200, req);
  } catch (error) {
    if (error.message === 'QUOTATION_IDS_REQUIRED') {
      return fail(res, 400, 'VALIDATION_FAILED', 'quotationIds array is required');
    }
    next(error);
  }
}

async function bulkRejectQuotations(req, res, next) {
  try {
    const { quotationIds, marginNote } = req.body;
    const result = await quotationService.bulkRejectQuotations({
      quotationIds,
      marginNote,
      actorId: req.user._id
    });
    return ok(res, result, `Successfully rejected ${result.rejectedCount} quotations`, 200, req);
  } catch (error) {
    if (error.message === 'QUOTATION_IDS_REQUIRED') {
      return fail(res, 400, 'VALIDATION_FAILED', 'quotationIds array is required');
    }
    next(error);
  }
}

module.exports = {
  requestQuotation,
  pendingQuotations,
  approveQuotation,
  rejectQuotation,
  bulkApproveQuotations,
  bulkRejectQuotations,
  markSentToCustomer,
  getSummaryReport
};
