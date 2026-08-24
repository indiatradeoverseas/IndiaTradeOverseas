const leadService = require('./lead.service');
const { ok, fail } = require('../../utils/response');

async function getLeadsList(req, res, next) {
  try {
    const leads = await leadService.listLeads(req.user, req.query);
    return ok(res, { leads }, 'Leads list retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getLeadDetails(req, res, next) {
  try {
    const result = await leadService.getLeadById(req.params.id, req.user);
    return ok(res, result, 'Lead details retrieved successfully', 200, req);
  } catch (error) {
    if (error.message === 'LEAD_NOT_FOUND') {
      return fail(res, 404, 'VALIDATION_FAILED', 'Lead not found');
    }
    if (error.message === 'OWNERSHIP_FORBIDDEN') {
      return fail(res, 403, 'OWNERSHIP_FORBIDDEN', 'Access denied: You are not authorized to view this lead');
    }
    next(error);
  }
}

async function changeLeadStage(req, res, next) {
  try {
    const newStage = req.body.newStage || req.body.stage; // Handle both keys
    const { remark, nextFollowupAt } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
    const deviceHash = req.headers['x-device-hash'] || '';

    if (!newStage) {
      return fail(res, 400, 'VALIDATION_FAILED', 'Stage parameter is required');
    }

    const lead = await leadService.updateStage({
      leadId: req.params.id,
      newStage,
      remark,
      nextFollowupAt,
      user: req.user,
      ipAddress,
      deviceHash
    });

    return ok(res, { lead }, 'Lead stage updated successfully', 200, req);
  } catch (error) {
    if (error.message === 'LEAD_NOT_FOUND') {
      return fail(res, 404, 'VALIDATION_FAILED', 'Lead not found');
    }
    if (error.message === 'OWNERSHIP_FORBIDDEN') {
      return fail(res, 403, 'OWNERSHIP_FORBIDDEN', 'Access denied: You do not have permissions for this lead');
    }
    if (error.message.includes('INVALID_STAGE_TRANSITION')) {
      return fail(res, 400, 'VALIDATION_FAILED', error.message);
    }
    next(error);
  }
}

async function assignLead(req, res, next) {
  try {
    const { assignedTo, assignedDepartment } = req.body;
    const lead = await leadService.assignLead({
      leadId: req.params.id || req.params.leadId,
      assignedTo,
      assignedDepartment,
      user: req.user
    });
    return ok(res, { lead }, 'Lead assignment updated successfully', 200, req);
  } catch (error) {
    if (error.message === 'LEAD_NOT_FOUND') {
      return fail(res, 404, 'VALIDATION_FAILED', 'Lead not found');
    }
    next(error);
  }
}

async function deleteLead(req, res, next) {
  try {
    await leadService.deleteLead(req.params.id || req.params.leadId, req.user);
    return ok(res, {}, 'Lead deleted successfully', 200, req);
  } catch (error) {
    if (error.message === 'LEAD_NOT_FOUND') {
      return fail(res, 404, 'VALIDATION_FAILED', 'Lead not found');
    }
    next(error);
  }
}

async function assignLeadsBulk(req, res, next) {
  try {
    const { leadIds, assignedTo } = req.body;
    const result = await leadService.assignLeadsBulk({
      leadIds,
      assignedTo,
      user: req.user
    });
    return ok(res, result, 'Leads bulk assigned successfully', 200, req);
  } catch (error) {
    if (error.message === 'LEAD_IDS_REQUIRED') {
      return fail(res, 400, 'VALIDATION_FAILED', 'leadIds array is required');
    }
    next(error);
  }
}

async function bulkImportLeads(req, res, next) {
  try {
    const { leads } = req.body;
    const result = await leadService.bulkImportLeads(leads, req.user);
    return ok(res, result, 'Bulk leads processed', 200, req);
  } catch (error) {
    if (error.message === 'LEADS_ARRAY_REQUIRED') {
      return fail(res, 400, 'VALIDATION_FAILED', 'leads array is required');
    }
    next(error);
  }
}

module.exports = {
  getLeadsList,
  getLeadDetails,
  changeLeadStage,
  assignLead,
  deleteLead,
  assignLeadsBulk,
  bulkImportLeads
};
