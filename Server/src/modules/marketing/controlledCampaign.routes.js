const router = require('express').Router();

const {
  authenticate,
} = require('../../middlewares/auth.middleware');

const {
  fail,
} = require('../../utils/response');

const {
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
  getControlledCampaignPrelaunchReviewController,
} = require('./controlledCampaign.controller');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.5: Controlled Stone campaign routes
 *
 * Responsibility boundaries from the DPR:
 * - Marketing owns campaign structure, creative and UTM governance.
 * - Operations owns the real commercial marketSelection inputs and confirms
 *   those inputs separately.
 * - Management owns target-market/budget/commercial approval decisions and
 *   can act as the governed administrative override.
 * - IT owns the supporting website/API/database/tracking infrastructure and
 *   attribution verification, not commercial approval.
 *
 * This router intentionally exposes configuration/review actions only.
 * It does NOT expose an ad-launch endpoint, fabricate Meta identifiers,
 * record fake performance, or declare Phase 4 complete from click metrics.
 */

function cleanUpper(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .toUpperCase();
}

function isManagementUser(user) { return require('./campaignGovernance').isManagement(user); }

function isDepartmentUser(user, departmentName) {
  return (
    cleanUpper(user?.department) ===
    cleanUpper(departmentName)
  );
}

function isMarketingUser(user) {
  return isDepartmentUser(
    user,
    'MARKETING'
  );
}

function isOperationsUser(user) {
  return isDepartmentUser(
    user,
    'OPERATIONS'
  );
}

function isITUser(user) {
  return isDepartmentUser(
    user,
    'IT'
  );
}

function denyCampaignAccess(
  req,
  res,
  message
) {
  return fail(
    res,
    403,
    'RBAC_FORBIDDEN',
    message,
    [],
    req
  );
}

/**
 * Read access is limited to the departments participating in the controlled
 * campaign workflow plus Management. IT has read access because the DPR
 * assigns APIs, database, tracking and dashboards to IT, but this does not
 * grant IT authority to confirm commercial inputs or approve a campaign.
 */
function requireCampaignReadAccess(
  req,
  res,
  next
) {
  if (
    isManagementUser(req.user) ||
    isMarketingUser(req.user) ||
    isOperationsUser(req.user) ||
    isITUser(req.user)
  ) {
    return next();
  }

  return denyCampaignAccess(
    req,
    res,
    'Forbidden: Controlled campaign review is restricted to Marketing, Operations, IT, or Management.'
  );
}

/**
 * Campaign configuration may be prepared by Marketing, supplied/validated
 * with Operations data, or handled by Management. Any material edit is
 * still protected by the service layer, which clears previous Operations
 * confirmation and Management approval so stale approval cannot survive.
 */
function requireCampaignCreateAccess(
  req,
  res,
  next
) {
  if (
    isManagementUser(req.user) ||
    isMarketingUser(req.user)
  ) {
    return next();
  }

  return denyCampaignAccess(
    req,
    res,
    'Forbidden: Controlled campaign creation is restricted to Marketing or Management.'
  );
}

/**
 * Marketing/Management can edit the governed campaign definition.
 * Operations can edit only the real commercial marketSelection block that
 * belongs to its DPR responsibility area. Operations confirmation remains a
 * separate action so merely editing values never self-confirms them.
 */
function requireCampaignUpdateAccess(
  req,
  res,
  next
) {
  if (
    isManagementUser(req.user) ||
    isMarketingUser(req.user)
  ) {
    return next();
  }

  if (
    isOperationsUser(req.user)
  ) {
    const body =
      req.body &&
      typeof req.body === 'object' &&
      !Array.isArray(req.body)
        ? req.body
        : {};

    const keys =
      Object.keys(body);

    const operationsOnly =
      keys.length === 1 &&
      keys[0] === 'marketSelection';

    if (operationsOnly) {
      return next();
    }

    return denyCampaignAccess(
      req,
      res,
      'Forbidden: Operations may edit only the controlled campaign marketSelection inputs.'
    );
  }

  return denyCampaignAccess(
    req,
    res,
    'Forbidden: Controlled campaign editing is restricted to Marketing, Operations commercial inputs, or Management.'
  );
}

/**
 * DPR responsibility boundary: real commercial operating inputs are owned
 * by Operations. Management may act as an administrative override, but a
 * Marketing/IT user cannot mark those inputs confirmed.
 */
function requireOperationsConfirmationAccess(req,res,next) {
  if (isOperationsUser(req.user)) return next();
  return denyCampaignAccess(req,res,'Forbidden: Operations must confirm its own commercial inputs.');
}

/**
 * Management approval is intentionally kept separate from Operations
 * confirmation. The service additionally blocks approval when Operations
 * has not confirmed inputs, delivery is NOT_SUPPORTED, or priority is D.
 */
function requireManagementApprovalAccess(
  req,
  res,
  next
) {
  if (isManagementUser(req.user)) {
    return next();
  }

  return denyCampaignAccess(
    req,
    res,
    'Forbidden: Controlled campaign approval is restricted to Management.'
  );
}

function requireAudienceExclusionDecisionAccess(
  req,
  res,
  next
) {
  if (
    isManagementUser(req.user) ||
    isMarketingUser(req.user)
  ) {
    return next();
  }

  return denyCampaignAccess(
    req,
    res,
    'Forbidden: Audience exclusion decisions are restricted to Marketing or Management.'
  );
}

function requirePrelaunchVerificationAccess(
  req,
  res,
  next
) {
  if (isManagementUser(req.user)) {
    return next();
  }

  const type = cleanUpper(
    req.body?.verificationType
  );

  if (
    type === 'LANDING_EXPERIENCE' &&
    isMarketingUser(req.user)
  ) {
    return next();
  }

  if (
    type === 'CREATIVE_CLAIMS' &&
    isOperationsUser(req.user)
  ) {
    return next();
  }

  if (
    [
      'WEBSITE_ATTRIBUTION',
      'META_INSTANT_FORM_ATTRIBUTION',
    ].includes(type) &&
    isITUser(req.user)
  ) {
    return next();
  }

  return denyCampaignAccess(
    req,
    res,
    'Forbidden: This pre-launch verification belongs to another DPR responsibility area.'
  );
}

// All controlled-campaign endpoints are internal/authenticated.
router.use(authenticate);

// Collection routes.
router.get(
  '/',
  requireCampaignReadAccess,
  listControlledCampaigns
);

router.post(
  '/',
  requireCampaignCreateAccess,
  createControlledCampaign
);

// Explicit workflow actions remain separate from general campaign edits.
router.patch(
  '/:campaignId/operations-confirmation',
  requireOperationsConfirmationAccess,
  confirmOperationsInputs
);

router.patch(
  '/:campaignId/management-approval',
  requireManagementApprovalAccess,
  recordManagementApproval
);

router.patch(
  '/:campaignId/audience-exclusion',
  requireAudienceExclusionDecisionAccess,
  recordAudienceExclusionDecision
);

router.patch(
  '/:campaignId/prelaunch-verification',
  requirePrelaunchVerificationAccess,
  recordPrelaunchVerification
);

// Read-only observed business outcomes for the controlled campaign.
// Uses the same governed read access as campaign review.
router.get(
  '/:campaignId/metrics',
  requireCampaignReadAccess,
  getControlledCampaignOutcomeMetrics
);

// Privacy-safe review of existing leads/customers before generic acquisition.
// This endpoint does not expose PII and does not perform a Meta audience sync.
router.get(
  '/:campaignId/audience-review',
  requireCampaignReadAccess,
  getControlledCampaignAudienceReviewController
);

// Combined read-only pre-launch review.
// This reports readiness and blockers; it does not launch or approve a campaign.
router.get(
  '/:campaignId/prelaunch-review',
  requireCampaignReadAccess,
  getControlledCampaignPrelaunchReviewController
);

// Single-campaign routes.
router.get(
  '/:campaignId',
  requireCampaignReadAccess,
  getControlledCampaign
);

router.patch(
  '/:campaignId',
  requireCampaignUpdateAccess,
  updateControlledCampaign
);

module.exports = router;
