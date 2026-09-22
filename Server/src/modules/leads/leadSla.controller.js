const mongoose = require('mongoose');

const {
  ok,
  fail,
} = require('../../utils/response');

const {
  getSalesSlaDashboard,
} = require('./leadSla.service');

const {
  recordAudit,
} = require('../security-audit/auditLog.service');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.27D: Sales SLA audit consistency hardening
 *
 * Responsibilities:
 * - expose factual Sales SLA monitoring to authorized management users;
 * - do not invent numeric SLA thresholds that are not defined by Master DPR;
 * - preserve response-time / untouched-HOT / ownership monitoring;
 * - write a valid append-only audit record for every successful dashboard view;
 * - never make dashboard availability depend on the audit store.
 */

const SALES_SLA_AUDIT_ENTITY_ID =
  'SALES_SLA_DASHBOARD';

function cleanText(
  value,
  maxLength = 250
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

function isManagementUser(
  user
) {
  if (!user) {
    return false;
  }

  const role =
    cleanText(
      user.role,
      80
    ).toUpperCase();

  const department =
    cleanText(
      user.department,
      80
    ).toUpperCase();

  const position =
    cleanText(
      user.position,
      120
    ).toUpperCase();

  return (
    role === 'ADMIN' ||
    role === 'FOUNDER' ||
    role === 'SUPER_ADMIN' ||
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

function getAuditActorId(
  user
) {
  const candidates = [
    user?._id,
    user?.employeeDbId,
  ];

  for (
    const candidate
    of candidates
  ) {
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

function getRequestIp(req) {
  const forwarded =
    cleanText(
      req.headers?.['x-forwarded-for'],
      200
    );

  if (forwarded) {
    return cleanText(
      forwarded.split(',')[0],
      200
    );
  }

  return cleanText(
    req.ip,
    200
  );
}

async function safeAudit(
  payload
) {
  try {
    await recordAudit(
      payload
    );

  } catch (error) {
    /*
     * Management monitoring must remain available if the audit store has a
     * temporary failure.
     */
    console.warn(
      '[Sales SLA Controller] Audit logging failed:',
      cleanText(
        error.message,
        300
      )
    );
  }
}

async function getSalesSlaDashboardController(
  req,
  res,
  next
) {
  try {
    if (
      !isManagementUser(
        req.user
      )
    ) {
      return fail(
        res,
        403,
        'RBAC_FORBIDDEN',
        'Sales SLA dashboard is restricted to management users.',
        [],
        req
      );
    }

    const from =
      cleanText(
        req.query.from,
        100
      ) || null;

    const to =
      cleanText(
        req.query.to,
        100
      ) || null;

    const limit =
      req.query.limit !== undefined
        ? req.query.limit
        : 50;

    const dashboard =
      await getSalesSlaDashboard({
        from,
        to,
        limit,
      });

    await safeAudit({
      actorId:
        getAuditActorId(
          req.user
        ),

      actionType:
        'SALES_SLA_DASHBOARD_VIEWED',

      entityType:
        'DASHBOARD',

      /*
       * auditLog.model.js requires a non-null entityId.
       * The previous entityId: null caused the audit write to fail.
       */
      entityId:
        SALES_SLA_AUDIT_ENTITY_ID,

      severity:
        'LOW',

      ipAddress:
        getRequestIp(req),

      deviceHash:
        cleanText(
          req.headers?.['x-device-hash'],
          256
        ),

      metadata: {
        from:
          dashboard.scope?.from ||
          '',

        to:
          dashboard.scope?.to ||
          '',

        queueLimit:
          dashboard.scope?.queueLimit ||
          50,

        openLeads:
          dashboard.metrics?.openLeads ||
          0,

        unownedLeads:
          dashboard.metrics?.unownedLeads ||
          0,

        stillNewLeads:
          dashboard.metrics?.stillNewLeads ||
          0,

        untouchedHotLeads:
          dashboard.metrics?.untouchedHotLeads ||
          0,

        overdueFollowups:
          dashboard.metrics?.overdueFollowups ||
          0,
      },
    });

    return ok(
      res,
      {
        dashboard,
      },
      'Sales SLA dashboard retrieved successfully',
      200,
      req
    );

  } catch (error) {
    if (
      [
        'SLA_DATE_INVALID',
        'SLA_DATE_RANGE_INVALID',
      ].includes(
        error?.code
      )
    ) {
      return fail(
        res,
        400,
        error.code,
        error.message,
        [],
        req
      );
    }

    return next(error);
  }
}

module.exports = {
  getSalesSlaDashboardController,
};