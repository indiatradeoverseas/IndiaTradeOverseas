const Attendance = require('./attendance.model');

const LATE_THRESHOLD_HOUR = 10;
const LATE_THRESHOLD_MINUTE = 15;
const STANDARD_WORK_HOURS = 8;

function getDayStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function checkIn(userId) {
  const today = getDayStart();
  const existing = await Attendance.findOne({ employeeId: userId, date: today });
  if (existing && existing.checkInAt) {
    throw new Error('ALREADY_CHECKED_IN');
  }

  const now = new Date();
  const isLate = now.getHours() > LATE_THRESHOLD_HOUR ||
    (now.getHours() === LATE_THRESHOLD_HOUR && now.getMinutes() > LATE_THRESHOLD_MINUTE);

  if (existing) {
    existing.checkInAt = now;
    existing.status = isLate ? 'LATE' : 'PRESENT';
    await existing.save();
    return existing;
  }

  return Attendance.create({
    employeeId: userId,
    date: today,
    checkInAt: now,
    status: isLate ? 'LATE' : 'PRESENT'
  });
}

async function checkOut(userId) {
  const today = getDayStart();
  const record = await Attendance.findOne({ employeeId: userId, date: today });
  if (!record || !record.checkInAt) {
    throw new Error('NOT_CHECKED_IN');
  }
  if (record.checkOutAt) {
    throw new Error('ALREADY_CHECKED_OUT');
  }

  const now = new Date();
  const hoursWorked = (now - record.checkInAt) / (1000 * 60 * 60);
  record.checkOutAt = now;
  record.workingHours = Math.round(hoursWorked * 100) / 100;
  record.overtimeHours = hoursWorked > STANDARD_WORK_HOURS
    ? Math.round((hoursWorked - STANDARD_WORK_HOURS) * 100) / 100
    : 0;
  if (hoursWorked < STANDARD_WORK_HOURS / 2) {
    record.status = 'HALF_DAY';
  }
  await record.save();
  return record;
}

async function getTodayStatus(userId) {
  const today = getDayStart();
  return Attendance.findOne({ employeeId: userId, date: today });
}

async function getPresentTodayCount() {
  const today = getDayStart();
  return Attendance.countDocuments({ date: today, checkInAt: { $ne: null } });
}

async function getAttendanceReport({ employeeId, startDate, endDate } = {}) {
  const filter = {};
  if (employeeId) filter.employeeId = employeeId;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = getDayStart(new Date(startDate));
    if (endDate) filter.date.$lte = getDayStart(new Date(endDate));
  }
  return Attendance.find(filter)
    .populate('employeeId', 'fullName employeeId department')
    .sort({ date: -1 });
}

module.exports = {
  getDayStart,
  checkIn,
  checkOut,
  getTodayStatus,
  getPresentTodayCount,
  getAttendanceReport
};
