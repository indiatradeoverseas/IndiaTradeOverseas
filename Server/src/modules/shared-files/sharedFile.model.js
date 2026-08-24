const mongoose = require('mongoose');

const sharedFileSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true
    },
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      default: 0
    },
    mimeType: {
      type: String,
      default: ''
    },
    sentBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Employee',
      required: true,
      index: true
    },
    sentTo: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Employee',
      required: true,
      index: true
    },
    department: {
      type: String,
      enum: ['SALES', 'HR', 'IT', 'ADMIN', 'GENERAL'],
      default: 'GENERAL'
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    downloadedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SharedFile', sharedFileSchema);
