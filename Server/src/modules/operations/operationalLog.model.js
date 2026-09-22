const mongoose = require('mongoose');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.26A: Privacy-safe operational logging ledger
 *
 * DPR-required operational outcomes:
 * - Lead API success/failure
 * - Database write outcome
 * - CRM sync outcome
 * - Retry count
 * - Notification outcome
 * - Quotation generation outcome
 * - Tracking dispatch status where available
 *
 * Important:
 * - this collection is append-only;
 * - raw buyer phone/email/GST, passwords, payment credentials, API secrets,
 *   auth headers and provider access tokens do not belong here;
 * - the companion service sanitizes metadata before persistence.
 */

const OPERATIONAL_LOG_CATEGORIES = Object.freeze([
  'LEAD_API',
  'DATABASE_WRITE',
  'CRM_SYNC',
  'RETRY',
  'NOTIFICATION',
  'QUOTATION',
  'TRACKING',
]);

const OPERATIONAL_LOG_OUTCOMES = Object.freeze([
  'SUCCESS',
  'FAILURE',
  'PENDING',
  'RETRY_SCHEDULED',
  'MANUAL_RECOVERY',
  'SKIPPED',
]);

const OPERATIONAL_LOG_SEVERITIES = Object.freeze([
  'INFO',
  'WARN',
  'ERROR',
  'CRITICAL',
]);

function cleanText(value, maxLength = 1000) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

const operationalLogSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: OPERATIONAL_LOG_CATEGORIES,
      required: true,
      index: true,
    },

    operation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },

    outcome: {
      type: String,
      enum: OPERATIONAL_LOG_OUTCOMES,
      required: true,
      index: true,
    },

    severity: {
      type: String,
      enum: OPERATIONAL_LOG_SEVERITIES,
      default: 'INFO',
      index: true,
    },

    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },

    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
      index: true,
    },

    analyticsEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnalyticsEvent',
      default: null,
      index: true,
    },

    entityType: {
      type: String,
      default: '',
      trim: true,
      maxlength: 80,
      index: true,
    },

    entityId: {
      type: String,
      default: '',
      trim: true,
      maxlength: 160,
      index: true,
    },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    provider: {
      type: String,
      default: '',
      trim: true,
      maxlength: 120,
      index: true,
    },

    requestId: {
      type: String,
      default: '',
      trim: true,
      maxlength: 160,
      index: true,
    },

    correlationId: {
      type: String,
      default: '',
      trim: true,
      maxlength: 160,
      index: true,
    },

    idempotencyKey: {
      type: String,
      default: '',
      trim: true,
      maxlength: 220,
      index: true,
    },

    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    httpStatus: {
      type: Number,
      default: null,
      min: 100,
      max: 599,
    },

    durationMs: {
      type: Number,
      default: null,
      min: 0,
    },

    errorCode: {
      type: String,
      default: '',
      trim: true,
      maxlength: 160,
    },

    errorMessage: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    occurredAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: false,
    },
    versionKey: false,
    minimize: true,
  }
);

operationalLogSchema.pre(
  'validate',
  function normalizeOperationalLog(next) {
    this.operation = cleanText(
      this.operation,
      120
    ).toUpperCase();

    this.entityType = cleanText(
      this.entityType,
      80
    ).toUpperCase();

    this.entityId = cleanText(
      this.entityId,
      160
    );

    this.provider = cleanText(
      this.provider,
      120
    ).toUpperCase();

    this.requestId = cleanText(
      this.requestId,
      160
    );

    this.correlationId = cleanText(
      this.correlationId,
      160
    );

    this.idempotencyKey = cleanText(
      this.idempotencyKey,
      220
    );

    this.errorCode = cleanText(
      this.errorCode,
      160
    ).toUpperCase();

    this.errorMessage = cleanText(
      this.errorMessage,
      1000
    );

    if (
      this.retryCount === undefined ||
      this.retryCount === null ||
      !Number.isFinite(Number(this.retryCount)) ||
      Number(this.retryCount) < 0
    ) {
      this.retryCount = 0;
    } else {
      this.retryCount = Math.floor(
        Number(this.retryCount)
      );
    }

    if (
      this.durationMs !== undefined &&
      this.durationMs !== null
    ) {
      const duration = Number(
        this.durationMs
      );

      this.durationMs =
        Number.isFinite(duration) &&
        duration >= 0
          ? Math.round(duration)
          : null;
    }

    if (
      this.httpStatus !== undefined &&
      this.httpStatus !== null
    ) {
      const status = Number(
        this.httpStatus
      );

      this.httpStatus =
        Number.isInteger(status) &&
        status >= 100 &&
        status <= 599
          ? status
          : null;
    }

    next();
  }
);

function rejectMutation(next) {
  next(
    new Error(
      'Operational logs are append-only. Modification is prohibited.'
    )
  );
}

function rejectDeletion(next) {
  next(
    new Error(
      'Operational logs are append-only. Deletion is prohibited.'
    )
  );
}

operationalLogSchema.pre(
  'updateOne',
  rejectMutation
);

operationalLogSchema.pre(
  'updateMany',
  rejectMutation
);

operationalLogSchema.pre(
  'replaceOne',
  rejectMutation
);

operationalLogSchema.pre(
  'findOneAndUpdate',
  rejectMutation
);

operationalLogSchema.pre(
  'deleteOne',
  rejectDeletion
);

operationalLogSchema.pre(
  'deleteMany',
  rejectDeletion
);

operationalLogSchema.pre(
  'findOneAndDelete',
  rejectDeletion
);

operationalLogSchema.index({
  category: 1,
  outcome: 1,
  occurredAt: -1,
});

operationalLogSchema.index({
  leadId: 1,
  category: 1,
  occurredAt: -1,
});

operationalLogSchema.index({
  quotationId: 1,
  category: 1,
  occurredAt: -1,
});

operationalLogSchema.index({
  correlationId: 1,
  occurredAt: -1,
});

operationalLogSchema.index({
  requestId: 1,
  occurredAt: -1,
});

operationalLogSchema.index({
  severity: 1,
  outcome: 1,
  occurredAt: -1,
});

operationalLogSchema.statics.CATEGORIES =
  OPERATIONAL_LOG_CATEGORIES;

operationalLogSchema.statics.OUTCOMES =
  OPERATIONAL_LOG_OUTCOMES;

operationalLogSchema.statics.SEVERITIES =
  OPERATIONAL_LOG_SEVERITIES;

module.exports = mongoose.model(
  'OperationalLog',
  operationalLogSchema
);