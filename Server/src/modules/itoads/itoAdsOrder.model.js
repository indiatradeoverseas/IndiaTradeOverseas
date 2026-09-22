const mongoose = require('mongoose');

const itoAdsOrderSchema = new mongoose.Schema({
  // Customer details
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  company: { type: String },
  billingAddress: { type: String },
  billingState: { type: String },
  gstin: { type: String },

  // Order details
  plan: { type: String, required: true }, // Starter, Growth, Professional, Scale
  amount: { type: Number, required: true }, // service fee paid
  currency: { type: String, default: 'INR' },

  // Payment reference
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },

  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },

  // Meta
  consent: { type: Boolean, default: false },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ItoAdsOrder', itoAdsOrderSchema);