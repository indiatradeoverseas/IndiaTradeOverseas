const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { 
  registerDistributor, 
  verifyDistributorOtp,
  getDistributorStatus,
  getDistributors,
  toggleDistributorVerification,
  deleteDistributor,
  downloadGstCertificate,
  downloadUdyamCertificate
} = require('./distributor.controller');

const { authenticate } = require('../../middlewares/auth.middleware');

// Configure multer storage for distributor documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destDir = path.join(process.cwd(), 'uploads', 'distributor_docs');
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

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE: Allowed formats are PDF, PNG, JPG, JPEG, DOC, DOCX.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const checkAdminManagerHR = (req, res, next) => {
  if (['ADMIN', 'MANAGER', 'HR'].includes(req.user.role)) {
    return next();
  }
  return require('../../utils/response').fail(res, 403, 'FORBIDDEN', 'Access denied. Unauthorized role.');
};

// ==========================================
// Public Routes
router.post(
  '/', 
  upload.fields([
    { name: 'doc1', maxCount: 1 },
    { name: 'doc2', maxCount: 1 }
  ]), 
  registerDistributor
);

router.post('/verify-otp', verifyDistributorOtp);
router.get('/status/:id', getDistributorStatus);

// ==========================================
// Authenticated/Protected Admin Routes
// ==========================================
router.get('/', authenticate, checkAdminManagerHR, getDistributors);
router.patch('/:id/verify', authenticate, checkAdminManagerHR, toggleDistributorVerification);
router.delete('/:id', authenticate, checkAdminManagerHR, deleteDistributor);
router.get('/:id/gst-certificate', authenticate, checkAdminManagerHR, downloadGstCertificate);
router.get('/:id/udyam-certificate', authenticate, checkAdminManagerHR, downloadUdyamCertificate);

module.exports = router;
