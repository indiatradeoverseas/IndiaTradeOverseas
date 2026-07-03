const mongoose = require('mongoose');

const careerApplicationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  resumePath: {
    type: String,
    required: true
  },
  resumeOriginalName: {
    type: String,
    required: true
  },
  coverLetter: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'REVIEWED', 'ACCEPTED'],
    default: 'PENDING'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CareerApplication', careerApplicationSchema);
