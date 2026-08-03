const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../modules/users/user.model');
const { fail } = require('../utils/response');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Missing authentication token', [], req);
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    let user = await User.findById(decoded.sub);

    if (!user) {
      const Admin = require('../modules/admin-auth/admin.model');
      user = await Admin.findById(decoded.sub);
    }

    if (!user || !user.isActive) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'User is deactivated or invalid', [], req);
    }

    req.user = user;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return fail(res, 401, 'AUTH_TOKEN_EXPIRED', 'Token has expired', [], req);
    }
    return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid token or signature', [], req);
  }
}

async function authenticateDistributor(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Missing authentication token', [], req);
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const Distributor = require('../modules/distributors/distributor.model');
    const distributor = await Distributor.findById(decoded.sub);

    if (distributor) {
      req.distributor = distributor;
      return next();
    }

    const User = require('../modules/users/user.model');
    const user = await User.findById(decoded.sub);

    if (user && user.isActive) {
      req.user = user;
      req.distributor = {
        _id: user._id,
        name: user.fullName,
        email: user.email,
        approvalStatus: 'approved'
      };
      return next();
    }

    return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Distributor is invalid or not registered', [], req);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return fail(res, 401, 'AUTH_TOKEN_EXPIRED', 'Token has expired', [], req);
    }
    return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid token or signature', [], req);
  }
}

module.exports = { authenticate, authenticateDistributor };
