const mongoose = require("mongoose");

const {
  CRM_STATUSES,
  LOST_REASONS,
} = require("./lead.constants");

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.2: Lead / Opportunity persistence model
 *
 * Master DPR principles implemented here:
 * - ITO database remains the durable source of truth.
 * - Every opportunity has an immutable internal Lead ID / leadCode.
 * - A resolved Contact can have multiple Lead opportunities.
 * - Canonical CRM lifecycle is stored separately from the richer legacy stage.
 * - CRM synchronization / notification delivery have durable retry state.
 * - Lost reasons use the fixed DPR dictionary.
 * - Attribution, ownership, commercial and response-time fields are retained.
 * - Existing application fields are preserved for compatibility.
 */

const CRM_DELIVERY_STATUS = Object.freeze([
  "NOT_REQUIRED",
  "PENDING",
  "PROCESSING",
  "SYNCED",
  "FAILED",
  "MANUAL_RECOVERY",
]);

const NOTIFICATION_DELIVERY_STATUS = Object.freeze([
  "NOT_REQUIRED",
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
  "MANUAL_RECOVERY",
]);

const CONTACT_RESOLUTION_STATUS = Object.freeze([
  "UNRESOLVED",
  "MATCHED",
  "CREATED",
  "AMBIGUOUS",
]);

const CONTACT_RESOLUTION_METHOD = Object.freeze([
  "NONE",
  "PHONE",
  "EMAIL",
  "PHONE_AND_EMAIL",
]);

const crmSyncSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: CRM_DELIVERY_STATUS,
      default: "PENDING",
      index: true,
    },

    externalCrmId: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    nextAttemptAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    syncedAt: {
      type: Date,
      default: null,
    },

    lastError: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    manualRecoveryRequired: {
      type: Boolean,
      default: false,
      index: true,
    },

    manualRecoveryReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  {
    _id: false,
  }
);

const notificationStateSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: NOTIFICATION_DELIVERY_STATUS,
      default: "NOT_REQUIRED",
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    nextAttemptAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    lastError: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  {
    _id: false,
  }
);

const requirementDetailsSchema = new mongoose.Schema(
  {
    /**
     * Form/intake context is stored separately from the generic Lead fields so
     * CRM can show category-specific buyer requirements without reading
     * arbitrary legacy payload blobs.
     */
    captureMode: {
      type: String,
      enum: [
        "",
        "QUICK",
        "REQUIREMENT_BUILDER",
        "COMMERCIAL_ENQUIRY",
        "QUOTE_REQUEST",
        "REPEAT_ORDER",
      ],
      default: "",
      index: true,
    },

    sourcePreference: {
      type: String,
      default: "",
      trim: true,
      maxlength: 250,
    },

    packaging: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    tradeType: {
      type: String,
      enum: ["", "DOMESTIC", "EXPORT"],
      default: "",
      index: true,
    },

    incoterm: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    qualityRequirement: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    privateLabelRequirement: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    businessCategory: {
      type: String,
      default: "",
      trim: true,
      maxlength: 250,
    },

    objective: {
      type: String,
      default: "",
      trim: true,
      maxlength: 250,
    },

    /**
     * Keep ad budget as buyer-supplied text at intake time.
     * Do not manufacture currency conversion or treat it as actual ad spend.
     */
    monthlyAdBudget: {
      type: String,
      default: "",
      trim: true,
      maxlength: 250,
    },

    budgetCurrency: {
      type: String,
      default: "",
      trim: true,
      maxlength: 20,
    },

    marketingStatus: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    paymentTerms: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    documentationRequirement: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    buyerType: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
  },
  {
    _id: false,
  }
);

const leadSchema = new mongoose.Schema(
  {
    // ============================================================
    // MASTER DPR v4.0 — LEAD / OPPORTUNITY IDENTITY
    // ============================================================

    leadCode: {
      type: String,
      unique: true,
      required: true,
      index: true,
      trim: true,
    },

    // Idempotency key for public website submission retries.
    submissionId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },

    /**
     * A Lead document represents one commercial opportunity.
     * contactId resolves the person/company identity independently so the
     * same contact may own multiple opportunities across Stone/Rice/Tea etc.
     */
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      default: null,
      index: true,
    },

    contactResolution: {
      status: {
        type: String,
        enum: CONTACT_RESOLUTION_STATUS,
        default: "UNRESOLVED",
        index: true,
      },

      method: {
        type: String,
        enum: CONTACT_RESOLUTION_METHOD,
        default: "NONE",
      },

      resolvedAt: {
        type: Date,
        default: null,
      },
    },

    // ============================================================
    // LEAD SOURCE
    // ============================================================

    // Phase 4: keep Meta Instant Form distinct from WEBSITE so the
    // two DPR acquisition paths can be compared without corrupting source data.
    source: {
      type: String,
      enum: [
        "WEBSITE",
        "META_INSTANT_FORM",
        "AI_AGENT",
        "WHATSAPP",
        "INDIAMART",
        "MANUAL",
        "IMPORT",
        "CONTACT_FORM",
        "CALL_RECORDING",
        "LANDING_PAGE",
        "DIRECT",
        "EMAIL",
        "PHONE",
        "OTHER",
        "META",
        "FACEBOOK",
        "INSTAGRAM",
        "GOOGLE",
        "REFERRAL",
        "EXHIBITION",
        "FORM",
        "CHAT",
        "WEB"
      ],
      default: "WEBSITE",
      index: true,
    },

    leadOrigin: {
      type: String,
      enum: [
        "GENERAL_ENQUIRY",
        "COMMERCIAL_ENQUIRY",
        "QUICK_ENQUIRY",
        "META_INSTANT_FORM",
        "SOFT_GATE",
        "REQUIREMENT_BUILDER",
        "QUOTE_REQUEST",
        "REPEAT_ORDER",
        "AI_AGENT",
        "MANUAL",
        "IMPORT",
      ],
      default: "GENERAL_ENQUIRY",
      index: true,
    },

    // ============================================================
    // CONTACT SNAPSHOT
    // ============================================================

    customerName: {
      type: String,
      default: "",
      trim: true,
    },

    companyName: {
      type: String,
      default: "",
      trim: true,
    },

    companyNameHash: {
      type: String,
      default: "",
      index: true,
    },

    phoneEncrypted: {
      type: String,
      required: true,
    },

    phoneMasked: {
      type: String,
      required: true,
    },

    phoneHash: {
      type: String,
      required: true,
      index: true,
    },

    emailEncrypted: {
      type: String,
      default: "",
    },

    emailMasked: {
      type: String,
      default: "",
    },

    emailHash: {
      type: String,
      default: "",
      index: true,
    },

    // GST is optional and protected when supplied.
    gstEncrypted: {
      type: String,
      default: "",
    },

    gstMasked: {
      type: String,
      default: "",
    },

    gstHash: {
      type: String,
      default: "",
      index: true,
    },

    /**
     * A buyer may provide a WhatsApp number that differs from the primary
     * phone. New public flows persist that value only in protected form.
     */
    whatsAppEncrypted: {
      type: String,
      default: "",
    },

    whatsAppMasked: {
      type: String,
      default: "",
    },

    whatsAppHash: {
      type: String,
      default: "",
      index: true,
    },

    // Legacy compatibility field for existing records/UI only. New public
    // flows must not place plaintext phone/WhatsApp numbers here.
    whatsAppNumber: {
      type: String,
      default: "",
    },

    contactPerson: {
      type: String,
      default: "",
      trim: true,
    },

    country: {
      type: String,
      default: "",
      trim: true,
    },

    // ============================================================
    // REQUIREMENT / OPPORTUNITY
    // ============================================================

    productCategory: {
      type: String,
      required: true,
      index: true,
    },

    product: {
      type: String,
      default: "",
      trim: true,
    },

    productVariant: {
      type: String,
      default: "",
      trim: true,
    },

    grade: {
      type: String,
      default: "",
      trim: true,
    },

    specification: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    quantity: {
      type: String,
      default: "",
    },

    quantityValue: {
      type: Number,
      default: 0,
    },

    quantityUnit: {
      type: String,
      default: "MT",
      trim: true,
    },

    quantityBand: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    destination: {
      type: String,
      default: "",
      trim: true,
    },

    timeline: {
      type: String,
      default: "",
      trim: true,
    },

    /**
     * Product/form-specific qualification fields from Master DPR dynamic
     * forms. Generic requirement fields above remain the canonical CRM
     * summary; this subdocument preserves the additional buyer inputs.
     */
    requirementDetails: {
      type: requirementDetailsSchema,
      default: () => ({}),
    },

    targetDate: {
      type: Date,
      default: null,
    },

    // ============================================================
    // MASTER DPR v4.0 — ELIGIBILITY
    // ============================================================

    eligibilityStatus: {
      type: String,
      enum: [
        "NOT_CHECKED",
        "ELIGIBLE",
        "REVIEW_REQUIRED",
        "NOT_ELIGIBLE",
      ],
      default: "NOT_CHECKED",
      index: true,
    },

    eligibilityReason: {
      type: String,
      default: "",
      trim: true,
    },

    // ============================================================
    // MASTER DPR v4.0 — CONSENT
    // ============================================================

    consent: {
      contactAllowed: {
        type: Boolean,
        default: false,
      },

      marketingAllowed: {
        type: Boolean,
        default: false,
      },

      privacyVersion: {
        type: String,
        default: "",
        trim: true,
      },

      analyticsAllowed: {
        type: Boolean,
        default: false,
      },

      advertisingAllowed: {
        type: Boolean,
        default: false,
      },

      trackingConsentCapturedAt: {
        type: Date,
        default: null,
      },

      capturedAt: {
        type: Date,
        default: null,
      },
    },

    // ============================================================
    // MASTER DPR v4.0 — FIRST-PARTY ATTRIBUTION
    // ============================================================

    attribution: {
      utmSource: {
        type: String,
        default: "",
        trim: true,
      },

      utmMedium: {
        type: String,
        default: "",
        trim: true,
      },

      utmCampaign: {
        type: String,
        default: "",
        trim: true,
      },

      utmContent: {
        type: String,
        default: "",
        trim: true,
      },

      utmTerm: {
        type: String,
        default: "",
        trim: true,
      },

      gclid: {
        type: String,
        default: "",
        trim: true,
      },

      fbclid: {
        type: String,
        default: "",
        trim: true,
      },

      campaignId: {
        type: String,
        default: "",
        trim: true,
      },

      adSetId: {
        type: String,
        default: "",
        trim: true,
      },

      adId: {
        type: String,
        default: "",
        trim: true,
      },

      creativeId: {
        type: String,
        default: "",
        trim: true,
      },

      creative: {
        type: String,
        default: "",
        trim: true,
      },

      landingPage: {
        type: String,
        default: "",
        trim: true,
      },

      landingPageType: {
        type: String,
        default: "",
        trim: true,
      },

      analyticsSessionId: {
        type: String,
        default: "",
        trim: true,
        index: true,
      },
    },

    // ============================================================
    // MASTER DPR v4.0 — QUALIFICATION / CRM LIFECYCLE
    // ============================================================

    /**
     * Canonical DPR score classification:
     * HOT / WARM / NURTURE / LOW.
     *
     * COLD / FAKE / INCOMPLETE remain temporarily valid for backward
     * compatibility with existing CRM records and UI.
     */
    priority: {
      type: String,
      enum: [
        "HOT",
        "WARM",
        "NURTURE",
        "LOW",
        "COLD",
        "DEAD",
        "FAKE",
        "INCOMPLETE",
      ],
      default: "WARM",
      index: true,
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Exact Master DPR management lifecycle.
     * This is intentionally separate from the richer operational stage below.
     */
    crmStatus: {
      type: String,
      enum: CRM_STATUSES,
      default: "NEW",
      required: true,
      index: true,
    },

    crmStatusChangedAt: {
      type: Date,
      default: Date.now,
    },

    crmStatusChangedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Existing detailed operational pipeline retained for compatibility.
    stage: {
      type: String,
      enum: [
        "NEW_LEAD",
        "ASSIGNED",
        "CONTACT_ATTEMPTED",
        "CONTACTED",
        "LEAD_QUALIFICATION",
        "FOLLOW_UP",
        "REQUIREMENT_CAPTURED",
        "QUOTATION_REQUIRED",
        "QUOTATION_PENDING_APPROVAL",
        "QUOTATION_APPROVED",
        "QUOTATION_REQUESTED",
        "QUOTATION_SHARED",
        "NEGOTIATION",
        "LOI_PO_PENDING",
        "ORDER_CONFIRMED",
        "DISPATCH_PENDING",
        "DISPATCH_PLANNED",
        "PAYMENT_PENDING",
        "DOCUMENT_PENDING",
        "CLOSED_WON",
        "CLOSED_LOST",
        "DELIVERED",
        "COMPLETED",
        "REQUIREMENT_RECEIVED",
        "QUOTATION_SENT",
        "SAMPLE_SENT",
        "PRICE_DISCUSSION",
        "PAYMENT_DISCUSSION",
        "PO_RECEIVED",
        "DEAL_WON",
        "DEAL_LOST",
        "WON",
        "LOST",
      ],
      default: "NEW_LEAD",
      index: true,
    },

    stageChangedAt: {
      type: Date,
      default: Date.now,
    },

    stageChangedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ============================================================
    // MASTER DPR v4.0 — OWNERSHIP
    // ============================================================

    assignedTo: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    assignedByName: {
      type: String,
      default: "",
    },

    assignedDepartment: {
      type: String,
      enum: [
        "STONE",
        "COAL",
        "TEA",
        "RICE",
        "TRANSPORT",
        "ADMIN",
        "IT",
        "PROCUREMENT",
        "ACCOUNTS",
        "HR",
        "SALES",
      ],
      default: null,
    },

    territory: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    assignedTeam: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    assignedAt: {
      type: Date,
      default: null,
    },

    assignmentSource: {
      type: String,
      enum: [
        "UNASSIGNED",
        "AUTO_ROUTING",
        "MANUAL",
        "IMPORT",
        "SYSTEM_RECOVERY",
      ],
      default: "UNASSIGNED",
    },

    assignmentReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    // ============================================================
    // MASTER DPR v4.0 — ACTIVITY / SLA FIELDS
    // ============================================================

    firstResponseAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastContactAt: {
      type: Date,
      default: null,
      index: true,
    },

    nextFollowupAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastCallOutcome: {
      type: String,
      enum: ["", "CONNECTED", "BUSY", "NO_ANSWER", "SWITCHED_OFF", "CALL_BACK", "WRONG_NUMBER"],
      default: "",
      index: true,
    },

    lastCallAt: {
      type: Date,
      default: null,
    },

    lastCallBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    lastCallByName: {
      type: String,
      default: "",
    },

    callCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ============================================================
    // MASTER DPR v4.0 — COMMERCIAL FIELDS
    // ============================================================

    customerAccountId: {
      type: String,
      default: "",
      index: true,
    },

    customerAccountType: {
      type: String,
      enum: ["", "USER", "DISTRIBUTOR"],
      default: "",
    },

    customerAccountEvidence: {
      reference: String,
      verifiedAt: Date,
      verifiedBy: mongoose.Schema.Types.ObjectId,
    },

    crmHistory: {
      type: [
        {
          fromStatus: String,
          toStatus: String,
          occurredAt: Date,
          actorId: mongoose.Schema.Types.ObjectId,
        },
      ],
      default: [],
    },

    commercialOutcome: {
      type: new mongoose.Schema(
        {
          currency: String,
          revenue: {
            type: Number,
            default: null,
          },
          grossProfit: {
            type: Number,
            default: null,
          },
          orderReference: String,
          evidenceReference: String,
          recordedAt: Date,
          recordedBy: mongoose.Schema.Types.ObjectId,
        },
        {
          _id: false,
        }
      ),
      default: null,
    },

    leadValue: {
      type: Number,
      default: 0,
    },

    quoteId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },

    quoteAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    expectedMarginBand: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    orderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ============================================================
    // MASTER DPR v4.0 — OUTCOME / LOST REASON
    // ============================================================

    lostReason: {
      type: String,
      enum: ["", ...LOST_REASONS],
      default: "",
      index: true,
    },

    lostReasonNotes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    lostAt: {
      type: Date,
      default: null,
    },

    wonAt: {
      type: Date,
      default: null,
    },

    // ============================================================
    // MASTER DPR v4.0 — WEBSITE POST-PERSISTENCE AUTOMATION
    // ============================================================

    automationStatus: {
      type: String,
      enum: [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
      ],
      default: "PENDING",
      index: true,
    },

    automationAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    automationLastError: {
      type: String,
      default: "",
      maxlength: 500,
    },

    automationLastAttemptAt: {
      type: Date,
      default: null,
    },

    // ============================================================
    // MASTER DPR v4.0 — ASYNC CRM SYNC / MANUAL RECOVERY
    // ============================================================

    crmSync: {
      type: crmSyncSchema,
      default: () => ({}),
    },

    // ============================================================
    // MASTER DPR v4.0 — NOTIFICATION DELIVERY VISIBILITY
    // ============================================================

    notificationDelivery: {
      salesAlert: {
        type: notificationStateSchema,
        default: () => ({}),
      },

      itAlert: {
        type: notificationStateSchema,
        default: () => ({}),
      },
    },

    // ============================================================
    // VOICE NOTES
    // ============================================================

    voiceNotes: [
      {
        path: {
          type: String,
        },

        originalName: {
          type: String,
        },

        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ============================================================
    // LOI DOCUMENTS
    // ============================================================

    loiDocuments: [
      {
        path: {
          type: String,
        },

        originalName: {
          type: String,
        },

        mimeType: {
          type: String,
          default: "application/pdf",
        },

        size: {
          type: Number,
          default: 0,
        },

        notes: {
          type: String,
          default: "",
        },

        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        uploadedByName: {
          type: String,
          default: "",
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },

        driveFileId: {
          type: String,
          default: "",
        },

        driveWebViewLink: {
          type: String,
          default: "",
        },
      },
    ],

    // ============================================================
    // LEGACY DUPLICATE / ACTIVITY CONTEXT
    // ============================================================

    /**
     * Retained for existing records/UI only.
     * New Phase 2 contact resolution must NOT treat the same contact as a
     * duplicate opportunity. It should resolve contactId and still create a
     * separate Lead opportunity.
     */
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
      index: true,
    },

    chatSummary: {
      type: String,
      default: "",
    },

    // Legacy compatibility. New public flows must not store plaintext PII here.
    originalPayload: {
      type: Object,
      default: {},
    },

    remarks: {
      type: String,
      default: "",
    },

    // ============================================================
    // LOGISTICS / DELIVERY / PAYMENT FILES
    // ============================================================

    podFileUrl: {
      type: String,
      default: "",
    },

    paymentProofUrl: {
      type: String,
      default: "",
    },

    driverProofUrl: {
      type: String,
      default: "",
    },

    photoUrl: {
      type: String,
      default: "",
    },

    paymentProof: {
      type: Object,
      default: {},
    },

    deliveryImages: {
      type: Object,
      default: {},
    },

    // ============================================================
    // CREATOR
    // ============================================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// EXISTING CRM QUERY INDEX
// ============================================================

leadSchema.index({
  stage: 1,
  source: 1,
  productCategory: 1,
  assignedTo: 1,
  priority: 1,
  createdAt: -1,
});

// ============================================================
// MASTER DPR — CANONICAL CRM PIPELINE INDEX
// ============================================================

leadSchema.index({
  crmStatus: 1,
  assignedTo: 1,
  productCategory: 1,
  priority: 1,
  createdAt: -1,
});

// ============================================================
// CONTACT RESOLUTION / MULTI-OPPORTUNITY INDEXES
// ============================================================

leadSchema.index({
  contactId: 1,
  createdAt: -1,
});

leadSchema.index({
  phoneHash: 1,
  emailHash: 1,
  companyNameHash: 1,
  productCategory: 1,
});

leadSchema.index({
  gstHash: 1,
  createdAt: -1,
});

// ============================================================
// WEBSITE AUTOMATION RECOVERY INDEX
// ============================================================

leadSchema.index({
  automationStatus: 1,
  automationLastAttemptAt: 1,
});

// ============================================================
// CRM SYNC WORKER INDEX
// ============================================================

leadSchema.index({
  "crmSync.status": 1,
  "crmSync.nextAttemptAt": 1,
  "crmSync.attempts": 1,
  createdAt: 1,
});

leadSchema.index({
  "crmSync.manualRecoveryRequired": 1,
  "crmSync.status": 1,
  updatedAt: -1,
});

// ============================================================
// FOLLOW-UP / SLA INDEX
// ============================================================

leadSchema.index({
  crmStatus: 1,
  nextFollowupAt: 1,
  assignedTo: 1,
});

// ============================================================
// ACQUISITION REPORTING INDEX
// ============================================================

leadSchema.index({
  source: 1,
  leadOrigin: 1,
  productCategory: 1,
  createdAt: -1,
});

// ============================================================
// ATTRIBUTION REPORTING INDEX
// ============================================================

leadSchema.index({
  "attribution.utmSource": 1,
  "attribution.utmMedium": 1,
  "attribution.utmCampaign": 1,
  createdAt: -1,
});

// ============================================================
// LOST-REASON REPORTING INDEX
// ============================================================

leadSchema.index({
  crmStatus: 1,
  lostReason: 1,
  productCategory: 1,
  updatedAt: -1,
});

module.exports = mongoose.model(
  "Lead",
  leadSchema
);