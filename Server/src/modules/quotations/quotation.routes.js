const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const { 
  requestQuotation, 
  pendingQuotations, 
  approveQuotation, 
  rejectQuotation, 
  bulkApproveQuotations, 
  bulkRejectQuotations, 
  markSentToCustomer, 
  getSummaryReport 
} = require('./quotation.controller');

router.use(authenticate);

router.post('/request', requestQuotation);
router.get('/pending', pendingQuotations);

const checkQuotationApprovalAccess = (req, res, next) => {
  const role = (req.user?.role || '').toUpperCase();
  const dept = (req.user?.department || '').toUpperCase();
  const isAllowedManager =
    role === 'ADMIN' ||
    role === 'SALES_MANAGER' ||
    role === 'TRANSPORT_MANAGER' ||
    role === 'MANAGER' ||
    dept === 'ADMIN' ||
    dept === 'MANAGEMENT' ||
    req.user?.quotationPermission === true;

  if (isAllowedManager) {
    return next();
  }
  return require('../../utils/response').fail(
    res,
    403,
    'RBAC_FORBIDDEN',
    'Forbidden: Access restricted to Admin, Sales Manager, or Transport Manager',
    [],
    req
  );
};

router.patch('/bulk-approve', checkQuotationApprovalAccess, bulkApproveQuotations);
router.patch('/bulk-reject', checkQuotationApprovalAccess, bulkRejectQuotations);
router.patch('/:id/approve', checkQuotationApprovalAccess, approveQuotation);
router.patch('/:id/reject', checkQuotationApprovalAccess, rejectQuotation);
router.patch('/:id/sent-to-customer', markSentToCustomer);
router.get('/summary', rbac('ADMIN', 'MANAGER'), getSummaryReport);

module.exports = router;
