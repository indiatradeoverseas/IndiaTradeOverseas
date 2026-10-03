const mongoose = require('mongoose');

const careerLeadAuditSchema = new mongoose.Schema({
  leadId: {
    type: String,
    required: true,
    index: true
  },
  leadType: {
    type: String,
    enum: ['CAREER_LEAD', 'APPLICATION', 'GENERAL'],
    default: 'CAREER_LEAD'
  },
  candidateName: {
    type: String,
    required: true,
    trim: true
  },
  candidateEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  candidatePhone: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  position: {
    type: String,
    trim: true,
    default: 'General Candidate'
  },
  refNo: {
    type: String,
    trim: true,
    default: ''
  },
  action: {
    type: String,
    enum: [
      'INTERVIEW_SCHEDULED',
      'INTERVIEW_EVALUATED',
      'INTERVIEW_PASSED',
      'INTERVIEW_FAILED',
      'INTERVIEW_ON_HOLD',
      'STATUS_UPDATED',
      'ASSIGNED',
      'PASSED_FORWARDED_TO_HR_MANAGER'
    ],
    required: true
  },
  roundName: {
    type: String,
    default: 'Round 1 - Screening'
  },
  scheduledDate: {
    type: String,
    default: ''
  },
  scheduledTime: {
    type: String,
    default: ''
  },
  meetingLink: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['SCHEDULED', 'PASSED', 'FAILED', 'ON_HOLD', 'CONTACTED', 'NEW', 'HIRED', 'REJECTED', 'REVIEWED', 'PENDING'],
    default: 'SCHEDULED'
  },
  rating: {
    type: Number,
    default: 0
  },
  feedback: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  performedByName: {
    type: String,
    required: true,
    default: 'HR Executive'
  },
  performedByRole: {
    type: String,
    default: 'HR_EXECUTIVE'
  },
  forwardedToHrManager: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

careerLeadAuditSchema.index({ candidateEmail: 1, createdAt: -1 });
careerLeadAuditSchema.index({ leadId: 1, createdAt: -1 });

module.exports = mongoose.model('CareerLeadAudit', careerLeadAuditSchema);
