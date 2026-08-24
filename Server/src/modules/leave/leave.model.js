const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.Mixed,
      refPath: 'employeeModel',
      required: true,
      index: true
    },
    employeeModel: {
      type: String,
      required: true,
      enum: ['Employee', 'User'],
      default: 'Employee'
    },
    fromDate: {
      type: Date,
      required: true
    },
    toDate: {
      type: Date,
      required: true
    },
    numberOfDays: {
      type: Number,
      required: true
    },
    leaveType: {
      type: String,
      enum: ['PAID', 'SICK', 'CASUAL', 'UNPAID', 'EXTRA', 'HR_DISCRETIONARY'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'PENDING_HR_APPROVAL', 'HR_APPROVED_EXTRA'],
      default: 'PENDING',
      index: true
    },
    reason: {
      type: String,
      required: true
    },
    appliedOn: {
      type: Date,
      default: Date.now
    },
    approvedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      default: null
    },
    approvedOn: {
      type: Date,
      default: null
    },
    month: {
      type: String, // YYYY-MM
      required: true,
      index: true
    },
    // Extra leave fields
    isExtraLeave: {
      type: Boolean,
      default: false
    },
    extraLeaveReason: {
      type: String,
      default: ''
    },
    extraApprovedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      default: null
    },
    extraApprovedOn: {
      type: Date,
      default: null
    },
    hrRemarks: {
      type: String,
      default: ''
    },
    overrideBy: {
      type: String,
      enum: ['SYSTEM', 'HR_MANAGER', 'NONE'],
      default: 'NONE'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
// Also export as 'Leave' to prevent crash in any old imported references (acting as alias)
try {
  mongoose.model('Leave', leaveRequestSchema);
} catch (e) {
  // Already registered
}
