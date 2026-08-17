const LeaveRequest = require('./leave.model');
const MonthlyLeaveBalance = require('./monthlyLeaveBalance.model');
const LeaveAuditLog = require('./leaveAuditLog.model');
const HRSetting = require('./hrSetting.model');
const Employee = require('../employee/employee.model');
const { ok, fail } = require('../../utils/response');

// Helper to count days between dates (inclusive)
function getDaysCount(fromDate, toDate) {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return 0;
  }
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

// Get/initialize default HR Settings
async function getSettingsDoc() {
  let settings = await HRSetting.findOne();
  if (!settings) {
    settings = await HRSetting.create({
      maxExtraLeavesPerYear: 4,
      extraLeaveApprovalRequired: true,
      autoApproveExtraLeaves: false,
      notifyHROnExtraRequest: true,
      extraLeaveReasonRequired: true
    });
  }
  return settings;
}

// 1. Fetch HR settings
async function getSettings(req, res, next) {
  try {
    const settings = await getSettingsDoc();
    return ok(res, { settings }, 'HR Settings retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

// 2. Update HR settings
async function updateSettings(req, res, next) {
  try {
    if (!['ADMIN', 'HR'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: HR/Admin required', [], req);
    }
    const { maxExtraLeavesPerYear, extraLeaveApprovalRequired, autoApproveExtraLeaves, notifyHROnExtraRequest, extraLeaveReasonRequired } = req.body;
    let settings = await getSettingsDoc();
    
    settings.maxExtraLeavesPerYear = maxExtraLeavesPerYear !== undefined ? maxExtraLeavesPerYear : settings.maxExtraLeavesPerYear;
    settings.extraLeaveApprovalRequired = extraLeaveApprovalRequired !== undefined ? extraLeaveApprovalRequired : settings.extraLeaveApprovalRequired;
    settings.autoApproveExtraLeaves = autoApproveExtraLeaves !== undefined ? autoApproveExtraLeaves : settings.autoApproveExtraLeaves;
    settings.notifyHROnExtraRequest = notifyHROnExtraRequest !== undefined ? notifyHROnExtraRequest : settings.notifyHROnExtraRequest;
    settings.extraLeaveReasonRequired = extraLeaveReasonRequired !== undefined ? extraLeaveReasonRequired : settings.extraLeaveReasonRequired;
    
    await settings.save();
    return ok(res, { settings }, 'HR Settings updated successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 3. Apply for Leave (Handles both regular and extra leaves)
async function createLeave(req, res, next) {
  try {
    const { fromDate, toDate, leaveType, reason, isExtraLeave, extraLeaveReason } = req.body;

    if (!fromDate || !toDate || !leaveType || !reason) {
      return fail(res, 400, 'VALIDATION_FAILED', 'fromDate, toDate, leaveType and reason are required', [], req);
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return fail(res, 400, 'INVALID_DATE_RANGE', 'Please select a valid date range', [], req);
    }

    const month = fromDate.slice(0, 7); // YYYY-MM
    const toMonth = toDate.slice(0, 7);
    if (month !== toMonth) {
      return fail(res, 400, 'CROSS_MONTH_LEAVE', 'Leaves must start and end in the same calendar month', [], req);
    }

    const numberOfDays = getDaysCount(fromDate, toDate);
    if (numberOfDays <= 0) {
      return fail(res, 400, 'INVALID_DAYS', 'Number of days must be greater than 0', [], req);
    }

    // Determine target employee: HR/Admin can apply on behalf of someone, otherwise it's req.user
    let targetEmployeeId = req.user._id;
    if (req.body.employeeId && ['ADMIN', 'HR', 'MANAGER'].includes(req.user.role)) {
      targetEmployeeId = req.body.employeeId;
    }

    const employee = await Employee.findById(targetEmployeeId);
    if (!employee) {
      return fail(res, 404, 'EMPLOYEE_NOT_FOUND', 'Employee not found', [], req);
    }

    // Load or create MonthlyLeaveBalance for this employee & month
    let balance = await MonthlyLeaveBalance.findOne({ employeeId: targetEmployeeId, month });
    if (!balance) {
      balance = await MonthlyLeaveBalance.create({
        employeeId: targetEmployeeId,
        month,
        totalLeaves: 4,
        usedLeaves: 0,
        remainingLeaves: 4,
        extraLeavesUsed: 0,
        totalLeavesUsed: 0
      });
    }

    const settings = await getSettingsDoc();

    // Business Logic: Check Regular Balance
    let isApplyingForExtra = isExtraLeave || leaveType === 'EXTRA';
    let status = 'PENDING';

    if (balance.remainingLeaves < numberOfDays) {
      // Regular balance is insufficient. Must be requested as extra leave
      if (!isApplyingForExtra) {
        return fail(
          res,
          400,
          'BALANCE_EXCEEDED',
          `Your regular leave balance (${balance.remainingLeaves} days remaining) is insufficient. Please apply for Extra Leave.`,
          [],
          req
        );
      }
      
      // If extra leave logic, validate reason
      if (settings.extraLeaveReasonRequired && !extraLeaveReason && !reason) {
        return fail(res, 400, 'REASON_REQUIRED', 'A reason is required to request Extra Leaves', [], req);
      }

      isApplyingForExtra = true;
      status = 'PENDING_HR_APPROVAL';
    }

    // Create LeaveRequest
    const leaveRequest = await LeaveRequest.create({
      employeeId: targetEmployeeId,
      fromDate: start,
      toDate: end,
      numberOfDays,
      leaveType: isApplyingForExtra ? 'EXTRA' : leaveType,
      reason,
      status,
      appliedOn: new Date(),
      month,
      isExtraLeave: isApplyingForExtra,
      extraLeaveReason: isApplyingForExtra ? (extraLeaveReason || reason) : '',
      overrideBy: 'NONE'
    });

    // Auto-approve Extra Leaves if configured in settings
    if (isApplyingForExtra && !settings.extraLeaveApprovalRequired && settings.autoApproveExtraLeaves) {
      leaveRequest.status = 'HR_APPROVED_EXTRA';
      leaveRequest.extraApprovedBy = null;
      leaveRequest.extraApprovedOn = new Date();
      leaveRequest.hrRemarks = 'Auto-approved by system policy';
      leaveRequest.overrideBy = 'SYSTEM';
      await leaveRequest.save();

      // Deduct/update balance
      balance.extraLeavesUsed += numberOfDays;
      balance.totalLeavesUsed += numberOfDays;
      await balance.save();

      // Audit Log
      await LeaveAuditLog.create({
        employeeId: targetEmployeeId,
        leaveRequestId: leaveRequest._id,
        action: 'EXTRA_APPROVED',
        previousBalance: balance.remainingLeaves,
        newBalance: balance.remainingLeaves,
        extraLeavesAdded: numberOfDays,
        reason: 'Auto-approved system policy',
        performedBy: 'SYSTEM',
        remarks: 'System policy configuration'
      });
    }

    return ok(res, { leaveRequest, balance }, 'Leave request submitted successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

// 4. List Leave Requests
async function listLeaves(req, res, next) {
  try {
    const filter = {};
    
    // Role based filtering: Employees only see their own requests
    // Admins/HR/Managers can see all or filter by employeeId
    const isHRorAdmin = ['ADMIN', 'HR', 'MANAGER'].includes(req.user.role);
    if (!isHRorAdmin) {
      filter.employeeId = req.user._id;
    } else if (req.query.employeeId) {
      filter.employeeId = req.query.employeeId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.isExtraLeave) {
      filter.isExtraLeave = req.query.isExtraLeave === 'true';
    }
    if (req.query.month) {
      filter.month = req.query.month;
    }

    const leaves = await LeaveRequest.find(filter)
      .populate('employeeId', 'name email department role phone')
      .populate('approvedBy', 'fullName email')
      .populate('extraApprovedBy', 'fullName email')
      .sort({ createdAt: -1 });

    return ok(res, { leaves }, 'Leave requests retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 5. Review Leave Request (Approve/Reject)
async function reviewLeave(req, res, next) {
  try {
    if (!['ADMIN', 'HR', 'MANAGER'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: HR/Admin/Manager required to review leaves', [], req);
    }

    const { status, hrRemarks } = req.body;
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return fail(res, 400, 'INVALID_STATUS', 'Status must be APPROVED or REJECTED', [], req);
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) {
      return fail(res, 404, 'NOT_FOUND', 'Leave request not found', [], req);
    }

    if (['APPROVED', 'REJECTED', 'HR_APPROVED_EXTRA'].includes(leave.status)) {
      return fail(res, 400, 'ALREADY_REVIEWED', 'This leave request has already been processed', [], req);
    }

    const balance = await MonthlyLeaveBalance.findOne({ employeeId: leave.employeeId, month: leave.month });
    if (!balance) {
      return fail(res, 404, 'BALANCE_NOT_FOUND', 'Monthly balance registry not found', [], req);
    }

    const prevRemaining = balance.remainingLeaves;

    if (status === 'REJECTED') {
      leave.status = 'REJECTED';
      leave.approvedBy = req.user._id;
      leave.approvedOn = new Date();
      leave.hrRemarks = hrRemarks || '';
      await leave.save();

      await LeaveAuditLog.create({
        employeeId: leave.employeeId,
        leaveRequestId: leave._id,
        action: 'REJECTED',
        previousBalance: prevRemaining,
        newBalance: prevRemaining,
        extraLeavesAdded: 0,
        reason: leave.reason,
        performedBy: req.user.fullName || req.user.name || 'HR Manager',
        remarks: hrRemarks || 'Rejected by HR'
      });

      return ok(res, { leave, balance }, 'Leave request rejected successfully', 200, req);
    }

    // Approve Regular or Extra leaves
    if (leave.isExtraLeave) {
      leave.status = 'HR_APPROVED_EXTRA';
      leave.extraApprovedBy = req.user._id;
      leave.extraApprovedOn = new Date();
      leave.hrRemarks = hrRemarks || '';
      leave.overrideBy = 'HR_MANAGER';
      await leave.save();

      balance.extraLeavesUsed += leave.numberOfDays;
      balance.totalLeavesUsed += leave.numberOfDays;
      await balance.save();

      await LeaveAuditLog.create({
        employeeId: leave.employeeId,
        leaveRequestId: leave._id,
        action: 'EXTRA_APPROVED',
        previousBalance: prevRemaining,
        newBalance: prevRemaining,
        extraLeavesAdded: leave.numberOfDays,
        reason: leave.extraLeaveReason || leave.reason,
        performedBy: req.user.fullName || req.user.name || 'HR Manager',
        remarks: hrRemarks || 'Extra leave override approved'
      });
    } else {
      // Regular leave approval
      if (balance.remainingLeaves < leave.numberOfDays) {
        return fail(res, 400, 'INSUFFICIENT_BALANCE', 'Employee does not have enough leave balance remaining', [], req);
      }

      leave.status = 'APPROVED';
      leave.approvedBy = req.user._id;
      leave.approvedOn = new Date();
      leave.hrRemarks = hrRemarks || '';
      await leave.save();

      balance.usedLeaves += leave.numberOfDays;
      balance.remainingLeaves -= leave.numberOfDays;
      balance.totalLeavesUsed += leave.numberOfDays;
      await balance.save();

      await LeaveAuditLog.create({
        employeeId: leave.employeeId,
        leaveRequestId: leave._id,
        action: 'REGULAR_APPROVED',
        previousBalance: prevRemaining,
        newBalance: balance.remainingLeaves,
        extraLeavesAdded: 0,
        reason: leave.reason,
        performedBy: req.user.fullName || req.user.name || 'HR Manager',
        remarks: hrRemarks || 'Regular leave approved'
      });
    }

    return ok(res, { leave, balance }, 'Leave request approved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 6. Manual Reset of Monthly Balances
async function resetMonthlyBalances(req, res, next) {
  try {
    if (!['ADMIN', 'HR'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: HR/Admin privilege required', [], req);
    }

    const { month } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return fail(res, 400, 'INVALID_MONTH', 'Valid month format (YYYY-MM) is required', [], req);
    }

    const employees = await Employee.find({ status: 'ACTIVE' });
    const results = [];

    for (const emp of employees) {
      let balance = await MonthlyLeaveBalance.findOne({ employeeId: emp._id, month });
      const prevRemaining = balance ? balance.remainingLeaves : 4;

      if (balance) {
        balance.totalLeaves = 4;
        balance.remainingLeaves = 4;
        balance.usedLeaves = 0;
        balance.extraLeavesUsed = 0;
        balance.totalLeavesUsed = 0;
        balance.isReset = true;
        balance.resetDate = new Date();
        await balance.save();
      } else {
        balance = await MonthlyLeaveBalance.create({
          employeeId: emp._id,
          month,
          totalLeaves: 4,
          usedLeaves: 0,
          remainingLeaves: 4,
          extraLeavesUsed: 0,
          totalLeavesUsed: 0,
          isReset: true,
          resetDate: new Date()
        });
      }

      await LeaveAuditLog.create({
        employeeId: emp._id,
        action: 'AUTO_RESET',
        previousBalance: prevRemaining,
        newBalance: 4,
        extraLeavesAdded: 0,
        reason: `Monthly Reset trigger for ${month}`,
        performedBy: req.user.fullName || req.user.name || 'HR Manager',
        remarks: 'Leaves balance reset to 4'
      });

      results.push(balance);
    }

    return ok(res, { resetCount: results.length }, `Successfully reset leave balance to 4 for ${results.length} active employees`, 200, req);
  } catch (error) {
    next(error);
  }
}

// 7. Get All Employee Balances (for HR Dashboard display)
async function getAllBalances(req, res, next) {
  try {
    if (!['ADMIN', 'HR', 'MANAGER'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied', [], req);
    }

    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const balances = await MonthlyLeaveBalance.find({ month }).populate('employeeId', 'name email department role');

    return ok(res, { balances }, 'Leave balances list retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 8. Get Leave Audit Logs
async function getAuditLogs(req, res, next) {
  try {
    if (!['ADMIN', 'HR', 'MANAGER'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied', [], req);
    }

    const logs = await LeaveAuditLog.find()
      .populate('employeeId', 'name email department')
      .populate('leaveRequestId')
      .sort({ createdAt: -1 })
      .limit(100);

    return ok(res, { logs }, 'Audit logs retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getMyBalance(req, res, next) {
  try {
    const month = new Date().toISOString().slice(0, 7);
    let balance = await MonthlyLeaveBalance.findOne({ employeeId: req.user._id, month });
    if (!balance) {
      balance = await MonthlyLeaveBalance.create({
        employeeId: req.user._id,
        month,
        totalLeaves: 4,
        usedLeaves: 0,
        remainingLeaves: 4,
        extraLeavesUsed: 0,
        totalLeavesUsed: 0
      });
    }
    return ok(
      res,
      {
        balance: {
          paidLeave: {
            total: balance.totalLeaves,
            used: balance.usedLeaves,
            available: balance.remainingLeaves
          },
          emergencyLeave: {
            total: 4,
            used: balance.extraLeavesUsed,
            available: Math.max(0, 4 - balance.extraLeavesUsed)
          }
        }
      },
      'Leave balance retrieved',
      200,
      req
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  createLeave,
  listLeaves,
  reviewLeave,
  resetMonthlyBalances,
  getAllBalances,
  getAuditLogs,
  getMyBalance
};
