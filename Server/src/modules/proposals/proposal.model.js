const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  distributorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Distributor',
    required: true
  },
  lotId: {
    type: String, // e.g., "PK-AS-091"
    required: true
  },
  region: {
    type: String, // e.g., "Assam Upper Track"
    required: true
  },
  grade: {
    type: String, // e.g., "BP (Broken Pekoe)"
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 200 // Enforce our 200 Kg minimum constraint
  },
  basePrice: {
    type: Number,
    required: true
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
