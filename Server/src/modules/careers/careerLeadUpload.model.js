const mongoose = require('mongoose');

const careerLeadUploadSchema = new mongoose.Schema({
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
    trim: true,
    default: 'General Candidate'
  },
  experience: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  location: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  refNo: {
    type: String,
    trim: true,
    default: ''
  },
  result: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['NEW', 'CONTACTED', 'INTERVIEW_SCHEDULED', 'HIRED', 'REJECTED', 'NOT_APPLIED'],
    default: 'NEW'
  },
  source: {
    type: String,
    trim: true,
    default: 'MANUAL_UPLOAD'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadedByName: {
    type: String,
    default: 'HR Manager'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedToName: {
    type: String,
    default: ''
  },
  assignedToEmail: {
    type: String,
    default: ''
  },
  assignedAt: {
    type: Date,
    default: null
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedByName: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for fast search and listing
careerLeadUploadSchema.index({ email: 1 });
careerLeadUploadSchema.index({ fullName: 'text', email: 'text', phone: 'text', position: 'text' });

module.exports = mongoose.model('CareerLeadUpload', careerLeadUploadSchema);
