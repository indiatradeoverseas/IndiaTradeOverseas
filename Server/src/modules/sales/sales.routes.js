const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const { 
  getMyPerformance, 
  getMyTarget, 
  setTarget, 
  listTargets, 
  getLeaderboard, 
  getStrategicInsights, 
  getCoachingMessages, 
  sendCoachingMessage,
  submitDailyWorkLog,
  getDailyWorkLogs
} = require('./sales.controller');

router.use(authenticate);

router.get('/performance/me', getMyPerformance);
router.get('/targets/me', getMyTarget);
router.post('/targets', rbac('ADMIN', 'MANAGER', 'SALES_MANAGER'), setTarget);
router.get('/targets', rbac('ADMIN', 'MANAGER', 'SALES_MANAGER'), listTargets);
router.get('/leaderboard', rbac('ADMIN', 'MANAGER', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'SALES', 'EMPLOYEE'), getLeaderboard);
router.get('/strategic-insights', rbac('ADMIN', 'MANAGER', 'SALES_MANAGER', 'SALES'), getStrategicInsights);
router.get('/coaching-messages', rbac('ADMIN', 'MANAGER', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'SALES', 'EMPLOYEE', 'HR_EXECUTIVE', 'HR'), getCoachingMessages);
router.post('/coaching-messages', rbac('ADMIN', 'MANAGER', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'SALES', 'EMPLOYEE', 'HR_EXECUTIVE', 'HR'), sendCoachingMessage);

router.post('/daily-work-logs', submitDailyWorkLog);
router.get('/daily-work-logs', getDailyWorkLogs);

module.exports = router;
