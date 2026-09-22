const mongoose = require('mongoose');

const riceOrderItemSchema = new mongoose.Schema(
  {
    variety: { type: String, required: true },
    processingType: { type: String, required: true },
    processingLabel: String,
    compliance: { type: String, enum: ['REGULAR', 'COMPLIANCE'], default: 'REGULAR' },
    quantityKg: { type: Number, required: true, min: 1 },
    quantityMT: { type: Number, required: true },
    location: { type: String, required: true },
    pincode: { type: String, required: true, match: /^\d{6}$/ },
    timeline: String,
    packaging: String,
    tradeType: String,
    pricePerMT: { type: Number, required: true },
    baseAmount: { type: Number, required: true },
  },
  { _id: false }
);

const riceOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    visitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RiceVisitor',
      required: true,
      index: true,
    },
    division: {
      type: String,
      default: 'RICE',
      enum: ['RICE'],
      required: true,
    },
    // Customer Information (copied from visitor for order record)
    customer: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      currentLocation: { type: String, required: true },
    },
    // Delivery Information
    delivery: {
      location: { type: String, required: true },
      pincode: { type: String, required: true, match: /^\d{6}$/ },
      timeline: String,
    },
    // Order Items
    items: [riceOrderItemSchema],
    // Pricing Summary
    pricing: {
      subtotal: { type: Number, required: true },
      gstRate: { type: Number, default: 0.05 },
      gstAmount: { type: Number, required: true },
      grandTotal: { type: Number, required: true },
    },
    // Payment Information
    payment: {
      razorpayOrderId: { type: String, required: true },
      razorpayPaymentId: { type: String },
      razorpaySignature: { type: String },
      status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
        default: 'PENDING',
        index: true,
      },
      amount: { type: Number, required: true },
      currency: { type: String, default: 'INR' },
      paidAt: Date,
    },
    // Order Status
    status: {
      type: String,
      enum: ['PLACED', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
      default: 'PLACED',
      index: true,
    },
    source: {
      type: String,
      default: 'WEBSITE_CUSTOMER_PURCHASE',
    },
  },
  {
    timestamps: true,
  }
);

riceOrderSchema.index({ 'customer.email': 1 });
riceOrderSchema.index({ 'customer.phone': 1 });
riceOrderSchema.index({ status: 1, createdAt: -1 });

function generateOrderId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-RICE-${timestamp}-${random}`;
}

riceOrderSchema.statics.generateOrderId = generateOrderId;

module.exports = mongoose.model('RiceOrder', riceOrderSchema);