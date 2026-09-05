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

// Multer memory storage configuration for PDF files to store in MongoDB GridFS
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.includes('pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for payslips'), false);
    }
  }
});

router.post('/', authenticate, upload.single('file'), payslipController.uploadPayslip);
router.post('/generate', authenticate, payslipController.generatePayslip);
router.get('/employee/:employeeId', authenticate, payslipController.getEmployeePayslips);
router.get('/:id/download', authenticate, payslipController.downloadPayslipFile);
router.delete('/:id', authenticate, payslipController.deletePayslip);

module.exports = router;
