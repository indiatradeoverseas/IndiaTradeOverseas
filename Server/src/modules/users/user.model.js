const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    fullName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    phone: {
      type: String
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['ADMIN', 'MANAGER', 'SALES', 'PROCUREMENT', 'ACCOUNTS', 'HR', 'IT', 'FINANCE', 'SOFTWARE_ENGINEER', 'SYSTEM', 'AI'],
      required: true,
      default: ''
    },
    department: {
      type: String,
      enum: ['STONE', 'COAL', 'TEA', 'RICE', 'TRANSPORT', 'ADMIN', 'IT', 'PROCUREMENT', 'ACCOUNTS', 'HR', 'SALES', 'CRM', 'FINANCE'],
      required: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    failedLoginCount: {
      type: Number,
      default: 0
    },
    exportPermission: {
      type: Boolean,
      default: false
    },
    productUploadPermission: {
      type: Boolean,
      default: false
    },
    leadPermission: {
      type: Boolean,
      default: false
    },
    documentPermission: {
      type: Boolean,
      default: false
    },
    taskPermission: {
      type: Boolean,
      default: false
    },
    dispatchPermission: {
      type: Boolean,
      default: false
    },
    paymentPermission: {
      type: Boolean,
      default: false
    },
    quotationPermission: {
      type: Boolean,
      default: false
    },
    otp: {
      type: String,
      default: null
    },
    otpExpires: {
      type: Date,
      default: null
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
