const mongoose = require('mongoose');

const employeeStatusSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ['ON_CALL', 'FOLLOWING_UP', 'CONVERTING', 'PAYMENT', 'IDLE', 'OFFLINE'],
      default: 'OFFLINE'
    },
    currentActivity: {
      type: String,
      default: ''
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    duration: {
      type: String,
      default: '00:00:00'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('EmployeeStatus', employeeStatusSchema);
