const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../modules/users/user.model');
const TrustedDevice = require('../modules/auth/trustedDevice.model');
const { fail } = require('../utils/response');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Missing authentication token', [], req);
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.sub);

    if (!user || !user.isActive) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'User is deactivated or invalid', [], req);
    }

    
    req.user = user;

    
    const openRoutes = [
      '/api/auth/device/request-approval',
      '/api/auth/me',
      '/api/auth/get-me',
      '/api/auth/logout',
      '/api/auth/logout-all',
      '/api/auth/verify-otp',
      '/api/auth/sessions',
      '/api/v1/auth/device/request-approval',
      '/api/v1/auth/me',
      '/api/v1/auth/get-me',
      '/api/v1/auth/logout',
      '/api/v1/auth/logout-all',
      '/api/v1/auth/verify-otp',
      '/api/v1/auth/sessions'
    ];

    const isWhiteListedRoute = openRoutes.some(route => req.originalUrl.includes(route));

    const isClient = user.employeeId && user.employeeId.startsWith('CL_');
    const isBypassedRole = ['ADMIN', 'MANAGER', 'HR'].includes(user.role);
    const bypassDeviceCheck = isClient || isBypassedRole;

    if (!bypassDeviceCheck && !isWhiteListedRoute) {
      const deviceHash = req.headers['x-device-hash'];
      if (!deviceHash) {
        return fail(res, 403, 'DEVICE_REQUIRED', 'Access denied: Device hash header is required', [], req);
      }

      let device = await TrustedDevice.findOne({ userId: user._id, deviceHash });

      if (!device) {
        
        device = await TrustedDevice.create({
          userId: user._id,
          deviceHash,
          deviceName: req.headers['user-agent'] || 'Browser/Unknown Device',
          ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
          isApproved: false
        });

        return fail(
          res,
          403,
          'DEVICE_PENDING_APPROVAL',
          'Access restricted: Device is registered and pending approval by Admin.',
          { deviceId: device._id },
          req
        );
      }

      if (!device.isApproved) {
        return fail(
          res,
          403,
          'DEVICE_PENDING_APPROVAL',
          'Access restricted: Device is pending approval by Admin.',
          { deviceId: device._id },
          req
        );
      }
    }

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

    // Check if it is a system user (Staff)
    const User = require('../modules/users/user.model');
    const user = await User.findById(decoded.sub);

    if (user && user.isActive) {
      req.user = user;
      // Setup a mock distributor context for staff bypass
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
