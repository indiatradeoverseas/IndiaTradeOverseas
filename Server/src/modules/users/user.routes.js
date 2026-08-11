const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const {
  createEmployee,
  listUsers,
  deactivateUser,
  getMyProfile,
  updateMyProfile,
  getEmployeeProfile,
  updateEmployeeProfile,
  revealEmployeeField,
  updateEmploymentStatus,
  uploadMyDocument,
  listMyDocuments,
  listEmployeeDocuments
} = require('./user.controller');

const uploadDir = path.join(process.cwd(), 'uploads');
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
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

router.post('/', rbac('ADMIN', 'HR'), createEmployee);
router.get('/', rbac('ADMIN', 'MANAGER', 'HR'), listUsers);
router.patch('/:id/deactivate', rbac('ADMIN'), deactivateUser);

router.get('/me/profile', getMyProfile);
router.patch('/me/profile', updateMyProfile);
router.post('/me/documents', upload.single('file'), uploadMyDocument);
router.get('/me/documents', listMyDocuments);

router.get('/:id/profile', rbac('ADMIN', 'MANAGER', 'HR'), getEmployeeProfile);
router.patch('/:id/profile', rbac('ADMIN', 'MANAGER', 'HR'), updateEmployeeProfile);
router.post('/:id/profile/reveal', rbac('ADMIN'), revealEmployeeField);
router.patch('/:id/employment-status', rbac('ADMIN', 'MANAGER', 'HR'), updateEmploymentStatus);
router.get('/:id/documents', rbac('ADMIN', 'MANAGER', 'HR'), listEmployeeDocuments);

module.exports = router;
