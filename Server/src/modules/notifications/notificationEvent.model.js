const mongoose = require("mongoose");

const notificationEventSchema = new mongoose.Schema(
  {
    recipient: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      enum: ["WHATSAPP", "EMAIL"],
      required: true,
    },
    templateName: {
      type: String,
      default: "",
    },
    variables: {
      type: Object,
      default: {},
    },
    messageBody: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    errorMessage: {
      type: String,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "NotificationEvent",
  notificationEventSchema,
  "notification_events"
);