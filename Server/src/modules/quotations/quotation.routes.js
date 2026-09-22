const router = require('express').Router();

const {
  authenticate,
} = require('../../middlewares/auth.middleware');

const {
  fail,
} = require('../../utils/response');

const {
  requestQuotation,
  pendingQuotations,
  approveQuotation,
  rejectQuotation,
  bulkApproveQuotations,
  bulkRejectQuotations,
  markSentToCustomer,
  getSummaryReport,
} = require('./quotation.controller');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.25D: Quotation route RBAC hardening
 *
 * Route-level authorization is intentionally combined with controller-level
 * Lead ownership checks:
 * - route middleware answers "may this type of user use quotation features?";
 * - controller checks answer "may this user act on this specific Lead/quote?".
 *
 * That keeps object-level authorization intact while preventing unrelated
 * departments from reaching commercial quotation actions.
 */

function cleanUpper(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim().toUpperCase();
}

function isManagementUser(user) {
  const role = cleanUpper(user?.role);
  const department = cleanUpper(user?.department);
  const position = cleanUpper(user?.position);

  return (
    role === 'ADMIN' ||
    role === 'FOUNDER' ||
    role === 'SUPER_ADMIN' ||
    role === 'MANAGER' ||
    role === 'SALES_MANAGER' ||
    role === 'TRANSPORT_MANAGER' ||
    role.endsWith('_MANAGER') ||
    role.includes('MANAGER') ||
    role.includes('FOUNDER') ||
    department === 'ADMIN' ||
    department === 'MANAGEMENT' ||
    position.includes('ADMIN') ||
    position.includes('FOUNDER') ||
    position.includes('MANAGER')
  );
}

function hasQuotationPermission(user) {
  return (
    user?.quotationPermission === true ||
    user?.permissions?.quotation === true
  );
}

function isCommercialQuotationUser(user) {
  const role = cleanUpper(user?.role);
  const department = cleanUpper(user?.department);

  if (
    isManagementUser(user) ||
    hasQuotationPermission(user)
  ) {
    return true;
  }

  if (
    role === 'SALES' ||
    role === 'TRANSPORT' ||
    role === 'LOGISTICS'
  ) {
    return true;
  }

  return [
    'SALES',
    'CRM',
    'STONE',
    'COAL',
    'TEA',
    'RICE',
    'TRANSPORT',
    'LOGISTICS',
  ].includes(department);
}

function requireCommercialQuotationAccess(
  req,
  res,
  next
) {
  if (
    isCommercialQuotationUser(
      req.user
    )
  ) {
    return next();
  }

  return fail(
    res,
    403,
    'RBAC_FORBIDDEN',
    'Forbidden: Quotation access is restricted to authorized commercial users.',
    [],
    req
  );
}

function requireQuotationManagementAccess(req,res,next) {
  if(require('../marketing/campaignGovernance').isManagement(req.user)) return next();
  return fail(res,403,'RBAC_FORBIDDEN','Management approval is required.');
}

router.use(authenticate);

/*
 * Request/list endpoints remain available to commercial users.
 * The controller still scopes non-management users to Leads
 * they own or created.
 */
router.post(
  '/request',
  requireCommercialQuotationAccess,
  requestQuotation
);

router.get(
  '/pending',
  requireCommercialQuotationAccess,
  pendingQuotations
);

/*
 * Static management routes are declared before parameterized
 * routes to keep the API unambiguous as the quotation module grows.
 */
router.patch(
  '/bulk-approve',
  requireQuotationManagementAccess,
  bulkApproveQuotations
);

router.patch(
  '/bulk-reject',
  requireQuotationManagementAccess,
  bulkRejectQuotations
);

router.get(
  '/summary',
  requireQuotationManagementAccess,
  getSummaryReport
);

router.patch(
  '/:id/approve',
  requireQuotationManagementAccess,
  approveQuotation
);

router.patch(
  '/:id/reject',
  requireQuotationManagementAccess,
  rejectQuotation
);

/*
 * Sending a quote is a commercial action, but object-level
 * authorization stays inside markSentToCustomer so sales users
 * can only act on quotations/Leads they legitimately control.
 */
router.patch(
  '/:id/sent-to-customer',
  requireCommercialQuotationAccess,
  markSentToCustomer
);

module.exports = router;