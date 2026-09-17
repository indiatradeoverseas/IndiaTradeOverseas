const mongoose = require('mongoose');

const softLeadSchema = new mongoose.Schema(
  {
    leadId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    division: {
      type: String,
      enum: ['STONE', 'RICE', 'TEA'],
      required: true,
      index: true,
    },
    product: {
      type: String,
      required: true,
    },
    productDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    quantity: {
      type: String,
      default: '',
    },
    quantityUnit: {
      type: String,
      default: '',
    },
    destination: {
      type: String,
      default: '',
    },
    pin: {
      type: String,
      default: '',
    },
    timeline: {
      type: String,
      default: '',
    },
    eligibility: {
      type: String,
      enum: ['SUPPORTED', 'MANUAL_REVIEW', 'UNSUPPORTED'],
      default: 'SUPPORTED',
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    phoneEncrypted: {
      type: String,
      default: '',
    },
    phoneHash: {
      type: String,
      default: '',
      index: true,
    },
    consent: {
      type: Boolean,
      required: true,
      default: false,
    },
    consentTimestamp: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      default: 'WEBSITE',
    },
    medium: {
      type: String,
      default: 'ORGANIC',
    },
    campaign: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      default: '',
    },
    adSet: {
      type: String,
      default: '',
    },
    adCreative: {
      type: String,
      default: '',
    },
    landingPage: {
      type: String,
      default: '',
    },
    sessionId: {
      type: String,
      default: '',
    },
    attribution: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'],
      default: 'NEW',
      index: true,
    },
    qualificationState: {
      type: String,
      enum: ['REQUIREMENT_CAPTURED', 'PHONE_CAPTURED', 'DETAILS_PENDING', 'COMPLETE'],
      default: 'REQUIREMENT_CAPTURED',
    },
    progressiveDetails: {
      name: { type: String, default: '' },
      company: { type: String, default: '' },
      email: { type: String, default: '' },
      gst: { type: String, default: '' },
      detailedSpec: { type: String, default: '' },
      paymentTerms: { type: String, default: '' },
      billingAddress: { type: String, default: '' },
      shippingAddress: { type: String, default: '' },
    },
    crmSynced: {
      type: Boolean,
      default: false,
    },
    crmSyncAttempts: {
      type: Number,
      default: 0,
    },
    crmSyncLastAttempt: {
      type: Date,
      default: null,
    },
    crmSyncError: {
      type: String,
      default: '',
    },
    crmLeadId: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

softLeadSchema.index({ division: 1, status: 1, createdAt: -1 });
softLeadSchema.index({ phoneHash: 1, division: 1 });
softLeadSchema.index({ crmSynced: 1, crmSyncAttempts: 1 });

module.exports = mongoose.model('SoftLead', softLeadSchema);