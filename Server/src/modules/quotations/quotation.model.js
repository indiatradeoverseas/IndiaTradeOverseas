const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    employeeRequestedPrice: {
      type: Number,
      default: null,
    },
    approvedPrice: {
      type: Number,
      default: null,
    },
    marginNote: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "PENDING",
        "APPROVED",
        "REJECTED",
        "SENT_TO_CUSTOMER",
        "NEGOTIATION",
        "CLOSED",
      ],
      default: "PENDING",
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    validityDays: {
      type: Number,
      default: 7,
    },
    paymentTerms: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

quotationSchema.index({
  status: 1,
  requestedBy: 1,
  approvedBy: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Quotation", quotationSchema);