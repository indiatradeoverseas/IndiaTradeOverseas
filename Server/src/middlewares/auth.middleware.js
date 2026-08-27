const mongoose = require('mongoose');
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
    const subStr = decoded.sub ? decoded.sub.toString() : '';
    const isObjId = mongoose.isValidObjectId(subStr);
    const idQuery = isObjId
      ? { $or: [{ _id: subStr }, { _id: new mongoose.Types.ObjectId(subStr) }] }
      : { _id: subStr };

    let user = await User.findOne(idQuery);
    let foundIn = 'User';

    if (!user) {
      const Admin = require('../modules/admin-auth/admin.model');
      user = await Admin.findOne(idQuery);
      if (user) foundIn = 'Admin';
    }

    if (!user) {
      const Employee = require('../modules/employee/employee.model');
      user = await Employee.findOne(idQuery);
      if (user) foundIn = 'Employee';
    }

    if (!user) {
      console.error(`[AUTH FAIL] No user/admin/employee found for sub: ${decoded.sub}`);
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'User/Employee is deactivated or invalid', [], req);
    }

    if ((user.isActive === false) || (user.status === 'INACTIVE')) {
      console.error(`[AUTH FAIL] User ${user.email} in ${foundIn} is inactive! isActive: ${user.isActive}, status: ${user.status}`);
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'User/Employee is deactivated or invalid', [], req);
    }

    if (user && foundIn === 'User') {
      try {
        await User.updateOne(
          { _id: user._id },
          { $set: { isOnline: true, lastActiveAt: new Date() } }
        );
      } catch (err) {
        console.error('Error updating user active status in middleware:', err);
      }

      const Employee = require('../modules/employee/employee.model');
      const employee = await Employee.findOne({ employeeId: user.employeeId });
      if (employee) {
        user = user.toObject();
        user.employeeDbId = employee._id;
        user.role = employee.role;
        user.position = employee.position;
        user.department = employee.department;
        user.permissions = employee.permissions;
      }
    } else if (user) {
      if (typeof user.toObject === 'function') {
        user = user.toObject();
      }
      user.employeeDbId = user._id;
    }

    user.modelName = foundIn;
    req.user = user;

    next();
  } catch (error) {
    console.error(`[AUTH ERROR] JWT verify failed: ${error.message} (name: ${error.name})`);
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
    console.error(`[AUTH ERROR] JWT verify failed for token "${token ? token.substring(0, 15) : 'NULL'}...": ${error.message} (name: ${error.name})`);
    if (error.name === 'TokenExpiredError') {
      return fail(res, 401, 'AUTH_TOKEN_EXPIRED', 'Token has expired', [], req);
    }
    return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid token or signature', [], req);
  }
}

function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, 'AUTH_UNAUTHORIZED', 'User not authenticated', [], req);
    }
    const userRole = req.user.role;
    if (allowedRoles.length && !allowedRoles.includes(userRole)) {
      return fail(res, 403, 'AUTH_FORBIDDEN', 'You do not have permission to access this resource', [], req);
    }
    next();
  };
}

module.exports = { 
  authenticate, 
  authenticateDistributor, 
  authorize 
};
