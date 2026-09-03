const mongoose = require('mongoose');
const fs = require('fs');
const userService = require('./user.service');
const { ok, fail } = require('../../utils/response');
const { recordAudit } = require('../security-audit/auditLog.service');
const documentService = require('../documents/document.service');
const Document = require('../documents/document.model');
const resolveIdQuery = (id) => {
  const idStr = String(id);
  if (mongoose.isValidObjectId(idStr)) {
    return { $or: [{ _id: idStr }, { _id: new mongoose.Types.ObjectId(idStr) }] };
  }
  return { _id: idStr };
};

function calculateAge(dob) {
  if (!dob) return 28;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return 28;
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

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
    const isAdmin = req.user && (req.user.modelName === 'Admin' || req.user.constructor.modelName === 'Admin');
    if (isAdmin) {
      return ok(res, { profile: req.user }, 'Profile retrieved', 200, req);
    }

    const profile = await userService.getProfile(req.user._id, req.user);
    if (!profile) return fail(res, 404, 'VALIDATION_FAILED', 'User not found');
    return ok(res, { profile }, 'Profile retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const isEmployee = req.user && (req.user.modelName === 'Employee' || req.user.constructor.modelName === 'Employee' || !req.user.passwordHash);
    const isAdmin = req.user && (req.user.modelName === 'Admin' || req.user.constructor.modelName === 'Admin');
    if (isEmployee) {
      const Employee = require('../employee/employee.model');
      const User = require('./user.model');
      
      const payload = { ...req.body };
      if (payload.dateOfBirth) {
        payload.dob = payload.dateOfBirth;
        payload.age = calculateAge(payload.dateOfBirth);
      }
      if (payload.address) {
        payload.currentAddress = payload.address;
        payload.permanentAddress = payload.address;
      }
      if (payload.bankIFSC) {
        payload.ifscCode = payload.bankIFSC;
      }
      if (payload.fatherName) {
        payload.fatherHusbandName = payload.fatherName;
      }
      if (payload.dateOfJoining) {
        payload.joiningDate = payload.dateOfJoining;
      }

      const empIds = [req.user._id.toString()];
      if (mongoose.isValidObjectId(req.user._id)) {
        empIds.push(new mongoose.Types.ObjectId(req.user._id));
      }
      const empQuery = {
        $or: [
          { _id: { $in: empIds } },
          { email: { $regex: new RegExp('^' + req.user.email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } }
        ]
      };

      await Employee.findOneAndUpdate(empQuery, payload, { new: true });

      // Sync to User collection too
      const userPayload = { ...req.body };
      if (userPayload.dateOfBirth) {
        userPayload.age = calculateAge(userPayload.dateOfBirth);
      }
      await User.findOneAndUpdate({ email: req.user.email }, userPayload);

      const profile = await userService.getProfile(req.user._id, req.user);
      return ok(res, { profile }, 'Employee profile updated successfully', 200, req);
    }
    if (isAdmin) {
      const Admin = require('../admin-auth/admin.model');
      const payload = { ...req.body };
      if (payload.dateOfBirth) {
        payload.age = calculateAge(payload.dateOfBirth);
      }
      const updated = await Admin.findOneAndUpdate(resolveIdQuery(req.user._id), payload, { new: true });
      return ok(res, { profile: updated }, 'Admin profile updated successfully', 200, req);
    }

    const profile = await userService.updateOwnProfile(req.user._id, req.body);

    // Sync to Employee collection if it exists
    try {
      const Employee = require('../employee/employee.model');
      const empQuery = {};
      if (req.user.employeeId) {
        empQuery.employeeId = req.user.employeeId;
      } else if (req.user.email) {
        empQuery.email = { $regex: new RegExp('^' + req.user.email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') };
      }
      
      if (Object.keys(empQuery).length) {
        const empUpdates = {};
        const fieldMappings = {
          address: 'currentAddress',
          bankIFSC: 'ifscCode',
          fatherName: 'fatherHusbandName',
          dateOfBirth: 'dob',
          dateOfJoining: 'joiningDate'
        };
        
        const SELF_EDITABLE_FIELDS = [
          'address', 'addressCont', 'city', 'postalCode',
          'emergencyContactName', 'emergencyContactPhone', 'phone',
          'levelOfEducation', 'degree', 'hardSkill', 'softSkill',
          'taxNumber', 'fatherName', 'dateOfBirth', 'dateOfJoining',
          'bankName', 'bankIFSC'
        ];
        
        for (const field of SELF_EDITABLE_FIELDS) {
          if (req.body[field] !== undefined) {
            const targetField = fieldMappings[field] || field;
            empUpdates[targetField] = req.body[field];
            if (field === 'address') {
              empUpdates.permanentAddress = req.body[field];
            }
          }
        }
        
        if (req.body.dateOfBirth !== undefined) {
          empUpdates.age = calculateAge(req.body.dateOfBirth);
        }
        
        if (Object.keys(empUpdates).length) {
          await Employee.findOneAndUpdate(empQuery, { $set: empUpdates });
        }
      }
    } catch (syncErr) {
      console.error('Error syncing self profile update to Employee collection:', syncErr);
    }

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

    // Sync to Employee collection
    try {
      const Employee = require('../employee/employee.model');
      const User = require('./user.model');
      
      const targetUser = await User.findById(req.params.id);
      if (targetUser) {
        const empQuery = {};
        if (targetUser.employeeId) {
          empQuery.employeeId = targetUser.employeeId;
        } else if (targetUser.email) {
          empQuery.email = { $regex: new RegExp('^' + targetUser.email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') };
        }
        
        if (Object.keys(empQuery).length) {
          const empUpdates = {};
          const fieldMappings = {
            address: 'currentAddress',
            bankIFSC: 'ifscCode',
            fatherName: 'fatherHusbandName',
            dateOfBirth: 'dob',
            dateOfJoining: 'joiningDate'
          };
          
          const PROFILE_FIELDS = [
            'fatherName', 'dateOfBirth', 'address', 'emergencyContactName', 'emergencyContactPhone',
            'dateOfJoining', 'bankIFSC', 'bankName', 'phone'
          ];
          
          for (const field of PROFILE_FIELDS) {
            if (req.body[field] !== undefined) {
              const targetField = fieldMappings[field] || field;
              empUpdates[targetField] = req.body[field];
              if (field === 'address') {
                empUpdates.permanentAddress = req.body[field];
              }
            }
          }
          
          if (req.body.dateOfBirth !== undefined) {
            empUpdates.age = calculateAge(req.body.dateOfBirth);
          }
          
          // Sync sensitive fields
          if (req.body.salary !== undefined) empUpdates.salary = Number(req.body.salary) || 0;
          if (req.body.pan !== undefined) empUpdates.panCardNumber = req.body.pan;
          if (req.body.aadhaar !== undefined) empUpdates.aadhaarNumber = req.body.aadhaar;
          if (req.body.bankAccount !== undefined) empUpdates.bankAccountNumber = req.body.bankAccount;
          if (req.body.aadhaarVerified !== undefined) empUpdates.aadhaarVerified = !!req.body.aadhaarVerified;
          if (req.body.panVerified !== undefined) empUpdates.panVerified = !!req.body.panVerified;
          if (req.body.bankVerified !== undefined) empUpdates.bankVerified = !!req.body.bankVerified;
          
          if (Object.keys(empUpdates).length) {
            await Employee.findOneAndUpdate(empQuery, { $set: empUpdates });
          }
        }
      }
    } catch (syncErr) {
      console.error('Error syncing admin profile update to Employee collection:', syncErr);
    }

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
    const documents = await Document.find({ ownerId: req.user._id, isDeleted: false }).sort({ createdAt: -1 });
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

async function uploadMyProfileImage(req, res, next) {
  try {
    if (!req.file) {
      return fail(res, 400, 'VALIDATION_FAILED', 'Profile image file is required');
    }

    const fileUrl = `uploads/profile-images/${req.file.filename}`;

    const User = require('./user.model');
    const Employee = require('../employee/employee.model');

    // 1. Update User document (using req.user._id)
    const updatedUser = await User.findOneAndUpdate(resolveIdQuery(req.user._id), { profileImage: fileUrl }, { new: true });

    // 2. Update Employee document (using email match since req.user._id is user ID)
    const updatedEmployee = await Employee.findOneAndUpdate(
      { email: { $regex: new RegExp('^' + req.user.email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } },
      { profileImage: fileUrl },
      { new: true }
    );

    const isAdmin = req.user && (req.user.modelName === 'Admin' || req.user.constructor.modelName === 'Admin');
 
    let updated = updatedUser || updatedEmployee;
    if (isAdmin) {
      const Admin = require('../admin-auth/admin.model');
      updated = await Admin.findOneAndUpdate(resolveIdQuery(req.user._id), { profileImage: fileUrl }, { new: true });
    }

    return ok(res, { profile: updated }, 'Profile image uploaded successfully', 200, req);
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
  listEmployeeDocuments,
  uploadMyProfileImage
};
