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
  listJobs,
  listAllJobs,
  createJob,
  updateJob,
  deleteJob
} = require('./career.controller');

// Configure multer storage for resumes
const uploadDir = path.join(process.cwd(), 'uploads', 'resumes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
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
router.post('/', upload.single('resume'), applyJob);
router.get('/jobs', listJobs);

// ----------------------------------------------------
// Authenticated Endpoints
// ----------------------------------------------------
router.get('/', authenticate, listApplications);
router.patch('/:id/status', authenticate, updateApplicationStatus);
router.get('/:id/resume', authenticate, downloadResume);

router.get('/jobs/all', authenticate, listAllJobs);
router.post('/jobs', authenticate, createJob);
router.put('/jobs/:id', authenticate, updateJob);
router.delete('/jobs/:id', authenticate, deleteJob);

module.exports = router;
