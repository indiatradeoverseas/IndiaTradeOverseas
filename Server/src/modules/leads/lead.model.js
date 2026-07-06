const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    leadCode: { type: String, unique: true, required: true, index: true },
    source: {
      type: String,
      enum: ['WEBSITE', 'AI_AGENT', 'WHATSAPP', 'INDIAMART', 'MANUAL', 'IMPORT'],
      required: true
    },
    customerName: { type: String, required: true },
    companyName: { type: String, default: '' },
    companyNameHash: { type: String, default: '', index: true },
    phoneEncrypted: { type: String, required: true },
    phoneMasked: { type: String, required: true },
    phoneHash: { type: String, required: true, index: true },
    emailEncrypted: { type: String, default: '' },
    emailMasked: { type: String, default: '' },
    emailHash: { type: String, default: '', index: true },
    productCategory: { type: String, required: true },
    quantity: { type: String, default: '' },
    destination: { type: String, default: '' },
    priority: {
      type: String,
      enum: ['HOT', 'WARM', 'COLD', 'FAKE', 'INCOMPLETE'],
      default: 'WARM',
      index: true
    },
    stage: {
      type: String,
      enum: [
        'NEW_LEAD',
        'ASSIGNED',
        'CONTACTED',
        'LEAD_QUALIFICATION',
        'FOLLOW_UP',
        'REQUIREMENT_CAPTURED',
        'QUOTATION_REQUIRED',
        'QUOTATION_PENDING_APPROVAL',
        'QUOTATION_APPROVED',
        'QUOTATION_REQUESTED',
        'QUOTATION_SHARED',
        'NEGOTIATION',
        'LOI_PO_PENDING',
        'ORDER_CONFIRMED',
        'DISPATCH_PENDING',
        'DISPATCH_PLANNED',
        'PAYMENT_PENDING',
        'DOCUMENT_PENDING',
        'CLOSED_WON',
        'CLOSED_LOST',
        // New stages
        'REQUIREMENT_RECEIVED',
        'QUOTATION_SENT',
        'SAMPLE_SENT',
        'PRICE_DISCUSSION',
        'PAYMENT_DISCUSSION',
        'PO_RECEIVED',
        'DEAL_WON',
        'DEAL_LOST'
      ],
      default: 'NEW_LEAD',
      index: true
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    assignedDepartment: {
      type: String,
      enum: ['STONE', 'COAL', 'TEA', 'RICE', 'TRANSPORT', 'ADMIN', 'IT', 'PROCUREMENT', 'ACCOUNTS', 'HR', 'SALES'],
      default: null
    },
    contactPerson: { type: String, default: '' },
    country: { type: String, default: '' },
    whatsAppNumber: { type: String, default: '' },
    leadValue: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    voiceNotes: [
      {
        path: { type: String },
        originalName: { type: String },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    chatSummary: { type: String, default: '' },
    originalPayload: { type: Object, default: {} },
    nextFollowupAt: { type: Date, default: null },
    remarks: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);


leadSchema.index({ stage: 1, source: 1, productCategory: 1, assignedTo: 1, priority: 1, createdAt: -1 });


leadSchema.index({ phoneHash: 1, emailHash: 1, companyNameHash: 1, productCategory: 1 });

module.exports = mongoose.model('Lead', leadSchema);
