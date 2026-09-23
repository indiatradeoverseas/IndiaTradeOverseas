const mongoose = require('mongoose');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.25A: Quotation commercial-state foundation
 *
 * This phase does NOT implement Phase 8 quotation automation / PDF generation.
 * It only makes the existing quotation workflow reliable enough for Phase 2 CRM:
 * - persistent Quote ID already comes from MongoDB _id;
 * - every quotation has an amount source and creation timestamp;
 * - approval/rejection/sent status changes have explicit timestamps;
 * - sent quotations retain who issued them and when;
 * - existing statuses and controller/service contracts remain compatible.
 */

const QUOTATION_STATUSES = Object.freeze([
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SENT_TO_CUSTOMER',
  'NEGOTIATION',
  'CLOSED',
]);

function cleanText(value, maxLength = 2000) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

const quotationSchema = new mongoose.Schema(
  {
    commercialTerms: { type: new mongoose.Schema({source:String,product:String,destination:String,unit:String,deliveryTerms:String,paymentTerms:String,reference:String,currency:String,quantity:Number,unitPrice:Number,freight:Number,tax:Number,validUntil:Date,confirmedAt:Date,confirmedBy:mongoose.Schema.Types.ObjectId},{_id:false}),default:null },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    employeeRequestedPrice: {
      type: Number,
      default: null,
      min: 0,
    },

    approvedPrice: {
      type: Number,
      default: null,
      min: 0,
    },

    marginNote: {
      type: String,
      default: '',
      trim: true,
      maxlength: 5000,
    },

    status: {
      type: String,
      enum: QUOTATION_STATUSES,
      default: 'PENDING',
      index: true,
    },

    statusChangedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    statusChangedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    approvedAt: {
      type: Date,
      default: null,
      index: true,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    rejectedAt: {
      type: Date,
      default: null,
      index: true,
    },

    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    sentAt: {
      type: Date,
      default: null,
      index: true,
    },

    validityDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 365,
    },

    paymentTerms: {
      type: String,
      default: '',
      trim: true,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

quotationSchema.pre(
  'validate',
  function normalizeQuotationDocument(next) {
    if (this.marginNote !== undefined) {
      this.marginNote = cleanText(
        this.marginNote,
        5000
      );
    }

    if (this.paymentTerms !== undefined) {
      this.paymentTerms = cleanText(
        this.paymentTerms,
        5000
      );
    }

    /*
     * createdAt is the authoritative quotation creation timestamp.
     * statusChangedAt tracks the latest quotation workflow change.
     */
    if (!this.statusChangedAt) {
      this.statusChangedAt = new Date();
    }

    next();
  }
);

quotationSchema.index({
  status: 1,
  requestedBy: 1,
  approvedBy: 1,
  createdAt: -1,
});

quotationSchema.index({
  leadId: 1,
  createdAt: -1,
});

quotationSchema.index({
  leadId: 1,
  status: 1,
  statusChangedAt: -1,
});

quotationSchema.statics.STATUSES =
  QUOTATION_STATUSES;

module.exports = mongoose.model(
  'Quotation',
  quotationSchema
);