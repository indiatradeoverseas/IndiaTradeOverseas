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
  // Resume/cover-letter bytes live in MongoDB, not on local disk - Render's
  // filesystem is ephemeral and wipes uploads/ on every restart/redeploy,
  // which was silently losing previously-uploaded resumes. Files are capped
  // at 5MB by multer (see career.routes.js), well within MongoDB's 16MB
  // document limit.
  resumeData: {
    type: Buffer
  },
  resumeContentType: {
    type: String
  },
  resumeOriginalName: {
    type: String,
    required: true
  },
  coverLetter: {
    type: String,
    trim: true
  },
  coverLetterData: {
    type: Buffer
  },
  coverLetterContentType: {
    type: String
  },
  coverLetterOriginalName: {
    type: String,
    trim: true
  },
  // Legacy disk-path fields, kept only so applications submitted before this
  // migration can still be looked up by downloadResume/downloadCoverLetter's
  // fallback path - no longer written for new applications.
  resumePath: {
    type: String
  },
  coverLetterPath: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED'],
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
