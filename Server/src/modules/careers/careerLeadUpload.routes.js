const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  uploadSingleCareerLead,
  bulkUploadCareerLeads,
  getCareerLeads,
  updateCareerLeadStatus,
  deleteCareerLead,
  getHRExecutives,
  assignCareerLead,
  bulkAssignCareerLeads
} = require('./careerLeadUpload.controller');

// Authenticated Career Leads endpoints
router.get('/hr-executives', authenticate, getHRExecutives);
router.get('/', authenticate, getCareerLeads);
router.post('/upload', authenticate, uploadSingleCareerLead);
router.post('/bulk-upload', authenticate, bulkUploadCareerLeads);
router.post('/bulk-assign', authenticate, bulkAssignCareerLeads);
router.patch('/:id/status', authenticate, updateCareerLeadStatus);
router.patch('/:id/assign', authenticate, assignCareerLead);
router.delete('/:id', authenticate, deleteCareerLead);

module.exports = router;
