const mongoose = require('mongoose');

const salesTargetSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    targetValue: { type: Number, required: true, default: 0 },
    targetDeals: { type: Number, default: null },
    setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

salesTargetSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('SalesTarget', salesTargetSchema);
