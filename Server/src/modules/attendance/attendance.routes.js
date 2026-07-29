const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const { checkIn, checkOut, getMyTodayStatus, getReport, cleanupOrphaned } = require('./attendance.controller');

router.use(authenticate);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/me/today', getMyTodayStatus);
router.get('/report', rbac('ADMIN', 'MANAGER', 'HR'), getReport);
router.delete('/cleanup-orphaned', rbac('ADMIN'), cleanupOrphaned);

module.exports = router;
