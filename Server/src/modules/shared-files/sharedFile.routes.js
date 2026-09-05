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

// Memory storage configuration for GridFS MongoDB upload
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB max
});

router.post('/', authenticate, upload.single('file'), sharedFileController.shareFile);
router.get('/', authenticate, sharedFileController.getSharedFiles);
router.get('/gridfs/:gridFsFileId', sharedFileController.downloadGridFSFileDirect);
router.get('/:id/download', authenticate, sharedFileController.downloadFile);
router.delete('/:id', authenticate, sharedFileController.deleteSharedFile);

module.exports = router;
