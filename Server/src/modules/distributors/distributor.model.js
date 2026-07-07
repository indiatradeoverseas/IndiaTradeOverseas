const mongoose = require('mongoose');

const distributorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  mobile: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  gstCertificatePath: {
    type: String,
    required: true
  },
  gstCertificateOriginalName: {
    type: String,
    required: true
  },
  udyamCertificatePath: {
    type: String,
    required: true
  },
  udyamCertificateOriginalName: {
    type: String,
    required: true
  },
  otp: {
    type: String
  },
  otpExpiresAt: {
    type: Date
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Distributor', distributorSchema);
