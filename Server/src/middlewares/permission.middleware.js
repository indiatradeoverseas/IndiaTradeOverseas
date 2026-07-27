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

    if (req.user.role === 'ADMIN') {
      return next();
    }

    const hasAnyPermission = permissionNames.some(perm => {
      if (req.user[perm] === true) return true;
      const rolePerms = rolePermissions[req.user.role];
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

