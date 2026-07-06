const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const { getAdminSummary, getPipelineReport, getPerformanceReport } = require('./report.controller');

router.use(authenticate, rbac('ADMIN', 'MANAGER'));

router.get('/admin-summary', getAdminSummary);
router.get('/employee-performance', getPerformanceReport);
router.get('/employee/:id/performance', getPerformanceReport);
router.get('/pipeline', getPipelineReport);

module.exports = router;
