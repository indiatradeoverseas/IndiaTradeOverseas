const { fail } = require('../utils/response');

const {
  recordAudit
} = require('../modules/security-audit/auditLog.service');


/* ============================================================
   HELPERS
============================================================ */

function getSafePath(req) {
  return String(
    req?.originalUrl ||
    req?.url ||
    ''
  ).split('?')[0];
}


function getActorId(user) {
  return (
    user?._id ||
    user?.id ||
    user?.employeeDbId ||
    null
  );
}


function recordDeniedAccess({
  req,
  actionType,
  role = ''
}) {

  /*
   * Audit logging must not break the actual authorization flow.
   * If the audit database write fails, the request must still
   * receive the correct 401/403 response.
   */
  recordAudit({
    actorId:
      getActorId(req?.user),

    actionType,

    entityType:
      'AUTH',

    entityId:
      getSafePath(req) ||
      'UNKNOWN_ROUTE',

    severity:
      actionType === 'RBAC_ACCESS_DENIED'
        ? 'MEDIUM'
        : 'LOW',

    ipAddress:
      req?.ip || '',

    deviceHash:
      req?.headers?.['x-device-hash'] || '',

    metadata: {
      method:
        req?.method || '',

      path:
        getSafePath(req),

      role:
        role || ''
    }
  }).catch(error => {

    console.error(
      '[RBAC Audit] Failed to record denied access:',
      error?.code ||
      error?.name ||
      'UNKNOWN'
    );
  });
}


/* ============================================================
   RBAC
============================================================ */

function rbac(...allowedRoles) {

  return (
    req,
    res,
    next
  ) => {

    if (!req.user) {

      recordDeniedAccess({
        req,
        actionType:
          'ACCESS_DENIED'
      });

      return fail(
        res,
        401,
        'AUTH_INVALID_CREDENTIALS',
        'Unauthorized: Authentication required',
        [],
        req
      );
    }


    const roleUpper =
      (
        req.user.role ||
        ''
      ).toUpperCase();


    const positionLower =
      (
        req.user.position ||
        ''
      ).toLowerCase();


    const isAdminUser =
      [
        'ADMIN',
        'CEO',
        'FOUNDER',
        'SUPER_ADMIN',
        'CO_FOUNDER'
      ].includes(roleUpper) ||

      req.user.department ===
        'ADMIN' ||

      positionLower.includes(
        'admin'
      ) ||

      positionLower.includes(
        'founder'
      ) ||

      positionLower.includes(
        'ceo'
      ) ||

      roleUpper.includes(
        'FOUNDER'
      ) ||

      roleUpper.includes(
        'CEO'
      );


    const userRole =
      req.user.role ||
      '';


    const isMatched =

      allowedRoles.includes('*') ||

      allowedRoles.includes(
        userRole
      ) ||

      allowedRoles.includes(
        roleUpper
      ) ||

      (
        allowedRoles.includes(
          'MANAGER'
        ) &&
        (
          userRole ===
            'MANAGER' ||

          userRole.endsWith(
            '_MANAGER'
          ) ||

          userRole
            .toLowerCase()
            .includes(
              'manager'
            )
        )
      );


    if (
      isAdminUser ||
      isMatched
    ) {
      return next();
    }


    /*
     * Master DPR security requirement:
     * denied RBAC/admin access must be auditable.
     */
    recordDeniedAccess({
      req,
      actionType:
        'RBAC_ACCESS_DENIED',

      role:
        roleUpper
    });


    return fail(
      res,
      403,
      'RBAC_FORBIDDEN',
      `Forbidden: Access restricted. Requires role in [${allowedRoles.join(', ')}]`,
      [],
      req
    );
  };
}


module.exports = rbac;