const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  register,
  login,
  getProfile,
  getNextEmployeeId,
  getListManagers,
  signupEmployee,
  signupEmployeeSelfRegistration,
  sendSignupOtp,
  verifySignupOtp,
  listEmployees,
  getEmployeesCount,
  getEmployeeStatus,
  updateEmployeeStatus,
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getPendingEmployees,
  approveEmployee,
  rejectEmployee,
  uploadEmployeeDocument,
  getMyEmployeeDocuments,
  getEmployeeDocuments
} = require('./employee.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');

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

const adminOnly = [authenticate, rbac('ADMIN', 'MANAGER', 'HR_MANAGER')];
const hrOnly = [authenticate, rbac('ADMIN', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR')];

router.get('/next-id', getNextEmployeeId);
router.get('/list-managers', getListManagers);
router.get('/all', authenticate, getAllEmployees);

// Self-registration endpoint (public - no auth required)
router.post('/signup/request', signupEmployeeSelfRegistration);

// OTP-based signup flow (public - no auth required)
router.post('/signup/send-otp', sendSignupOtp);
router.post('/signup/verify-otp', verifySignupOtp);

// Direct signup endpoint
router.post('/signup', signupEmployee);

// Pending employees management (HR/Admin only)
router.get('/pending', ...hrOnly, getPendingEmployees);
router.post('/pending/:id/approve', ...hrOnly, approveEmployee);
router.post('/pending/:id/reject', ...hrOnly, rejectEmployee);

// Document Endpoints for Employee collection
router.post('/me/documents', authenticate, upload.single('file'), uploadEmployeeDocument);
router.get('/me/documents', authenticate, getMyEmployeeDocuments);
router.get('/:id/documents', authenticate, getEmployeeDocuments);

router.post('/', ...adminOnly, createEmployee);
router.patch('/:id', ...adminOnly, updateEmployee);
router.delete('/:id', ...adminOnly, deleteEmployee);

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/me', authenticate, getProfile);

// Dashboard / Management endpoints
router.get('/', authenticate, listEmployees);
router.get('/count', authenticate, getEmployeesCount);
router.get('/:id/status', authenticate, getEmployeeStatus);
router.post('/:id/status', authenticate, updateEmployeeStatus);

module.exports = router;
