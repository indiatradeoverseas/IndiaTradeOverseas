const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    department: { type: String, default: 'SALES', index: true },
    actionCategory: {
      type: String,
      enum: [
        'CALL_LOGGED',
        'LEAD_UPDATED',
        'FOLLOWUP_COMPLETED',
        'NOTE_ADDED',
        'RECORDING_UPLOADED',
        'LEAD_STATUS_CHANGED',
        'CRM_INTERACTION',
        'LOGIN',
        'LOGOUT',
        'TICKET_RESOLVED',
        'ONBOARDING_TASK_COMPLETED',
        'APPRAISAL_REVIEW_COMPLETED',
        'LEAVE_APPROVED',
        'EMPLOYEE_STATUS_CHANGED',
        'TRIP_ASSIGNED',
        'TRIP_COMPLETED',
        'POD_UPLOADED',
        'DISPATCH_STATUS_UPDATED',
        'DRIVER_ISSUE_LOGGED',
        'FREIGHT_DOC_GENERATED'
      ],
      required: true
    },
    details: { type: String, default: '' },
    metadata: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now, index: true }
  },
  { versionKey: false }
);

activityLogSchema.index({ userId: 1, actionCategory: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
