const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.Mixed },
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
    lockUntil: {
      type: Date,
      default: null
    },
    isEmailVerified: {
      type: Boolean,
      default: true
    },
    // Extended personal profile
    profileImage: { type: String, default: '' },
    fatherName: { type: String, default: '' },
    dateOfBirth: { type: Date, default: null },
    address: { type: String, default: '' },
    addressCont: { type: String, default: '' },
    city: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    levelOfEducation: { type: String, default: 'Higher Education' },
    degree: { type: String, default: 'Electrical Engineering' },
    hardSkill: { type: String, default: 'Technical Support' },
    softSkill: { type: String, default: 'Communication' },
    taxNumber: { type: String, default: '' },
    nationality: { type: String, default: 'India' },
    age: { type: Number, default: 28 },
    emergencyContactName: { type: String, default: '' },
    emergencyContactPhone: { type: String, default: '' },
    dateOfJoining: { type: Date, default: null },

    // Sensitive fields
    salaryEncrypted: { type: String, default: '' },
    panEncrypted: { type: String, default: '' },
    panMasked: { type: String, default: '' },
    aadhaarEncrypted: { type: String, default: '' },
    aadhaarMasked: { type: String, default: '' },
    bankAccountEncrypted: { type: String, default: '' },
    bankAccountMasked: { type: String, default: '' },
    bankIFSC: { type: String, default: '' },
    bankName: { type: String, default: '' },

    // Employee lifecycle
    employmentStatus: {
      type: String,
      enum: ['PROBATION', 'CONFIRMED', 'ON_NOTICE', 'RESIGNED', 'TERMINATED'],
      default: 'CONFIRMED'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);
