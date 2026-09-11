const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    // ============================================================
    // MASTER DPR v4.0 — LEAD IDENTITY / IDEMPOTENCY
    // ============================================================

    leadCode: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Prevents duplicate website leads when the same browser
    // submission is retried because of timeout/network failure.
    submissionId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },

    // ============================================================
    // LEAD SOURCE
    // ============================================================

    source: {
      type: String,
      enum: [
        "WEBSITE",
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

    // More specific than source.
    // Example:
    // source = WEBSITE
    // leadOrigin = REQUIREMENT_BUILDER
    leadOrigin: {
      type: String,
      enum: [
        "GENERAL_ENQUIRY",
        "SOFT_GATE",
        "REQUIREMENT_BUILDER",
        "QUOTE_REQUEST",
        "AI_AGENT",
        "MANUAL",
        "IMPORT",
      ],
      default: "GENERAL_ENQUIRY",
      index: true,
    },

    // ============================================================
    // CONTACT
    // ============================================================

    // MASTER DPR:
    // Name is optional at initial phone-first soft gate.
    // It can be collected later through progressive qualification.
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

    // Canonical protected phone storage
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

    // Existing compatibility field.
    // New website soft-gate leads should NOT populate this
    // with plaintext phone data.
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
    // PRODUCT / REQUIREMENT
    // ============================================================

    productCategory: {
      type: String,
      required: true,
      index: true,
    },

    // Canonical product name.
    // Example: "20 MM Stone Chips"
    product: {
      type: String,
      default: "",
      trim: true,
    },

    // Example: PAKUR / BHUTAN / BLACK / WHITE
    productVariant: {
      type: String,
      default: "",
      trim: true,
    },

    // Example: 20 MM / 40 MM / Stone Dust / WMM
    grade: {
      type: String,
      default: "",
      trim: true,
    },

    // Legacy/free-text quantity retained for compatibility.
    quantity: {
      type: String,
      default: "",
    },

    // Canonical numeric quantity for analytics,
    // scoring and CRM reporting.
    quantityValue: {
      type: Number,
      default: 0,
    },

    quantityUnit: {
      type: String,
      default: "MT",
      trim: true,
    },

    // Example:
    // BELOW_40_MT
    // 40_99_MT
    // 100_499_MT
    // 500_PLUS_MT
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

    // Human/business timeline value.
    // Example: WITHIN_7_DAYS
    timeline: {
      type: String,
      default: "",
      trim: true,
    },

    // Parsed Date equivalent where available.
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
      // Permission to contact the buyer about this enquiry.
      contactAllowed: {
        type: Boolean,
        default: false,
      },

      // Separate, optional promotional marketing permission.
      marketingAllowed: {
        type: Boolean,
        default: false,
      },

      // Version of Privacy Policy / notice accepted.
      privacyVersion: {
        type: String,
        default: "",
        trim: true,
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
    // QUALIFICATION / CRM
    // ============================================================

    priority: {
      type: String,
      enum: [
        "HOT",
        "WARM",
        "COLD",
        "FAKE",
        "INCOMPLETE",
      ],
      default: "WARM",
      index: true,
    },

    stage: {
      type: String,
      enum: [
        "NEW_LEAD",
        "ASSIGNED",
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

        // Existing/newer stages
        "REQUIREMENT_RECEIVED",
        "QUOTATION_SENT",
        "SAMPLE_SENT",
        "PRICE_DISCUSSION",
        "PAYMENT_DISCUSSION",
        "PO_RECEIVED",
        "DEAL_WON",
        "DEAL_LOST",
      ],
      default: "NEW_LEAD",
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
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

    // ============================================================
    // LEAD COMMERCIAL VALUE
    // ============================================================

    leadValue: {
      type: Number,
      default: 0,
    },

    score: {
      type: Number,
      default: 0,
    },

    // ============================================================
    // MASTER DPR v4.0 — AUTOMATION / RECOVERY STATE
    // ============================================================

    // Local persistence happens first.
    // Routing/audit/activity automation runs after persistence.
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
    },

    automationLastError: {
      type: String,
      default: "",
    },

    automationLastAttemptAt: {
      type: Date,
      default: null,
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
    // DUPLICATE / ACTIVITY CONTEXT
    // ============================================================

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

    // Legacy compatibility.
    //
    // IMPORTANT:
    // New website requirement-builder leads should NOT store
    // plaintext phone/email/contact PII here.
    originalPayload: {
      type: Object,
      default: {},
    },

    nextFollowupAt: {
      type: Date,
      default: null,
      index: true,
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
// DUPLICATE / CONTACT RESOLUTION INDEX
// ============================================================

leadSchema.index({
  phoneHash: 1,
  emailHash: 1,
  companyNameHash: 1,
  productCategory: 1,
});


// ============================================================
// MASTER DPR v4.0 — AUTOMATION RECOVERY INDEX
// ============================================================

leadSchema.index({
  automationStatus: 1,
  automationLastAttemptAt: 1,
});


// ============================================================
// MASTER DPR v4.0 — ACQUISITION REPORTING INDEX
// ============================================================

leadSchema.index({
  source: 1,
  leadOrigin: 1,
  productCategory: 1,
  createdAt: -1,
});


// ============================================================
// MASTER DPR v4.0 — ATTRIBUTION REPORTING INDEX
// ============================================================

leadSchema.index({
  "attribution.utmSource": 1,
  "attribution.utmMedium": 1,
  "attribution.utmCampaign": 1,
  createdAt: -1,
});


module.exports = mongoose.model(
  "Lead",
  leadSchema
);