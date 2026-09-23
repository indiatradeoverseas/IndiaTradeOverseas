const mongoose = require("mongoose");

const onionVisitorSchema =
  new mongoose.Schema(
    {
      visitorId: {
        type: String,
        unique: true,
        required: true,
        index: true,
      },

      division: {
        type: String,
        default: "ONION",
        enum: ["ONION"],
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

      timeline: String,

      requirement: {
        product: String,
        crop: String,
        tradeType: String,
        size: String,
        grade: String,
        quantityKg: Number,
        quantityMT: Number,
        packaging: String,
        destination: String,
      },

      pricing: {
        unitRate: Number,
        transportRate: Number,
        materialAmount: Number,
        transportAmount: Number,
        subtotal: Number,
        gstRate: Number,
        gstAmount: Number,
        grandTotal: Number,
      },

      status: {
        type: String,

        // PAYMENT_INITIATED is intentionally included.
        enum: [
          "NEW",
          "PRICING_VIEWED",
          "PAYMENT_INITIATED",
          "PAYMENT_COMPLETED",
          "ORDER_CREATED",
        ],

        default: "NEW",

        index: true,
      },

      source: {
        type: String,
        default:
          "WEBSITE_REQUEST_BULK_QUOTE",
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

onionVisitorSchema.index({
  email: 1,
  division: 1,
});

onionVisitorSchema.index({
  status: 1,
  createdAt: -1,
});

onionVisitorSchema.statics.generateVisitorId =
  function () {
    return `ITO-ONION-${Date.now()
      .toString(36)
      .toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
  };

module.exports =
  mongoose.model(
    "OnionVisitor",
    onionVisitorSchema
  );