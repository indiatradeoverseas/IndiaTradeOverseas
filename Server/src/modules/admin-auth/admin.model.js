const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      default: ''
    },
    passwordHash: {
      type: String,
      required: true
    },
    // System role used by RBAC checks across the CRM (kept aligned with the User model's 'ADMIN' role
    // so an Admin account sees exactly what an ADMIN-role employee sees).
    role: {
      type: String,
      enum: ['ADMIN'],
      default: 'ADMIN'
    },
    // Free-text display title, e.g. "Founder", "Co-founder", "Managing Director".
    designation: {
      type: String,
      default: 'Administrator'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    failedLoginCount: {
      type: Number,
      default: 0
    },
    isEmailVerified: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);
