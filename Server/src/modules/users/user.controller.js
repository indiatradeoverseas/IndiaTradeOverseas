const userService = require('./user.service');
const { ok, fail } = require('../../utils/response');
const { recordAudit } = require('../security-audit/auditLog.service');

async function createEmployee(req, res, next) {
  try {
    const { employeeId, fullName, email, role, department } = req.body;
    if (!employeeId || !fullName || !email) {
      return fail(res, 400, 'VALIDATION_FAILED', 'employeeId, fullName, and email are required');
    }

    const user = await userService.createUser({
      ...req.body,
      createdBy: req.user ? req.user._id : null
    });

    await recordAudit({
      actorId: req.user ? req.user._id : null,
      actionType: 'USER_CREATED',
      entityType: 'USER',
      entityId: user._id.toString(),
      severity: 'LOW',
      ipAddress: req.ip,
      deviceHash: req.headers['x-device-hash'] || '',
      metadata: { employeeId: user.employeeId }
    });

    return ok(res, { user }, 'User created successfully', 201, req);
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 499, 'DUPLICATE_FOUND', 'User with email or employeeId already exists');
    }
    next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const users = await userService.listAllUsers();
    return ok(res, { users }, 'Users list retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function activateUser(req, res, next) {
  try {
    const user = await userService.activateUser(req.params.id);
    if (!user) return fail(res, 404, 'VALIDATION_FAILED', 'User not found');

    await recordAudit({
      actorId: req.user._id,
      actionType: 'USER_ACTIVATED',
      entityType: 'USER',
      entityId: user._id.toString(),
      severity: 'LOW',
      ipAddress: req.ip,
      deviceHash: req.headers['x-device-hash'] || '',
      metadata: { activatedBy: req.user.fullName }
    });

    return ok(res, { user }, 'User activated successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;
    if (!role) return fail(res, 400, 'VALIDATION_FAILED', 'Role is required');

    const user = await userService.updateUserRole(req.params.id, role);
    if (!user) return fail(res, 404, 'VALIDATION_FAILED', 'User not found');

    return ok(res, { user }, 'User role updated successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function updateUserDepartment(req, res, next) {
  try {
    const { department } = req.body;
    if (!department) return fail(res, 400, 'VALIDATION_FAILED', 'Department is required');

    const user = await userService.updateUserDepartment(req.params.id, department);
    if (!user) return fail(res, 404, 'VALIDATION_FAILED', 'User not found');

    return ok(res, { user }, 'User department updated successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function updateUserPermissions(req, res, next) {
  try {
    const { exportPermission, productUploadPermission, leadPermission, documentPermission, taskPermission, dispatchPermission, paymentPermission, quotationPermission, jobPermission } = req.body;
    const permissions = {};

    if (typeof exportPermission === 'boolean') {
      permissions.exportPermission = exportPermission;
    }
    if (typeof productUploadPermission === 'boolean') {
      permissions.productUploadPermission = productUploadPermission;
    }
    if (typeof leadPermission === 'boolean') {
      permissions.leadPermission = leadPermission;
    }
    if (typeof documentPermission === 'boolean') {
      permissions.documentPermission = documentPermission;
    }
    if (typeof taskPermission === 'boolean') {
      permissions.taskPermission = taskPermission;
    }
    if (typeof dispatchPermission === 'boolean') {
      permissions.dispatchPermission = dispatchPermission;
    }
    if (typeof paymentPermission === 'boolean') {
      permissions.paymentPermission = paymentPermission;
    }
    if (typeof quotationPermission === 'boolean') {
      permissions.quotationPermission = quotationPermission;
    }
    if (typeof jobPermission === 'boolean') {
      permissions.jobPermission = jobPermission;
    }

    if (!Object.keys(permissions).length) {
      return fail(res, 400, 'VALIDATION_FAILED', 'At least one permission field is required');
    }

    const user = await userService.updateUserPermissions(req.params.id, permissions);
    if (!user) return fail(res, 404, 'VALIDATION_FAILED', 'User not found');

    return ok(res, { user }, 'User permissions updated successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function deactivateUser(req, res, next) {
  try {
    const user = await userService.deactivateUser(req.params.id);
    if (!user) return fail(res, 404, 'VALIDATION_FAILED', 'User not found');

    await recordAudit({
      actorId: req.user._id,
      actionType: 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: user._id.toString(),
      severity: 'MEDIUM',
      ipAddress: req.ip,
      deviceHash: req.headers['x-device-hash'] || '',
      metadata: { deactivatedBy: req.user.fullName }
    });

    return ok(res, { user }, 'User deactivated successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const user = await userService.deleteUser(req.params.id);
    if (!user) return fail(res, 404, 'VALIDATION_FAILED', 'User not found');

    await recordAudit({
      actorId: req.user._id,
      actionType: 'USER_DELETED',
      entityType: 'USER',
      entityId: user._id.toString(),
      severity: 'HIGH',
      ipAddress: req.ip,
      deviceHash: req.headers['x-device-hash'] || '',
      metadata: { deletedBy: req.user.fullName }
    });

    return ok(res, { user }, 'User deleted successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createEmployee,
  listUsers,
  deactivateUser,
  activateUser,
  updateUserRole,
  updateUserDepartment,
  updateUserPermissions,
  deleteUser
};
