const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const { 
  createPayment, 
  getPaymentsList, 
  getOutstandingPayments, 
  updateStatus, 
  triggerReminder
} = require('./payment.controller');

router.use(authenticate);

const checkPaymentAccess = (req, res, next) => {
  if (
    ['ADMIN', 'MANAGER', 'ACCOUNTS'].includes(req.user.role) ||
    req.user.paymentPermission === true
  ) {
    return next();
  }
  return require('../../utils/response').fail(
    res,
    403,
    'RBAC_FORBIDDEN',
    'Forbidden: Access restricted to Admin, Manager, Accounts or users with payment permission',
    [],
    req
  );
};

router.post('/', checkPaymentAccess, createPayment);
router.get('/outstanding', getOutstandingPayments);
router.get('/', getPaymentsList);
router.patch('/:id/status', updateStatus);
router.patch('/:id', updateStatus); 
router.post('/:id/reminder', triggerReminder);

module.exports = router;


