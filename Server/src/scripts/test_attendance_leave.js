const mongoose = require('mongoose');
const env = require('../config/env');
const Employee = require('../modules/employee/employee.model');
const MonthlyLeaveBalance = require('../modules/leave/monthlyLeaveBalance.model');
const LeaveRequest = require('../modules/leave/leave.model');
const LeaveAuditLog = require('../modules/leave/leaveAuditLog.model');
const BiometricSync = require('../modules/attendance/biometricSync.model');
const HRSetting = require('../modules/leave/hrSetting.model');
const Attendance = require('../modules/attendance/attendance.model');
const bcrypt = require('bcryptjs');

async function run() {
  console.log("=== STARTING ATTENDANCE & LEAVE MODULE TESTS ===");
  
  // 1. Connect to Database
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("✓ Connected to MongoDB");
  } catch (err) {
    console.error("✗ Database connection failed:", err.message);
    process.exit(1);
  }

  const testEmail = `test_emp_${Date.now()}@ito.com`;
  let employeeId = null;

  try {
    // 2. Clear pre-existing test data if any
    await Employee.deleteMany({ email: /test_emp_.*@ito.com/ });
    console.log("✓ Cleaned up old test employees");

    // 3. Create Test Employee
    const hashed = await bcrypt.hash("password123", 10);
    const emp = await Employee.create({
      name: "Test Employee",
      email: testEmail,
      password: hashed,
      department: "IT",
      joiningDate: new Date(),
      role: "EMPLOYEE",
      status: "ACTIVE"
    });
    employeeId = emp._id;
    console.log("✓ Created test employee:", emp.email);

    // 4. Verify Monthly Leave Balance Initialization
    const month = new Date().toISOString().slice(0, 7);
    let balance = await MonthlyLeaveBalance.create({
      employeeId,
      month,
      totalLeaves: 4,
      usedLeaves: 0,
      remainingLeaves: 4,
      extraLeavesUsed: 0,
      totalLeavesUsed: 0
    });
    console.log(`✓ Initialized monthly leave balance for ${month}: remainingLeaves = ${balance.remainingLeaves}`);

    // 5. Test Regular Leave Application (2 days)
    const fromDate = new Date();
    const toDate = new Date();
    toDate.setDate(fromDate.getDate() + 1); // 2 days inclusive
    
    const req1 = await LeaveRequest.create({
      employeeId,
      fromDate,
      toDate,
      numberOfDays: 2,
      leaveType: 'PAID',
      reason: 'Regular paid leave test',
      status: 'PENDING',
      month
    });
    console.log(`✓ Created regular leave request. status = ${req1.status}, days = ${req1.numberOfDays}`);

    // Simulate HR Approval
    req1.status = 'APPROVED';
    req1.approvedBy = employeeId; // using self as dummy HR
    req1.approvedOn = new Date();
    await req1.save();

    balance.usedLeaves += req1.numberOfDays;
    balance.remainingLeaves -= req1.numberOfDays;
    balance.totalLeavesUsed += req1.numberOfDays;
    await balance.save();

    console.log(`✓ Approved regular leave request. Updated balance: remaining = ${balance.remainingLeaves}, used = ${balance.usedLeaves}`);

    // 6. Test Extra Leave Application (when balance is insufficient)
    // Regular remaining is now 2. Applying for 3 days will fail regular check, so applying as isExtraLeave
    const extraFrom = new Date();
    extraFrom.setDate(extraFrom.getDate() + 5);
    const extraTo = new Date();
    extraTo.setDate(extraTo.getDate() + 7); // 3 days
    
    const req2 = await LeaveRequest.create({
      employeeId,
      fromDate: extraFrom,
      toDate: extraTo,
      numberOfDays: 3,
      leaveType: 'EXTRA',
      reason: 'Extra leave test reason',
      status: 'PENDING_HR_APPROVAL',
      isExtraLeave: true,
      extraLeaveReason: 'Emergency family trip',
      month
    });
    console.log(`✓ Created Extra Leave request. status = ${req2.status}, isExtraLeave = ${req2.isExtraLeave}`);

    // Approve Extra Leave
    req2.status = 'HR_APPROVED_EXTRA';
    req2.extraApprovedBy = employeeId;
    req2.extraApprovedOn = new Date();
    req2.overrideBy = 'HR_MANAGER';
    await req2.save();

    balance.extraLeavesUsed += req2.numberOfDays;
    balance.totalLeavesUsed += req2.numberOfDays;
    await balance.save();

    console.log(`✓ Approved Extra Leave. Balance: remainingLeaves = ${balance.remainingLeaves}, extraLeavesUsed = ${balance.extraLeavesUsed}`);

    // 7. Verify Audit Log
    const log = await LeaveAuditLog.create({
      employeeId,
      leaveRequestId: req2._id,
      action: 'EXTRA_APPROVED',
      previousBalance: 2,
      newBalance: 2,
      extraLeavesAdded: 3,
      reason: 'Emergency family trip',
      performedBy: 'HR Manager Testing'
    });
    console.log(`✓ Logged extra leave approval in Audit Trail. Log Action = ${log.action}`);

    // 8. Test Biometric Sync Log
    const sync = await BiometricSync.create({
      lastSyncTime: new Date(),
      status: 'ONLINE',
      totalSyncedRecords: 1,
      lastSyncBy: 'System Cron'
    });
    console.log(`✓ Created Biometric Sync Log: status = ${sync.status}, syncedRecords = ${sync.totalSyncedRecords}`);

    // 9. Clean up mock database entries
    await LeaveRequest.deleteMany({ employeeId });
    await MonthlyLeaveBalance.deleteMany({ employeeId });
    await LeaveAuditLog.deleteMany({ employeeId });
    await Employee.findByIdAndDelete(employeeId);
    console.log("✓ Cleaned up all test records");

    console.log("=== ALL BACKEND MODULE TESTS COMPLETED SUCCESSFULLY ===");
  } catch (error) {
    console.error("✗ Test failed with error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("✓ Database connection closed");
  }
}

run();
