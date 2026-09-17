const { fail } = require('../utils/response');

function rbac(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Unauthorized: Authentication required', [], req);
    }

    const roleUpper = (req.user.role || '').toUpperCase();
    const positionLower = (req.user.position || '').toLowerCase();

    const isAdminUser =
      ['ADMIN', 'CEO', 'FOUNDER', 'SUPER_ADMIN', 'CO_FOUNDER'].includes(roleUpper) ||
      req.user.department === 'ADMIN' ||
      positionLower.includes('admin') ||
      positionLower.includes('founder') ||
      positionLower.includes('ceo') ||
      roleUpper.includes('FOUNDER') ||
      roleUpper.includes('CEO');

    const userRole = req.user.role || '';
    const isMatched = allowedRoles.includes('*') || 
                      allowedRoles.includes(userRole) ||
                      allowedRoles.includes(roleUpper) ||
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
