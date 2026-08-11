const User = require('./user.model');
const bcrypt = require('bcryptjs');
const { encryptText, decryptText } = require('../../utils/crypto');

const SENSITIVE_FIELDS = ['salary', 'pan', 'aadhaar', 'bankAccount'];
const SELF_EDITABLE_FIELDS = ['address', 'emergencyContactName', 'emergencyContactPhone', 'phone'];
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
  return User.find().select('-passwordHash').sort({ createdAt: -1 });
}

async function getUserById(id) {
  return User.findById(id).select('-passwordHash');
}

async function activateUser(id) {
  return User.findByIdAndUpdate(id, { isActive: true }, { new: true }).select('-passwordHash');
}

async function updateUserRole(id, role, actorId = null) {
  const existing = await User.findById(id);
  if (!existing) return null;
  const fromValue = existing.role;
  existing.role = role;
  if (fromValue !== role) {
    existing.employmentHistory.push({ event: 'ROLE_CHANGED', fromValue, toValue: role, changedBy: actorId });
  }
  await existing.save();
  return User.findById(id).select('-passwordHash');
}

async function updateUserDepartment(id, department, actorId = null) {
  const existing = await User.findById(id);
  if (!existing) return null;
  const fromValue = existing.department;
  existing.department = department;
  if (fromValue !== department) {
    existing.employmentHistory.push({ event: 'DEPARTMENT_CHANGED', fromValue, toValue: department, changedBy: actorId });
  }
  await existing.save();
  return User.findById(id).select('-passwordHash');
}

async function updateUserPermissions(id, permissions) {
  return User.findByIdAndUpdate(
    id,
    permissions,
    { new: true, runValidators: true }
  ).select('-passwordHash');
}

async function deleteUser(id) {
  return User.findByIdAndDelete(id).select('-passwordHash');
}

async function deactivateUser(id) {
  return User.findByIdAndUpdate(id, { isActive: false }, { new: true }).select('-passwordHash');
}

function serializeProfile(user, { includePlaintext = false } = {}) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.salaryEncrypted;
  delete obj.panEncrypted;
  delete obj.aadhaarEncrypted;
  delete obj.bankAccountEncrypted;

  if (includePlaintext) {
    obj.salary = user.salaryEncrypted ? decryptText(user.salaryEncrypted) : '';
    obj.pan = user.panEncrypted ? decryptText(user.panEncrypted) : '';
    obj.aadhaar = user.aadhaarEncrypted ? decryptText(user.aadhaarEncrypted) : '';
    obj.bankAccount = user.bankAccountEncrypted ? decryptText(user.bankAccountEncrypted) : '';
  } else {
    obj.hasSalary = Boolean(user.salaryEncrypted);
  }

  return obj;
}

async function getProfile(targetId, requester) {
  const user = await User.findById(targetId);
  if (!user) return null;
  const isSelf = requester._id.toString() === targetId.toString();
  return serializeProfile(user, { includePlaintext: isSelf });
}

async function updateOwnProfile(userId, data) {
  const updates = {};
  for (const field of SELF_EDITABLE_FIELDS) {
    if (data[field] !== undefined) updates[field] = data[field];
  }
  if (!Object.keys(updates).length) {
    const error = new Error('NO_VALID_FIELDS');
    throw error;
  }
  const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
  return serializeProfile(user, { includePlaintext: true });
}

async function updateEmployeeProfile(targetId, data, actor) {
  const user = await User.findById(targetId);
  if (!user) return null;

  for (const field of PROFILE_FIELDS) {
    if (data[field] !== undefined) user[field] = data[field];
  }
  if (data.phone !== undefined) user.phone = data.phone;

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
  const user = await User.findById(targetId);
  if (!user) return null;

  const encryptedKey = `${field}Encrypted`;
  const value = user[encryptedKey] ? decryptText(user[encryptedKey]) : '';
  return { field, value };
}

async function updateEmploymentStatus(targetId, { employmentStatus, note, effectiveDate }, actor) {
  const user = await User.findById(targetId);
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
