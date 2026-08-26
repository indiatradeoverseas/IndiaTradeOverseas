const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const payslipController = require('./payslip.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../../uploads/payslips');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration for PDF files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, `payslip-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for payslips'), false);
    }
  }
});

router.post('/', authenticate, upload.single('file'), payslipController.uploadPayslip);
router.get('/employee/:employeeId', authenticate, payslipController.getEmployeePayslips);
router.get('/:id/download', authenticate, payslipController.downloadPayslipFile);
router.delete('/:id', authenticate, payslipController.deletePayslip);

module.exports = router;
