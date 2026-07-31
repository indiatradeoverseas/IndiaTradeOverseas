const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const {
  uploadDocument,
  getDocuments,
  getDocumentDetails,
  downloadDoc,
  approveDocument,
  rejectDocument,
  uploadNewVersion,
  changeAccessLevel,
  deleteDocument
} = require('./document.controller');

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

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});

const checkPermission = require('../../middlewares/permission.middleware');

router.use(authenticate);

router.get('/', checkPermission('documentPermission'), getDocuments);
router.post('/upload', checkPermission('documentPermission'), upload.single('file'), uploadDocument);
router.post('/', checkPermission('documentPermission'), upload.single('file'), uploadDocument); 
router.get('/:id', checkPermission('documentPermission'), getDocumentDetails);
router.get('/:id/download', checkPermission('documentPermission'), downloadDoc);
router.patch('/:id/approve', rbac('ADMIN', 'MANAGER'), approveDocument);
router.patch('/:id/reject', rbac('ADMIN', 'MANAGER'), rejectDocument);
router.post('/:id/new-version', checkPermission('documentPermission'), upload.single('file'), uploadNewVersion);
router.patch('/:id/access-level', rbac('ADMIN', 'MANAGER'), changeAccessLevel);
router.delete('/:id', rbac('ADMIN'), deleteDocument); 

module.exports = router;
