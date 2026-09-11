const mongoose = require('mongoose');
const User = require('./user.model');
const bcrypt = require('bcryptjs');
const { encryptText, decryptText } = require('../../utils/crypto');

const resolveIdQuery = (id) => {
  const idStr = String(id);
  if (mongoose.isValidObjectId(idStr)) {
    return { $or: [{ _id: idStr }, { _id: new mongoose.Types.ObjectId(idStr) }, { trialId: idStr }, { employeeId: idStr }] };
  }
  return { $or: [{ _id: idStr }, { trialId: idStr }, { employeeId: idStr }] };
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

const SENSITIVE_FIELDS = ['salary', 'pan', 'aadhaar', 'bankAccount'];
const SELF_EDITABLE_FIELDS = [
  'address', 'addressCont', 'city', 'postalCode',
  'emergencyContactName', 'emergencyContactPhone', 'phone',
  'levelOfEducation', 'degree', 'hardSkill', 'softSkill',
  'taxNumber', 'fatherName', 'dateOfBirth', 'dateOfJoining',
  'bankName', 'bankIFSC'
];
const PROFILE_FIELDS = [
  'fatherName', 'dateOfBirth', 'address', 'emergencyContactName', 'emergencyContactPhone',
  'dateOfJoining', 'bankIFSC', 'bankName'
];

function maskValue(value) {
  if (!value) return '';
  const clean = String(value);
  if (clean.length <= 4) return 'X'.repeat(clean.length);
  return clean.slice(0, 2) + 'X'.repeat(clean.length - 4) + clean.slice(-2);
}

async function createUser(data) {
  const existingUser = await User.findOne({
    $or: [
      { email: data.email },
      { employeeId: data.employeeId }
    ]
  });
  if (existingUser) {
    const error = new Error('User with this email or Employee ID already exists');
    error.code = 11000;
    throw error;
  }

  const passwordHash = await bcrypt.hash(data.password || 'ItoPass123!', 10);
  return User.create({
    employeeId: data.employeeId,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone || '',
    passwordHash,
    role: data.role || 'SALES',
    department: data.department || 'SALES',
    isActive: true,
    createdBy: data.createdBy || null
  });
}

async function listAllUsers() {
  const User = require('./user.model');
  const Employee = require('../employee/employee.model');
  const SalesTrialUser = require('../sales-trial/salesTrialUser.model');
  const [users, employees, trialUsers] = await Promise.all([
    User.find().select('-passwordHash').lean(),
    Employee.find().select('-password').lean(),
    SalesTrialUser.find().select('-passwordHash').lean()
  ]);

  const userMap = new Map();

  users.forEach(u => {
    const key = (u.email || u.employeeId || String(u._id)).toLowerCase();
    userMap.set(key, {
      ...u,
      fullName: u.fullName || u.name || 'User',
      department: (u.department || 'HQ').toUpperCase(),
      role: (u.role || 'EMPLOYEE').toUpperCase(),
      isActive: u.isActive !== undefined ? u.isActive : true
    });
  });

  employees.forEach(emp => {
    const key = (emp.email || emp.employeeId || String(emp._id)).toLowerCase();
    if (!userMap.has(key)) {
      userMap.set(key, {
        _id: emp._id,
        employeeId: emp.employeeId,
        fullName: emp.name || emp.fullName || 'Employee',
        email: emp.email,
        phone: emp.phone || '',
        department: (emp.department || emp.role || 'HQ').toUpperCase(),
        role: (emp.role || 'EMPLOYEE').toUpperCase(),
        isActive: emp.status === 'ACTIVE',
        productUploadPermission: emp.permissions?.productUpload || false,
        exportPermission: emp.permissions?.export || false,
        jobPermission: emp.permissions?.job || false,
        createdAt: emp.createdAt || new Date()
      });
    }
  });

  (trialUsers || []).forEach(t => {
    const key = (t.email || t.trialId || String(t._id)).toLowerCase();
    if (!userMap.has(key)) {
      userMap.set(key, {
        _id: t._id,
        employeeId: t.trialId,
        trialId: t.trialId,
        fullName: t.fullName || t.name || 'Sales Trial Executive',
        email: t.email,
        phone: t.phone || '',
        department: (t.department || 'SALES_TRIAL').toUpperCase(),
        role: 'SALES_TRIAL',
        isActive: t.status === 'ACTIVE',
        createdAt: t.createdAt || new Date()
      });
    }
  });

  const merged = Array.from(userMap.values());
  merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return merged;
}

async function getUserById(id) {
  return User.findOne(resolveIdQuery(id)).select('-passwordHash');
}

async function activateUser(id) {
  const Employee = require('../employee/employee.model');
  const user = await User.findOne(resolveIdQuery(id));
  const emp = await Employee.findOne(resolveIdQuery(id));
  const targetEmail = user?.email || emp?.email;
  const targetEmpId = user?.employeeId || emp?.employeeId;

  const queryOr = [{ _id: id }];
  if (mongoose.isValidObjectId(id)) queryOr.push({ _id: new mongoose.Types.ObjectId(id) });
  if (targetEmail) queryOr.push({ email: { $regex: new RegExp('^' + targetEmail.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } });
  if (targetEmpId) queryOr.push({ employeeId: targetEmpId });

  const [updatedUser, updatedEmp] = await Promise.all([
    User.findOneAndUpdate({ $or: queryOr }, { isActive: true }, { new: true }).select('-passwordHash'),
    Employee.findOneAndUpdate({ $or: queryOr }, { status: 'ACTIVE' }, { new: true }).select('-password')
  ]);

  return updatedUser || updatedEmp;
}

async function deactivateUser(id) {
  const Employee = require('../employee/employee.model');
  const user = await User.findOne(resolveIdQuery(id));
  const emp = await Employee.findOne(resolveIdQuery(id));
  const targetEmail = user?.email || emp?.email;
  const targetEmpId = user?.employeeId || emp?.employeeId;

  const queryOr = [{ _id: id }];
  if (mongoose.isValidObjectId(id)) queryOr.push({ _id: new mongoose.Types.ObjectId(id) });
  if (targetEmail) queryOr.push({ email: { $regex: new RegExp('^' + targetEmail.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } });
  if (targetEmpId) queryOr.push({ employeeId: targetEmpId });

  const [updatedUser, updatedEmp] = await Promise.all([
    User.findOneAndUpdate({ $or: queryOr }, { isActive: false }, { new: true }).select('-passwordHash'),
    Employee.findOneAndUpdate({ $or: queryOr }, { status: 'INACTIVE' }, { new: true }).select('-password')
  ]);

  return updatedUser || updatedEmp;
}

async function updateUserRole(id, role, actorId = null) {
  const Employee = require('../employee/employee.model');
  let existing = await User.findOne(resolveIdQuery(id));
  let emp = await Employee.findOne(resolveIdQuery(id));
  const targetEmail = existing?.email || emp?.email;

  if (existing) {
    const fromValue = existing.role;
    existing.role = role;
    if (fromValue !== role) {
      existing.employmentHistory.push({ event: 'ROLE_CHANGED', fromValue, toValue: role, changedBy: actorId });
    }
    await existing.save();
  }
  if (targetEmail) {
    await Employee.findOneAndUpdate(
      { email: { $regex: new RegExp('^' + targetEmail.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } },
      { role }
    );
  } else if (emp) {
    emp.role = role;
    await emp.save();
  }
  return existing || emp;
}

async function updateUserDepartment(id, department, actorId = null) {
  const Employee = require('../employee/employee.model');
  let existing = await User.findOne(resolveIdQuery(id));
  let emp = await Employee.findOne(resolveIdQuery(id));
  const targetEmail = existing?.email || emp?.email;

  if (existing) {
    const fromValue = existing.department;
    existing.department = department;
    if (fromValue !== department) {
      existing.employmentHistory.push({ event: 'DEPARTMENT_CHANGED', fromValue, toValue: department, changedBy: actorId });
    }
    await existing.save();
  }
  if (targetEmail) {
    await Employee.findOneAndUpdate(
      { email: { $regex: new RegExp('^' + targetEmail.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } },
      { department }
    );
  } else if (emp) {
    emp.department = department;
    await emp.save();
  }
  return existing || emp;
}

async function updateUserPermissions(id, permissions) {
  const Employee = require('../employee/employee.model');
  const user = await User.findOne(resolveIdQuery(id));
  const emp = await Employee.findOne(resolveIdQuery(id));
  const targetEmail = user?.email || emp?.email;

  const queryOr = [{ _id: id }];
  if (mongoose.isValidObjectId(id)) queryOr.push({ _id: new mongoose.Types.ObjectId(id) });
  if (targetEmail) queryOr.push({ email: { $regex: new RegExp('^' + targetEmail.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } });

  const updatedUser = await User.findOneAndUpdate({ $or: queryOr }, permissions, { new: true, runValidators: true }).select('-passwordHash');

  if (targetEmail) {
    const empUpdates = {};
    if (permissions.productUploadPermission !== undefined) empUpdates['permissions.productUpload'] = permissions.productUploadPermission;
    if (permissions.exportPermission !== undefined) empUpdates['permissions.export'] = permissions.exportPermission;
    if (permissions.jobPermission !== undefined) empUpdates['permissions.job'] = permissions.jobPermission;
    if (permissions.leadPermission !== undefined) empUpdates['permissions.lead'] = permissions.leadPermission;
    if (permissions.documentPermission !== undefined) empUpdates['permissions.document'] = permissions.documentPermission;
    if (permissions.taskPermission !== undefined) empUpdates['permissions.task'] = permissions.taskPermission;
    if (permissions.dispatchPermission !== undefined) empUpdates['permissions.dispatch'] = permissions.dispatchPermission;
    if (permissions.paymentPermission !== undefined) empUpdates['permissions.payment'] = permissions.paymentPermission;
    if (permissions.quotationPermission !== undefined) empUpdates['permissions.quotation'] = permissions.quotationPermission;

    await Employee.findOneAndUpdate(
      { email: { $regex: new RegExp('^' + targetEmail.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } },
      { $set: empUpdates }
    );
  }

  return updatedUser || emp;
}

async function deleteUser(id) {
  const Employee = require('../employee/employee.model');
  const user = await User.findOne(resolveIdQuery(id));
  const emp = await Employee.findOne(resolveIdQuery(id));
  const targetEmail = user?.email || emp?.email;
  const targetEmpId = user?.employeeId || emp?.employeeId;

  const queryOr = [{ _id: id }];
  if (mongoose.isValidObjectId(id)) queryOr.push({ _id: new mongoose.Types.ObjectId(id) });
  if (targetEmail) queryOr.push({ email: { $regex: new RegExp('^' + targetEmail.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } });
  if (targetEmpId) queryOr.push({ employeeId: targetEmpId });

  const [deletedUser, deletedEmp] = await Promise.all([
    User.findOneAndDelete({ $or: queryOr }).select('-passwordHash'),
    Employee.findOneAndDelete({ $or: queryOr }).select('-password')
  ]);

  if (!deletedUser && !deletedEmp) return null;
  return deletedUser || deletedEmp;
}

function serializeProfile(user, { includePlaintext = false } = {}) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.salaryEncrypted;
  delete obj.panEncrypted;
  delete obj.aadhaarEncrypted;
  delete obj.bankAccountEncrypted;

  if (includePlaintext) {
    try {
      obj.salary = user.salaryEncrypted ? decryptText(user.salaryEncrypted) : '';
      obj.pan = user.panEncrypted ? decryptText(user.panEncrypted) : '';
      obj.aadhaar = user.aadhaarEncrypted ? decryptText(user.aadhaarEncrypted) : '';
      obj.bankAccount = user.bankAccountEncrypted ? decryptText(user.bankAccountEncrypted) : '';
    } catch (e) {
      console.warn('Crypto decryption notice in serializeProfile:', e.message);
    }
  } else {
    obj.hasSalary = Boolean(user.salaryEncrypted);
  }

  obj.dateOfBirth = obj.dateOfBirth || obj.dob || '';
  if (obj.dateOfBirth) {
    try {
      obj.age = calculateAge(obj.dateOfBirth);
    } catch (e) {
      obj.age = obj.age || 28;
    }
  } else {
    obj.age = obj.age || 28;
  }

  return obj;
}

async function getProfile(targetId, requester) {
  let user = await User.findOne(resolveIdQuery(targetId));
  if (!user) {
    const Employee = require('../employee/employee.model');
    user = await Employee.findOne(resolveIdQuery(targetId));
    if (!user) {
      const SalesTrialUser = require('../sales-trial/salesTrialUser.model');
      user = await SalesTrialUser.findOne(resolveIdQuery(targetId));
      if (!user) return null;
    }

    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.password;
    delete obj.passwordHash;

    obj.employeeId = obj.employeeId || obj.trialId || String(obj._id);
    obj.fullName = obj.fullName || obj.name || 'Sales Trial Executive';
    obj.pan = obj.panCardNumber || obj.pan || '';
    obj.aadhaar = obj.aadhaarNumber || obj.aadhaar || '';
    obj.bankAccount = obj.bankAccountNumber || obj.bankAccount || '';
    obj.bankIFSC = obj.ifscCode || obj.bankIFSC || '';
    obj.address = obj.currentAddress || obj.permanentAddress || obj.address || '';
    obj.fatherName = obj.fatherHusbandName || obj.fatherName || '';
    obj.dateOfBirth = obj.dob || obj.dateOfBirth || '';
    if (obj.dateOfBirth) {
      try {
        obj.age = calculateAge(obj.dateOfBirth);
      } catch (e) {
        obj.age = obj.age || 28;
      }
    } else {
      obj.age = obj.age || 28;
    }
    obj.dateOfJoining = obj.joiningDate || obj.dateOfJoining || obj.createdAt || '';
    obj.role = obj.role || 'SALES_TRIAL';

    const reqId = requester ? String(requester._id || requester.id || '') : '';
    const targIdStr = String(targetId);
    const objIdStr = String(user._id);

    const isSelf = Boolean(
      reqId && (reqId === targIdStr || reqId === objIdStr || (user.trialId && reqId === user.trialId))
    );
    const requesterRole = requester ? (requester.role || '') : '';
    const isManagerOrAdminUser =
      requesterRole === 'ADMIN' ||
      requesterRole === 'MANAGER' ||
      requesterRole.endsWith('_MANAGER') ||
      requesterRole.toLowerCase().includes('manager') ||
      (requester && (requester.department === 'ADMIN' || (requester.position && requester.position.toLowerCase().includes('admin'))));
    const hasAccess = isSelf || isManagerOrAdminUser || requesterRole === 'HR';

    if (!hasAccess) {
      obj.pan = maskValue(obj.pan);
      obj.aadhaar = maskValue(obj.aadhaar);
      obj.bankAccount = maskValue(obj.bankAccount);
      delete obj.salary;
      obj.hasSalary = Boolean(obj.salary);
    } else {
      obj.hasSalary = true;
    }

    return obj;
  }
  const reqId = requester ? String(requester._id || requester.id || '') : '';
  const isSelf = Boolean(reqId && (reqId === String(targetId) || reqId === String(user._id)));
  return serializeProfile(user, { includePlaintext: isSelf });
}

async function updateOwnProfile(userId, data) {
  const updates = {};
  for (const field of SELF_EDITABLE_FIELDS) {
    if (data[field] !== undefined) updates[field] = data[field];
  }
  if (updates.dateOfBirth !== undefined) {
    try {
      updates.age = calculateAge(updates.dateOfBirth);
    } catch (e) {}
  }
  if (!Object.keys(updates).length) {
    const error = new Error('NO_VALID_FIELDS');
    throw error;
  }
  let user = await User.findOneAndUpdate(resolveIdQuery(userId), updates, { new: true, runValidators: true });
  if (!user) {
    const Employee = require('../employee/employee.model');
    user = await Employee.findOneAndUpdate(resolveIdQuery(userId), updates, { new: true });
  }
  if (!user) {
    const SalesTrialUser = require('../sales-trial/salesTrialUser.model');
    user = await SalesTrialUser.findOneAndUpdate(resolveIdQuery(userId), updates, { new: true });
    if (user) {
      return getProfile(userId, { _id: userId });
    }
  }
  if (!user) return null;
  return serializeProfile(user, { includePlaintext: true });
}

async function updateEmployeeProfile(targetId, data, actor) {
  const Employee = require('../employee/employee.model');
  const VERIFICATION_FIELDS = ['aadhaarVerified', 'panVerified', 'bankVerified', 'bankStatementVerified', 'offerLetterVerified', 'experienceLetterVerified'];

  let user = await User.findOne(resolveIdQuery(targetId));
  let employee = await Employee.findOne(resolveIdQuery(targetId));

  const verifUpdates = {};
  VERIFICATION_FIELDS.forEach(f => {
    if (data[f] !== undefined) verifUpdates[f] = Boolean(data[f]);
  });

  if (employee && Object.keys(verifUpdates).length > 0) {
    Object.assign(employee, verifUpdates);
    await employee.save();
  }

  if (user && Object.keys(verifUpdates).length > 0) {
    Object.assign(user, verifUpdates);
    await user.save();
  }

  if (!user) {
    if (!employee) {
      const SalesTrialUser = require('../sales-trial/salesTrialUser.model');
      let trialUser = await SalesTrialUser.findOne(resolveIdQuery(targetId));
      if (!trialUser) return null;

      if (data.fullName || data.name) trialUser.fullName = data.fullName || data.name;
      if (data.phone !== undefined) trialUser.phone = data.phone;
      if (data.position !== undefined) trialUser.position = data.position;
      Object.assign(trialUser, verifUpdates);
      await trialUser.save();
      return getProfile(targetId, actor);
    }

    const fieldMappings = {
      address: 'currentAddress',
      bankIFSC: 'ifscCode',
      fatherName: 'fatherHusbandName',
      dateOfBirth: 'dob',
      dateOfJoining: 'joiningDate'
    };

    for (const field of PROFILE_FIELDS) {
      if (data[field] !== undefined) {
        const targetField = fieldMappings[field] || field;
        employee[targetField] = data[field];
      }
    }
    if (data.phone !== undefined) employee.phone = data.phone;
    if (data.salary !== undefined) employee.salary = Number(data.salary) || 0;
    if (data.pan !== undefined) employee.panCardNumber = data.pan;
    if (data.aadhaar !== undefined) employee.aadhaarNumber = data.aadhaar;
    if (data.bankAccount !== undefined) employee.bankAccountNumber = data.bankAccount;
    if (data.dateOfBirth !== undefined) {
      try {
        employee.age = calculateAge(data.dateOfBirth);
      } catch (e) {}
    }

    await employee.save();
    return getProfile(targetId, actor);
  }

  for (const field of PROFILE_FIELDS) {
    if (data[field] !== undefined) user[field] = data[field];
  }
  if (data.phone !== undefined) user.phone = data.phone;
  if (data.dateOfBirth !== undefined) {
    try {
      user.age = calculateAge(data.dateOfBirth);
    } catch (e) {}
  }

  if (data.salary !== undefined) user.salaryEncrypted = data.salary ? encryptText(String(data.salary)) : '';
  if (data.pan !== undefined) {
    user.panEncrypted = data.pan ? encryptText(data.pan) : '';
    user.panMasked = data.pan ? maskValue(data.pan) : '';
  }
  if (data.aadhaar !== undefined) {
    user.aadhaarEncrypted = data.aadhaar ? encryptText(data.aadhaar) : '';
    user.aadhaarMasked = data.aadhaar ? maskValue(data.aadhaar) : '';
  }
  if (data.bankAccount !== undefined) {
    user.bankAccountEncrypted = data.bankAccount ? encryptText(data.bankAccount) : '';
    user.bankAccountMasked = data.bankAccount ? maskValue(data.bankAccount) : '';
  }

  if (!user.employmentHistory) user.employmentHistory = [];
  user.employmentHistory.push({
    event: 'PROFILE_UPDATED',
    note: 'Profile fields updated by admin/HR',
    changedBy: actor ? actor._id : null
  });

  await user.save();
  return serializeProfile(user, { includePlaintext: false });
}

async function revealProfileField(targetId, field, actor) {
  if (!SENSITIVE_FIELDS.includes(field)) {
    throw new Error('INVALID_FIELD');
  }
  let user = await User.findOne(resolveIdQuery(targetId));
  if (!user) {
    const Employee = require('../employee/employee.model');
    const employee = await Employee.findOne(resolveIdQuery(targetId));
    if (!employee) {
      const SalesTrialUser = require('../sales-trial/salesTrialUser.model');
      const trialUser = await SalesTrialUser.findOne(resolveIdQuery(targetId));
      if (!trialUser) return null;
      return { field, value: trialUser[field] || '' };
    }

    const fieldMappings = {
      salary: 'salary',
      pan: 'panCardNumber',
      aadhaar: 'aadhaarNumber',
      bankAccount: 'bankAccountNumber'
    };
    const targetField = fieldMappings[field];
    const value = employee[targetField] || '';
    return { field, value };
  }

  const encryptedKey = `${field}Encrypted`;
  const value = user[encryptedKey] ? decryptText(user[encryptedKey]) : '';
  return { field, value };
}

async function updateEmploymentStatus(targetId, { employmentStatus, note, effectiveDate }, actor) {
  const user = await User.findOne(resolveIdQuery(targetId));
  if (!user) return null;

  const validStatuses = ['PROBATION', 'CONFIRMED', 'ON_NOTICE', 'RESIGNED', 'TERMINATED'];
  if (!validStatuses.includes(employmentStatus)) {
    throw new Error('INVALID_STATUS');
  }

  const fromValue = user.employmentStatus;
  const date = effectiveDate ? new Date(effectiveDate) : new Date();

  user.employmentStatus = employmentStatus;
  if (employmentStatus === 'CONFIRMED') user.confirmationDate = date;
  if (employmentStatus === 'RESIGNED' || employmentStatus === 'TERMINATED') user.lastWorkingDay = date;
  if (employmentStatus === 'PROBATION' && effectiveDate) user.probationEndDate = date;

  user.employmentHistory.push({
    event: 'STATUS_CHANGED',
    fromValue,
    toValue: employmentStatus,
    note: note || '',
    changedBy: actor ? actor._id : null
  });

  await user.save();
  return serializeProfile(user, { includePlaintext: false });
}

module.exports = {
  createUser,
  listAllUsers,
  getUserById,
  activateUser,
  deactivateUser,
  updateUserRole,
  updateUserDepartment,
  updateUserPermissions,
  deleteUser,
  getProfile,
  updateOwnProfile,
  updateEmployeeProfile,
  revealProfileField,
  updateEmploymentStatus
};
