const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
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
    password: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    dob: {
      type: Date
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male'
    },
    fatherHusbandName: {
      type: String,
      trim: true
    },
    permanentAddress: {
      type: String,
      trim: true
    },
    currentAddress: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      required: true,
      enum: ['SALES', 'HR', 'IT', 'ADMIN', 'FINANCE', 'OPERATIONS', 'MARKETING'],
      trim: true
    },
    position: {
      type: String,
      required: true,
      trim: true
    },
    joiningDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    employmentType: {
      type: String,
      enum: ['Permanent', 'Contract', 'Probation', 'Internship'],
      default: 'Permanent'
    },
    probationEndDate: {
      type: Date
    },
    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    departmentHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    role: {
      type: String,
      enum: ['EMPLOYEE', 'HR_EXECUTIVE', 'HR_MANAGER', 'ADMIN', 'MANAGER', 'HR'],
      default: 'EMPLOYEE',
      required: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      required: true
    },
    // Banking & Compensation
    salary: {
      type: Number,
      default: 0
    },
    bankName: {
      type: String,
      trim: true
    },
    bankAccountNumber: {
      type: String,
      trim: true
    },
    ifscCode: {
      type: String,
      trim: true
    },
    panCardNumber: {
      type: String,
      trim: true
    },
    aadhaarNumber: {
      type: String,
      trim: true
    },
    // Emergency Contact
    emergencyContactName: {
      type: String,
      trim: true
    },
    emergencyContactRelationship: {
      type: String,
      enum: ['Spouse', 'Parent', 'Sibling', 'Friend', 'Other'],
      default: 'Other'
    },
    emergencyContactPhone: {
      type: String,
      trim: true
    },
    emergencyContactEmail: {
      type: String,
      trim: true
    },
    // Documents
    profileImage: {
      type: String,
      default: ''
    },
    resume: {
      type: String,
      default: ''
    },
    panCardCopy: {
      type: String,
      default: ''
    },
    aadhaarCardCopy: {
      type: String,
      default: ''
    },
    passportPhoto: {
      type: String,
      default: ''
    },
    offerLetter: {
      type: String,
      default: ''
    },
    additionalDocs: [
      {
        type: String
      }
    ],
    // Permissions & Access
    permissions: {
      productUpload: { type: Boolean, default: false },
      lead: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
      document: { type: Boolean, default: false },
      task: { type: Boolean, default: false },
      dispatch: { type: Boolean, default: false },
      payment: { type: Boolean, default: false },
      quotation: { type: Boolean, default: false },
      job: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Employee', employeeSchema);
