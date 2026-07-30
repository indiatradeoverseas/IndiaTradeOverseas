const fs = require('fs');
const userService = require('./user.service');
const { ok, fail } = require('../../utils/response');
const { recordAudit } = require('../security-audit/auditLog.service');
const documentService = require('../documents/document.service');
const Document = require('../documents/document.model');

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

    const user = await userService.updateUserRole(req.params.id, role, req.user ? req.user._id : null);
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

    const user = await userService.updateUserDepartment(req.params.id, department, req.user ? req.user._id : null);
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

async function getMyProfile(req, res, next) {
  try {
    const profile = await userService.getProfile(req.user._id, req.user);
    if (!profile) return fail(res, 404, 'VALIDATION_FAILED', 'User not found');
    return ok(res, { profile }, 'Profile retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const profile = await userService.updateOwnProfile(req.user._id, req.body);
    return ok(res, { profile }, 'Profile updated successfully', 200, req);
  } catch (error) {
    if (error.message === 'NO_VALID_FIELDS') {
      return fail(res, 400, 'VALIDATION_FAILED', 'No editable fields provided');
    }
    next(error);
  }
}

async function getEmployeeProfile(req, res, next) {
  try {
    const profile = await userService.getProfile(req.params.id, req.user);
    if (!profile) return fail(res, 404, 'VALIDATION_FAILED', 'User not found');
    return ok(res, { profile }, 'Profile retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function updateEmployeeProfile(req, res, next) {
  try {
    const profile = await userService.updateEmployeeProfile(req.params.id, req.body, req.user);
    if (!profile) return fail(res, 404, 'VALIDATION_FAILED', 'User not found');

    await recordAudit({
      actorId: req.user._id,
      actionType: 'EMPLOYEE_PROFILE_UPDATED',
      entityType: 'USER',
      entityId: req.params.id,
      severity: 'MEDIUM',
      ipAddress: req.ip,
      metadata: { updatedBy: req.user.fullName }
    });

    return ok(res, { profile }, 'Employee profile updated successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function revealEmployeeField(req, res, next) {
  try {
    const { field, reason } = req.body;
    if (!field) return fail(res, 400, 'VALIDATION_FAILED', 'field is required');
    if (!reason) return fail(res, 400, 'VALIDATION_FAILED', 'reason is required to reveal sensitive data');

    const result = await userService.revealProfileField(req.params.id, field, req.user);
    if (!result) return fail(res, 404, 'VALIDATION_FAILED', 'User not found');

    await recordAudit({
      actorId: req.user._id,
      actionType: 'EMPLOYEE_PII_REVEALED',
      entityType: 'USER',
      entityId: req.params.id,
      severity: 'HIGH',
      ipAddress: req.ip,
      metadata: { field, reason }
    });

    return ok(res, result, 'Sensitive field revealed', 200, req);
  } catch (error) {
    if (error.message === 'INVALID_FIELD') {
      return fail(res, 400, 'VALIDATION_FAILED', 'Invalid field requested');
    }
    next(error);
  }
}

async function updateEmploymentStatus(req, res, next) {
  try {
    const { employmentStatus, note, effectiveDate } = req.body;
    if (!employmentStatus) return fail(res, 400, 'VALIDATION_FAILED', 'employmentStatus is required');

    const profile = await userService.updateEmploymentStatus(req.params.id, { employmentStatus, note, effectiveDate }, req.user);
    if (!profile) return fail(res, 404, 'VALIDATION_FAILED', 'User not found');

    await recordAudit({
      actorId: req.user._id,
      actionType: 'EMPLOYMENT_STATUS_CHANGED',
      entityType: 'USER',
      entityId: req.params.id,
      severity: 'MEDIUM',
      ipAddress: req.ip,
      metadata: { employmentStatus, changedBy: req.user.fullName }
    });

    return ok(res, { profile }, 'Employment status updated successfully', 200, req);
  } catch (error) {
    if (error.message === 'INVALID_STATUS') {
      return fail(res, 400, 'VALIDATION_FAILED', 'Invalid employment status');
    }
    next(error);
  }
}

async function uploadMyDocument(req, res, next) {
  try {
    if (!req.file) return fail(res, 400, 'VALIDATION_FAILED', 'File is required');
    const doc = await documentService.uploadDoc({
      ownerType: 'USER',
      ownerId: req.user._id,
      accessLevel: 'HR',
      file: req.file,
      user: req.user
    });
    return ok(res, { document: doc }, 'Document uploaded successfully', 201, req);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (error.message.includes('BLOCKED_FILE_TYPE') || error.message.includes('LIMIT_FILE_SIZE')) {
      return fail(res, 400, 'VALIDATION_FAILED', error.message);
    }
    next(error);
  }
}

async function listMyDocuments(req, res, next) {
  try {
    const documents = await Document.find({ ownerType: 'USER', ownerId: req.user._id, isDeleted: false }).sort({ createdAt: -1 });
    return ok(res, { documents }, 'Documents retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function listEmployeeDocuments(req, res, next) {
  try {
    const documents = await Document.find({ ownerType: 'USER', ownerId: req.params.id, isDeleted: false }).sort({ createdAt: -1 });
    return ok(res, { documents }, 'Documents retrieved successfully', 200, req);
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
  deleteUser,
  getMyProfile,
  updateMyProfile,
  getEmployeeProfile,
  updateEmployeeProfile,
  revealEmployeeField,
  updateEmploymentStatus,
  uploadMyDocument,
  listMyDocuments,
  listEmployeeDocuments
};
