const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const { checkIn, checkOut, startLunch, endLunch, getMyTodayStatus, getReport, getMyHistory, cleanupOrphaned } = require('./attendance.controller');

router.use(authenticate);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.post('/lunch-start', startLunch);
router.post('/lunch-end', endLunch);
router.get('/me/today', getMyTodayStatus);
router.get('/me/history', getMyHistory);
router.get('/report', rbac('ADMIN', 'MANAGER', 'HR'), getReport);
router.delete('/cleanup-orphaned', rbac('ADMIN'), cleanupOrphaned);

module.exports = router;
