const Lead = require('./lead.model');
const leadService = require('./lead.service');
const { ok, fail } = require('../../utils/response');

const {
  createWebsiteLeadRecord,
  updateWebsiteLeadProgressiveProfile,
  scheduleWebsiteLeadAutomation
} = require('./websiteLead.service');

const {
  transitionLeadCrmStatus
} = require('./leadLifecycle.service');

const {
  CRM_STATUSES
} = require('./lead.constants');

const {
  logLeadApi,
  buildRequestContext
} = require('../operations/operationalLog.service');


function cleanText(value, maxLength = 1000) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}


function isManagementUser(user) {
  if (!user) {
    return false;
  }

  const role = cleanText(
    user?.role,
    80
  ).toUpperCase();

  const department = cleanText(
    user?.department,
    80
  ).toUpperCase();

  const position = cleanText(
    user?.position,
    120
  ).toUpperCase();

  return (
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'FOUNDER' ||
    role === 'MANAGER' ||
    role === 'SALES_MANAGER' ||
    role.endsWith('_MANAGER') ||
    role.includes('MANAGER') ||
    department === 'ADMIN' ||
    department === 'MANAGEMENT' ||
    position.includes('ADMIN') ||
    position.includes('FOUNDER') ||
    position.includes('MANAGER')
  );
}


async function resolveLeadForMutation(identifier) {
  if (!identifier) {
    return null;
  }

  let lead = null;

  try {
    if (
      require('mongoose')
        .isValidObjectId(identifier)
    ) {
      lead = await Lead.findById(identifier);
    }
  } catch {
    lead = null;
  }

  if (lead) {
    return lead;
  }

  return Lead.findOne({
    $or: [
      { leadCode: identifier },
      { leadId: identifier },
      { orderNumber: identifier }
    ]
  });
}


function handleLifecycleError(error, res) {
  const code = cleanText(
    error?.code,
    100
  );

  if (code === 'LEAD_NOT_FOUND') {
    return fail(
      res,
      404,
      'VALIDATION_FAILED',
      'Lead not found'
    );
  }

  if (code === 'CRM_TRANSITION_CONFLICT') {
    return fail(
      res,
      409,
      code,
      error.message
    );
  }

  if (
    [
      'LEAD_ID_REQUIRED',
      'CRM_STATUS_INVALID',
      'CRM_TRANSITION_NOT_ALLOWED',
      'CRM_FORCE_REASON_REQUIRED',
      'CRM_DATE_INVALID',
      'CRM_NUMBER_INVALID',
      'LOST_REASON_REQUIRED',
      'LOST_REASON_NOTES_REQUIRED'
    ].includes(code)
  ) {
    return fail(
      res,
      400,
      code,
      error.message
    );
  }

  return null;
}


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
      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Access denied: You are not authorized to view this lead'
      );
    }

    next(error);
  }
}


/**
 * Canonical Master DPR CRM lifecycle endpoint.
 *
 * This is intentionally separate from the richer operational `stage`
 * pipeline. `leadLifecycle.service.js` is the only authority for changing
 * crmStatus.
 */
async function changeLeadCrmStatus(req, res, next) {
  try {
    const requestedStatus =
      req.body.crmStatus ||
      req.body.status ||
      req.body.toStatus;

    if (!requestedStatus) {
      return fail(
        res,
        400,
        'CRM_STATUS_INVALID',
        `CRM status is required. Allowed values: ${CRM_STATUSES.join(', ')}`
      );
    }

    const lead =
      await resolveLeadForMutation(
        req.params.id
      );

    if (!lead) {
      return fail(
        res,
        404,
        'VALIDATION_FAILED',
        'Lead not found'
      );
    }

    if (
      !leadService.canAccessLead(
        req.user,
        lead
      )
    ) {
      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Access denied: You do not have permissions for this lead'
      );
    }

    const forceRequested =
      req.body.force === true;

    if (
      forceRequested &&
      !isManagementUser(req.user)
    ) {
      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Only management can force a CRM lifecycle transition.'
      );
    }

    const result =
      await transitionLeadCrmStatus({
        leadId: lead._id,

        toStatus: requestedStatus,

        actorId:
          req.user?._id ||
          null,

        note:
          req.body.note ||
          req.body.remark ||
          '',

        nextFollowupAt:
          req.body.nextFollowupAt ||
          null,

        lostReason:
          req.body.lostReason ||
          '',

        lostReasonNotes:
          req.body.lostReasonNotes ||
          req.body.remark ||
          '',

        orderAmount:
          req.body.orderAmount,

        force:
          forceRequested,

        forceReason:
          req.body.forceReason ||
          ''
      });

    const displayLead =
      leadService.getLeadDisplay(
        result.lead,
        req.user
      );

    return ok(
      res,
      {
        lead: displayLead,

        lifecycle: {
          changed: result.changed,
          reused: result.reused,
          fromStatus: result.fromStatus,
          toStatus: result.toStatus
        }
      },
      result.changed
        ? 'Lead CRM status updated successfully'
        : 'Lead CRM status already matches the requested state',
      200,
      req
    );

  } catch (error) {
    const handled =
      handleLifecycleError(
        error,
        res
      );

    if (handled) {
      return handled;
    }

    next(error);
  }
}


async function changeLeadStage(req, res, next) {
  try {
    /*
     * Never allow clients to sneak a canonical CRM status mutation through
     * the operational-stage endpoint.
     */
    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        'crmStatus'
      )
    ) {
      return fail(
        res,
        400,
        'CRM_STATUS_ENDPOINT_REQUIRED',
        'crmStatus cannot be changed through the operational stage endpoint. Use the CRM status endpoint.'
      );
    }

    const newStage =
      req.body.newStage ||
      req.body.stage;

    const {
      remark,
      nextFollowupAt,
      lostReason,
      lostReasonNotes
    } = req.body;

    const ipAddress =
      req.ip ||
      req.headers['x-forwarded-for'] ||
      '';

    const deviceHash =
      req.headers['x-device-hash'] ||
      '';

    console.log(
      '[changeLeadStage] Request received:',
      {
        leadId: req.params.id,
        newStage,
        lostReason,
        hasPodFileUrl: !!req.body.podFileUrl,
        hasPaymentProofUrl: !!req.body.paymentProofUrl,
        hasDriverProofUrl: !!req.body.driverProofUrl,
        userRole: req.user?.role
      }
    );

    if (!newStage) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'Stage parameter is required'
      );
    }

    const lead = await leadService.updateStage({
      leadId: req.params.id,
      newStage,
      remark,
      nextFollowupAt,
      lostReason,
      lostReasonNotes,
      podFileUrl: req.body.podFileUrl,
      paymentProofUrl: req.body.paymentProofUrl,
      driverProofUrl: req.body.driverProofUrl,
      photoUrl: req.body.photoUrl,
      paymentProof: req.body.paymentProof,
      deliveryImages: req.body.deliveryImages,
      user: req.user,
      ipAddress,
      deviceHash
    });

    console.log(
      '[changeLeadStage] Success for lead:',
      req.params.id
    );

    return ok(
      res,
      { lead },
      'Lead stage updated successfully',
      200,
      req
    );

  } catch (error) {
    console.error(
      '[changeLeadStage] ERROR:',
      error.message,
      'leadId:',
      req.params.id
    );

    if (error.message === 'LEAD_NOT_FOUND') {
      return fail(
        res,
        404,
        'VALIDATION_FAILED',
        'Lead not found'
      );
    }

    if (error.message === 'OWNERSHIP_FORBIDDEN') {
      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Access denied: You do not have permissions for this lead'
      );
    }

    if (
      error.message.includes('INVALID_STAGE_TRANSITION') ||
      error.message.includes('QUOTATION_NOT_APPROVED') ||
      error.message.includes('LOI_DOCUMENT_REQUIRED') ||
      error.message.includes('LOST_REASON_REQUIRED') ||
      error.message.includes('CRM_')
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        error.message
      );
    }

    next(error);
  }
}


async function assignLead(req, res, next) {
  try {
    const {
      assignedTo,
      assignedDepartment
    } = req.body;

    const lead = await leadService.assignLead({
      leadId:
        req.params.id ||
        req.params.leadId,

      assignedTo,
      assignedDepartment,
      user: req.user
    });

    return ok(
      res,
      { lead },
      'Lead assignment updated successfully',
      200,
      req
    );
  } catch (error) {
    if (error.message === 'LEAD_NOT_FOUND') {
      return fail(
        res,
        404,
        'VALIDATION_FAILED',
        'Lead not found'
      );
    }

    next(error);
  }
}


async function deleteLead(req, res, next) {
  try {
    await leadService.deleteLead(
      req.params.id ||
      req.params.leadId,
      req.user
    );

    return ok(
      res,
      {},
      'Lead deleted successfully',
      200,
      req
    );
  } catch (error) {
    if (error.message === 'LEAD_NOT_FOUND') {
      return fail(
        res,
        404,
        'VALIDATION_FAILED',
        'Lead not found'
      );
    }

    next(error);
  }
}


async function assignLeadsBulk(req, res, next) {
  try {
    const {
      leadIds,
      assignedTo
    } = req.body;

    const result =
      await leadService.assignLeadsBulk({
        leadIds,
        assignedTo,
        user: req.user
      });

    return ok(
      res,
      result,
      'Leads bulk assigned successfully',
      200,
      req
    );
  } catch (error) {
    if (error.message === 'LEAD_IDS_REQUIRED') {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'leadIds array is required'
      );
    }

    next(error);
  }
}


async function bulkImportLeads(req, res, next) {
  try {
    const { leads } = req.body;

    const result =
      await leadService.bulkImportLeads(
        leads,
        req.user
      );

    return ok(
      res,
      result,
      'Bulk leads processed',
      200,
      req
    );
  } catch (error) {
    if (error.message === 'LEADS_ARRAY_REQUIRED') {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'leads array is required'
      );
    }

    next(error);
  }
}


async function changeLeadPriority(req, res, next) {
  try {
    const {
      priority,
      leadValue
    } = req.body;

    if (
      !priority &&
      (
        leadValue === undefined ||
        leadValue === null
      )
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'Priority or leadValue parameter is required'
      );
    }

    const lead =
      await leadService.updatePriority({
        leadId: req.params.id,
        priority,
        leadValue,
        user: req.user
      });

    return ok(
      res,
      { lead },
      'Lead priority and details updated successfully',
      200,
      req
    );
  } catch (error) {
    if (error.message === 'LEAD_NOT_FOUND') {
      return fail(
        res,
        404,
        'VALIDATION_FAILED',
        'Lead not found'
      );
    }

    if (error.message === 'OWNERSHIP_FORBIDDEN') {
      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Access denied'
      );
    }

    if (error.message === 'INVALID_PRIORITY') {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'Invalid priority value'
      );
    }

    next(error);
  }
}


async function createWebsiteLead(
  req,
  res,
  next
) {
  const startedAt = Date.now();

  const requestContext =
    buildRequestContext(req);

  const submissionId =
    cleanText(
      req.body?.submissionId,
      128
    );

  try {
    const {
      lead,
      reused,
      leadCreatedEventId
    } =
      await createWebsiteLeadRecord(
        req.body
      );

    const httpStatus =
      reused
        ? 200
        : 201;

    await logLeadApi(
      'WEBSITE_LEAD_SUBMISSION',
      'SUCCESS',
      {
        leadId:
          lead._id,

        entityType:
          'LEAD',

        entityId:
          lead.leadCode ||
          String(lead._id),

        requestId:
          requestContext.requestId,

        correlationId:
          requestContext.correlationId,

        actorId:
          requestContext.actorId,

        idempotencyKey:
          submissionId ||
          lead.submissionId ||
          '',

        httpStatus,

        durationMs:
          Date.now() -
          startedAt,

        metadata: {
          persisted:
            true,

          reused:
            !!reused,

          source:
            'WEBSITE',

          productCategory:
            lead.productCategory ||
            'STONE',

          eligibilityStatus:
            lead.eligibilityStatus ||
            '',

          leadPriority:
            lead.priority ||
            ''
        }
      }
    );

    /*
     * Deliberately after durable Lead persistence.
     * This scheduling operation must not delay or invalidate the public
     * acknowledgement that the Lead is already safe in MongoDB.
     */
    scheduleWebsiteLeadAutomation(
      lead._id.toString()
    );

    return ok(
      res,
      {
        leadId:
          lead._id.toString(),

        leadCode:
          lead.leadCode,

        persisted:
          true,

        reused:
          !!reused,

        eligibilityStatus:
          lead.eligibilityStatus,

        leadCreatedEventId
      },

      reused
        ? 'Lead already persisted successfully'
        : 'Requirement submitted successfully',

      httpStatus,

      req
    );

  } catch (error) {
    const validationFailure =
      error.code ===
      'VALIDATION_FAILED';

    const httpStatus =
      validationFailure
        ? 400
        : 500;

    await logLeadApi(
      'WEBSITE_LEAD_SUBMISSION',
      'FAILURE',
      {
        entityType:
          'LEAD',

        entityId:
          submissionId ||
          'WEBSITE_SUBMISSION',

        requestId:
          requestContext.requestId,

        correlationId:
          requestContext.correlationId,

        actorId:
          requestContext.actorId,

        idempotencyKey:
          submissionId,

        httpStatus,

        durationMs:
          Date.now() -
          startedAt,

        error,

        metadata: {
          persisted:
            false,

          source:
            'WEBSITE',

          validationFailure
        }
      }
    );

    if (
      validationFailure
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        error.message,
        [],
        req
      );
    }

    return next(error);
  }
}


/**
 * Master DPR v4.0 — progressive profile after durable phone Lead capture.
 *
 * Public by design, but not anonymous-by-identifier:
 * - requires immutable leadId + original submissionId;
 * - never creates a second Lead;
 * - Name / Company / Email remain optional/progressive;
 * - no OTP is introduced here;
 * - no PII is written to operational logs.
 */
async function updateWebsiteLeadProfile(
  req,
  res,
  next
) {
  const startedAt =
    Date.now();

  const requestContext =
    buildRequestContext(req);

  const leadId =
    cleanText(
      req.body?.leadId ||
      req.params?.id,
      100
    );

  const submissionId =
    cleanText(
      req.body?.submissionId,
      128
    );

  try {
    if (
      !leadId ||
      !submissionId
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'leadId and submissionId are required.',
        [],
        req
      );
    }

    const result =
      await updateWebsiteLeadProgressiveProfile({
        leadId,
        submissionId,

        customerName:
          req.body?.customerName ||
          req.body?.name ||
          '',

        companyName:
          req.body?.companyName ||
          req.body?.company ||
          '',

        email:
          req.body?.email ||
          ''
      });

    const lead =
      result.lead;

    await logLeadApi(
      'WEBSITE_LEAD_PROGRESSIVE_PROFILE',
      'SUCCESS',
      {
        leadId:
          lead._id,

        entityType:
          'LEAD',

        entityId:
          lead.leadCode ||
          String(lead._id),

        requestId:
          requestContext.requestId,

        correlationId:
          requestContext.correlationId,

        actorId:
          requestContext.actorId,

        idempotencyKey:
          submissionId,

        httpStatus:
          200,

        durationMs:
          Date.now() -
          startedAt,

        metadata: {
          persisted:
            true,

          profileUpdated:
            true,

          nameUpdated:
            !!result.updatedFields?.name,

          companyUpdated:
            !!result.updatedFields?.company,

          emailUpdated:
            !!result.updatedFields?.email
        }
      }
    );

    return ok(
      res,
      {
        leadId:
          lead._id.toString(),

        leadCode:
          lead.leadCode,

        persisted:
          true,

        profileUpdated:
          true,

        updatedFields:
          result.updatedFields
      },

      'Lead profile updated successfully',

      200,

      req
    );

  } catch (error) {
    const code =
      cleanText(
        error?.code,
        120
      );

    const validationFailure =
      code ===
      'VALIDATION_FAILED';

    const notFound =
      code ===
      'WEBSITE_LEAD_NOT_FOUND';

    const httpStatus =
      validationFailure
        ? 400
        : notFound
          ? 404
          : 500;

    await logLeadApi(
      'WEBSITE_LEAD_PROGRESSIVE_PROFILE',
      'FAILURE',
      {
        entityType:
          'LEAD',

        entityId:
          leadId ||
          'WEBSITE_PROGRESSIVE_PROFILE',

        requestId:
          requestContext.requestId,

        correlationId:
          requestContext.correlationId,

        actorId:
          requestContext.actorId,

        idempotencyKey:
          submissionId,

        httpStatus,

        durationMs:
          Date.now() -
          startedAt,

        error,

        metadata: {
          persistedLeadPreserved:
            true,

          profileUpdated:
            false
        }
      }
    );

    if (
      validationFailure
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        error.message,
        [],
        req
      );
    }

    if (
      notFound
    ) {
      return fail(
        res,
        404,
        'WEBSITE_LEAD_NOT_FOUND',
        'The persisted website Lead could not be matched.',
        [],
        req
      );
    }

    if (
      code ===
      'WEBSITE_LEAD_CONTACT_RESOLUTION_FAILED'
    ) {
      return fail(
        res,
        409,
        code,
        'The persisted Lead contact could not be safely resolved for profile update.',
        [],
        req
      );
    }

    if (
      code ===
      'WEBSITE_LEAD_PROFILE_UPDATE_FAILED'
    ) {
      return fail(
        res,
        409,
        code,
        'The persisted Lead was preserved, but the optional profile update could not be completed.',
        [],
        req
      );
    }

    return next(error);
  }
}


module.exports = {
  createWebsiteLead,
  updateWebsiteLeadProfile,
  getLeadsList,
  getLeadDetails,
  changeLeadCrmStatus,
  changeLeadStage,
  changeLeadPriority,
  assignLead,
  deleteLead,
  assignLeadsBulk,
  bulkImportLeads
};
