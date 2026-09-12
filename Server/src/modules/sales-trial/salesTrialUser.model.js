const mongoose = require('mongoose');

const salesTrialUserSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.Mixed },
    trialId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      default: ''
    },
    profileImage: {
      type: String,
      default: ''
    },
    dateOfBirth: {
      type: Date,
      default: null
    },
    dob: {
      type: Date,
      default: null
    },
    age: {
      type: Number,
      default: 28
    },
    fatherName: {
      type: String,
      default: ''
    },
    fatherHusbandName: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    currentAddress: {
      type: String,
      default: ''
    },
    permanentAddress: {
      type: String,
      default: ''
    },
    addressCont: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    postalCode: {
      type: String,
      default: ''
    },
    emergencyContactName: {
      type: String,
      default: ''
    },
    emergencyContactPhone: {
      type: String,
      default: ''
    },
    levelOfEducation: {
      type: String,
      default: ''
    },
    degree: {
      type: String,
      default: ''
    },
    hardSkill: {
      type: String,
      default: ''
    },
    softSkill: {
      type: String,
      default: ''
    },
    taxNumber: {
      type: String,
      default: ''
    },
    bankName: {
      type: String,
      default: ''
    },
    bankIFSC: {
      type: String,
      default: ''
    },
    ifscCode: {
      type: String,
      default: ''
    },
    nationality: {
      type: String,
      default: 'India'
    },
    gender: {
      type: String,
      default: 'Male'
    },
    employmentType: {
      type: String,
      default: 'Permanent'
    },
    role: {
      type: String,
      default: 'SALES_TRIAL'
    },
    department: {
      type: String,
      default: 'SALES_TRIAL'
    },
    position: {
      type: String,
      default: 'Sales Trial Executive'
    },
    assignedManager: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    assignedManagerName: {
      type: String,
      default: 'Sales Manager'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'PENDING_APPROVAL'],
      default: 'ACTIVE'
    },
    isApproved: {
      type: Boolean,
      default: true
    },
    isOtpVerified: {
      type: Boolean,
      default: false
    },
    otpCode: {
      type: String,
      default: null
    },
    otpExpiresAt: {
      type: Date,
      default: null
    },
    joiningDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SalesTrialUser', salesTrialUserSchema);
