const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const controller = require('./employeeActivity.controller');

router.use(authenticate);

router.post('/heartbeat', controller.handleHeartbeat);
router.post('/log-action', controller.handleLogCrmAction);
router.get('/live-status', controller.getLiveStatuses);
router.get('/reports', controller.getReports);
router.get('/6pm-report', controller.get6PMReport);
router.get('/export', controller.exportReportsCSV);

module.exports = router;
