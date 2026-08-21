const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const {
  checkIn,
  checkOut,
  getMyTodayStatus,
  getMyHistory,
  getReport,
  triggerBiometricSync,
  getBiometricStatus
} = require('./attendance.controller');

router.use(authenticate);

// Employee endpoints
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/me/today', getMyTodayStatus);
router.get('/me/history', getMyHistory);

// HR/Manager endpoints
router.get('/report', rbac('ADMIN', 'MANAGER', 'HR', 'HR_MANAGER', 'HR_EXECUTIVE'), getReport);
router.post('/biometric/sync', rbac('ADMIN', 'HR', 'HR_MANAGER'), triggerBiometricSync);
router.get('/biometric/status', getBiometricStatus);

module.exports = router;
