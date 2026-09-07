const router = require('express').Router();

// 🟢 Added getProposalsByDistributorId to the destructured imports
const {
  createProposal,
  getAllProposals,
  updateProposalStatus,
  deleteProposal,
  getProposalsByDistributorId
} = require('./proposal.controller');

const { authenticate, authenticateDistributor } = require('../../middlewares/auth.middleware');

const checkAdminManagerHR = (req, res, next) => {
  const userRole = (req.user?.role || '').toUpperCase();
  const allowedRoles = ['ADMIN', 'MANAGER', 'SALES_MANAGER', 'FINANCE_MANAGER', 'TRANSPORT_MANAGER', 'HR', 'EXECUTIVE', 'SALES_EXECUTIVE', 'EMPLOYEE'];
  if (allowedRoles.includes(userRole) || userRole.includes('MANAGER') || userRole.includes('EXECUTIVE') || userRole.includes('ADMIN')) {
    return next();
  }
  return require('../../utils/response').fail(res, 403, 'FORBIDDEN', 'Access denied. Unauthorized role.');
};

// Distributor Routes
router.post('/proposals', authenticateDistributor, createProposal);
router.get('/proposals/distributor/:distributorId', authenticateDistributor, getProposalsByDistributorId);

// Admin / Staff Management Routes
router.get('/proposals/active', authenticate, checkAdminManagerHR, getAllProposals);
router.patch('/proposals/:id/status', authenticate, checkAdminManagerHR, updateProposalStatus);
router.delete('/proposals/:id', authenticate, checkAdminManagerHR, deleteProposal);

module.exports = router;
