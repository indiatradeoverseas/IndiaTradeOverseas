const mongoose = require('mongoose');

const leaveAuditLogSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Employee',
      required: true,
      index: true
    },
    leaveRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveRequest',
      default: null
    },
    action: {
      type: String,
      enum: ['REGULAR_APPROVED', 'EXTRA_APPROVED', 'REJECTED', 'AUTO_RESET', 'HR_OVERRIDE'],
      required: true
    },
    previousBalance: {
      type: Number,
      default: 0
    },
    newBalance: {
      type: Number,
      default: 0
    },
    extraLeavesAdded: {
      type: Number,
      default: 0
    },
    reason: {
      type: String,
      default: ''
    },
    performedBy: {
      type: String, // Can be "SYSTEM" or ref to HR User name
      required: true
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    remarks: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('LeaveAuditLog', leaveAuditLogSchema);
