const LeaveRequest = require('./leave.model');
const MonthlyLeaveBalance = require('./monthlyLeaveBalance.model');
const LeaveAuditLog = require('./leaveAuditLog.model');
const HRSetting = require('./hrSetting.model');
const Employee = require('../employee/employee.model');
const { sendEmail } = require('../../utils/mailer');
const { ok, fail } = require('../../utils/response');
const mongoose = require('mongoose');

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

// Helper to find all DB IDs (User and Employee) associated with a given ID's email
async function getAllIdsForId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return [id];
  
  const User = require('../users/user.model');
  const user = await User.findById(id);
  let email = user ? user.email : null;
  
  if (!email) {
    const emp = await Employee.findById(id);
    email = emp ? emp.email : null;
  }
  
  if (!email) return [id];
  
  const users = await User.find({ email: { $regex: new RegExp(`^${email}$`, 'i') } }, '_id');
  const emps = await Employee.find({ email: { $regex: new RegExp(`^${email}$`, 'i') } }, '_id');
  
  const ids = [
    ...users.map(u => u._id.toString()),
    ...emps.map(e => e._id.toString())
  ];
  
  return [...new Set(ids)];
}

// Helper to find or create balance by email/IDs
async function getBalanceForUser(employeeOrUser, month) {
  const email = employeeOrUser.email;
  if (!email) {
    let balance = await MonthlyLeaveBalance.findOne({ employeeId: employeeOrUser._id, month });
    if (!balance) {
      const modelName = employeeOrUser.constructor.modelName || (employeeOrUser.passwordHash ? 'User' : 'Employee');
      balance = await MonthlyLeaveBalance.create({
        employeeId: employeeOrUser._id,
        employeeModel: modelName,
        month,
        totalLeaves: 4,
        usedLeaves: 0,
        remainingLeaves: 4,
        extraLeavesUsed: 0,
        totalLeavesUsed: 0
      });
    }
    return balance;
  }

  const User = require('../users/user.model');
  const users = await User.find({ email: { $regex: new RegExp(`^${email}$`, 'i') } }, '_id');
  const emps = await Employee.find({ email: { $regex: new RegExp(`^${email}$`, 'i') } }, '_id');
  
  const allIds = [
    ...users.map(u => u._id),
    ...emps.map(e => e._id)
  ];

  let balance = await MonthlyLeaveBalance.findOne({ employeeId: { $in: allIds }, month });
  if (!balance) {
    const preferredEmployee = emps[0] || users[0];
    const preferredModel = emps[0] ? 'Employee' : 'User';
    
    balance = await MonthlyLeaveBalance.create({
      employeeId: preferredEmployee._id,
      employeeModel: preferredModel,
      month,
      totalLeaves: 4,
      usedLeaves: 0,
      remainingLeaves: 4,
      extraLeavesUsed: 0,
      totalLeavesUsed: 0
    });
  }
  return balance;
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
    if (!['ADMIN', 'HR', 'HR_MANAGER'].includes(req.user.role)) {
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
    let targetModel = req.user.constructor.modelName || (req.user.passwordHash ? 'User' : 'Employee');

    if (req.body.employeeId && ['ADMIN', 'HR', 'MANAGER'].includes(req.user.role)) {
      targetEmployeeId = req.body.employeeId;
      // Determine model by database lookup
      const existsInEmployee = await Employee.findById(targetEmployeeId);
      targetModel = existsInEmployee ? 'Employee' : 'User';
    }

    let employee;
    if (targetModel === 'Employee') {
      employee = await Employee.findById(targetEmployeeId);
    } else {
      const User = require('../users/user.model');
      employee = await User.findById(targetEmployeeId);
    }

    if (!employee) {
      return fail(res, 404, 'EMPLOYEE_NOT_FOUND', 'Employee/User not found', [], req);
    }

    // Load or create MonthlyLeaveBalance for this employee & month
    const balance = await getBalanceForUser(employee, month);

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
      employeeModel: targetModel,
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

// Helper to find all employee and user IDs within a department
async function getDeptEmployeeIds(department) {
  const Employee = require('../employee/employee.model');
  const User = require('../users/user.model');
  
  const employees = await Employee.find({ department }, '_id');
  const users = await User.find({ department }, '_id');
  
  return [...employees.map(e => e._id), ...users.map(u => u._id)];
}

// 4. List Leave Requests
async function listLeaves(req, res, next) {
  try {
    const filter = {};
    
    // Role based filtering: 
    // HR/Admin see all requests.
    // Managers see their own leaves OR leaves of employees in their department.
    // Executives / Employees see only their own.
    const isHRorAdmin = ['ADMIN', 'HR', 'HR_MANAGER', 'HR_EXECUTIVE'].includes(req.user.role);
    if (!isHRorAdmin) {
      if (req.user.role === 'MANAGER') {
        const deptIds = await getDeptEmployeeIds(req.user.department);
        const managerIds = await getAllIdsForId(req.user._id);
        const allDeptIds = [];
        for (const dId of deptIds) {
          const ids = await getAllIdsForId(dId);
          allDeptIds.push(...ids);
        }
        const uniqueDeptIds = [...new Set(allDeptIds)];

        filter.$or = [
          { employeeId: { $in: managerIds } },
          { employeeId: { $in: uniqueDeptIds } }
        ];
      } else {
        const myIds = await getAllIdsForId(req.user._id);
        filter.employeeId = { $in: myIds };
      }
    } else if (req.query.employeeId) {
      const allIds = await getAllIdsForId(req.query.employeeId);
      filter.employeeId = { $in: allIds };
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
      .populate('employeeId', 'name fullName email department role phone')
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
    if (!['ADMIN', 'HR', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE'].includes(req.user.role)) {
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

    let employee;
    if (leave.employeeModel === 'Employee') {
      employee = await Employee.findById(leave.employeeId);
    } else {
      const User = require('../users/user.model');
      employee = await User.findById(leave.employeeId);
    }

    if (!employee) {
      return fail(res, 404, 'EMPLOYEE_NOT_FOUND', 'Employee/User for this leave request not found');
    }

    // Role-based Approval Checks:
    // - Managers can only be reviewed by HR/Admin
    // - Executives can be reviewed by their department manager OR HR/Admin
    if (employee.role === 'MANAGER') {
      if (!['HR', 'ADMIN', 'HR_MANAGER'].includes(req.user.role)) {
        return fail(res, 403, 'FORBIDDEN', 'Access denied: Only HR Managers or Admins can review Manager leave requests', [], req);
      }
    } else {
      const isHRorAdmin = ['HR', 'ADMIN', 'HR_MANAGER', 'HR_EXECUTIVE'].includes(req.user.role);
      const isMyDeptManager = req.user.role === 'MANAGER' && req.user.department === employee.department;
      if (!isHRorAdmin && !isMyDeptManager) {
        return fail(res, 403, 'FORBIDDEN', 'Access denied: Only your department manager or HR/Admin can review this leave request', [], req);
      }
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
        remarks: hrRemarks || 'Rejected by reviewer'
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

    // Email notification trigger for approved leaves (both regular and extra)
    if (employee.email) {
      try {
        const userEmail = employee.email;
        const approverName = req.user.fullName || req.user.name || 'HR Manager';
        const subject = 'Your Leave Request Accepted // India Trade Overseas';
        const text = `Dear ${employee.fullName || employee.name},\n\nYour leave request from ${new Date(leave.fromDate).toLocaleDateString()} to ${new Date(leave.toDate).toLocaleDateString()} has been approved by ${approverName}.\n\nRemarks: ${hrRemarks || 'None'}\n\nBest Regards,\nHR Team`;
        const html = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 25px;">
              <span style="font-size: 10px; font-weight: bold; letter-spacing: 0.15em; color: #64748b; text-transform: uppercase;">India Trade Overseas // Operations</span>
              <h2 style="margin: 5px 0 0 0; color: #0d9488; font-size: 20px; font-weight: 600;">Leave Request Approved</h2>
            </div>
            
            <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">
              Dear <strong>${employee.fullName || employee.name}</strong>,
            </p>
            <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 20px;">
              Your leave request starting from <strong>${new Date(leave.fromDate).toLocaleDateString('en-IN')}</strong> to <strong>${new Date(leave.toDate).toLocaleDateString('en-IN')}</strong> has been reviewed and <strong style="color: #0d9488;">APPROVED</strong>.
            </p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 25px; font-size: 13px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 35%;">Leave Type:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right; text-transform: uppercase;">${leave.leaveType}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Duration:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">${leave.numberOfDays} Day(s)</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Approved By:</td>
                  <td style="padding: 6px 0; color: #0d9488; font-weight: bold; text-align: right;">${approverName}</td>
                </tr>
                ${hrRemarks ? `
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500; vertical-align: top;">Remarks:</td>
                  <td style="padding: 6px 0; color: #334155; text-align: right; font-style: italic;">"${hrRemarks}"</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
              Please ensure all pending finalizations are completed before your departure.
            </p>
          </div>
        `;
        await sendEmail(userEmail, subject, text, html);
      } catch (mailErr) {
        console.error('Failed to notify manager via email:', mailErr);
      }
    }

    return ok(res, { leave, balance }, 'Leave request approved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 6. Manual Reset of Monthly Balances
async function resetMonthlyBalances(req, res, next) {
  try {
    if (!['ADMIN', 'HR', 'HR_MANAGER'].includes(req.user.role)) {
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
    if (!['ADMIN', 'HR', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE'].includes(req.user.role)) {
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
    if (!['ADMIN', 'HR', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE'].includes(req.user.role)) {
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
    const balance = await getBalanceForUser(req.user, month);
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
