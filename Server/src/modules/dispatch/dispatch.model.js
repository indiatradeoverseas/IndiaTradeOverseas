const mongoose = require('mongoose');

const dispatchSchema = new mongoose.Schema({
  dispatchNumber: { type: String, required: true, unique: true },
  orderNumber: { type: String, index: true },
  leadCode: { type: String, index: true },
  customerName: { type: String, default: 'Lead Client' },
  
  // Sales Integration
  salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' }, 
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  
  // Transport Details & Corridors
  corridor: { 
    type: String, 
    enum: ['Bihar', 'West Bengal', 'Jharkhand', 'Assam', 'Delhi NCR', 'Bhutan-linked', 'Export-Nepal', 'Export-Bangladesh'], 
    default: 'Bihar' 
  },
  origin: { type: String, default: 'Main Depot' },
  destination: { type: String, default: 'Destination' },
  
  // Cargo & Rate Breakdown
  productName: { type: String, default: 'General Cargo' },
  tonnage: { type: Number, default: 20 },
  rateBasis: { type: String, enum: ['Per MT', 'Per Trip'], default: 'Per Trip' },
  freightRate: { type: Number, default: 18000 },
  totalFreightAmount: { type: Number, default: 18000 },
  
  // Logistics Operational Setup
  truckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

  // ─── DPR COMPLIANCE: REGULATORY & GATE CONTROL ───────────────────
  ewayBillNumber: { type: String, default: 'EWB-ACTIVE' },
  ewayBillExpiry: { type: Date, default: () => new Date(Date.now() + 30 * 86400000) },
  gatePassId: { type: String, default: 'GP-ACTIVE' },
  gateOutTime: { type: Date },

  // ─── DPR COMPLIANCE: VEHICLE & DRIVER MASTER CHECKS ───────────────
  vehicleNumber: { type: String, default: 'BR-01-TR-4521' },
  pucExpiry: { type: Date, default: () => new Date(Date.now() + 30 * 86400000) },
  insuranceExpiry: { type: Date, default: () => new Date(Date.now() + 30 * 86400000) },
  driverName: { type: String, default: 'Ramesh Driver' },
  driverLicenseNumber: { type: String, default: 'DL-ACTIVE' },
  driverPhone: { type: String, default: '9876543210' },

  // ─── DPR COMPLIANCE: COMMERCIAL FREIGHT ACCOUNTING ───────────────
  fuelSurcharge: { type: Number, default: 0 },
  tollCharges: { type: Number, default: 0 },
  advanceAmountPaid: { type: Number, default: 0 },
  balanceAmountPayable: { type: Number, default: 0 },
  
  // Tracking & Status
  dispatchStatus: { 
    type: String, 
    default: 'Delivered' 
  },
  podStatus: { type: String, default: 'Uploaded' },
  podFileUrl: { type: String }, // Stored object storage signed URL
  paymentProofUrl: { type: String },
  driverProofUrl: { type: String },
  photoUrl: { type: String },
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
    driverName: { type: String },
    vehicleNumber: { type: String },
    vehicleNo: { type: String },
    leadCode: { type: String },
    leadCustomer: { type: String },
    todaysTrip: { type: String },
    vehicleMileage: { type: Number, default: 0 },
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