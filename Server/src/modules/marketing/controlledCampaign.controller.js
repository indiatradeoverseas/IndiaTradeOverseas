const mongoose = require('mongoose');

const controlledCampaignService =
  require('./controlledCampaign.service');

const {
  getControlledCampaignMetrics,
} = require('./controlledCampaignMetrics.service');

const {
  getControlledCampaignAudienceReview,
} = require('./controlledCampaignAudience.service');

const {
  getControlledCampaignPrelaunchReview,
} = require('./controlledCampaignPrelaunch.service');

const {
  ok,
  fail
} = require('../../utils/response');


/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.4: Controlled Stone campaign controller
 *
 * Purpose:
 * - expose the controlled-campaign service through the existing API
 *   response contract;
 * - keep campaign creation/update separate from Operations confirmation,
 *   Management approval, audience-exclusion decisions and pre-launch checks;
 * - use the authenticated actor as audit evidence instead of trusting
 *   audit/governance IDs from the request body;
 * - surface real-evidence validation failures as safe 4xx responses;
 * - return readiness/review data without inventing campaign performance;
 * - avoid exposing any endpoint that claims Phase 4 success, launches ads,
 *   or fabricates Meta IDs/business outcomes.
 *
 * Authorization is intentionally left to the route layer so the existing
 * authentication/RBAC middleware remains the single access-control surface.
 */


function cleanText(
  value,
  maxLength = 1000
) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}


function getActorObjectId(user) {
  const candidates = [
    user?.employeeDbId,
    user?._id
  ];

  for (const candidate of candidates) {
    if (
      mongoose.isValidObjectId(
        candidate
      )
    ) {
      return candidate;
    }
  }

  return null;
}


function sendControlledCampaignError(
  res,
  error,
  req
) {
  const code = cleanText(
    error?.code,
    160
  );

  const mappings = {
    CONTROLLED_CAMPAIGN_NOT_FOUND: {
      status: 404,
      errorCode:
        'CONTROLLED_CAMPAIGN_NOT_FOUND',
      message:
        'Controlled campaign was not found.'
    },

    CONTROLLED_CAMPAIGN_UTM_DUPLICATE: {
      status: 409,
      errorCode:
        'CONTROLLED_CAMPAIGN_UTM_DUPLICATE',
      message:
        error?.message ||
        'A controlled campaign with this UTM campaign key already exists.'
    },

    CONTROLLED_CAMPAIGN_OPERATIONS_CONFIRMATION_REQUIRED: {
      status: 409,
      errorCode:
        'CONTROLLED_CAMPAIGN_OPERATIONS_CONFIRMATION_REQUIRED',
      message:
        error?.message ||
        'Operations inputs must be confirmed before Management approval.'
    },

    CONTROLLED_CAMPAIGN_DELIVERY_NOT_SUPPORTED: {
      status: 409,
      errorCode:
        'CONTROLLED_CAMPAIGN_DELIVERY_NOT_SUPPORTED',
      message:
        error?.message ||
        'A market marked not supported cannot be approved for advertising.'
    },

    CONTROLLED_CAMPAIGN_DO_NOT_ADVERTISE: {
      status: 409,
      errorCode:
        'CONTROLLED_CAMPAIGN_DO_NOT_ADVERTISE',
      message:
        error?.message ||
        'A Priority D market cannot be approved for advertising.'
    },

    CONTROLLED_CAMPAIGN_BUDGET_REQUIRED: {
      status: 400,
      errorCode:
        'CONTROLLED_CAMPAIGN_BUDGET_REQUIRED',
      message:
        error?.message ||
        'A real Management-owned campaign budget is required before approval.'
    },

    CONTROLLED_CAMPAIGN_AUDIENCE_EXCLUSION_EVIDENCE_REQUIRED: {
      status: 400,
      errorCode:
        'CONTROLLED_CAMPAIGN_AUDIENCE_EXCLUSION_EVIDENCE_REQUIRED',
      message:
        error?.message ||
        'A real evidence reference is required when audience exclusion is marked applied.'
    },

    CONTROLLED_CAMPAIGN_VERIFICATION_EVIDENCE_REQUIRED: {
      status: 400,
      errorCode:
        'CONTROLLED_CAMPAIGN_VERIFICATION_EVIDENCE_REQUIRED',
      message:
        error?.message ||
        'A real evidence reference is required before a pre-launch check can be marked verified.'
    },

    CONTROLLED_CAMPAIGN_VALIDATION_FAILED: {
      status: 400,
      errorCode:
        'VALIDATION_FAILED',
      message:
        error?.message ||
        'Controlled campaign validation failed.'
    },

    CONTROLLED_CAMPAIGN_ATTRIBUTION_KEY_MISSING: {
      status: 409,
      errorCode:
        'CONTROLLED_CAMPAIGN_ATTRIBUTION_KEY_MISSING',
      message:
        error?.message ||
        'Controlled campaign does not yet have a usable attribution key.'
    }
  };

  const mapped =
    mappings[code];

  if (mapped) {
    return fail(
      res,
      mapped.status,
      mapped.errorCode,
      mapped.message,
      [],
      req
    );
  }

  if (
    code.startsWith(
      'CONTROLLED_CAMPAIGN_'
    ) &&
    Number.isInteger(
      error?.statusCode
    ) &&
    error.statusCode >= 400 &&
    error.statusCode <= 499
  ) {
    return fail(
      res,
      error.statusCode,
      code,
      cleanText(
        error?.message,
        1000
      ) ||
        'Controlled campaign request could not be completed.',
      [],
      req
    );
  }

  if (
    error?.name ===
    'ValidationError'
  ) {
    const details =
      Object.values(
        error.errors || {}
      )
        .map(
          (item) =>
            cleanText(
              item?.message,
              500
            )
        )
        .filter(Boolean);

    return fail(
      res,
      400,
      'VALIDATION_FAILED',
      'Controlled campaign validation failed.',
      details,
      req
    );
  }

  if (
    error?.name ===
    'CastError'
  ) {
    return fail(
      res,
      400,
      'INVALID_ID',
      'A supplied controlled campaign ID is invalid.',
      [],
      req
    );
  }

  return null;
}


async function createControlledCampaign(
  req,
  res,
  next
) {
  try {
    const actorId =
      getActorObjectId(
        req.user
      );

    const result =
      await controlledCampaignService
        .createControlledCampaign(
          req.body || {},
          actorId
        );

    return ok(
      res,
      result,
      'Controlled campaign created successfully.',
      201,
      req
    );
  } catch (error) {
    const handled =
      sendControlledCampaignError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(error);
  }
}


async function updateControlledCampaign(
  req,
  res,
  next
) {
  try {
    const actorId =
      getActorObjectId(
        req.user
      );

    const result =
      await controlledCampaignService
        .updateControlledCampaign(
          req.params.campaignId,
          req.body || {},
          actorId
        );

    return ok(
      res,
      result,
      'Controlled campaign updated successfully.',
      200,
      req
    );
  } catch (error) {
    const handled =
      sendControlledCampaignError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(error);
  }
}


async function getControlledCampaign(
  req,
  res,
  next
) {
  try {
    const result =
      await controlledCampaignService
        .getControlledCampaign(
          req.params.campaignId
        );

    return ok(
      res,
      result,
      'Controlled campaign retrieved successfully.',
      200,
      req
    );
  } catch (error) {
    const handled =
      sendControlledCampaignError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(error);
  }
}


async function listControlledCampaigns(
  req,
  res,
  next
) {
  try {
    const campaigns =
      await controlledCampaignService
        .listControlledCampaigns(
          req.query || {}
        );

    return ok(
      res,
      {
        campaigns
      },
      'Controlled campaigns retrieved successfully.',
      200,
      req
    );
  } catch (error) {
    const handled =
      sendControlledCampaignError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(error);
  }
}


async function confirmOperationsInputs(
  req,
  res,
  next
) {
  try {
    const actorId =
      getActorObjectId(
        req.user
      );

    const result =
      await controlledCampaignService
        .confirmOperationsInputs(
          req.params.campaignId,
          actorId
        );

    return ok(
      res,
      result,
      'Operations inputs confirmed successfully.',
      200,
      req
    );
  } catch (error) {
    const handled =
      sendControlledCampaignError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(error);
  }
}


async function recordManagementApproval(
  req,
  res,
  next
) {
  try {
    const actorId =
      getActorObjectId(
        req.user
      );

    const result =
      await controlledCampaignService
        .recordManagementApproval(
          req.params.campaignId,
          req.body || {},
          actorId
        );

    return ok(
      res,
      result,
      'Management approval recorded successfully.',
      200,
      req
    );
  } catch (error) {
    const handled =
      sendControlledCampaignError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(error);
  }
}



async function recordAudienceExclusionDecision(
  req,
  res,
  next
) {
  try {
    const actorId =
      getActorObjectId(req.user);

    const result =
      await controlledCampaignService
        .recordAudienceExclusionDecision(
          req.params.campaignId,
          req.body || {},
          actorId
        );

    return ok(
      res,
      result,
      'Audience exclusion decision recorded successfully.',
      200,
      req
    );
  } catch (error) {
    const handled =
      sendControlledCampaignError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(error);
  }
}


async function recordPrelaunchVerification(
  req,
  res,
  next
) {
  try {
    const actorId =
      getActorObjectId(req.user);

    const result =
      await controlledCampaignService
        .recordPrelaunchVerification(
          req.params.campaignId,
          req.body || {},
          actorId
        );

    return ok(
      res,
      result,
      'Pre-launch verification evidence updated successfully.',
      200,
      req
    );
  } catch (error) {
    const handled =
      sendControlledCampaignError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(error);
  }
}


async function getControlledCampaignOutcomeMetrics(
  req,
  res,
  next
) {
  try {
    const result =
      await getControlledCampaignMetrics(
        req.params.campaignId
      );

    return ok(
      res,
      result,
      'Controlled campaign outcome metrics retrieved successfully.',
      200,
      req
    );
  } catch (error) {
    const handled =
      sendControlledCampaignError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(error);
  }
}



async function getControlledCampaignAudienceReviewController(
  req,
  res,
  next
) {
  try {
    const result =
      await getControlledCampaignAudienceReview(
        req.params.campaignId
      );

    return ok(
      res,
      result,
      'Controlled campaign audience exclusion review retrieved successfully.',
      200,
      req
    );
  } catch (error) {
    const handled =
      sendControlledCampaignError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(error);
  }
}



async function getControlledCampaignPrelaunchReviewController(
  req,
  res,
  next
) {
  try {
    const result =
      await getControlledCampaignPrelaunchReview(
        req.params.campaignId
      );

    return ok(
      res,
      result,
      'Controlled campaign pre-launch review retrieved successfully.',
      200,
      req
    );
  } catch (error) {
    const handled =
      sendControlledCampaignError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(error);
  }
}


module.exports = {
  createControlledCampaign,
  updateControlledCampaign,
  getControlledCampaign,
  listControlledCampaigns,
  confirmOperationsInputs,
  recordManagementApproval,
  recordAudienceExclusionDecision,
  recordPrelaunchVerification,
  getControlledCampaignOutcomeMetrics,
  getControlledCampaignAudienceReviewController,
  getControlledCampaignPrelaunchReviewController
};
