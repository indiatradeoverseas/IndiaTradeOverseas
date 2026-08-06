const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  distributorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Distributor',
    required: true
  },
  division: {
    type: String,
    enum: ['TEA', 'RICE' , 'STONE'],
    default: 'TEA',
    required: true
  },
  lotId: {
    type: String, // e.g., "PK-AS-091"
    required: true
  },
  region: {
    type: String,
    required: true
  },
  grade: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 200
  },
  basePrice: {
    type: Number,
    required: true
  },
  paymentTerm: {
    type: String,
    enum: ['ADVANCE_100', 'ADVANCE_50', 'COD'],
    required: false
  },
  estimatedValue: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'disapproved'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Proposal', proposalSchema);
