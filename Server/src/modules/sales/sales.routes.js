const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const { getMyPerformance, getMyTarget, setTarget, listTargets, getLeaderboard } = require('./sales.controller');

router.use(authenticate);

router.get('/performance/me', getMyPerformance);
router.get('/targets/me', getMyTarget);
router.post('/targets', rbac('ADMIN', 'MANAGER', 'SALES_MANAGER'), setTarget);
router.get('/targets', rbac('ADMIN', 'MANAGER', 'SALES_MANAGER'), listTargets);
router.get('/leaderboard', rbac('ADMIN', 'MANAGER', 'SALES_MANAGER'), getLeaderboard);

module.exports = router;
