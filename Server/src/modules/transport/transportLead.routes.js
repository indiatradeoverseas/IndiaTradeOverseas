const express = require('express');
const router = express.Router();
const transportLeadController = require('./transportLead.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

// All transport lead endpoints require authentication
router.use(authenticate);

router.post('/', transportLeadController.createTransportLead);
router.post('/bulk', transportLeadController.bulkUploadTransportLeads);
router.get('/', transportLeadController.getTransportLeads);
router.patch('/:id/assign-drivers', transportLeadController.assignMultipleDrivers);
router.patch('/:id/status', transportLeadController.updateTransportLeadStatus);
router.delete('/:id', transportLeadController.deleteTransportLead);

module.exports = router;
