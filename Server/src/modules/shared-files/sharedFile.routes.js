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

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, `shared-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB max
});

router.post('/', authenticate, upload.single('file'), sharedFileController.shareFile);
router.get('/', authenticate, sharedFileController.getSharedFiles);
router.get('/:id/download', authenticate, sharedFileController.downloadFile);
router.delete('/:id', authenticate, sharedFileController.deleteSharedFile);

module.exports = router;
