const mongoose = require('mongoose');

const subActivityLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    actionType: { type: String, required: true },
    details: { type: String, default: '' }
  },
  { _id: false }
);

const employeeActivitySchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.Mixed, ref: 'User', required: true, index: true },
    department: { type: String, default: 'SALES', index: true },
    role: { type: String, default: 'EMPLOYEE' },
    date: { type: String, required: true, index: true }, // Format YYYY-MM-DD
    firstLoginAt: { type: Date, default: Date.now },
    lastLogoutAt: { type: Date, default: null },
    lastActiveAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['ACTIVE', 'IDLE', 'OFFLINE'],
      default: 'ACTIVE',
      index: true
    },
    activeMinutes: { type: Number, default: 0 },
    inactiveMinutes: { type: Number, default: 0 },
    lunchStartAt: { type: Date, default: null },
    lunchEndAt: { type: Date, default: null },
    lunchDurationMinutes: { type: Number, default: 0 },
    // Sales metrics
    callsLoggedCount: { type: Number, default: 0 },
    leadsUpdatedCount: { type: Number, default: 0 },
    followupsCompletedCount: { type: Number, default: 0 },
    notesEnteredCount: { type: Number, default: 0 },
    recordingsUploadedCount: { type: Number, default: 0 },
    statusChangesCount: { type: Number, default: 0 },

    // HR metrics
    ticketsResolvedCount: { type: Number, default: 0 },
    onboardingTasksCount: { type: Number, default: 0 },
    leaveApprovalsCount: { type: Number, default: 0 },
    employeeStatusChangesCount: { type: Number, default: 0 },

    // Transport metrics
    tripsAssignedCount: { type: Number, default: 0 },
    podsUploadedCount: { type: Number, default: 0 },
    dispatchUpdatesCount: { type: Number, default: 0 },
    driverLogsCount: { type: Number, default: 0 },
    freightDocsCount: { type: Number, default: 0 },

    totalCrmActions: { type: Number, default: 0 },
    productivityScore: { type: Number, default: 100 },
    activityLogs: { type: [subActivityLogSchema], default: [] }
  },
  { timestamps: true }
);

employeeActivitySchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('EmployeeActivity', employeeActivitySchema);
