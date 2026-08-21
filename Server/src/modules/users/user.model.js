const mongoose = require('mongoose');

const employmentHistorySchema = new mongoose.Schema(
  {
    event: { type: String, required: true },
    fromValue: { type: String, default: '' },
    toValue: { type: String, default: '' },
    note: { type: String, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.Mixed },
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
    jobPermission: {
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

    // Sensitive fields — stored encrypted, masked copy kept for list/display use
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
    },
    probationEndDate: { type: Date, default: null },
    confirmationDate: { type: Date, default: null },
    lastWorkingDay: { type: Date, default: null },
    employmentHistory: { type: [employmentHistorySchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
