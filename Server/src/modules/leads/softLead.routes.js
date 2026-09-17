const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const {
  createSoftLead,
  updateSoftLeadDetails,
  getSoftLead,
  listSoftLeads,
  retryCrmSync,
} = require('./softLead.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');

const softLeadCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, errorCode: 'RATE_LIMITED', message: 'Too many lead submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', softLeadCreateLimiter, createSoftLead);
router.get('/:leadId', getSoftLead);
router.patch('/:leadId/details', updateSoftLeadDetails);
router.post('/:leadId/retry-crm', retryCrmSync);

router.use(authenticate);
router.get('/', checkPermission('leadPermission', 'taskPermission'), listSoftLeads);

module.exports = router;