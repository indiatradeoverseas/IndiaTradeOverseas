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
    fileUrl: {
      type: String,
      required: true
    },
    fileOriginalName: {
      type: String,
      required: true
    },
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
