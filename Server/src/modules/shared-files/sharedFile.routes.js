const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const sharedFileController = require('./sharedFile.controller');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../../uploads/shared-files');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Memory storage configuration for GridFS MongoDB upload (25 MB max limit)
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE }
});

// Middleware wrapper for multer to return clean 400 error on 25MB limit breach
function handleFileUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds maximum allowed limit of 25MB'
        });
      }
      return res.status(400).json({
        success: false,
        code: 'UPLOAD_ERROR',
        message: err.message
      });
    }
    next();
  });
}

router.get('/recipients', authenticate, sharedFileController.getRecipients);
router.post('/', authenticate, handleFileUpload, sharedFileController.shareFile);
router.get('/', authenticate, sharedFileController.getSharedFiles);
router.get('/gridfs/:gridFsFileId', authenticate, sharedFileController.downloadGridFSFileDirect);
router.get('/:id/download', authenticate, sharedFileController.downloadFile);
router.delete('/:id', authenticate, sharedFileController.deleteSharedFile);

module.exports = router;

