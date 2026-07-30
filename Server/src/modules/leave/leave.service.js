const Leave = require('./leave.model');

const PAID_LEAVE_PER_MONTH = 1;
const EMERGENCY_LEAVE_PER_YEAR = 5;
const LEAVE_APPROVER_ROLES = ['ADMIN', 'MANAGER', 'HR'];
const ACTIVE_STATUSES = ['PENDING', 'APPROVED'];

function canApprove(user) {
  return LEAVE_APPROVER_ROLES.includes(user.role);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function countLeaveDays(startDate, endDate) {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (cursor.getDay() !== 0) count += 1; // exclude Sundays
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

async function applyForLeave({ leaveType, startDate, endDate, reason }, user) {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    throw new Error('INVALID_DATE_RANGE');
  }

  const daysCount = countLeaveDays(start, end);
  if (daysCount <= 0) {
    throw new Error('INVALID_DATE_RANGE');
  }

  if (leaveType === 'PAID') {
    if (start.getMonth() !== end.getMonth() || start.getFullYear() !== end.getFullYear()) {
      throw new Error('PAID_LEAVE_SINGLE_MONTH_ONLY');
    }
    if (daysCount > PAID_LEAVE_PER_MONTH) {
      throw new Error('PAID_LEAVE_SINGLE_DAY_ONLY');
    }

    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    const existing = await Leave.findOne({
      appliedBy: user._id,
      leaveType: 'PAID',
      status: { $in: ACTIVE_STATUSES },
      startDate: { $gte: monthStart, $lte: monthEnd }
    });
    if (existing) {
      throw new Error('PAID_LEAVE_ALREADY_USED_THIS_MONTH');
    }
  } else if (leaveType === 'EMERGENCY') {
    if (start.getFullYear() !== end.getFullYear()) {
      throw new Error('EMERGENCY_LEAVE_SINGLE_YEAR_ONLY');
    }
    const yearStart = new Date(start.getFullYear(), 0, 1);
    const yearEnd = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999);
    const existingLeaves = await Leave.find({
      appliedBy: user._id,
      leaveType: 'EMERGENCY',
      status: { $in: ACTIVE_STATUSES },
      startDate: { $gte: yearStart, $lte: yearEnd }
    });
    const usedDays = existingLeaves.reduce((sum, lv) => sum + lv.daysCount, 0);
    if (usedDays + daysCount > EMERGENCY_LEAVE_PER_YEAR) {
      throw new Error('EMERGENCY_LEAVE_BALANCE_EXCEEDED');
    }
  } else {
    throw new Error('INVALID_LEAVE_TYPE');
  }

  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const leaveCode = `LV-${timestamp}-${random}`;

  return Leave.create({
    leaveCode,
    leaveType,
    startDate: start,
    endDate: end,
    daysCount,
    reason,
    appliedBy: user._id
  });
}

async function getMyLeaveBalance(user) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const paidUsed = await Leave.countDocuments({
    appliedBy: user._id,
    leaveType: 'PAID',
    status: { $in: ACTIVE_STATUSES },
    startDate: { $gte: monthStart, $lte: monthEnd }
  });

  const emergencyLeaves = await Leave.find({
    appliedBy: user._id,
    leaveType: 'EMERGENCY',
    status: { $in: ACTIVE_STATUSES },
    startDate: { $gte: yearStart, $lte: yearEnd }
  });
  const emergencyUsed = emergencyLeaves.reduce((sum, lv) => sum + lv.daysCount, 0);

  return {
    paidLeave: {
      total: PAID_LEAVE_PER_MONTH,
      used: Math.min(paidUsed, PAID_LEAVE_PER_MONTH),
      available: Math.max(0, PAID_LEAVE_PER_MONTH - paidUsed)
    },
    emergencyLeave: {
      total: EMERGENCY_LEAVE_PER_YEAR,
      used: emergencyUsed,
      available: Math.max(0, EMERGENCY_LEAVE_PER_YEAR - emergencyUsed)
    }
  };
}

async function listLeaves(user, query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.leaveType) filter.leaveType = query.leaveType;

  if (!canApprove(user)) {
    filter.appliedBy = user._id;
  } else if (query.employeeId) {
    filter.appliedBy = query.employeeId;
  }

  return Leave.find(filter)
    .populate('appliedBy', 'fullName employeeId department')
    .populate('reviewedBy', 'fullName employeeId')
    .sort({ createdAt: -1 });
}

async function getLeaveById(leaveId, user) {
  const leave = await Leave.findById(leaveId)
    .populate('appliedBy', 'fullName employeeId department')
    .populate('reviewedBy', 'fullName employeeId');
  if (!leave) throw new Error('LEAVE_NOT_FOUND');

  const isOwner = leave.appliedBy._id.toString() === user._id.toString();
  if (!isOwner && !canApprove(user)) {
    throw new Error('OWNERSHIP_FORBIDDEN');
  }
  return leave;
}

async function reviewLeave(leaveId, { status, reviewNote }, user) {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new Error('INVALID_STATUS');
  }
  const leave = await Leave.findById(leaveId);
  if (!leave) throw new Error('LEAVE_NOT_FOUND');
  if (!canApprove(user)) throw new Error('OWNERSHIP_FORBIDDEN');
  if (leave.status !== 'PENDING') throw new Error('LEAVE_ALREADY_REVIEWED');

  leave.status = status;
  leave.reviewedBy = user._id;
  leave.reviewedAt = new Date();
  leave.reviewNote = reviewNote || '';
  await leave.save();
  return leave;
}

async function cancelLeave(leaveId, user) {
  const leave = await Leave.findById(leaveId);
  if (!leave) throw new Error('LEAVE_NOT_FOUND');

  const isOwner = leave.appliedBy.toString() === user._id.toString();
  if (!isOwner) throw new Error('OWNERSHIP_FORBIDDEN');
  if (leave.status !== 'PENDING') throw new Error('LEAVE_NOT_CANCELLABLE');

  leave.status = 'CANCELLED';
  await leave.save();
  return leave;
}

async function getPendingLeaveCount() {
  return Leave.countDocuments({ status: 'PENDING' });
}

module.exports = {
  applyForLeave,
  getMyLeaveBalance,
  listLeaves,
  getLeaveById,
  reviewLeave,
  cancelLeave,
  getPendingLeaveCount,
  canApprove,
  PAID_LEAVE_PER_MONTH,
  EMERGENCY_LEAVE_PER_YEAR
};
