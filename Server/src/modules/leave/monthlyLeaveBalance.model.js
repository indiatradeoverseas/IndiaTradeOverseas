const mongoose = require('mongoose');

const monthlyLeaveBalanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
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
    month: {
      type: String, // YYYY-MM
      required: true,
      index: true
    },
    totalLeaves: {
      type: Number,
      default: 4
    },
    usedLeaves: {
      type: Number,
      default: 0
    },
    remainingLeaves: {
      type: Number,
      default: 4
    },
    extraLeavesUsed: {
      type: Number,
      default: 0
    },
    totalLeavesUsed: {
      type: Number,
      default: 0
    },
    isReset: {
      type: Boolean,
      default: false
    },
    resetDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: [employeeId, month]
monthlyLeaveBalanceSchema.index({ employeeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyLeaveBalance', monthlyLeaveBalanceSchema);
