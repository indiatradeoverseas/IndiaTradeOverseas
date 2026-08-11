const { fail } = require('../utils/response');

function rbac(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Unauthorized: Authentication required', [], req);
    }

    if (allowedRoles.includes('*') || allowedRoles.includes(req.user.role)) {
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
