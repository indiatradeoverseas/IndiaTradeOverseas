const mongoose = require('mongoose');

const managerChatSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    senderEmail: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
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
    senderAllIds: [String],
    recipientId: {
      type: String,
      default: 'GENERAL', // 'GENERAL' for leadership hub, or user ID for 1-on-1 direct chat
      index: true
    },
    recipientEmail: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
      index: true
    },
    recipientName: {
      type: String,
      default: 'General Leadership Hub',
      trim: true
    },
    recipientAllIds: [String],
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
    readBy: [String]
  },
  {
    timestamps: true
  }
);

managerChatSchema.index({ recipientId: 1, createdAt: 1 });
managerChatSchema.index({ senderId: 1, recipientId: 1 });
managerChatSchema.index({ senderEmail: 1, recipientEmail: 1 });
managerChatSchema.index({ senderAllIds: 1 });
managerChatSchema.index({ recipientAllIds: 1 });

const ManagerChat = mongoose.model('ManagerChat', managerChatSchema);

// Auto-drop broken legacy compound index if it exists in MongoDB collection catalog
try {
  ManagerChat.collection.dropIndex('senderAllIds_1_recipientAllIds_1').catch(() => {});
} catch (e) {}

module.exports = ManagerChat;

