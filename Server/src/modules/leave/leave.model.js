const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    leaveCode: { type: String, required: true, unique: true, index: true },
    leaveType: {
      type: String,
      enum: ['PAID', 'EMERGENCY'],
      required: true,
      index: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    daysCount: { type: Number, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Leave', leaveSchema);
