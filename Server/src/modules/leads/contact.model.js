const mongoose = require('mongoose');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.3A: Canonical Contact model
 *
 * A Contact represents buyer/person/company identity.
 * A Lead represents one commercial opportunity.
 *
 * Master DPR identity rule:
 * - normalized phone AND/OR verified email may resolve a Contact;
 * - the same Contact may own multiple independent opportunities;
 * - each Lead keeps its own attribution/history;
 * - raw phone/email/GST are not stored in plaintext.
 */

const CONTACT_STATUS = Object.freeze([
  'ACTIVE',
  'MERGED',
  'ARCHIVED',
]);

const CONTACT_SOURCE = Object.freeze([
  'WEBSITE',
  'META_INSTANT_FORM',
  'AI_AGENT',
  'WHATSAPP',
  'INDIAMART',
  'MANUAL',
  'IMPORT',
  'SYSTEM',
]);

const contactSchema = new mongoose.Schema(
  {
    // ============================================================
    // IMMUTABLE CONTACT IDENTITY
    // ============================================================

    contactCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      immutable: true,
      maxlength: 120,
    },

    status: {
      type: String,
      enum: CONTACT_STATUS,
      default: 'ACTIVE',
      index: true,
    },

    // ============================================================
    // PROFILE
    // ============================================================

    name: {
      type: String,
      default: '',
      trim: true,
      maxlength: 150,
    },

    companyName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },

    companyNameHash: {
      type: String,
      default: '',
      trim: true,
      index: true,
      maxlength: 128,
    },

    country: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },

    // ============================================================
    // PHONE — OPTIONAL CONTACT-RESOLUTION KEY
    // ============================================================

    /**
     * Phone is deliberately optional at schema level because the DPR
     * explicitly allows Contact resolution by normalized phone AND/OR
     * verified email.
     *
     * Website funnels may still require phone as a business rule.
     */
    phoneEncrypted: {
      type: String,
      default: '',
    },

    phoneMasked: {
      type: String,
      default: '',
      trim: true,
      maxlength: 80,
    },

    phoneHash: {
      type: String,
      default: '',
      trim: true,
      index: true,
      maxlength: 128,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    phoneVerifiedAt: {
      type: Date,
      default: null,
    },

    // ============================================================
    // EMAIL — RESOLUTION KEY ONLY WHEN VERIFIED
    // ============================================================

    emailEncrypted: {
      type: String,
      default: '',
    },

    emailMasked: {
      type: String,
      default: '',
      trim: true,
      maxlength: 320,
    },

    emailHash: {
      type: String,
      default: '',
      trim: true,
      index: true,
      maxlength: 128,
    },

    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },

    // ============================================================
    // GST / BUSINESS VERIFICATION
    // ============================================================

    gstEncrypted: {
      type: String,
      default: '',
    },

    gstMasked: {
      type: String,
      default: '',
      trim: true,
      maxlength: 80,
    },

    gstHash: {
      type: String,
      default: '',
      trim: true,
      index: true,
      maxlength: 128,
    },

    gstVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    gstVerifiedAt: {
      type: Date,
      default: null,
    },

    // ============================================================
    // CONTACT HISTORY / OPPORTUNITY SUMMARY
    // ============================================================

    firstSource: {
      type: String,
      enum: CONTACT_SOURCE,
      default: 'SYSTEM',
      index: true,
    },

    lastSource: {
      type: String,
      enum: CONTACT_SOURCE,
      default: 'SYSTEM',
      index: true,
    },

    firstSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    firstOpportunityAt: {
      type: Date,
      default: null,
    },

    lastOpportunityAt: {
      type: Date,
      default: null,
      index: true,
    },

    opportunityCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ============================================================
    // CONSENT SNAPSHOT
    // ============================================================

    /**
     * Latest known Contact-level permission summary.
     * Each Lead still retains its own immutable submission-time snapshot.
     */
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
        default: '',
        trim: true,
        maxlength: 80,
      },

      updatedAt: {
        type: Date,
        default: null,
      },
    },

    // ============================================================
    // MERGE / MANUAL RECOVERY SUPPORT
    // ============================================================

    mergedIntoContactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
      index: true,
    },

    mergedAt: {
      type: Date,
      default: null,
    },

    mergeReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },

    // ============================================================
    // AUDIT
    // ============================================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// ACTIVE PHONE CONTACT-RESOLUTION INDEX
// ============================================================

/**
 * Only ACTIVE Contacts with a non-empty normalized phone hash participate
 * in uniqueness. This permits email-only Contacts and preserves merged /
 * archived records without blocking recovery operations.
 */
contactSchema.index(
  {
    phoneHash: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: 'ACTIVE',
      phoneHash: {
        $type: 'string',
        $gt: '',
      },
    },
    name: 'uniq_active_contact_phone',
  }
);

// ============================================================
// VERIFIED EMAIL CONTACT-RESOLUTION INDEX
// ============================================================

/**
 * Email only acts as an identity-resolution key when it has been verified.
 */
contactSchema.index(
  {
    emailHash: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: 'ACTIVE',
      emailVerified: true,
      emailHash: {
        $type: 'string',
        $gt: '',
      },
    },
    name: 'uniq_active_verified_contact_email',
  }
);

// ============================================================
// BUSINESS / RECOVERY INDEXES
// ============================================================

contactSchema.index({
  status: 1,
  companyNameHash: 1,
  lastSeenAt: -1,
});

contactSchema.index({
  status: 1,
  gstHash: 1,
  lastSeenAt: -1,
});

contactSchema.index({
  status: 1,
  lastOpportunityAt: -1,
});

contactSchema.statics.CONTACT_STATUS =
  CONTACT_STATUS;

contactSchema.statics.CONTACT_SOURCE =
  CONTACT_SOURCE;

module.exports = mongoose.model(
  'Contact',
  contactSchema
);