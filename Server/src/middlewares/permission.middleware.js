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
    exportPermission: false,
    importPermission: true,
    productUploadPermission: true,
    leadPermission: true,
    documentPermission: true,
    taskPermission: true,
    dispatchPermission: true,
    paymentPermission: true,
    quotationPermission: true,
    jobPermission: true
  },
  SALES: {
    exportPermission: false,
    importPermission: false,
    leadPermission: true,
    taskPermission: true,
    documentPermission: true
  },
  SALES_MANAGER: {
    exportPermission: false,
    importPermission: true,
    leadPermission: true,
    taskPermission: true,
    documentPermission: true,
    quotationPermission: true,
    paymentPermission: true,
    dispatchPermission: true
  },
  SALES_EXECUTIVE: {
    exportPermission: false,
    leadPermission: true,
    taskPermission: true,
    documentPermission: true,
    quotationPermission: true,
    paymentPermission: true,
    dispatchPermission: true
  },
  SALES_TRIAL: {
    exportPermission: false,
    leadPermission: true,
    taskPermission: true,
    documentPermission: true,
    quotationPermission: true,
    paymentPermission: true,
    dispatchPermission: true
  },
  ACCOUNTS: {
    exportPermission: false,
    paymentPermission: true,
    leadPermission: true,
    documentPermission: true
  },
  FINANCE: {
    exportPermission: false,
    paymentPermission: true,
    leadPermission: true,
    documentPermission: true
  },
  PROCUREMENT: {
    exportPermission: false,
    dispatchPermission: true,
    leadPermission: true,
    documentPermission: true
  },
  HR: {
    exportPermission: false,
    leadPermission: true,
    taskPermission: true,
    documentPermission: true
  },
  DRIVER: {
    exportPermission: false,
    productUploadPermission: false,
    leadPermission: true,
    documentPermission: true,
    taskPermission: true,
    dispatchPermission: true,
    paymentPermission: false,
    quotationPermission: false
  },
  FLEET_CAPTAIN: {
    exportPermission: false,
    productUploadPermission: false,
    leadPermission: true,
    documentPermission: true,
    taskPermission: true,
    dispatchPermission: true,
    paymentPermission: false,
    quotationPermission: false
  },
  TRANSPORT: {
    exportPermission: false,
    productUploadPermission: false,
    leadPermission: true,
    documentPermission: true,
    taskPermission: true,
    dispatchPermission: true,
    paymentPermission: false,
    quotationPermission: false
  },
  TRANSPORT_MANAGER: {
    exportPermission: false,
    productUploadPermission: false,
    leadPermission: true,
    documentPermission: true,
    taskPermission: true,
    dispatchPermission: true,
    paymentPermission: false,
    quotationPermission: false
  },
  LOGISTICS: {
    exportPermission: false,
    productUploadPermission: false,
    leadPermission: true,
    documentPermission: true,
    taskPermission: true,
    dispatchPermission: true,
    paymentPermission: false,
    quotationPermission: false
  },
  LOGISTICS_MANAGER: {
    exportPermission: false,
    productUploadPermission: false,
    leadPermission: true,
    documentPermission: true,
    taskPermission: true,
    dispatchPermission: true,
    paymentPermission: false,
    quotationPermission: false
  },
  IT: {
    exportPermission: false,
    productUploadPermission: true,
    leadPermission: true,
    documentPermission: true,
    taskPermission: true,
    dispatchPermission: true,
    paymentPermission: true,
    quotationPermission: true
  },
  SOFTWARE_ENGINEER: {
    exportPermission: false,
    productUploadPermission: true,
    leadPermission: true,
    documentPermission: true,
    taskPermission: true,
    dispatchPermission: true,
    paymentPermission: true,
    quotationPermission: true
  },
  EMPLOYEE: {
    exportPermission: false,
    leadPermission: true,
    taskPermission: true,
    documentPermission: true,
    quotationPermission: true,
    paymentPermission: true,
    dispatchPermission: true
  },
  USER: {
    exportPermission: false,
    leadPermission: true,
    taskPermission: true,
    documentPermission: true,
    quotationPermission: true,
    paymentPermission: true,
    dispatchPermission: true
  }
};

function checkPermission(...permissionNames) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Unauthorized: Authentication required', [], req);
    }

    const userRole = String(req.user.role || '').toUpperCase().trim();
    const userDept = String(req.user.department || '').toUpperCase().trim();
    const userPosition = String(req.user.position || '').toLowerCase().trim();

    // 1. Admin role, ADMIN department, or Admin/Founder designations get full bypass access
    const isAdminUser =
      userRole === 'ADMIN' ||
      userRole === 'FOUNDER' ||
      userRole === 'SUPER_ADMIN' ||
      userRole === 'CO_FOUNDER' ||
      userDept === 'ADMIN' ||
      userPosition.includes('admin') ||
      userPosition.includes('founder') ||
      userRole.toLowerCase().includes('founder');

    if (isAdminUser) {
      return next();
    }

    // 2. Check if user is a Manager (e.g. MANAGER, SALES_MANAGER, HR_MANAGER, etc.)
    const isManagerUser =
      userRole === 'MANAGER' ||
      userRole.endsWith('_MANAGER') ||
      userRole.includes('MANAGER') ||
      userPosition.includes('manager');

    const hasAnyPermission = permissionNames.some(perm => {
      const shortName = perm.replace('Permission', '');

      // Special rule: EXPORT PERMISSION (export / exportPermission)
      // Export is strictly blocked for non-Admins UNLESS explicitly set to true on user document/permissions
      if (shortName === 'export' || perm === 'exportPermission') {
        if (req.user.permissions && (req.user.permissions.export === true || req.user.permissions.exportPermission === true)) return true;
        if (req.user.exportPermission === true) return true;
        return false; // Block export by default for Managers & Employees
      }

      // For Managers (SALES_MANAGER, MANAGER, etc.), grant standard operational permissions by default (leads, tasks, import, documents, dispatch, payment, quotation)
      if (isManagerUser) {
        if (req.user.permissions && (req.user.permissions[shortName] === false || req.user.permissions[perm] === false)) {
          return false; // Founder explicitly revoked this permission
        }
        return true; // Managers get default operational access to leads, tasks, import, docs, etc.
      }

      // 3. For non-manager employees: Check explicit true on user model or nested permissions
      if (req.user.permissions) {
        if (req.user.permissions[shortName] === true || req.user.permissions[perm] === true) return true;
        // Don't auto-block leads or tasks for active employees if shortName is lead or task
        if (shortName !== 'lead' && shortName !== 'task' && perm !== 'leadPermission' && perm !== 'taskPermission') {
          if (req.user.permissions[shortName] === false || req.user.permissions[perm] === false) return false;
        }
      }

      if (req.user[perm] === true) return true;

      // Check role default
      const rolePerms = rolePermissions[userRole] || rolePermissions[userDept];
      if (rolePerms && rolePerms[perm] === true) return true;

      // Default grant lead/task permissions for general active employees
      if (shortName === 'lead' || shortName === 'task' || perm === 'leadPermission' || perm === 'taskPermission') {
        return true;
      }

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

