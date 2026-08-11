const mongoose = require("mongoose");

const dispatchSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      default: null,
    },
    loadingPoint: {
      type: String,
      default: "",
    },
    destination: {
      type: String,
      default: "",
    },
    truckNo: {
      type: String,
      default: "",
    },
    driverName: {
      type: String,
      default: "",
    },
    driverPhoneEncrypted: {
      type: String,
      default: "",
    },
    driverPhoneMasked: {
      type: String,
      default: "",
    },
    material: {
      type: String,
      default: "",
    },
    quantity: {
      type: String,
      default: "",
    },
    dispatchStatus: {
      type: String,
      enum: [
        "Pending",
        "Truck Assigned",
        "Loading",
        "In Transit",
        "Delivered",
        "Issue Raised",
        "Closed",
      ],
      default: "Pending",
      index: true,
    },
    loadingDate: {
      type: Date,
      default: null,
    },
    deliveryDate: {
      type: Date,
      default: null,
    },
    proofDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },
    issueRemarks: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Dispatch", dispatchSchema);