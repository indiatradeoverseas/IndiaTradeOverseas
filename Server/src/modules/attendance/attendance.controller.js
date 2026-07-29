const attendanceService = require('./attendance.service');
const { ok, fail } = require('../../utils/response');

async function checkIn(req, res, next) {
  try {
    const record = await attendanceService.checkIn(req.user._id);
    return ok(res, { attendance: record }, 'Checked in successfully', 200, req);
  } catch (error) {
    if (error.message === 'ALREADY_CHECKED_IN') {
      return fail(res, 400, 'ALREADY_CHECKED_IN', 'You have already checked in today');
    }
    next(error);
  }
}

async function checkOut(req, res, next) {
  try {
    const record = await attendanceService.checkOut(req.user._id);
    return ok(res, { attendance: record }, 'Checked out successfully', 200, req);
  } catch (error) {
    if (error.message === 'NOT_CHECKED_IN') {
      return fail(res, 400, 'NOT_CHECKED_IN', 'You have not checked in today');
    }
    if (error.message === 'ALREADY_CHECKED_OUT') {
      return fail(res, 400, 'ALREADY_CHECKED_OUT', 'You have already checked out today');
    }
    next(error);
  }
}

async function getMyTodayStatus(req, res, next) {
  try {
    const record = await attendanceService.getTodayStatus(req.user._id);
    return ok(res, { attendance: record }, "Today's attendance status retrieved", 200, req);
  } catch (error) {
    next(error);
  }
}

async function getReport(req, res, next) {
  try {
    const { employeeId, department, startDate, endDate } = req.query;
    const records = await attendanceService.getAttendanceReport({ employeeId, department, startDate, endDate });
    return ok(res, { records }, 'Attendance report retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function cleanupOrphaned(req, res, next) {
  try {
    const deletedCount = await attendanceService.cleanupOrphanedRecords();
    return ok(res, { deletedCount }, `Removed ${deletedCount} invalid attendance record(s)`, 200, req);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkIn,
  checkOut,
  getMyTodayStatus,
  getReport,
  cleanupOrphaned
};
