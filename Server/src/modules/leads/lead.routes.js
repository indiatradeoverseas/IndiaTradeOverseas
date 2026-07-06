const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { getLeadsList, getLeadDetails, changeLeadStage } = require('./lead.controller');
const { createFromChat } = require('./ai-agent/aiLead.controller');

const {
  createManualLead,
  getDueReminders,
  uploadVoiceNote,
  streamVoiceNote,
  logWhatsAppActivity,
  logEmailActivity
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

router.use(authenticate);

router.post('/from-chat', createFromChat);
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

// Voice Notes & Integration logs
router.post('/:id/voice-note', checkPermission('leadPermission', 'taskPermission'), upload.single('voiceNote'), uploadVoiceNote);
router.get('/:id/voice-note/:index', checkPermission('leadPermission', 'taskPermission'), streamVoiceNote);
router.post('/:id/log-whatsapp', checkPermission('leadPermission', 'taskPermission'), logWhatsAppActivity);
router.post('/:id/send-email', checkPermission('leadPermission', 'taskPermission'), logEmailActivity);

router.get('/:id', checkPermission('leadPermission', 'taskPermission', 'paymentPermission', 'dispatchPermission', 'quotationPermission'), getLeadDetails);
router.patch('/:id/stage', checkPermission('leadPermission', 'taskPermission'), changeLeadStage);
router.patch('/:id', checkPermission('leadPermission', 'taskPermission'), changeLeadStage); 

module.exports = router;
