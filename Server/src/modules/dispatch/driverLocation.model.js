const mongoose = require('mongoose');

const driverLocationSchema = new mongoose.Schema(
  {
    driverKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    driverId: {
      type: String,
      default: '',
      trim: true
    },
    driverName: {
      type: String,
      default: 'Driver',
      trim: true
    },
    vehicleNo: {
      type: String,
      default: '',
      trim: true
    },
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    long: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    accuracy: {
      type: String,
      default: ''
    },
    lastSeenAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

driverLocationSchema.index({ lastSeenAt: -1 });

driverLocationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.driverId = ret.driverId || ret.driverKey;
    ret.timestamp = ret.lastSeenAt;
    delete ret.driverKey;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('DriverLocation', driverLocationSchema);
