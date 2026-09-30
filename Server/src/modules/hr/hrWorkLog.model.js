const mongoose = require('mongoose');

const hrWorkLogSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    employeeName: {
      type: String,
      required: true
    },
    employeeRole: {
      type: String,
      default: 'HR_MANAGER'
    },
    department: {
      type: String,
      default: 'HR'
    },
    numberOfCalls: {
      type: Number,
      default: 0
    },
    callDuration: {
      type: String,
      default: ''
    },
    numberOfHiring: {
      type: Number,
      default: 0
    },
    workSummary: {
      type: String,
      default: ''
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('HrWorkLog', hrWorkLogSchema);
