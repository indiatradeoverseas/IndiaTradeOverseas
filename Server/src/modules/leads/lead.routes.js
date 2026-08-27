const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { getLeadsList, getLeadDetails, changeLeadStage, assignLead, assignLeadsBulk, bulkImportLeads } = require('./lead.controller');
const {getSalesMetrics} = require('./leadManagement.controller.js');
const { createFromChat } = require('./ai-agent/aiLead.controller');

const {
  createManualLead,
  getDueReminders,
  uploadVoiceNote,
  streamVoiceNote,
  addActivity,
  logWhatsAppActivity,
  logEmailActivity,
  uploadCallRecording,
  getCallRecordings,
  streamCallRecording
} = require('./leadManagement.controller');

// Multer setup for lead voice notes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destDir = path.join(process.cwd(), 'uploads', 'voice_notes');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname}`.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for audio clips
});

// Public route: used by the unauthenticated Quote Request form (Client/src/pages/public/QuoteRequest.jsx)
// and the public chat widget. Must stay above router.use(authenticate) below.
router.post('/from-chat', createFromChat);

router.use(authenticate);

router.post('/score', async (req, res, next) => {
  try {
    const { score, priority } = require('./ai-agent/leadScoring.service').scoreAndClassifyLead(req.body);
    return require('../../utils/response').ok(res, { score, priority }, 'Lead scored successfully', 200, req);
  } catch (error) {
    next(error);
  }
});

router.get('/', checkPermission('leadPermission', 'taskPermission', 'paymentPermission', 'dispatchPermission', 'quotationPermission'), getLeadsList);
router.get('/unassigned', rbac('ADMIN', 'MANAGER', 'HR'), checkPermission('leadPermission', 'taskPermission'), async (req, res, next) => {
  try {
    const Lead = require('./lead.model');
    const { getLeadDisplay } = require('./lead.service');
    const leads = await Lead.find({ assignedTo: null }).sort({ createdAt: -1 });
    return require('../../utils/response').ok(res, { leads: leads.map(l => getLeadDisplay(l, req.user)) }, 'Unassigned leads list', 200, req);
  } catch (error) {
    next(error);
  }
});

// Reminders & Creation Routes
router.get('/reminders/due', checkPermission('leadPermission', 'taskPermission'), getDueReminders);
router.post('/', checkPermission('leadPermission', 'taskPermission'), createManualLead);
router.post('/assign', rbac('ADMIN', 'MANAGER', 'SALES_MANAGER'), assignLeadsBulk);
router.post('/bulk-import', rbac('ADMIN', 'MANAGER', 'SALES_MANAGER'), bulkImportLeads);

// Multer setup for Call Recordings
const callRecordingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destDir = path.join(process.cwd(), 'uploads', 'call_recordings');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const safeName = `call-${Date.now()}-${file.originalname}`.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safeName);
  }
});

const uploadCallAudio = multer({
  storage: callRecordingStorage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit
});

// Call Recordings Routes
router.post('/call-recordings', uploadCallAudio.single('file'), uploadCallRecording);
router.get('/call-recordings', getCallRecordings);
router.get('/call-recordings/:recordingId/stream', streamCallRecording);

// Voice Notes & Integration logs
router.post('/:id/activity', checkPermission('leadPermission', 'taskPermission'), addActivity);
router.post('/:id/voice-note', checkPermission('leadPermission', 'taskPermission'), upload.single('voiceNote'), uploadVoiceNote);
router.get('/:id/voice-note/:index', checkPermission('leadPermission', 'taskPermission'), streamVoiceNote);
router.post('/:id/log-whatsapp', checkPermission('leadPermission', 'taskPermission'), logWhatsAppActivity);
router.post('/:id/send-email', checkPermission('leadPermission', 'taskPermission'), logEmailActivity);
router.get('/metrics', checkPermission('leadPermission', 'taskPermission'), getSalesMetrics);

router.get('/count', checkPermission('leadPermission', 'taskPermission'), async (req, res, next) => {
  try {
    const Lead = require('./lead.model');
    const { status } = req.query;
    let filter = {};
    if (status === 'won') {
      filter.stage = { $in: ['CLOSED_WON', 'DEAL_WON'] };
    } else if (status === 'pending') {
      filter.stage = { $nin: ['CLOSED_WON', 'DEAL_WON', 'CLOSED_LOST', 'DEAL_LOST'] };
    }
    const count = await Lead.countDocuments(filter);
    return require('../../utils/response').ok(res, { count }, 'Leads count retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', checkPermission('leadPermission', 'taskPermission', 'paymentPermission', 'dispatchPermission', 'quotationPermission'), getLeadDetails);
router.patch('/:id/stage', checkPermission('leadPermission', 'taskPermission'), changeLeadStage);
router.patch('/:id', checkPermission('leadPermission', 'taskPermission'), changeLeadStage);  

module.exports = router;
