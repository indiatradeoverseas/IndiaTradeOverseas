const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const {
  checkIn,
  checkOut,
  startLunch,
  endLunch,
  getMyTodayStatus,
  getMyHistory,
  getReport,
  triggerBiometricSync,
  getBiometricStatus,
  markAttendanceManually
} = require('./attendance.controller');

router.use(authenticate);

// Employee endpoints
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.post('/lunch-start', startLunch);
router.post('/lunch-end', endLunch);
router.get('/me/today', getMyTodayStatus);
router.get('/me/history', getMyHistory);

// HR/Manager endpoints
router.get('/report', getReport);
router.post('/manual', markAttendanceManually);
router.post('/biometric/sync', rbac('ADMIN', 'HR', 'HR_MANAGER'), triggerBiometricSync);
router.get('/biometric/status', getBiometricStatus);

module.exports = router;
