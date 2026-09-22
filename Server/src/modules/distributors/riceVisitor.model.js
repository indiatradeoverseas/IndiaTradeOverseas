const mongoose = require('mongoose');

const riceVisitorSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    division: {
      type: String,
      default: 'RICE',
      enum: ['RICE'],
      required: true,
      index: true,
    },
    // Customer Information
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
    currentLocation: {
      type: String,
      required: true,
      trim: true,
    },
    // Requirement Information
    variety: {
      type: String,
      required: true,
    },
    processingType: {
      type: String,
      required: true,
    },
    compliance: {
      type: String,
      enum: ['REGULAR', 'COMPLIANCE'],
      default: 'REGULAR',
    },
    quantityKg: {
      type: Number,
      required: true,
      min: 1,
    },
    quantityMT: {
      type: Number,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
      match: /^\d{6}$/,
    },
    timeline: {
      type: String,
    },
    packaging: {
      type: String,
    },
    tradeType: {
      type: String,
    },
    // Pricing
    pricePerMT: {
      type: Number,
    },
    baseAmount: {
      type: Number,
    },
    // Status and tracking
    status: {
      type: String,
      enum: ['NEW', 'PRICING_VIEWED', 'CART_ACTIVE', 'PAYMENT_INITIATED', 'PAYMENT_COMPLETED', 'ORDER_CREATED'],
      default: 'NEW',
      index: true,
    },
    source: {
      type: String,
      default: 'WEBSITE_EXPLORE_PRODUCTS',
    },
    sourcePage: {
      type: String,
      default: 'Rice / Prakriti Rice',
    },
    sourceAction: {
      type: String,
      default: 'Explore Products',
    },
    // Cart and order reference
    cartItems: [{
      variety: String,
      processingType: String,
      compliance: String,
      quantityKg: Number,
      quantityMT: Number,
      location: String,
      pincode: String,
      pricePerMT: Number,
      baseAmount: Number,
      timeline: String,
      packaging: String,
      tradeType: String,
    }],
    cartSubtotal: {
      type: Number,
      default: 0,
    },
    cartGstRate: {
      type: Number,
      default: 0.05,
    },
    cartGstAmount: {
      type: Number,
      default: 0,
    },
    cartGrandTotal: {
      type: Number,
      default: 0,
    },
    // Payment reference
    paymentOrderId: String,
    paymentId: String,
    paymentStatus: String,
    paymentAmount: Number,
    paymentCompletedAt: Date,
    // Order reference
    orderId: String,
    orderCreatedAt: Date,
  },
  {
    timestamps: true,
  }
);

riceVisitorSchema.index({ email: 1, division: 1 });
riceVisitorSchema.index({ phone: 1, division: 1 });
riceVisitorSchema.index({ status: 1, createdAt: -1 });

function generateVisitorId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ITO-RICE-${timestamp}-${random}`;
}

riceVisitorSchema.statics.generateVisitorId = generateVisitorId;

module.exports = mongoose.model('RiceVisitor', riceVisitorSchema);