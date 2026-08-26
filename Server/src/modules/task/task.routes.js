const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const taskController = require('./task.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../../uploads/task-attachments');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for task file attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, `task-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'text/csv',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

router.post('/', authenticate, upload.single('file'), taskController.createTask);
router.post('/assign', authenticate, upload.single('file'), taskController.createTask);
router.get('/', authenticate, taskController.getTasks);
router.get('/employees', authenticate, taskController.getEmployeesByDepartment);
router.patch('/:id', authenticate, upload.single('file'), taskController.updateTaskStatus);
router.delete('/:id', authenticate, taskController.deleteTask);

module.exports = router;
