const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    targetRole: {
      type: String,
      default: null,
    },
    targetDepartment: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: "GENERAL",
    },
    metadata: {
      type: Object,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);