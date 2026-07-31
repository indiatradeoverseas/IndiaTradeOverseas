const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  registerDistributor,
  verifyDistributorOtp,
  resendDistributorOtp,
  getDistributorStatus,
  getDistributors,
  toggleDistributorVerification,
  deleteDistributor,
  downloadGstCertificate,
  downloadUdyamCertificate,
  createRazorpayOrder,
  verifyRazorpayPayment,
  createPaypalOrder,
  capturePaypalOrder
} = require('./distributor.controller');


const { authenticate } = require('../../middlewares/auth.middleware');

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


router.post(
  '/',
  upload.fields([
    { name: 'doc1', maxCount: 1 },
    { name: 'doc2', maxCount: 1 },
    { name: 'primaryDocument', maxCount: 1 },
    { name: 'secondaryDocument', maxCount: 1 }
  ]),
  registerDistributor
);



router.post('/verify-otp', verifyDistributorOtp);
router.post('/resend-otp', resendDistributorOtp);
router.get('/status/:id', getDistributorStatus);

const { authenticateDistributor } = require('../../middlewares/auth.middleware');
router.post('/payments/razorpay/create-order', authenticateDistributor, createRazorpayOrder);
router.post('/payments/razorpay/verify-payment', authenticateDistributor, verifyRazorpayPayment);
router.post('/payments/paypal/create-order', authenticateDistributor, createPaypalOrder);
router.post('/payments/paypal/capture-order', authenticateDistributor, capturePaypalOrder);

router.get('/', authenticate, checkAdminManagerHR, getDistributors);
router.patch('/:id/verify', authenticate, checkAdminManagerHR, toggleDistributorVerification);
router.delete('/:id', authenticate, checkAdminManagerHR, deleteDistributor);
router.get('/:id/gst-certificate', authenticate, checkAdminManagerHR, downloadGstCertificate);
router.get('/:id/udyam-certificate', authenticate, checkAdminManagerHR, downloadUdyamCertificate);

// Proposals Router Integration
const proposalsRouter = require('../proposals/proposals.route');
router.use('/', proposalsRouter);

module.exports = router;
