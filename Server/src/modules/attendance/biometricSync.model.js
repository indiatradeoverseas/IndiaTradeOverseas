const mongoose = require('mongoose');

const biometricSyncSchema = new mongoose.Schema(
  {
    lastSyncTime: {
      type: Date,
      required: true,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE'],
      default: 'ONLINE',
      required: true
    },
    totalSyncedRecords: {
      type: Number,
      default: 0
    },
    lastSyncBy: {
      type: String, // Name or ID of the user triggering it (e.g. "HR Manager" or username)
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('BiometricSync', biometricSyncSchema);
