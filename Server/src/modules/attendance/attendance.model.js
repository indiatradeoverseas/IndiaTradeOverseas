const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Employee',
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'HOLIDAY', 'WEEKEND'],
      required: true,
      default: 'PRESENT'
    },
    checkInTime: {
      type: String,
      default: null
    },
    checkInAt: {
      type: Date,
      default: null
    },
    checkOutTime: {
      type: String,
      default: null
    },
    checkOutAt: {
      type: Date,
      default: null
    },
    workingHours: {
      type: Number,
      default: 0
    },
    lunchStartAt: {
      type: Date,
      default: null
    },
    lunchEndAt: {
      type: Date,
      default: null
    },
    lunchDurationMinutes: {
      type: Number,
      default: 0
    },
    overtimeHours: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: [employeeId, date]
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
