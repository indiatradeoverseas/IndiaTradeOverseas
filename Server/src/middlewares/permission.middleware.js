const { fail } = require('../utils/response');

const rolePermissions = {
  ADMIN: {
    exportPermission: true,
    productUploadPermission: true,
    leadPermission: true,
    documentPermission: true,
    taskPermission: true,
    dispatchPermission: true,
    paymentPermission: true,
    quotationPermission: true
  },
  MANAGER: {
    exportPermission: true,
    productUploadPermission: true,
    leadPermission: true,
    documentPermission: true,
    taskPermission: true,
    dispatchPermission: true,
    paymentPermission: true,
    quotationPermission: true
  },
  SALES: {
    leadPermission: true,
    taskPermission: true,
    documentPermission: true
  },
  ACCOUNTS: {
    paymentPermission: true,
    leadPermission: true,
    documentPermission: true
  },
  FINANCE: {
    paymentPermission: true,
    leadPermission: true,
    documentPermission: true
  },
  PROCUREMENT: {
    dispatchPermission: true,
    leadPermission: true,
    documentPermission: true
  },
  HR: {
    leadPermission: true,
    taskPermission: true,
    documentPermission: true
  },
  IT: {
    exportPermission: true,
    productUploadPermission: true,
    leadPermission: true,
    documentPermission: true,
    taskPermission: true,
    dispatchPermission: true,
    paymentPermission: true,
    quotationPermission: true
  },
  SOFTWARE_ENGINEER: {
    exportPermission: true,
    productUploadPermission: true,
    leadPermission: true,
    documentPermission: true,
    taskPermission: true,
    dispatchPermission: true,
    paymentPermission: true,
    quotationPermission: true
  }
};

function checkPermission(...permissionNames) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Unauthorized: Authentication required', [], req);
    }

    // Admin role, ADMIN department, or Admin designations get bypass access to all CRM resources
    const isAdminUser =
      req.user.role === 'ADMIN' ||
      req.user.department === 'ADMIN' ||
      (req.user.position && req.user.position.toLowerCase().includes('admin'));

    if (isAdminUser) {
      return next();
    }

    const hasAnyPermission = permissionNames.some(perm => {
      // 1. Check nested permissions on Employee model (e.g. exportPermission -> permissions.export)
      if (req.user.permissions) {
        const shortName = perm.replace('Permission', '');
        if (req.user.permissions[shortName] === true) return true;
      }

      // 2. Check root properties on User model
      if (req.user[perm] === true) return true;

      // 3. Check role-based defaults
      const rolePerms = rolePermissions[req.user.role] || rolePermissions[req.user.department];
      if (rolePerms && rolePerms[perm] === true) return true;

      return false;
    });

    if (hasAnyPermission) {
      return next();
    }

    return fail(
      res,
      403,
      'PERMISSION_DENIED',
      `Forbidden: Access restricted. Requires at least one permission in [${permissionNames.join(', ')}]`,
      [],
      req
    );
  };
}

module.exports = checkPermission;

