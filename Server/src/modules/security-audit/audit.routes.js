const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const { getLogs, getAlerts, revealSensitiveData, interceptBulkExportAttempt, reportScreenshotAttempt } = require('./audit.controller');

router.use(authenticate);

router.get('/alerts', rbac('ADMIN', 'MANAGER'), getAlerts);
router.get('/logs', rbac('ADMIN'), getLogs);
router.post('/reveal', revealSensitiveData);
router.post('/export-attempt', interceptBulkExportAttempt);
router.post('/screenshot-attempt', reportScreenshotAttempt);

module.exports = router;
