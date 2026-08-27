const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
  vehicleNumber: { type: String, 
    required: true,
    unique: true,
    uppercase: true,
    trim: true },

  vehicleType: { type: String,
    enum: ['Open Truck', 'Container', 'Trailer', 'Dumper', 'Tipper'],
    required: true },

  capacityTons: { type: Number,
    required: true },

  ownerType: { type: String,
    enum: ['Owned', 'Leased', 'Market/ThirdParty'],
    default: 'Market/ThirdParty' },

  ownerName: { type: String },
  ownerPhone: { type: String },
  rcNumber: { type: String },
  fitnessExpiry: { type: Date },
  insuranceExpiry: { type: Date },
  status: { type: String,
    enum: ['Available', 'In-Transit', 'Maintenance', 'Inactive'],
    default: 'Available' },
  isActive: { type: Boolean, default: true }
}, 
{ timestamps: true });

module.exports = mongoose.model('Truck', truckSchema);