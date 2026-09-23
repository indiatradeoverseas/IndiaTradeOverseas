const mongoose = require('mongoose');

const coalVisitorSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    division: {
      type: String,
      default: 'COAL',
      enum: ['COAL'],
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    timeline: {
      type: String,
      trim: true,
    },

    requirement: {
      company: String,
      buyerType: String,
      industry: String,
      plant: String,
      use: String,

      origin: String,
      coalType: String,
      gcv: Number,
      basis: String,
      rejVal: Number,
      ash: Number,
      sulphur: Number,
      tm: Number,
      vm: Number,
      fc: Number,
      hgiAft: String,

      orderQty: Number,
      trialQty: Number,
      monthly: Number,
      targetQty: Number,
      estValuation: Number,

      dest: String,
      tMode: String,
      incoterm: String,
      reqDate: String,

      specFileName: String,
      notes: String,
      privacy: Boolean,
    },

    pricing: {
      valuationAmount: Number,
      transportAmount: Number,
      subtotal: Number,
      gstRate: Number,
      gstAmount: Number,
      grandTotal: Number,
      currency: {
        type: String,
        default: 'INR',
      },
    },

    status: {
      type: String,
      enum: [
        'NEW',
        'PRICING_VIEWED',
        'PAYMENT_INITIATED',
        'PAYMENT_COMPLETED',
        'ORDER_CREATED',
      ],
      default: 'NEW',
      index: true,
    },

    source: {
      type: String,
      default: 'WEBSITE_REQUEST_BULK_QUOTE',
    },

    paymentOrderId: String,
    paymentId: String,
    paymentSignature: String,
    paymentStatus: String,
    paymentAmount: Number,
    paymentCompletedAt: Date,
    orderId: String,
  },
  {
    timestamps: true,
  }
);

coalVisitorSchema.index({
  email: 1,
  division: 1,
});

coalVisitorSchema.index({
  status: 1,
  createdAt: -1,
});

coalVisitorSchema.statics.generateVisitorId = function () {
  return `ITO-COAL-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
};

module.exports = mongoose.model(
  'CoalVisitor',
  coalVisitorSchema
);