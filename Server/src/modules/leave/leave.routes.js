const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  createLeave,
  getMyBalance,
  listLeaves,
  getLeaveById,
  reviewLeave,
  cancelLeave
} = require('./leave.controller');

router.use(authenticate);

router.post('/', createLeave);
router.get('/', listLeaves);
router.get('/balance/me', getMyBalance);
router.get('/:id', getLeaveById);
router.patch('/:id/review', reviewLeave);
router.patch('/:id/cancel', cancelLeave);

module.exports = router;
