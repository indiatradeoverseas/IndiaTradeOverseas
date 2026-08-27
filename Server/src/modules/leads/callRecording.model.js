const mongoose = require('mongoose');

const callRecordingSchema = new mongoose.Schema(
  {
    executiveId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    executiveName: {
      type: String,
      required: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },
    leadCode: {
      type: String,
      default: '',
    },
    customerName: {
      type: String,
      default: '',
    },
    audioPath: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      default: '',
    },
    mimeType: {
      type: String,
      default: 'audio/mpeg',
    },
    size: {
      type: Number,
      default: 0,
    },
    duration: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    leadPriority: {
      type: String,
      enum: ['HOT', 'WARM', 'COLD'],
      default: 'WARM',
    },
    managerRemark: {
      type: String,
      default: '',
    },
    managerRemarkBy: {
      type: String,
      default: '',
    },
    managerRemarkAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

callRecordingSchema.index({ executiveId: 1, createdAt: -1 });
callRecordingSchema.index({ leadId: 1, createdAt: -1 });

module.exports = mongoose.model('CallRecording', callRecordingSchema);
