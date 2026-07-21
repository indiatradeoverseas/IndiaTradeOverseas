const router = require('express').Router();

const {
  createProposal,
  getAllProposals,
  updateProposalStatus
} = require('./proposal.controller');

const { authenticate, authenticateDistributor } = require('../../middlewares/auth.middleware');

const checkAdminManagerHR = (req, res, next) => {
  if (['ADMIN', 'MANAGER', 'HR'].includes(req.user.role)) {
    return next();
  }
  return require('../../utils/response').fail(res, 403, 'FORBIDDEN', 'Access denied. Unauthorized role.');
};

router.post('/proposals', authenticateDistributor, createProposal);
router.get('/proposals/distributor/:distributorId', authenticateDistributor, getProposalsByDistributorId);
router.get('/proposals/active', authenticate, checkAdminManagerHR, getAllProposals);
router.patch('/proposals/:id/status', authenticate, checkAdminManagerHR, updateProposalStatus);

module.exports = router;
