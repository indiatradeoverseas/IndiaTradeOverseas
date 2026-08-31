const mongoose = require('mongoose');

const dailyWorkLogSchema = new mongoose.Schema(
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
    department: {
      type: String,
      default: 'SALES'
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    },
    numberOfCalls: {
      type: Number,
      default: 0
    },
    numberOfConversions: {
      type: Number,
      default: 0
    },
    numberOfSales: {
      type: Number,
      default: 0
    },
    note: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DailyWorkLog', dailyWorkLogSchema);
