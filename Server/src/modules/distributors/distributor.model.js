const mongoose = require('mongoose');

const DistributorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  mobile: { type: String, required: true, trim: true },
  gstNumber: { type: String, trim: true },
  
  // Compliance Documents
  doc1Path: { type: String, required: false }, // GST Certificate (optional initially)
  doc2Path: { type: String }, // Udyam Certificate (Optional)
  
  city: { type: String, required: false },
  state: { type: String, required: false },
  country: { type: String, default: 'India' },


  // Optional Sourcing Parameters for Admin CRM panel compatibility
  company: { type: String, default: 'Prakriti Tea Partner', trim: true },
  address: { type: String, default: '', trim: true },
  teaType: { type: String, default: 'CTC & Orthodox Bulk' },
  monthlyReq: { type: Number, default: 0 },
  purpose: { type: String, default: 'Wholesale Sourcing' },
  businessType: { type: String, default: '1' },
  
  // Security Tokens & Lifecycles
  otpToken: { type: String },
  otpExpires: { type: Date },
  isOtpVerified: { type: Boolean, default: false },
  
  // Layer 4 & 5 Verification States
  approvalStatus: { 
    type: String, 
    default: 'pending', 
    enum: ['pending', 'approved', 'rejected'] 
  }
}, { timestamps: true });

module.exports = mongoose.model('Distributor', DistributorSchema);
