const mongoose = require('mongoose');

const managerChatSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    senderName: {
      type: String,
      required: true,
      trim: true
    },
    senderRole: {
      type: String,
      default: 'MANAGER',
      trim: true
    },
    senderDepartment: {
      type: String,
      default: 'GENERAL',
      trim: true
    },
    recipientId: {
      type: String,
      default: 'GENERAL', // 'GENERAL' for leadership hub, or user ID for 1-on-1 direct chat
      index: true
    },
    recipientName: {
      type: String,
      default: 'General Leadership Hub',
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    attachmentUrl: {
      type: String,
      default: ''
    },
    leadCode: {
      type: String,
      default: '',
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readBy: [
      {
        type: String
      }
    ]
  },
  {
    timestamps: true
  }
);

managerChatSchema.index({ recipientId: 1, createdAt: 1 });
managerChatSchema.index({ senderId: 1, recipientId: 1 });

module.exports = mongoose.model('ManagerChat', managerChatSchema);
