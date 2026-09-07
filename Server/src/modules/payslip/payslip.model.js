const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    month: {
      type: String, // e.g. "July 2026"
      required: true
    },
    netAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['PAID', 'PENDING'],
      default: 'PAID'
    },
    gridFsFileId: {
      type: String,
      default: null
    },
    fileUrl: {
      type: String,
      default: ''
    },
    fileOriginalName: {
      type: String,
      default: ''
    },
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    allowance: { type: Number, default: 0 },
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    grossAmount: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Payslip', payslipSchema);
