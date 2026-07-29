const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const { checkIn, checkOut, getMyTodayStatus, getReport } = require('./attendance.controller');

router.use(authenticate);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/me/today', getMyTodayStatus);
router.get('/report', rbac('ADMIN', 'MANAGER', 'HR'), getReport);

module.exports = router;
