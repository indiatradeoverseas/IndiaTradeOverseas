const router = require('express').Router();

const {
  createItoAdsOrder,
  getAllItoAdsOrders,
  updateItoAdsOrderStatus,
  deleteItoAdsOrder
} = require('./itoAdsOrder.controller');

const { authenticate } = require('../../middlewares/auth.middleware');

const checkAdminManager = (req, res, next) => {
  const role = (req.user?.role || '').toUpperCase();
  const allowed = ['ADMIN','MANAGER','SALES_MANAGER','FINANCE_MANAGER','HR_MANAGER','FOUNDER','CO_FOUNDER'];
  if (allowed.includes(role) || role.includes('MANAGER') || role.includes('ADMIN') || role.includes('FOUNDER')) return next();
  return require('../../utils/response').fail(res, 403, 'FORBIDDEN', 'Access denied.');
};

// Public create (called from frontend after payment verification)
router.post('/orders', createItoAdsOrder);

// Admin list
router.get('/orders', authenticate, checkAdminManager, getAllItoAdsOrders);
router.patch('/orders/:id/status', authenticate, checkAdminManager, updateItoAdsOrderStatus);
router.delete('/orders/:id', authenticate, checkAdminManager, deleteItoAdsOrder);

module.exports = router;