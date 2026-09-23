const mongoose = require('mongoose');

const {
  ok,
  fail,
} = require('../../utils/response');

const {
  RECOVERY_TYPES,
  getLeadRecoveryDashboard,
  requeueLeadRecovery,
} = require('./leadRecovery.service');

const {
  recordAudit,
} = require('../security-audit/auditLog.service');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.27G-A: Recovery authorization denial auditing
 *
 * Access model:
 * - Management/Admin/IT can VIEW reliability state;
 * - only Admin/Founder/Super Admin/IT reliability operators can REQUEUE jobs;
 * - denied dashboard access and denied recovery mutations are append-only audited;
 * - audit failure never weakens authorization and never blocks the primary response.
 */

const RECOVERY_DASHBOARD_AUDIT_ENTITY_ID =
  'LEAD_RECOVERY_DASHBOARD';

function cleanText(
  value,
  maxLength = 500
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

function normalizeRole(value) {
  return cleanText(
    value,
    150
  ).toUpperCase();
}

function isRecoveryViewer(
  user
) {
  if (!user) {
    return false;
  }

  const role =
    normalizeRole(
      user.role
    );

  const department =
    normalizeRole(
      user.department
    );

  const position =
    normalizeRole(
      user.position
    );

  return (
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'FOUNDER' ||
    role === 'MANAGER' ||
    role === 'IT' ||
    role === 'IT_ADMIN' ||
    role === 'IT_MANAGER' ||
    role.endsWith('_MANAGER') ||
    role.includes('MANAGER') ||
    department === 'ADMIN' ||
    department === 'MANAGEMENT' ||
    department === 'IT' ||
    position.includes('ADMIN') ||
    position.includes('FOUNDER') ||
    position.includes('MANAGER') ||
    position.includes('IT')
  );
}

function isRecoveryMutator(
  user
) {
  if (!user) {
    return false;
  }

  const role =
    normalizeRole(
      user.role
    );

  const department =
    normalizeRole(
      user.department
    );

  const position =
    normalizeRole(
      user.position
    );

  return (
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'FOUNDER' ||
    role === 'IT' ||
    role === 'IT_ADMIN' ||
    role === 'IT_MANAGER' ||
    role.startsWith('IT_') ||
    department === 'ADMIN' ||
    department === 'IT' ||
    position.includes('ADMIN') ||
    position.includes('FOUNDER') ||
    position.includes('IT MANAGER') ||
    position.includes('IT ADMIN')
  );
}

function isRecoveryOperator(
  user
) {
  return isRecoveryViewer(
    user
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

function getDeviceHash(req) {
  return cleanText(
    req.headers?.['x-device-hash'],
    256
  );
}

function buildRequesterContext(
  user
) {
  return {
    role:
      normalizeRole(
        user?.role
      ),

    department:
      normalizeRole(
        user?.department
      ),

    position:
      normalizeRole(
        user?.position
      ),
  };
}

async function safeAudit(
  payload
) {
  try {
    await recordAudit(
      payload
    );
  } catch (error) {
    console.warn(
      '[Lead Recovery Controller] Audit logging failed:',
      cleanText(
        error.message,
        300
      )
    );
  }
}

async function auditRecoveryAccessDenied(
  req,
  {
    actionType,
    leadId = null,
    recoveryType = '',
  } = {}
) {
  const validLeadId =
    leadId &&
    mongoose.isValidObjectId(
      leadId
    )
      ? String(leadId)
      : '';

  await safeAudit({
    actorId:
      getAuditActorId(
        req.user
      ),

    actionType,

    entityType:
      validLeadId
        ? 'LEAD'
        : 'DASHBOARD',

    entityId:
      validLeadId ||
      RECOVERY_DASHBOARD_AUDIT_ENTITY_ID,

    severity:
      actionType ===
      'RECOVERY_MUTATION_DENIED'
        ? 'HIGH'
        : 'MEDIUM',

    ipAddress:
      getRequestIp(req),

    deviceHash:
      getDeviceHash(req),

    metadata: {
      ...buildRequesterContext(
        req.user
      ),

      recoveryType:
        cleanText(
          recoveryType,
          80
        )
          .toUpperCase()
          .replace(
            /[\s-]+/g,
            '_'
          ),

      method:
        cleanText(
          req.method,
          20
        ).toUpperCase(),

      path:
        cleanText(
          req.route?.path ||
          req.path,
          200
        ),
    },
  });
}

function handleRecoveryError(
  error,
  req,
  res
) {
  const code =
    cleanText(
      error?.code,
      120
    );

  if (
    code === 'LEAD_NOT_FOUND'
  ) {
    return fail(
      res,
      404,
      code,
      error.message,
      [],
      req
    );
  }

  if (
    [
      'RECOVERY_DATE_INVALID',
      'RECOVERY_DATE_RANGE_INVALID',
      'LEAD_ID_REQUIRED',
      'RECOVERY_TYPE_INVALID',
      'RECOVERY_REASON_REQUIRED',
      'RECOVERY_TYPE_NOT_APPLICABLE',
    ].includes(code)
  ) {
    return fail(
      res,
      400,
      code,
      error.message,
      [],
      req
    );
  }

  if (
    code === 'RECOVERY_REQUEUE_FAILED'
  ) {
    return fail(
      res,
      409,
      code,
      error.message,
      [],
      req
    );
  }

  return null;
}


/* ============================================================
   GET RELIABILITY / RECOVERY DASHBOARD
============================================================ */

async function getLeadRecoveryDashboardController(
  req,
  res,
  next
) {
  try {
    if (
      !isRecoveryViewer(
        req.user
      )
    ) {
      await auditRecoveryAccessDenied(
        req,
        {
          actionType:
            'RECOVERY_ACCESS_DENIED',
        }
      );

      return fail(
        res,
        403,
        'RBAC_FORBIDDEN',
        'Lead recovery visibility is restricted to authorised Management, Admin and IT users.',
        [],
        req
      );
    }

    const dashboard =
      await getLeadRecoveryDashboard({
        from:
          cleanText(
            req.query.from,
            100
          ) || null,

        to:
          cleanText(
            req.query.to,
            100
          ) || null,

        limit:
          req.query.limit,

        auditLimit:
          req.query.auditLimit,
      });

    await safeAudit({
      actorId:
        getAuditActorId(
          req.user
        ),

      actionType:
        'LEAD_RECOVERY_DASHBOARD_VIEWED',

      entityType:
        'DASHBOARD',

      entityId:
        RECOVERY_DASHBOARD_AUDIT_ENTITY_ID,

      severity:
        'LOW',

      ipAddress:
        getRequestIp(req),

      deviceHash:
        getDeviceHash(req),

      metadata: {
        crmProblems:
          dashboard.metrics
            ?.crmProblemCount ||
          0,

        crmManualRecovery:
          dashboard.metrics
            ?.crmManualRecoveryCount ||
          0,

        salesNotificationProblems:
          dashboard.metrics
            ?.salesNotificationProblemCount ||
          0,

        itNotificationProblems:
          dashboard.metrics
            ?.itNotificationProblemCount ||
          0,

        websiteAutomationProblems:
          dashboard.metrics
            ?.websiteAutomationProblemCount ||
          0,

        contactAmbiguities:
          dashboard.metrics
            ?.contactAmbiguityCount ||
          0,

        canRequeue:
          isRecoveryMutator(
            req.user
          ),
      },
    });

    return ok(
      res,
      {
        dashboard,

        permissions: {
          canView:
            true,

          canRequeue:
            isRecoveryMutator(
              req.user
            ),
        },
      },
      'Lead recovery dashboard retrieved successfully',
      200,
      req
    );

  } catch (error) {
    const handled =
      handleRecoveryError(
        error,
        req,
        res
      );

    if (handled) {
      return handled;
    }

    return next(error);
  }
}


/* ============================================================
   MANUAL REQUEUE
============================================================ */

async function requeueLeadRecoveryController(
  req,
  res,
  next
) {
  try {
    const rawLeadId =
      cleanText(
        req.params.id ||
        req.params.leadId,
        100
      );

    const requestedRecoveryType =
      cleanText(
        req.body?.recoveryType,
        80
      )
        .toUpperCase()
        .replace(
          /[\s-]+/g,
          '_'
        );

    if (
      !isRecoveryViewer(
        req.user
      )
    ) {
      await auditRecoveryAccessDenied(
        req,
        {
          actionType:
            'RECOVERY_ACCESS_DENIED',

          leadId:
            rawLeadId,

          recoveryType:
            requestedRecoveryType,
        }
      );

      return fail(
        res,
        403,
        'RBAC_FORBIDDEN',
        'Lead recovery visibility is restricted to authorised Management, Admin and IT users.',
        [],
        req
      );
    }

    if (
      !isRecoveryMutator(
        req.user
      )
    ) {
      await auditRecoveryAccessDenied(
        req,
        {
          actionType:
            'RECOVERY_MUTATION_DENIED',

          leadId:
            rawLeadId,

          recoveryType:
            requestedRecoveryType,
        }
      );

      return fail(
        res,
        403,
        'RECOVERY_MUTATION_FORBIDDEN',
        'Manual recovery requeue is restricted to authorised Admin, Founder and IT reliability operators.',
        [],
        req
      );
    }

    const leadId =
      rawLeadId;

    if (
      !leadId ||
      !mongoose.isValidObjectId(
        leadId
      )
    ) {
      return fail(
        res,
        400,
        'LEAD_ID_REQUIRED',
        'A valid Lead ID is required for recovery requeue.',
        [],
        req
      );
    }

    const recoveryType =
      requestedRecoveryType;

    if (
      !RECOVERY_TYPES.includes(
        recoveryType
      )
    ) {
      return fail(
        res,
        400,
        'RECOVERY_TYPE_INVALID',
        `recoveryType must be one of: ${RECOVERY_TYPES.join(', ')}.`,
        [],
        req
      );
    }

    const reason =
      cleanText(
        req.body?.reason,
        500
      );

    if (
      reason.length < 5
    ) {
      return fail(
        res,
        400,
        'RECOVERY_REASON_REQUIRED',
        'A meaningful recovery reason is required.',
        [],
        req
      );
    }

    const result =
      await requeueLeadRecovery({
        leadId,
        recoveryType,

        actorId:
          getAuditActorId(
            req.user
          ),

        reason,
      });

    return ok(
      res,
      result,
      `${recoveryType} recovery job requeued successfully`,
      200,
      req
    );

  } catch (error) {
    const handled =
      handleRecoveryError(
        error,
        req,
        res
      );

    if (handled) {
      return handled;
    }

    return next(error);
  }
}

module.exports = {
  isRecoveryOperator,
  isRecoveryViewer,
  isRecoveryMutator,
  getLeadRecoveryDashboardController,
  requeueLeadRecoveryController,
};