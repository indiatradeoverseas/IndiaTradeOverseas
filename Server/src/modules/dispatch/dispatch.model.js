const mongoose = require('mongoose');

const dispatchSchema = new mongoose.Schema({
  dispatchNumber: { type: String, required: true, unique: true },
  
  // Sales Integration
  salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' }, 
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  
  // Transport Details & Corridors
  corridor: { 
    type: String, 
    enum: ['Bihar', 'West Bengal', 'Jharkhand', 'Assam', 'Delhi NCR', 'Bhutan-linked', 'Export-Nepal', 'Export-Bangladesh'], 
    required: true 
  },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  
  // Cargo & Rate Breakdown
  productName: { type: String, required: true },
  tonnage: { type: Number, required: true },
  rateBasis: { type: String, enum: ['Per MT', 'Per Trip'], required: true },
  freightRate: { type: Number, required: true }, // Rate per MT or total trip rate
  totalFreightAmount: { type: Number, required: true },
  
  // Logistics Operational Setup
  truckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },

  // ─── DPR COMPLIANCE: REGULATORY & GATE CONTROL ───────────────────
  ewayBillNumber: { type: String, required: true, trim: true },
  ewayBillExpiry: { type: Date, required: true },
  gatePassId: { type: String, required: true, trim: true },
  gateOutTime: { type: Date },

  // ─── DPR COMPLIANCE: VEHICLE & DRIVER MASTER CHECKS ───────────────
  vehicleNumber: { type: String, required: true, uppercase: true, trim: true },
  pucExpiry: { type: Date, required: true },
  insuranceExpiry: { type: Date, required: true },
  driverName: { type: String, required: true, trim: true },
  driverLicenseNumber: { type: String, required: true, trim: true },
  driverPhone: { type: String, required: true, trim: true },

  // ─── DPR COMPLIANCE: COMMERCIAL FREIGHT ACCOUNTING ───────────────
  fuelSurcharge: { type: Number, default: 0 },
  tollCharges: { type: Number, default: 0 },
  advanceAmountPaid: { type: Number, default: 0 },
  balanceAmountPayable: { type: Number, default: 0 },
  
  // Tracking & Status
  dispatchStatus: { 
    type: String, 
    enum: ['Planned', 'Loading', 'In-Transit', 'Delivered', 'Cancelled'], 
    default: 'Planned' 
  },
  podStatus: { type: String, enum: ['Pending', 'Uploaded', 'Verified', 'Rejected'], default: 'Pending' },
  podFileUrl: { type: String }, // Stored object storage signed URL
  podVerifiedAt: { type: Date },
  podVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  dispatchDate: { type: Date, default: Date.now },
  estimatedDeliveryDate: { type: Date },
  actualDeliveryDate: { type: Date },

  remarks: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto-calculate total payable balance before saving
dispatchSchema.pre('save', function (next) {
  const grossFreight = (this.totalFreightAmount || 0) + (this.fuelSurcharge || 0) + (this.tollCharges || 0);
  this.balanceAmountPayable = grossFreight - (this.advanceAmountPaid || 0);
  next();
});

module.exports = mongoose.model('Dispatch', dispatchSchema);