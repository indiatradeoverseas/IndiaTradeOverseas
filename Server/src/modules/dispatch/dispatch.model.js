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
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ─── PHASE 4.1 ENHANCEMENTS: EXECUTION & PROOF UPGRADES ───────────────
  
  // Feature 1: Real-Time Payment Collection & Proof Upload (UPI/QR)
  paymentProof: {
    amountPaid: { type: Number, default: 0 },
    paymentMode: { 
      type: String, 
      enum: ['UPI', 'GPay', 'PhonePe', 'Paytm', 'BankTransfer', 'Cash'], 
      default: 'UPI' 
    },
    upiRefNo: { type: String, trim: true },
    proofImageUrl: { type: String, trim: true }, // Mandatory Screenshot
    receivedAt: { type: Date },
    verifiedByFinance: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Feature 2: Distance & Odometer Tracking
  odometerReadings: {
    startReading: { type: Number },
    startReadingPhotoUrl: { type: String },
    startCapturedAt: { type: Date },
    startGps: { lat: Number, long: Number },
    endReading: { type: Number },
    endReadingPhotoUrl: { type: String },
    endCapturedAt: { type: Date },
    endGps: { lat: Number, long: Number },
    totalDistanceKm: { type: Number, default: 0 }
  },

  // Feature 2: Fuel / Diesel Tracking Logs
  fuelLogs: [{
    fuelType: { type: String, enum: ['Diesel', 'Petrol', 'CNG', 'AdBlue'], default: 'Diesel' },
    quantityLiters: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    kmDriven: { type: Number, default: 0 },
    punctureCost: { type: Number, default: 0 },
    otherCost: { type: Number, default: 0 },
    fromLocation: { type: String },
    toLocation: { type: String },
    remarks: { type: String },
    location: { type: String },
    gps: { lat: Number, long: Number },
    receiptPhotoUrl: { type: String },
    loggedAt: { type: Date, default: Date.now }
  }],

  // Feature 3: Departure Verification (At Loading)
  departureImages: {
    driverSelfieUrl: { type: String },
    vehiclePhotoUrl: { type: String },
    capturedAt: { type: Date },
    gps: { lat: Number, long: Number },
    status: { type: String, enum: ['Pending', 'Submitted', 'Verified'], default: 'Pending' }
  },

  // Feature 3: Delivery Verification (At Unloading)
  deliveryImages: {
    driverSelfieUrl: { type: String },
    emptyVehiclePhotoUrl: { type: String },
    capturedAt: { type: Date },
    gps: { lat: Number, long: Number },
    status: { type: String, enum: ['Pending', 'Submitted', 'Verified'], default: 'Pending' }
  },

  // Feature 4: Breakdown & Emergency SOS Alert System with SLA Escalation
  breakdownAlert: {
    isBreakdownActive: { type: Boolean, default: false },
    sosId: { type: String },
    issueType: { 
      type: String, 
      enum: ['Tyre Puncture', 'Engine Overheat', 'Accident', 'Brake Failure', 'Fuel Outage', 'Other'], 
      default: 'Engine Overheat' 
    },
    description: { type: String },
    photoUrl: { type: String },
    gps: { lat: Number, long: Number },
    reportedAt: { type: Date },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    escalatedToMD: { type: Boolean, default: false },
    escalatedAt: { type: Date }
  },

  // Feature 2: Computed Profitability & Budget Alerts
  profitability: {
    plannedKm: { type: Number, default: 500 },
    actualKm: { type: Number, default: 0 },
    totalFuelCost: { type: Number, default: 0 },
    mileageKmpl: { type: Number, default: 0 },
    costPerKm: { type: Number, default: 0 },
    freightEarned: { type: Number, default: 0 },
    netMargin: { type: Number, default: 0 },
    budgetOverrunAlert: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Auto-calculate total payable balance before saving
dispatchSchema.pre('save', function (next) {
  const grossFreight = (this.totalFreightAmount || 0) + (this.fuelSurcharge || 0) + (this.tollCharges || 0);
  this.balanceAmountPayable = grossFreight - (this.advanceAmountPaid || 0);
  next();
});

module.exports = mongoose.model('Dispatch', dispatchSchema);