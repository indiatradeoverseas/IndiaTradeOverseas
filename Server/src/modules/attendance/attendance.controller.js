const Attendance = require('./attendance.model');
const BiometricSync = require('./biometricSync.model');
const Employee = require('../employee/employee.model');
const User = require('../users/user.model');
const socketService = require('../../services/socket.service');
const { ok, fail } = require('../../utils/response');

// Helper: Get start of day in UTC
function getStartOfDay(dateStr) {
  const targetStr = dateStr || new Date().toISOString().slice(0, 10);
  return new Date(targetStr + "T00:00:00.000Z");
}

// Helper: Parse string time (e.g. "09:15 AM") into a Date object on a given base date
function parseTimeToDate(dateVal, timeStr) {
  if (!timeStr) return null;
  const baseDate = new Date(dateVal);
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return baseDate;
  let [_, hours, minutes, ampm] = match;
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);
  if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  baseDate.setHours(hours, minutes, 0, 0);
  return baseDate;
}

// Helper: Format a single attendance record for frontend consumption (clockIn, clockOut mapping)
function formatAttendance(record) {
  if (!record) return null;
  const obj = typeof record.toObject === 'function' ? record.toObject() : record;
  const checkInAt = obj.checkInAt || (obj.checkInTime ? parseTimeToDate(obj.date, obj.checkInTime) : null);
  const checkOutAt = obj.checkOutAt || (obj.checkOutTime ? parseTimeToDate(obj.date, obj.checkOutTime) : null);
  return {
    ...obj,
    checkInAt,
    checkOutAt,
    clockIn: checkInAt || obj.checkInTime,
    clockOut: checkOutAt || obj.checkOutTime
  };
}

// 1. Employee Check-In
async function checkIn(req, res, next) {
  try {
    const today = getStartOfDay();
    
    // Find Employee matching user email
    const employee = await Employee.findOne({ email: req.user.email });
    const empId = employee ? employee._id : req.user._id;

    // Check if record exists
    let record = await Attendance.findOne({ 
      date: today,
      $or: [
        { employeeId: empId },
        { employeeId: req.user._id }
      ]
    });
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
      record.checkInAt = now;
      record.status = status;
      await record.save();
    } else {
      record = await Attendance.create({
        employeeId: empId,
        date: today,
        checkInTime: timeStr,
        checkInAt: now,
        status
      });
    }

    const formatted = formatAttendance(record);
    socketService.emitToAll('attendance_updated', { employeeId: empId, type: 'check-in', record: formatted });

    return ok(res, { record, attendance: formatted }, 'Checked in successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 2. Employee Check-Out
async function checkOut(req, res, next) {
  try {
    const today = getStartOfDay();
    
    const employee = await Employee.findOne({ email: req.user.email });
    const empId = employee ? employee._id : req.user._id;

    const record = await Attendance.findOne({ 
      date: today,
      $or: [
        { employeeId: empId },
        { employeeId: req.user._id }
      ]
    });

    if (!record || !record.checkInTime) {
      return fail(res, 400, 'NOT_CHECKED_IN', 'You must check in before checking out', [], req);
    }
    if (record.checkOutTime) {
      return fail(res, 400, 'ALREADY_CHECKED_OUT', 'You have already checked out today', [], req);
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Calculate hours worked
    const checkInDate = record.checkInAt || parseTimeToDate(record.date, record.checkInTime) || today;
    const hoursWorked = (now - checkInDate) / (1000 * 60 * 60);
    const workingHours = Math.round(hoursWorked * 100) / 100;

    // Calculate overtime (shift ends at 18:00)
    let overtime = 0;
    if (now.getHours() >= 18) {
      overtime = (now.getHours() - 18) + (now.getMinutes() / 60);
      overtime = Math.round(overtime * 100) / 100;
    }

    record.checkOutTime = timeStr;
    record.checkOutAt = now;
    record.workingHours = workingHours;
    record.overtimeHours = overtime;
    if (workingHours < 4.5) {
      record.status = 'HALF_DAY';
    }
    await record.save();

    const formatted = formatAttendance(record);
    socketService.emitToAll('attendance_updated', { employeeId: empId, type: 'check-out', record: formatted });

    return ok(res, { record, attendance: formatted }, 'Checked out successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 2b. Lunch Break Start
async function startLunch(req, res, next) {
  try {
    const today = getStartOfDay();
    
    const employee = await Employee.findOne({ email: req.user.email });
    const empId = employee ? employee._id : req.user._id;

    const record = await Attendance.findOne({ 
      date: today,
      $or: [
        { employeeId: empId },
        { employeeId: req.user._id }
      ]
    });

    if (!record || !record.checkInTime) {
      return fail(res, 400, 'NOT_CHECKED_IN', 'You must check in before starting lunch', [], req);
    }
    if (record.checkOutTime) {
      return fail(res, 400, 'ALREADY_CHECKED_OUT', 'You have already checked out today', [], req);
    }
    if (record.lunchEndAt) {
      return fail(res, 400, 'LUNCH_ALREADY_TAKEN', 'Lunch has already been completed today', [], req);
    }
    if (record.lunchStartAt) {
      return fail(res, 400, 'LUNCH_IN_PROGRESS', 'Lunch break is already in progress', [], req);
    }

    record.lunchStartAt = new Date();
    await record.save();

    const formatted = formatAttendance(record);
    socketService.emitToAll('attendance_updated', { employeeId: empId, type: 'lunch-start', record: formatted });

    return ok(res, { record, attendance: formatted }, 'Lunch break started', 200, req);
  } catch (error) {
    next(error);
  }
}

// 2c. Lunch Break End
async function endLunch(req, res, next) {
  try {
    const today = getStartOfDay();
    
    const employee = await Employee.findOne({ email: req.user.email });
    const empId = employee ? employee._id : req.user._id;

    const record = await Attendance.findOne({ 
      date: today,
      $or: [
        { employeeId: empId },
        { employeeId: req.user._id }
      ]
    });

    if (!record || !record.lunchStartAt) {
      return fail(res, 400, 'LUNCH_NOT_STARTED', 'Lunch break has not been started today', [], req);
    }
    if (record.lunchEndAt) {
      return fail(res, 400, 'LUNCH_ALREADY_ENDED', 'Lunch break has already been completed today', [], req);
    }

    const now = new Date();
    record.lunchEndAt = now;
    record.lunchDurationMinutes = Math.round((now - record.lunchStartAt) / 60000);
    await record.save();

    const formatted = formatAttendance(record);
    socketService.emitToAll('attendance_updated', { employeeId: empId, type: 'lunch-end', record: formatted });

    return ok(res, { record, attendance: formatted }, 'Lunch break completed', 200, req);
  } catch (error) {
    next(error);
  }
}

// 3. Get Employee's Today Status
async function getMyTodayStatus(req, res, next) {
  try {
    const today = getStartOfDay();
    
    const employee = await Employee.findOne({ email: req.user.email });
    const empId = employee ? employee._id : req.user._id;

    const record = await Attendance.findOne({ 
      date: today,
      $or: [
        { employeeId: empId },
        { employeeId: req.user._id }
      ]
    });
    return ok(res, { record, attendance: record ? formatAttendance(record) : null }, 'Today\'s status retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

// 4. Get Employee's Attendance History
async function getMyHistory(req, res, next) {
  try {
    const employee = await Employee.findOne({ email: req.user.email });
    const empId = employee ? employee._id : req.user._id;

    const filter = {
      $or: [
        { employeeId: empId },
        { employeeId: req.user._id }
      ]
    };
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) filter.date.$gte = getStartOfDay(req.query.startDate);
      if (req.query.endDate) filter.date.$lte = getStartOfDay(req.query.endDate);
    }

    const history = await Attendance.find(filter).sort({ date: -1 });
    const mappedHistory = history.map(formatAttendance);
    return ok(res, { history, logs: mappedHistory, records: mappedHistory }, 'Attendance history retrieved', 200, req);
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

    // Support date ranges or single dates
    const start = getStartOfDay(req.query.startDate || req.query.date || new Date().toISOString().slice(0, 10));
    const end = getStartOfDay(req.query.endDate || req.query.date || new Date().toISOString().slice(0, 10));

    const dateList = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      dateList.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const employees = await Employee.find({ status: 'ACTIVE' });
    const records = await Attendance.find({ 
      date: { $gte: start, $lte: end } 
    }).populate('employeeId', 'name email department role');

    // Retroactive resolution for manual check-ins logged under User ID
    const resolvedRecords = [];
    for (const r of records) {
      const obj = r.toObject();
      if (!obj.employeeId) {
        const rawId = r.populated('employeeId') || r._doc.employeeId;
        if (rawId) {
          const userDoc = await User.findById(rawId);
          if (userDoc) {
            const empDoc = await Employee.findOne({ email: userDoc.email });
            if (empDoc) {
              obj.employeeId = {
                _id: empDoc._id,
                name: empDoc.name,
                email: empDoc.email,
                department: empDoc.department,
                role: empDoc.role
              };
            }
          }
        }
      }
      resolvedRecords.push(obj);
    }

    const recordMap = new Map();
    resolvedRecords.forEach(r => {
      if (r.employeeId && r.employeeId._id) {
        const key = `${r.employeeId._id.toString()}_${new Date(r.date).toDateString()}`;
        recordMap.set(key, r);
      }
    });

    const reportData = [];
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;

    for (const emp of employees) {
      for (const dateVal of dateList) {
        const key = `${emp._id.toString()}_${dateVal.toDateString()}`;
        const r = recordMap.get(key);
        if (r) {
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
          reportData.push(r);
        } else {
          const day = dateVal.getDay();
          const isWeekend = day === 0 || day === 6; // Sunday or Saturday
          const status = isWeekend ? 'WEEKEND' : 'ABSENT';
          
          if (!isWeekend) absentCount++;

          reportData.push({
            _id: `abs_${emp._id}_${dateVal.getTime()}`,
            employeeId: emp,
            date: dateVal,
            status,
            checkInTime: null,
            checkOutTime: null,
            overtimeHours: 0
          });
        }
      }
    }

    const formattedRecords = reportData.map(formatAttendance);

    // Sort by date desc, then by name
    formattedRecords.sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      const nameA = a.employeeId?.name || '';
      const nameB = b.employeeId?.name || '';
      return nameA.localeCompare(nameB);
    });

    return ok(res, {
      records: formattedRecords,
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

        const checkInAt = parseTimeToDate(today, checkInTime);
        const checkOutAt = parseTimeToDate(today, checkOutTime);
        const workingHours = checkInAt && checkOutAt ? Math.round(((checkOutAt - checkInAt) / (1000 * 60 * 60)) * 100) / 100 : 9;

        if (record) {
          record.checkInTime = checkInTime;
          record.checkInAt = checkInAt;
          record.checkOutTime = checkOutTime;
          record.checkOutAt = checkOutAt;
          record.status = status;
          record.overtimeHours = overtime;
          record.workingHours = workingHours;
          await record.save();
        } else {
          await Attendance.create({
            employeeId: emp._id,
            date: today,
            checkInTime,
            checkInAt,
            checkOutTime,
            checkOutAt,
            status,
            overtimeHours: overtime,
            workingHours,
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

    socketService.emitToAll('attendance_updated', { type: 'biometric-sync' });

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
  startLunch,
  endLunch,
  getMyTodayStatus,
  getMyHistory,
  getReport,
  triggerBiometricSync,
  getBiometricStatus
};
