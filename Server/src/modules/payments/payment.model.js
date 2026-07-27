const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispatch",
      default: null,
      index: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    advanceAmount: {
      type: Number,
      default: 0,
    },
    balanceAmount: {
      type: Number,
      default: 0,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: [
        "Not Started",
        "Advance Received",
        "Partial",
        "Due",
        "Overdue",
        "Paid",
        "Disputed",
      ],
      default: "Not Started",
      index: true,
    },
    invoiceDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },
    paymentProofDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },
    reminderCount: {
      type: Number,
      default: 0,
    },
    lastReminderAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);