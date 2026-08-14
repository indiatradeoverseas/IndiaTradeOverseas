const mongoose = require('mongoose');

const hrSettingSchema = new mongoose.Schema(
  {
    maxExtraLeavesPerYear: {
      type: Number,
      default: 4
    },
    extraLeaveApprovalRequired: {
      type: Boolean,
      default: true
    },
    autoApproveExtraLeaves: {
      type: Boolean,
      default: false
    },
    notifyHROnExtraRequest: {
      type: Boolean,
      default: true
    },
    extraLeaveReasonRequired: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('HRSetting', hrSettingSchema);
