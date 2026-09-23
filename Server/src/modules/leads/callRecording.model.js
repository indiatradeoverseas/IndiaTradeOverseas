const mongoose = require('mongoose');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.22A: Call-recording priority alignment
 *
 * DPR classification:
 * - HOT
 * - WARM
 * - NURTURE
 * - LOW
 *
 * Legacy compatibility:
 * Older records/controllers may still provide COLD. New writes normalize
 * COLD -> LOW so no new legacy classification is persisted.
 */

const CALL_RECORDING_PRIORITIES = Object.freeze([
  'HOT',
  'WARM',
  'NURTURE',
  'LOW',
]);

const CALL_RECORDING_STATUSES = Object.freeze([
  'PENDING',
  'COMPLETED',
]);

function normalizePriorityForStorage(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return value;
  }

  const normalized = String(value)
    .trim()
    .toUpperCase();

  if (normalized === 'COLD' || normalized === 'DEAD') {
    return 'LOW';
  }

  // If the value is not in the allowed enum, fallback to WARM
  if (!CALL_RECORDING_PRIORITIES.includes(normalized)) {
    return 'WARM';
  }

  return normalized;
}

const callRecordingSchema = new mongoose.Schema(
  {
    executiveId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },

    executiveName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },

    leadCode: {
      type: String,
      default: '',
      trim: true,
      maxlength: 150,
      index: true,
    },

    customerName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },

    /**
     * Phase 2.21 writes only a masked phone representation here.
     *
     * Historical rows may contain older values, therefore the field name is
     * retained for backward compatibility instead of performing a destructive
     * schema rename during the DPR implementation.
     */
    mobileNumber: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },

    contactRole: {
      type: String,
      default: 'Customer',
      trim: true,
      maxlength: 120,
    },

    material: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },

    quantity: {
      type: String,
      default: '',
      trim: true,
      maxlength: 150,
    },

    location: {
      type: String,
      default: '',
      trim: true,
      maxlength: 250,
    },

    serialNo: {
      type: String,
      default: '',
      trim: true,
      maxlength: 150,
    },

    audioPath: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    originalName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },

    mimeType: {
      type: String,
      default: 'audio/mpeg',
      trim: true,
      maxlength: 150,
    },

    size: {
      type: Number,
      default: 0,
      min: 0,
    },

    duration: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },

    notes: {
      type: String,
      default: '',
      maxlength: 5000,
    },

    leadPriority: {
      type: String,
      enum: CALL_RECORDING_PRIORITIES,
      default: 'WARM',
      set: normalizePriorityForStorage,
      index: true,
    },

    managerRemark: {
      type: String,
      default: '',
      maxlength: 5000,
    },

    managerRemarkBy: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },

    managerRemarkAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: CALL_RECORDING_STATUSES,
      default: 'PENDING',
      index: true,
    },

    completedBy: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    driveFileId: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },

    driveWebViewLink: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },

    driveWebContentLink: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);


/* ============================================================
   LEGACY PRIORITY NORMALIZATION
============================================================ */

/**
 * Defensive compatibility for any legacy document/controller that still
 * assigns COLD before validation.
 *
 * No new CallRecording should persist COLD.
 */
callRecordingSchema.pre(
  'validate',
  function normalizeLegacyPriority(next) {
    if (
      this.leadPriority === 'COLD' ||
      this.leadPriority === 'DEAD'
    ) {
      this.leadPriority = 'LOW';
    }

    // Fallback: if priority is not in the allowed enum, default to WARM
    if (
      this.leadPriority &&
      !CALL_RECORDING_PRIORITIES.includes(this.leadPriority)
    ) {
      this.leadPriority = 'WARM';
    }

    next();
  }
);


/* ============================================================
   INDEXES
============================================================ */

callRecordingSchema.index({
  executiveId: 1,
  createdAt: -1,
});

callRecordingSchema.index({
  leadId: 1,
  createdAt: -1,
});

callRecordingSchema.index({
  leadPriority: 1,
  status: 1,
  createdAt: -1,
});


/* ============================================================
   MODEL DICTIONARIES
============================================================ */

callRecordingSchema.statics.PRIORITIES =
  CALL_RECORDING_PRIORITIES;

callRecordingSchema.statics.STATUSES =
  CALL_RECORDING_STATUSES;

callRecordingSchema.statics.normalizePriority =
  normalizePriorityForStorage;


module.exports = mongoose.model(
  'CallRecording',
  callRecordingSchema
);