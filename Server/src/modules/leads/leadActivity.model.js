const mongoose = require("mongoose");

const leadActivitySchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
    nextFollowupAt: {
      type: Date,
      default: null,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("LeadActivity", leadActivitySchema);