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

    const actorId = req.user?.employeeDbId || req.user?._id;

    const quotation = await quotationService.createQuotationRequest({
      ...req.body,
      actorId
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
      .populate('leadId')
      .sort({ createdAt: -1 });

    const Employee = require('../employee/employee.model');
    const User = require('../users/user.model');
    const Admin = require('../admin-auth/admin.model');

    const formattedQuotations = await Promise.all(
      quotations.map(async (q) => {
        const doc = q.toObject ? q.toObject() : q;
        const rawReqId = q.requestedBy;
        let reqByObj = null;

        // 1. Resolve requestedBy ID directly across User, Employee, and Admin collections
        if (rawReqId) {
          const reqIdStr = rawReqId._id || rawReqId;
          const userDoc = await User.findById(reqIdStr).select('fullName name email');
          const empDoc = await Employee.findById(reqIdStr).select('name fullName email');
          const adminDoc = await Admin.findById(reqIdStr).select('name fullName email');
          const found = userDoc || empDoc || adminDoc;
          if (found) {
            reqByObj = {
              _id: found._id,
              fullName: found.fullName || found.name || 'Staff Member',
              email: found.email || ''
            };
          }
        }

        // 2. Fallback to Lead's assignedTo if requestedBy was missing
        if (!reqByObj && doc.leadId && doc.leadId.assignedTo) {
          const assigned = doc.leadId.assignedTo;
          if (typeof assigned === 'object' && (assigned.fullName || assigned.name)) {
            reqByObj = {
              _id: assigned._id,
              fullName: assigned.fullName || assigned.name,
              email: assigned.email || ''
            };
          } else if (assigned) {
            const userDoc = await User.findById(assigned).select('fullName name email');
            const empDoc = await Employee.findById(assigned).select('name fullName email');
            const adminDoc = await Admin.findById(assigned).select('name fullName email');
            const found = userDoc || empDoc || adminDoc;
            if (found) {
              reqByObj = {
                _id: found._id,
                fullName: found.fullName || found.name,
                email: found.email || ''
              };
            }
          }
        }

        // 3. Fallback to Lead's createdBy if still missing
        if (!reqByObj && doc.leadId && doc.leadId.createdBy) {
          const cId = doc.leadId.createdBy;
          const userDoc = await User.findById(cId).select('fullName name email');
          const empDoc = await Employee.findById(cId).select('name fullName email');
          const found = userDoc || empDoc;
          if (found) {
            reqByObj = {
              _id: found._id,
              fullName: found.fullName || found.name,
              email: found.email || ''
            };
          }
        }

        doc.requestedBy = reqByObj || { fullName: 'Sales Representative' };
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
