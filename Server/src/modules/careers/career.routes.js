const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../middlewares/auth.middleware');
const { 
  applyJob, 
  listApplications, 
  updateApplicationStatus, 
  downloadResume,
  downloadCoverLetter,
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

// ----------------------------------------------------
// Public Endpoints
// ----------------------------------------------------
router.post('/', upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'coverLetter', maxCount: 1 }
]), applyJob);
router.get('/jobs', listJobs);
router.get('/jobs/:id/jd', downloadJobJD);

// ----------------------------------------------------
// Authenticated Endpoints
// ----------------------------------------------------
router.get('/', authenticate, listApplications);
router.patch('/:id/status', authenticate, updateApplicationStatus);
router.get('/:id/resume', authenticate, downloadResume);
router.get('/:id/cover-letter', authenticate, downloadCoverLetter);
router.delete('/:id', authenticate, deleteApplication);


router.get('/jobs/all', authenticate, listAllJobs);
router.post('/jobs', authenticate, upload.fields([{ name: 'jd', maxCount: 1 }]), createJob);
router.put('/jobs/:id', authenticate, upload.fields([{ name: 'jd', maxCount: 1 }]), updateJob);
router.delete('/jobs/:id', authenticate, deleteJob);

module.exports = router;
