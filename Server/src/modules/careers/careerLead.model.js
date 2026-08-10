const mongoose = require('mongoose');

// Captures everyone who completes the BuyerEntryGate details step on the
// Careers page, whether or not they go on to submit a full job application
// (see career.model.js for the actual CareerApplication). Upserted by email
// so re-submitting the gate (e.g. after clearing localStorage) updates the
// same record instead of creating duplicates.
const careerLeadSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CareerLead', careerLeadSchema);
