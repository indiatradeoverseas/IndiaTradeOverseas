const { fail } = require('../utils/response');

function rbac(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Unauthorized: Authentication required', [], req);
    }

    const isAdminUser =
      req.user.role === 'ADMIN' ||
      req.user.department === 'ADMIN' ||
      (req.user.position && req.user.position.toLowerCase().includes('admin'));

    const userRole = req.user.role || '';
    const isMatched = allowedRoles.includes('*') || 
                      allowedRoles.includes(userRole) ||
                      (allowedRoles.includes('MANAGER') && (userRole === 'MANAGER' || userRole.endsWith('_MANAGER') || userRole.toLowerCase().includes('manager')));

    if (isAdminUser || isMatched) {
      return next();
    }

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
