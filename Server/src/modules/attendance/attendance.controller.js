const Attendance = require('./attendance.model');
const BiometricSync = require('./biometricSync.model');
const Employee = require('../employee/employee.model');
const { ok, fail } = require('../../utils/response');

// Helper: Get start of day in UTC
function getStartOfDay(dateStr) {
  const targetStr = dateStr || new Date().toISOString().slice(0, 10);
  return new Date(targetStr + "T00:00:00.000Z");
}

// 1. Employee Check-In
async function checkIn(req, res, next) {
  try {
    const today = getStartOfDay();
    
    // Check if record exists
    let record = await Attendance.findOne({ employeeId: req.user._id, date: today });
    if (record && record.checkInTime) {
      return fail(res, 400, 'ALREADY_CHECKED_IN', 'You have already checked in today', [], req);
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Late if check in after 09:15 AM
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);
    const status = isLate ? 'LATE' : 'PRESENT';

    if (record) {
      record.checkInTime = timeStr;
      record.status = status;
      await record.save();
    } else {
      record = await Attendance.create({
        employeeId: req.user._id,
        date: today,
        checkInTime: timeStr,
        status
      });
    }

    return ok(res, { record }, 'Checked in successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 2. Employee Check-Out
async function checkOut(req, res, next) {
  try {
    const today = getStartOfDay();
    const record = await Attendance.findOne({ employeeId: req.user._id, date: today });

    if (!record || !record.checkInTime) {
      return fail(res, 400, 'NOT_CHECKED_IN', 'You must check in before checking out', [], req);
    }
    if (record.checkOutTime) {
      return fail(res, 400, 'ALREADY_CHECKED_OUT', 'You have already checked out today', [], req);
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Calculate overtime (shift ends at 18:00)
    let overtime = 0;
    if (now.getHours() >= 18) {
      overtime = (now.getHours() - 18) + (now.getMinutes() / 60);
      overtime = Math.round(overtime * 100) / 100;
    }

    record.checkOutTime = timeStr;
    record.overtimeHours = overtime;
    await record.save();

    return ok(res, { record }, 'Checked out successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 3. Get Employee's Today Status
async function getMyTodayStatus(req, res, next) {
  try {
    const today = getStartOfDay();
    const record = await Attendance.findOne({ employeeId: req.user._id, date: today });
    return ok(res, { record }, 'Today\'s status retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

// 4. Get Employee's Attendance History
async function getMyHistory(req, res, next) {
  try {
    const filter = { employeeId: req.user._id };
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) filter.date.$gte = getStartOfDay(req.query.startDate);
      if (req.query.endDate) filter.date.$lte = getStartOfDay(req.query.endDate);
    }

    const history = await Attendance.find(filter).sort({ date: -1 });
    return ok(res, { history }, 'Attendance history retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

// 5. Get General Attendance Report & Telemetry Stats (HR/Manager)
async function getReport(req, res, next) {
  try {
    if (!['ADMIN', 'HR', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied', [], req);
    }

    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const date = getStartOfDay(dateStr);

    const employees = await Employee.find({ status: 'ACTIVE' });
    const records = await Attendance.find({ date }).populate('employeeId', 'name email department role');

    // Stats calculations
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;

    const recordMap = new Map();
    records.forEach(r => {
      recordMap.set(r.employeeId._id.toString(), r);
      if (r.status === 'PRESENT') presentCount++;
      else if (r.status === 'LATE') {
        presentCount++;
        lateCount++;
      } else if (r.status === 'HALF_DAY') {
        presentCount++;
        halfDayCount++;
      } else if (r.status === 'ABSENT') {
        absentCount++;
      }
    });

    // Employees without logs count as absent (except weekend)
    const reportData = employees.map(emp => {
      const record = recordMap.get(emp._id.toString());
      if (record) return record;

      const day = date.getDay();
      const isWeekend = day === 0 || day === 6; // Sunday or Saturday
      const status = isWeekend ? 'WEEKEND' : 'ABSENT';
      
      if (!isWeekend) absentCount++;

      return {
        _id: `abs_${emp._id}`,
        employeeId: emp,
        date,
        status,
        checkInTime: null,
        checkOutTime: null,
        overtimeHours: 0
      };
    });

    return ok(res, {
      records: reportData,
      stats: {
        totalEmployees: employees.length,
        presentCount,
        lateCount,
        halfDayCount,
        absentCount
      }
    }, 'Attendance report retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 6. Trigger Biometric Sync Simulation (HR/Manager)
async function triggerBiometricSync(req, res, next) {
  try {
    if (!['ADMIN', 'HR', 'HR_MANAGER'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: HR/Admin privilege required', [], req);
    }

    const today = getStartOfDay();
    const employees = await Employee.find({ status: 'ACTIVE' });
    let syncCount = 0;

    for (const emp of employees) {
      // Check if employee already has attendance today
      let record = await Attendance.findOne({ employeeId: emp._id, date: today });
      if (record && record.checkInTime) continue; // Already clocked in

      // Simulate biometric check-in (90% present rate)
      const roll = Math.random();
      if (roll > 0.15) {
        // PRESENT
        const isLate = Math.random() > 0.8; // 20% late rate
        const checkInHour = isLate ? '09' : '08';
        const checkInMinute = isLate ? Math.floor(Math.random() * 20 + 16).toString().padStart(2, '0') : Math.floor(Math.random() * 59).toString().padStart(2, '0');
        const checkInTime = `${checkInHour}:${checkInMinute} AM`;

        const checkOutTime = `06:${Math.floor(Math.random() * 45 + 10).toString().padStart(2, '0')} PM`;
        const status = isLate ? 'LATE' : 'PRESENT';
        
        const overtime = Math.round(Math.random() * 2 * 100) / 100;

        if (record) {
          record.checkInTime = checkInTime;
          record.checkOutTime = checkOutTime;
          record.status = status;
          record.overtimeHours = overtime;
          await record.save();
        } else {
          await Attendance.create({
            employeeId: emp._id,
            date: today,
            checkInTime,
            checkOutTime,
            status,
            overtimeHours: overtime,
            createdBy: req.user._id
          });
        }
        syncCount++;
      } else {
        // ABSENT
        if (!record) {
          await Attendance.create({
            employeeId: emp._id,
            date: today,
            status: 'ABSENT',
            checkInTime: null,
            checkOutTime: null,
            overtimeHours: 0,
            createdBy: req.user._id
          });
          syncCount++;
        }
      }
    }

    // Create BiometricSync Log
    const syncLog = await BiometricSync.create({
      lastSyncTime: new Date(),
      status: 'ONLINE',
      totalSyncedRecords: syncCount,
      lastSyncBy: req.user.fullName || req.user.name || 'HR Manager'
    });

    return ok(res, { syncLog }, `Biometric logs sync successful: imported ${syncCount} records.`, 200, req);
  } catch (error) {
    next(error);
  }
}

// 7. Get Latest Biometric Sync Log
async function getBiometricStatus(req, res, next) {
  try {
    const syncLog = await BiometricSync.findOne().sort({ createdAt: -1 });
    return ok(res, { syncLog }, 'Biometric sync log retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkIn,
  checkOut,
  getMyTodayStatus,
  getMyHistory,
  getReport,
  triggerBiometricSync,
  getBiometricStatus
};
