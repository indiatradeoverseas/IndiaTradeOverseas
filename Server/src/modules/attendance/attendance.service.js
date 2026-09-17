const Attendance = require('./attendance.model');

// Official shift: 09:00 AM - 06:00 PM (9 elapsed shift hours = 8 Net Working Hours + 1 Hour Flexible Lunch)
const SHIFT_START_HOUR = 9;
const SHIFT_END_HOUR = 18;
const LATE_THRESHOLD_HOUR = 10;
const LATE_THRESHOLD_MINUTE = 0;
const STANDARD_WORK_HOURS = 8; // Net working hours target

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

  let attRecord;
  if (existing) {
    existing.checkInAt = now;
    existing.status = isLate ? 'LATE' : 'PRESENT';
    await existing.save();
    attRecord = existing;
  } else {
    attRecord = await Attendance.create({
      employeeId: userId,
      date: today,
      checkInAt: now,
      status: isLate ? 'LATE' : 'PRESENT'
    });
  }

  // Trigger real-time EmployeeActivity heartbeat sync
  try {
    const User = require('../users/user.model');
    const userDoc = await User.findById(userId);
    if (userDoc) {
      const { recordHeartbeat } = require('../employee-activity/employeeActivity.service');
      await recordHeartbeat(userDoc);
    }
  } catch (syncErr) {
    console.error('Error syncing activity heartbeat on checkIn:', syncErr);
  }

  return attRecord;
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
  const totalElapsedHours = (now - record.checkInAt) / (1000 * 60 * 60);
  
  // Deduct lunch break duration (in hours). Default to 0 if not taken, or exact recorded lunch duration
  const lunchHours = (record.lunchDurationMinutes || 0) / 60;
  const netWorkingHours = Math.max(0, totalElapsedHours - lunchHours);

  record.checkOutAt = now;
  record.workingHours = Math.round(netWorkingHours * 100) / 100;
  record.overtimeHours = netWorkingHours > STANDARD_WORK_HOURS
    ? Math.round((netWorkingHours - STANDARD_WORK_HOURS) * 100) / 100
    : 0;

  // Half day threshold: Net working hours < 4 hours (Half of 8 Net Working Hours)
  if (netWorkingHours < (STANDARD_WORK_HOURS / 2)) {
    record.status = 'HALF_DAY';
  }
  await record.save();

  // Trigger real-time EmployeeActivity logout sync
  try {
    const User = require('../users/user.model');
    const userDoc = await User.findById(userId);
    if (userDoc) {
      const { recordLogout } = require('../employee-activity/employeeActivity.service');
      await recordLogout(userDoc);
    }
  } catch (syncErr) {
    console.error('Error syncing activity logout on checkOut:', syncErr);
  }

  return record;
}

async function startLunch(userId) {
  const today = getDayStart();
  const record = await Attendance.findOne({ employeeId: userId, date: today });
  if (!record || !record.checkInAt) {
    throw new Error('NOT_CHECKED_IN');
  }
  if (record.checkOutAt) {
    throw new Error('ALREADY_CHECKED_OUT');
  }
  if (record.lunchEndAt) {
    throw new Error('LUNCH_ALREADY_TAKEN');
  }
  if (record.lunchStartAt) {
    throw new Error('LUNCH_ALREADY_IN_PROGRESS');
  }

  record.lunchStartAt = new Date();
  await record.save();

  try {
    const User = require('../users/user.model');
    const EmployeeActivity = require('../employee-activity/employeeActivity.model');
    const userDoc = await User.findById(userId);
    if (userDoc) {
      const empId = userDoc.employeeId || String(userDoc._id);
      const todayStr = new Date().toISOString().slice(0, 10);
      await EmployeeActivity.updateOne(
        { employeeId: empId, date: todayStr },
        { $set: { lunchStartAt: record.lunchStartAt, lunchEndAt: null } }
      );
    }
  } catch (err) {
    console.error('Error syncing EmployeeActivity on startLunch:', err);
  }

  return record;
}

async function endLunch(userId) {
  const today = getDayStart();
  const record = await Attendance.findOne({ employeeId: userId, date: today });
  if (!record || !record.lunchStartAt) {
    throw new Error('LUNCH_NOT_STARTED');
  }
  if (record.lunchEndAt) {
    throw new Error('LUNCH_ALREADY_ENDED');
  }

  const now = new Date();
  record.lunchEndAt = now;
  record.lunchDurationMinutes = Math.round((now - record.lunchStartAt) / 60000);
  await record.save();

  try {
    const User = require('../users/user.model');
    const EmployeeActivity = require('../employee-activity/employeeActivity.model');
    const userDoc = await User.findById(userId);
    if (userDoc) {
      const empId = userDoc.employeeId || String(userDoc._id);
      const todayStr = new Date().toISOString().slice(0, 10);
      await EmployeeActivity.updateOne(
        { employeeId: empId, date: todayStr },
        { $set: { lunchEndAt: record.lunchEndAt, lunchDurationMinutes: record.lunchDurationMinutes } }
      );
    }
  } catch (err) {
    console.error('Error syncing EmployeeActivity on endLunch:', err);
  }

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

async function getAttendanceReport({ employeeId, department, startDate, endDate } = {}) {
  const filter = {};
  if (employeeId) {
    filter.employeeId = employeeId;
  } else if (department) {
    const User = require('../users/user.model');
    const users = await User.find({ department }).select('_id');
    filter.employeeId = { $in: users.map((u) => u._id) };
  }
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = getDayStart(new Date(startDate));
    if (endDate) filter.date.$lte = getDayStart(new Date(endDate));
  }
  return Attendance.find(filter)
    .populate('employeeId', 'fullName employeeId department')
    .sort({ date: -1 });
}

async function cleanupOrphanedRecords() {
  const result = await Attendance.deleteMany({ checkInAt: null });
  return result.deletedCount;
}

module.exports = {
  getDayStart,
  checkIn,
  checkOut,
  startLunch,
  endLunch,
  getTodayStatus,
  getPresentTodayCount,
  getAttendanceReport,
  cleanupOrphanedRecords
};
