const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  applyJob,
  listApplications,
  updateApplicationStatus,
  submitInterviewFeedback,
  bulkAssignApplications,
  downloadResume,
  downloadCoverLetter,
  submitGateLead,
  listGateLeads,
  listJobs,
  listAllJobs,
  createJob,
  updateJob,
  deleteJob,
  deleteApplication,
  downloadJobJD
} = require('./career.controller');

// Configure multer storage for resumes and cover letters
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let fieldName = 'resumes';
    if (file.fieldname === 'coverLetter') {
      fieldName = 'cover_letters';
    } else if (file.fieldname === 'jd') {
      fieldName = 'job_descriptions';
    }
    const destDir = path.join(process.cwd(), 'uploads', fieldName);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname}`.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Resumes/cover letters are stored as bytes in MongoDB (see career.model.js),
// not on disk, so they're read into memory here instead of written to
// uploads/ - JD uploads below still use the disk-backed `upload` above.
const uploadToMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ----------------------------------------------------
// Public Endpoints
// ----------------------------------------------------
router.post('/', uploadToMemory.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'coverLetter', maxCount: 1 }
]), applyJob);
router.post('/gate-leads', submitGateLead);
router.get('/jobs', listJobs);
router.get('/jobs/:id/jd', downloadJobJD);

// ----------------------------------------------------
// Authenticated Endpoints
// ----------------------------------------------------
router.get('/gate-leads', authenticate, listGateLeads);
router.get('/', authenticate, listApplications);
router.post('/bulk-assign', authenticate, bulkAssignApplications);
router.patch('/:id/status', authenticate, updateApplicationStatus);
router.post('/:id/interviews/:interviewId/feedback', authenticate, submitInterviewFeedback);
router.post('/:id/feedback', authenticate, submitInterviewFeedback);
router.get('/:id/resume', authenticate, downloadResume);
router.get('/:id/cover-letter', authenticate, downloadCoverLetter);
router.delete('/:id', authenticate, deleteApplication);


router.get('/jobs/all', authenticate, listAllJobs);
router.post('/jobs', authenticate, upload.fields([{ name: 'jd', maxCount: 1 }]), createJob);
router.put('/jobs/:id', authenticate, upload.fields([{ name: 'jd', maxCount: 1 }]), updateJob);
router.delete('/jobs/:id', authenticate, deleteJob);

module.exports = router;
