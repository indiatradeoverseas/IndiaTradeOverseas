const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  createLeave,
  getMyBalance,
  listLeaves,
  reviewLeave,
  resetMonthlyBalances,
  getSettings,
  updateSettings,
  getAllBalances,
  getAuditLogs
} = require('./leave.controller');

router.use(authenticate);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Balances and Audits
router.get('/balances', getAllBalances);
router.get('/audit-logs', getAuditLogs);
router.get('/balance/me', getMyBalance);

// Core leave request actions
router.post('/', createLeave);
router.get('/', listLeaves);
router.patch('/:id/review', reviewLeave);
router.post('/reset', resetMonthlyBalances);

module.exports = router;
