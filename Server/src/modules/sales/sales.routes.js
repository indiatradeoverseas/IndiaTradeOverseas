const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const { getMyPerformance, getMyTarget, setTarget, listTargets, getLeaderboard } = require('./sales.controller');

router.use(authenticate);

router.get('/performance/me', getMyPerformance);
router.get('/targets/me', getMyTarget);
router.post('/targets', rbac('ADMIN'), setTarget);
router.get('/targets', rbac('ADMIN', 'MANAGER'), listTargets);
router.get('/leaderboard', rbac('ADMIN', 'MANAGER'), getLeaderboard);

module.exports = router;
