const mongoose = require('mongoose');

const driverWorkUpdateSchema = new mongoose.Schema(
  {
    driverId: { type: String, default: '' },
    driverName: { type: String, required: true },
    vehicleNo: { type: String, default: '' },
    updateType: { 
      type: String, 
      default: 'In Transit'
    },
    notes: { type: String, required: true },
    location: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    dispatchId: { type: String, default: '' },
    kmDriven: { type: Number, default: 0 },
    fuelCost: { type: Number, default: 0 },
    otherCost: { type: Number, default: 0 },
    punctureCost: { type: Number, default: 0 },
    vehicleMileage: { type: Number, default: 0 },
    fromLocation: { type: String, default: '' },
    toLocation: { type: String, default: '' },
    leadCode: { type: String, default: '' },
    leadCustomer: { type: String, default: '' }
  },
  { timestamps: true }
);

// Index for fast driver-specific queries
driverWorkUpdateSchema.index({ driverId: 1, createdAt: -1 });

module.exports = mongoose.model('DriverWorkUpdate', driverWorkUpdateSchema);
