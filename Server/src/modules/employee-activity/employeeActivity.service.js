const EmployeeActivity = require('./employeeActivity.model');
const ActivityLog = require('./activityLog.model');
const User = require('../users/user.model');

const getTodayString = (dateObj = new Date()) => {
  return dateObj.toISOString().slice(0, 10);
};

const calculateProductivity = (activeMins, inactiveMins, crmActions, dept = 'SALES', act = null) => {
  const totalShiftMins = activeMins + inactiveMins;
  if (totalShiftMins === 0) return 100;
  
  const timeRatio = Math.min(1, activeMins / Math.max(1, totalShiftMins));
  let actionBonus = 0;

  const d = (dept || 'SALES').toUpperCase();
  if (d === 'HR') {
    const tickets = act?.ticketsResolvedCount || 0;
    const onboarding = act?.onboardingTasksCount || 0;
    const leaves = act?.leaveApprovalsCount || 0;
    const notes = act?.notesEnteredCount || 0;
    const calls = act?.callsLoggedCount || 0;
    actionBonus = Math.min(30, (tickets * 8) + (onboarding * 8) + (leaves * 5) + (calls * 3) + (notes * 3));
  } else if (d === 'TRANSPORT') {
    const trips = act?.tripsAssignedCount || 0;
    const pods = act?.podsUploadedCount || 0;
    const dispatches = act?.dispatchUpdatesCount || 0;
    const freight = act?.freightDocsCount || 0;
    const driverCalls = act?.callsLoggedCount || 0;
    actionBonus = Math.min(30, (trips * 6) + (pods * 10) + (dispatches * 5) + (freight * 5) + (driverCalls * 3));
  } else {
    // SALES / DEFAULT
    actionBonus = Math.min(30, crmActions * 4);
  }

  const score = Math.round((timeRatio * 70) + actionBonus);
  return Math.min(100, Math.max(0, score));
};

async function recordHeartbeat(user) {
  if (!user || !user._id) return null;
  
  const today = getTodayString();
  const now = new Date();
  const empId = user.employeeId || String(user._id);
  const dept = user.department || 'SALES';
  const role = user.role || 'EMPLOYEE';

  try {
    let activity = await EmployeeActivity.findOne({ employeeId: empId, date: today });

    if (!activity) {
      activity = new EmployeeActivity({
        employeeId: empId,
        userId: user._id,
        department: dept,
        role: role,
        date: today,
        firstLoginAt: now,
        lastActiveAt: now,
        status: 'ACTIVE',
        activeMinutes: 0,
        inactiveMinutes: 0,
        productivityScore: 100
      });
    } else {
      const lastActive = new Date(activity.lastActiveAt || now);
      const diffMs = Math.max(0, now.getTime() - lastActive.getTime());
      const diffMins = diffMs / (1000 * 60);

      if (diffMins <= 5) {
        // Continuous active session: add exact elapsed active minutes
        activity.activeMinutes += diffMins;
      } else {
        // User was idle/away for diffMins: add 5 mins active and remaining to inactive
        activity.activeMinutes += 5;
        activity.inactiveMinutes += Math.max(0, diffMins - 5);
      }

      // Safety cap: activeMinutes cannot exceed total time elapsed since first login today
      if (activity.firstLoginAt) {
        const totalElapsedMins = Math.max(0, (now.getTime() - new Date(activity.firstLoginAt).getTime()) / (1000 * 60));
        if (activity.activeMinutes > totalElapsedMins) {
          activity.activeMinutes = totalElapsedMins;
        }
      }

      activity.lastActiveAt = now;
      activity.status = 'ACTIVE';
      activity.productivityScore = calculateProductivity(
        activity.activeMinutes,
        activity.inactiveMinutes,
        activity.totalCrmActions,
        activity.department,
        activity
      );
    }

    await activity.save();
    return activity;
  } catch (err) {
    console.error('Error in recordHeartbeat:', err);
    return null;
  }
}

async function recordCrmAction(user, actionCategory, details = '', metadata = {}) {
  if (!user || !user._id) return null;

  const empId = user.employeeId || String(user._id);
  const dept = user.department || 'SALES';
  const now = new Date();

  // 1. Record log event
  try {
    await ActivityLog.create({
      userId: user._id,
      employeeId: empId,
      department: dept,
      actionCategory: actionCategory,
      details: details,
      metadata: metadata,
      createdAt: now
    });
  } catch (logErr) {
    console.error('Error logging ActivityLog:', logErr);
  }

  // 2. Refresh heartbeat & update daily counters
  const activity = await recordHeartbeat(user);
  if (!activity) return null;

  switch (actionCategory) {
    case 'CALL_LOGGED':
      activity.callsLoggedCount += 1;
      activity.followupsCompletedCount += 1;
      break;
    case 'LEAD_UPDATED':
      activity.leadsUpdatedCount += 1;
      break;
    case 'FOLLOWUP_COMPLETED':
      activity.followupsCompletedCount += 1;
      activity.callsLoggedCount += 1;
      break;
    case 'NOTE_ADDED':
      activity.notesEnteredCount += 1;
      break;
    case 'RECORDING_UPLOADED':
      activity.recordingsUploadedCount += 1;
      activity.callsLoggedCount += 1;
      activity.followupsCompletedCount += 1;
      break;
    case 'LEAD_STATUS_CHANGED':
      activity.statusChangesCount += 1;
      break;

    // HR Action Categories
    case 'TICKET_RESOLVED':
      activity.ticketsResolvedCount += 1;
      break;
    case 'ONBOARDING_TASK_COMPLETED':
      activity.onboardingTasksCount += 1;
      break;
    case 'LEAVE_APPROVED':
      activity.leaveApprovalsCount += 1;
      break;
    case 'EMPLOYEE_STATUS_CHANGED':
      activity.employeeStatusChangesCount += 1;
      break;

    // Transport Action Categories
    case 'TRIP_ASSIGNED':
      activity.tripsAssignedCount += 1;
      break;
    case 'POD_UPLOADED':
      activity.podsUploadedCount += 1;
      break;
    case 'DISPATCH_STATUS_UPDATED':
      activity.dispatchUpdatesCount += 1;
      break;
    case 'DRIVER_ISSUE_LOGGED':
      activity.driverLogsCount += 1;
      break;
    case 'FREIGHT_DOC_GENERATED':
      activity.freightDocsCount += 1;
      break;
    default:
      break;
  }

  activity.totalCrmActions += 1;
  activity.activityLogs.push({
    timestamp: now,
    actionType: actionCategory,
    details: details
  });

  // Keep latest 50 action logs per day in document
  if (activity.activityLogs.length > 50) {
    activity.activityLogs = activity.activityLogs.slice(-50);
  }

  activity.productivityScore = calculateProductivity(
    activity.activeMinutes,
    activity.inactiveMinutes,
    activity.totalCrmActions
  );

  await activity.save();
  return activity;
}

async function recordLogout(user) {
  if (!user || !user._id) return null;
  const today = getTodayString();
  const empId = user.employeeId || String(user._id);
  const now = new Date();

  try {
    const activity = await EmployeeActivity.findOne({ employeeId: empId, date: today });
    if (activity) {
      activity.lastLogoutAt = now;
      activity.status = 'OFFLINE';
      await activity.save();
    }
  } catch (err) {
    console.error('Error in recordLogout:', err);
  }
}

async function getLiveEmployeeStatuses(reqUser) {
  const today = getTodayString();
  const now = new Date();

  // Role-based department scoping
  const userRole = (reqUser?.role || '').toUpperCase();
  const isGlobalManager = ['ADMIN', 'HR', 'HR_MANAGER', 'SYSTEM', 'FOUNDER', 'CEO', 'SUPER_ADMIN', 'DIRECTOR'].includes(userRole);
  
  let userQuery = { isActive: true };
  if (!isGlobalManager && reqUser?.department) {
    userQuery.department = reqUser.department;
  }

  // Query BOTH User model and Employee model to get all staff
  const allUsersFromUserModel = await User.find(userQuery).select(
    'employeeId fullName email role department isOnline lastActiveAt lastLoginAt profileImage'
  ).lean();

  const Employee = require('../employee/employee.model');
  let empQuery = { status: 'ACTIVE' };
  if (!isGlobalManager && reqUser?.department) {
    empQuery.department = reqUser.department;
  }
  const allEmployees = await Employee.find(empQuery).select(
    'employeeId name email role department profileImage'
  ).lean();

  // Merge: Use a map keyed by employeeId to avoid duplicates
  const mergedMap = {};

  // Add User model entries first
  allUsersFromUserModel.forEach(u => {
    const empId = u.employeeId || String(u._id);
    mergedMap[empId] = {
      _id: u._id,
      employeeId: empId,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      department: u.department,
      isOnline: u.isOnline,
      lastActiveAt: u.lastActiveAt,
      lastLoginAt: u.lastLoginAt,
      profileImage: u.profileImage || ''
    };
  });

  // Add Employee model entries (only if not already present by employeeId)
  allEmployees.forEach(emp => {
    const empId = emp.employeeId || String(emp._id);
    if (!mergedMap[empId]) {
      mergedMap[empId] = {
        _id: emp._id,
        employeeId: empId,
        fullName: emp.name,
        email: emp.email,
        role: emp.role,
        department: emp.department,
        isOnline: false,
        lastActiveAt: null,
        lastLoginAt: null,
        profileImage: emp.profileImage || ''
      };
    }
  });

  const allUsers = Object.values(mergedMap);

  const Attendance = require('../attendance/attendance.model');

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const attendances = await Attendance.find({
    date: { $gte: startOfDay, $lte: endOfDay }
  }).populate('employeeId').lean();

  const attendanceMap = {};
  attendances.forEach(att => {
    if (!att.employeeId) return;
    const empDoc = att.employeeId;
    if (typeof empDoc === 'object') {
      if (empDoc._id) attendanceMap[String(empDoc._id)] = att;
      if (empDoc.employeeId) attendanceMap[String(empDoc.employeeId)] = att;
    } else {
      attendanceMap[String(empDoc)] = att;
    }
  });

  const todayActivities = await EmployeeActivity.find({ date: today }).lean();
  const activityMap = {};
  todayActivities.forEach(act => {
    if (act.employeeId) activityMap[String(act.employeeId)] = act;
    if (act.userId) activityMap[String(act.userId)] = act;
  });

  const result = allUsers.map(u => {
    const empId = u.employeeId || String(u._id);
    const act = activityMap[String(empId)] || activityMap[String(u._id)] || null;
    const att = attendanceMap[String(empId)] || attendanceMap[String(u._id)] || null;

    // First Login Today
    let rawFirstLogin = act?.firstLoginAt || att?.checkInAt || u.lastLoginAt;
    let firstLogin = (rawFirstLogin && getTodayString(new Date(rawFirstLogin)) === today) ? rawFirstLogin : null;

    // Last Logout Today
    let rawLastLogout = act?.lastLogoutAt || att?.checkOutAt;
    let lastLogout = (rawLastLogout && getTodayString(new Date(rawLastLogout)) === today) ? rawLastLogout : null;

    // Last Active Timestamp
    let lastActive = act?.lastActiveAt ? new Date(act.lastActiveAt) : (att?.checkInAt ? new Date(att.checkInAt) : (u.lastActiveAt ? new Date(u.lastActiveAt) : null));

    const isFirstLoginToday = Boolean(firstLogin);
    const isLastActiveToday = Boolean(lastActive && getTodayString(new Date(lastActive)) === today);

    // Lunch Break (Only show if actually taken today, NO default fake time)
    const lStart = (act?.lunchStartAt && getTodayString(new Date(act.lunchStartAt)) === today) ? act.lunchStartAt : ((att?.lunchStartAt && getTodayString(new Date(att.lunchStartAt)) === today) ? att.lunchStartAt : null);
    const lEnd = (act?.lunchEndAt && getTodayString(new Date(act.lunchEndAt)) === today) ? act.lunchEndAt : ((att?.lunchEndAt && getTodayString(new Date(att.lunchEndAt)) === today) ? att.lunchEndAt : null);
    const lDuration = act?.lunchDurationMinutes || att?.lunchDurationMinutes || (lStart && lEnd ? Math.round((new Date(lEnd) - new Date(lStart)) / 60000) : 0);

    let lunchTimingFormatted = 'Not Taken Yet';
    if (lStart && lEnd) {
      const sStr = new Date(lStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const eStr = new Date(lEnd).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      lunchTimingFormatted = `${sStr} - ${eStr} (${lDuration}m)`;
    } else if (lStart) {
      const sStr = new Date(lStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      lunchTimingFormatted = `On Lunch (Since ${sStr})`;
    }

    let computedStatus = 'OFFLINE';
    let inactiveDurationMins = 0;

    if (lastLogout) {
      computedStatus = 'OFFLINE';
    } else if (act && act.status === 'OFFLINE') {
      computedStatus = 'OFFLINE';
    } else if (lastActive && isLastActiveToday) {
      const diffMs = now.getTime() - new Date(lastActive).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));

      if (diffMins < 5) {
        computedStatus = 'ACTIVE';
      } else if (diffMins < 30) {
        computedStatus = 'IDLE';
        inactiveDurationMins = diffMins;
      } else if (att?.checkInAt && !att?.checkOutAt && getTodayString(new Date(att.checkInAt)) === today) {
        // Checked in today via Attendance & shift currently active
        computedStatus = 'IDLE';
        inactiveDurationMins = diffMins;
      } else {
        computedStatus = 'OFFLINE';
      }
    } else if (att?.checkInAt && !att?.checkOutAt && getTodayString(new Date(att.checkInAt)) === today) {
      // Checked in today via Attendance
      computedStatus = 'ACTIVE';
    } else {
      computedStatus = 'OFFLINE';
    }

    // Active & Inactive Minutes Calculation
    let activeMins = 0;
    let inactiveMins = 0;

    if (act) {
      activeMins = act.activeMinutes;
      inactiveMins = act.inactiveMinutes + (computedStatus === 'IDLE' ? inactiveDurationMins : 0);
    } else if (att?.checkInAt && getTodayString(new Date(att.checkInAt)) === today) {
      const checkInDate = new Date(att.checkInAt);
      const checkOutDate = att.checkOutAt ? new Date(att.checkOutAt) : now;
      const totalElapsedMins = Math.max(1, Math.floor((checkOutDate - checkInDate) / 60000));
      activeMins = Math.max(1, totalElapsedMins - (lDuration || 0));
      inactiveMins = computedStatus === 'IDLE' ? inactiveDurationMins : 0;
    } else {
      activeMins = 0;
      inactiveMins = 0;
    }

    const activeHoursFormatted = `${Math.floor(activeMins / 60)}h ${Math.floor(activeMins % 60)}m`;
    const inactiveHoursFormatted = `${Math.floor(inactiveMins / 60)}h ${Math.floor(inactiveMins % 60)}m`;

    return {
      _id: u._id,
      employeeId: empId,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      department: u.department,
      profileImage: u.profileImage || '',
      status: computedStatus, // 'ACTIVE' (Green), 'IDLE' (Inactive), 'OFFLINE'
      isGreenDotActive: computedStatus === 'ACTIVE',
      inactiveDurationMins: computedStatus === 'IDLE' ? inactiveDurationMins : 0,
      firstLoginAt: firstLogin,
      lastLogoutAt: lastLogout,
      lastActiveAt: lastActive,
      isFirstLoginToday: isFirstLoginToday,
      isLastActiveToday: isLastActiveToday,
      lunchStartAt: lStart,
      lunchEndAt: lEnd,
      lunchDurationMinutes: lDuration,
      lunchTimingFormatted: lunchTimingFormatted,
      activeMinutes: activeMins,
      inactiveMinutes: inactiveMins,
      activeHoursFormatted: activeHoursFormatted,
      inactiveHoursFormatted: inactiveHoursFormatted,
      callsLoggedCount: act ? act.callsLoggedCount : 0,
      leadsUpdatedCount: act ? act.leadsUpdatedCount : 0,
      followupsCompletedCount: act ? act.followupsCompletedCount : 0,
      notesEnteredCount: act ? act.notesEnteredCount : 0,
      recordingsUploadedCount: act ? act.recordingsUploadedCount : 0,
      statusChangesCount: act ? act.statusChangesCount : 0,

      // HR metrics
      ticketsResolvedCount: act ? act.ticketsResolvedCount : 0,
      onboardingTasksCount: act ? act.onboardingTasksCount : 0,
      leaveApprovalsCount: act ? act.leaveApprovalsCount : 0,
      employeeStatusChangesCount: act ? act.employeeStatusChangesCount : 0,

      // Transport metrics
      tripsAssignedCount: act ? act.tripsAssignedCount : 0,
      podsUploadedCount: act ? act.podsUploadedCount : 0,
      dispatchUpdatesCount: act ? act.dispatchUpdatesCount : 0,
      driverLogsCount: act ? act.driverLogsCount : 0,
      freightDocsCount: act ? act.freightDocsCount : 0,

      totalCrmActions: act ? act.totalCrmActions : 0,
      productivityScore: act ? act.productivityScore : (computedStatus === 'ACTIVE' ? 85 : 0),
      activityLogs: act ? (act.activityLogs || []) : []
    };
  });

  return result;
}

async function getActivityReports(query = {}, reqUser) {
  const { period = 'daily', department, employeeId, startDate, endDate } = query;
  const userRole = (reqUser?.role || '').toUpperCase();
  const isGlobalManager = ['ADMIN', 'HR', 'HR_MANAGER', 'SYSTEM', 'FOUNDER', 'CEO', 'SUPER_ADMIN', 'DIRECTOR'].includes(userRole);

  let matchQuery = {};

  if (!isGlobalManager && reqUser?.department) {
    matchQuery.department = reqUser.department;
  } else if (department && department !== 'ALL') {
    matchQuery.department = department;
  }

  if (employeeId && employeeId !== 'ALL') {
    matchQuery.employeeId = employeeId;
  }

  // Handle Date Ranges
  const now = new Date();
  if (startDate && endDate) {
    matchQuery.date = { $gte: startDate, $lte: endDate };
  } else if (period === 'daily') {
    matchQuery.date = getTodayString();
  } else if (period === 'weekly') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    matchQuery.date = { $gte: getTodayString(weekAgo), $lte: getTodayString(now) };
  } else if (period === 'monthly') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    matchQuery.date = { $gte: getTodayString(monthAgo), $lte: getTodayString(now) };
  }

  const records = await EmployeeActivity.find(matchQuery).sort({ date: -1 }).lean();
  
  // Aggregate stats employee-wise and department-wise
  const employeeSummary = {};
  const departmentSummary = {};

  let grandActiveMins = 0;
  let grandInactiveMins = 0;
  let grandCrmActions = 0;

  records.forEach(r => {
    grandActiveMins += r.activeMinutes || 0;
    grandInactiveMins += r.inactiveMinutes || 0;
    grandCrmActions += r.totalCrmActions || 0;

    // Employee aggregation
    if (!employeeSummary[r.employeeId]) {
      employeeSummary[r.employeeId] = {
        employeeId: r.employeeId,
        department: r.department,
        totalDays: 0,
        activeMinutes: 0,
        inactiveMinutes: 0,
        callsLogged: 0,
        leadsUpdated: 0,
        followupsCompleted: 0,
        notesEntered: 0,
        recordingsUploaded: 0,
        statusChanges: 0,
        totalCrmActions: 0,
        productivitySum: 0
      };
    }

    const emp = employeeSummary[r.employeeId];
    emp.totalDays += 1;
    emp.activeMinutes += r.activeMinutes || 0;
    emp.inactiveMinutes += r.inactiveMinutes || 0;
    emp.callsLogged += r.callsLoggedCount || 0;
    emp.leadsUpdated += r.leadsUpdatedCount || 0;
    emp.followupsCompleted += r.followupsCompletedCount || 0;
    emp.notesEntered += r.notesEnteredCount || 0;
    emp.recordingsUploaded += r.recordingsUploadedCount || 0;
    emp.statusChanges += r.statusChangesCount || 0;
    emp.totalCrmActions += r.totalCrmActions || 0;
    emp.productivitySum += r.productivityScore || 0;

    // Department aggregation
    const deptKey = r.department || 'UNKNOWN';
    if (!departmentSummary[deptKey]) {
      departmentSummary[deptKey] = {
        department: deptKey,
        recordCount: 0,
        activeMinutes: 0,
        inactiveMinutes: 0,
        totalCrmActions: 0,
        productivitySum: 0
      };
    }
    const dObj = departmentSummary[deptKey];
    dObj.recordCount += 1;
    dObj.activeMinutes += r.activeMinutes || 0;
    dObj.inactiveMinutes += r.inactiveMinutes || 0;
    dObj.totalCrmActions += r.totalCrmActions || 0;
    dObj.productivitySum += r.productivityScore || 0;
  });

  // Calculate averages for employee summaries
  const employeeList = Object.values(employeeSummary).map(e => ({
    ...e,
    activeHoursFormatted: `${Math.floor(e.activeMinutes / 60)}h ${Math.floor(e.activeMinutes % 60)}m`,
    inactiveHoursFormatted: `${Math.floor(e.inactiveMinutes / 60)}h ${Math.floor(e.inactiveMinutes % 60)}m`,
    avgProductivityScore: e.totalDays > 0 ? Math.round(e.productivitySum / e.totalDays) : 0
  }));

  // Calculate averages for department summaries
  const departmentList = Object.values(departmentSummary).map(d => ({
    ...d,
    activeHoursFormatted: `${Math.floor(d.activeMinutes / 60)}h ${Math.floor(d.activeMinutes % 60)}m`,
    inactiveHoursFormatted: `${Math.floor(d.inactiveMinutes / 60)}h ${Math.floor(d.inactiveMinutes % 60)}m`,
    avgProductivityScore: d.recordCount > 0 ? Math.round(d.productivitySum / d.recordCount) : 0
  }));

  return {
    period,
    totalRecords: records.length,
    grandTotalActiveHours: `${Math.floor(grandActiveMins / 60)}h ${Math.floor(grandActiveMins % 60)}m`,
    grandTotalInactiveHours: `${Math.floor(grandInactiveMins / 60)}h ${Math.floor(grandInactiveMins % 60)}m`,
    grandTotalCrmActions: grandCrmActions,
    employeeSummary: employeeList,
    departmentSummary: departmentList,
    rawRecords: records
  };
}

async function generate6PMReport(reqUser) {
  const today = getTodayString();
  const liveStatuses = await getLiveEmployeeStatuses(reqUser);
  const reports = await getActivityReports({ period: 'daily', startDate: today, endDate: today }, reqUser);

  return {
    reportTitle: `Official Shift End & Productivity Report (${today} - 6:00 PM)`,
    generatedAt: new Date(),
    summary: {
      totalEmployees: liveStatuses.length,
      activeEmployeesCount: liveStatuses.filter(e => e.isGreenDotActive).length,
      idleEmployeesCount: liveStatuses.filter(e => e.status === 'IDLE').length,
      offlineEmployeesCount: liveStatuses.filter(e => e.status === 'OFFLINE').length,
      grandTotalActiveHours: reports.grandTotalActiveHours,
      grandTotalInactiveHours: reports.grandTotalInactiveHours,
      grandTotalCrmActions: reports.grandTotalCrmActions
    },
    employeeBreakdown: liveStatuses,
    departmentBreakdown: reports.departmentSummary
  };
}

module.exports = {
  recordHeartbeat,
  recordCrmAction,
  recordLogout,
  getLiveEmployeeStatuses,
  getActivityReports,
  generate6PMReport
};
