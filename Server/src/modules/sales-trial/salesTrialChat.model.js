const mongoose = require('mongoose');

const salesTrialChatSchema = new mongoose.Schema(
  {
    trialUserId: {
      type: String,
      required: true,
      index: true
    },
    managerId: {
      type: String,
      required: true,
      index: true
    },
    senderId: {
      type: String,
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    senderRole: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    leadCode: {
      type: String,
      default: ''
    },
    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String }
      }
    ],
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SalesTrialChat', salesTrialChatSchema);
