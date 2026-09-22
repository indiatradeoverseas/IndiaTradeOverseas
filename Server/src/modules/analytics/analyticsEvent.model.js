const mongoose = require('mongoose');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 1: Persistent, privacy-safe commercial event ledger
 *
 * This collection is the first-party analytics system-of-record used to:
 * - persist canonical DPR events,
 * - link anonymous sessions/submissions to CRM leads,
 * - preserve acquisition attribution,
 * - support browser/server event deduplication,
 * - track downstream delivery/retry state without silent failure.
 *
 * Privacy rule:
 * Do not store raw phone numbers, WhatsApp numbers, email addresses,
 * customer names, OTPs, passwords, tokens, cookies, free-text customer
 * messages or full URLs in this collection.
 */

const CANONICAL_DPR_EVENTS = Object.freeze([
  'landing_page_view',
  'view_product',
  'start_requirement',
  'select_product',
  'select_quantity',
  'enter_destination',
  'select_timeline',
  'eligibility_checked',
  'view_soft_gate',
  'submit_phone',
  'lead_created',
  'qualification_completed',
  'qualified_lead',
  'quote_created',
  'quote_sent',
  'order_won',
  'purchase',
  'repeat_order',
]);

const deliverySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        'NOT_REQUIRED',
        'PENDING',
        'PROCESSING',
        'SENT',
        'FAILED',
        'SKIPPED',
      ],
      default: 'NOT_REQUIRED',
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Earliest time at which a FAILED/PENDING delivery may be claimed again.
     * This is the durable backoff clock used by the CAPI worker.
     */
    nextAttemptAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    lastError: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },

    responseCode: {
      type: String,
      default: '',
      trim: true,
      maxlength: 80,
    },
  },
  {
    _id: false,
  }
);

const analyticsEventSchema = new mongoose.Schema(
  {
    // ============================================================
    // EVENT IDENTITY / DEDUPLICATION
    // ============================================================

    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      minlength: 8,
      maxlength: 160,
    },

    eventName: {
      type: String,
      required: true,
      enum: CANONICAL_DPR_EVENTS,
      index: true,
      trim: true,
    },

    eventSource: {
      type: String,
      enum: ['WEB', 'SERVER', 'CRM', 'SYSTEM'],
      default: 'WEB',
      index: true,
    },

    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // ============================================================
    // FIRST-PARTY SESSION / BUSINESS LINKAGE
    // ============================================================

    analyticsSessionId: {
      type: String,
      default: '',
      trim: true,
      maxlength: 160,
      index: true,
    },

    submissionId: {
      type: String,
      default: '',
      trim: true,
      maxlength: 128,
      index: true,
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
      maxlength: 120,
      index: true,
    },

    // ============================================================
    // FIRST-PARTY ATTRIBUTION
    // ============================================================

    attribution: {
      utmSource: {
        type: String,
        default: '',
        trim: true,
        maxlength: 150,
      },

      utmMedium: {
        type: String,
        default: '',
        trim: true,
        maxlength: 150,
      },

      utmCampaign: {
        type: String,
        default: '',
        trim: true,
        maxlength: 200,
      },

      utmContent: {
        type: String,
        default: '',
        trim: true,
        maxlength: 200,
      },

      utmTerm: {
        type: String,
        default: '',
        trim: true,
        maxlength: 200,
      },

      gclid: {
        type: String,
        default: '',
        trim: true,
        maxlength: 250,
      },

      fbclid: {
        type: String,
        default: '',
        trim: true,
        maxlength: 250,
      },

      campaignId: {
        type: String,
        default: '',
        trim: true,
        maxlength: 150,
      },

      adSetId: {
        type: String,
        default: '',
        trim: true,
        maxlength: 150,
      },

      creativeId: { type: String, default: '', trim: true, maxlength: 150 },
      adId: {
        type: String,
        default: '',
        trim: true,
        maxlength: 150,
      },
    },

    // ============================================================
    // PRIVACY-SAFE PAGE / FUNNEL CONTEXT
    // ============================================================

    page: {
      path: {
        type: String,
        default: '',
        trim: true,
        maxlength: 250,
      },

      pageType: {
        type: String,
        default: '',
        trim: true,
        maxlength: 100,
      },

      landingPageType: {
        type: String,
        default: '',
        trim: true,
        maxlength: 100,
      },
    },

    // ============================================================
    // COMMERCIAL CONTEXT
    // ============================================================

    business: {
      vertical: {
        type: String,
        default: '',
        trim: true,
        maxlength: 100,
        index: true,
      },

      productCategory: {
        type: String,
        default: '',
        trim: true,
        maxlength: 100,
        index: true,
      },

      productCode: {
        type: String,
        default: '',
        trim: true,
        maxlength: 150,
      },

      quantityBand: {
        type: String,
        default: '',
        trim: true,
        maxlength: 100,
      },

      timelineBand: {
        type: String,
        default: '',
        trim: true,
        maxlength: 100,
      },

      eligibilityStatus: {
        type: String,
        default: '',
        trim: true,
        maxlength: 100,
      },

      leadPriority: {
        type: String,
        default: '',
        trim: true,
        maxlength: 50,
      },
    },

    // ============================================================
    // SERVER-SIDE DESTINATION DELIVERY / FAILURE VISIBILITY
    // ============================================================

    delivery: {
      metaCapi: {
        type: deliverySchema,
        default: () => ({}),
      },

      ga4Server: {
        type: deliverySchema,
        default: () => ({}),
      },
    },

    // ============================================================
    // PRIVACY-SAFE EXTENSION DATA
    // ============================================================

    properties: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    schemaVersion: {
      type: String,
      default: 'MASTER_DPR_V4_PHASE_1',
      trim: true,
      maxlength: 80,
    },
  },
  {
    timestamps: true,
    minimize: true,
  }
);

// ============================================================
// REPORTING / RECONCILIATION INDEXES
// ============================================================

analyticsEventSchema.index({
  analyticsSessionId: 1,
  occurredAt: 1,
});

analyticsEventSchema.index({
  submissionId: 1,
  occurredAt: 1,
});

analyticsEventSchema.index({
  leadId: 1,
  occurredAt: 1,
});

analyticsEventSchema.index({
  eventName: 1,
  occurredAt: -1,
});

analyticsEventSchema.index({
  'attribution.utmSource': 1,
  'attribution.utmMedium': 1,
  'attribution.utmCampaign': 1,
  occurredAt: -1,
});

/**
 * Worker queue index.
 * nextAttemptAt prevents a failed CAPI event from being reclaimed immediately
 * and exhausting every retry in one worker pass.
 */
analyticsEventSchema.index({
  'delivery.metaCapi.status': 1,
  'delivery.metaCapi.nextAttemptAt': 1,
  'delivery.metaCapi.attempts': 1,
  occurredAt: 1,
});

analyticsEventSchema.index({
  'business.vertical': 1,
  eventName: 1,
  occurredAt: -1,
});

analyticsEventSchema.statics.CANONICAL_DPR_EVENTS =
  CANONICAL_DPR_EVENTS;

module.exports = mongoose.model(
  'AnalyticsEvent',
  analyticsEventSchema
);