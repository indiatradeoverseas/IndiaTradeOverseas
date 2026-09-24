const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  authenticate,
} = require('../../middlewares/auth.middleware');

const rbac =
  require('../../middlewares/rbac.middleware');

const checkPermission =
  require('../../middlewares/permission.middleware');


const {
  createWebsiteLead,
  updateWebsiteLeadProfile,
  getLeadsList,
  getLeadDetails,
  changeLeadCrmStatus,
  changeLeadStage,
  changeLeadPriority,
  assignLead,
  assignLeadsBulk,
  bulkImportLeads,
  deleteLead,
} = require('./lead.controller');


const {
  getSalesMetrics,
} = require('./leadManagement.controller.js');


const {
  getSalesSlaDashboardController,
} = require('./leadSla.controller');


const {
  getLeadRecoveryDashboardController,
  requeueLeadRecoveryController,
} = require('./leadRecovery.controller');


const {
  createFromChat,
} = require('./ai-agent/aiLead.controller');


const {
  createManualLead,
  getDueReminders,
  uploadVoiceNote,
  streamVoiceNote,
  addActivity,
  logWhatsAppActivity,
  logEmailActivity,
  logCallOutcome,
  uploadCallRecording,
  getCallRecordings,
  streamCallRecording,
  updateCallRecordingRemark,
  updateCallRecordingStatus,
  uploadLOIDocument,
  streamLOIDocument,
} = require('./leadManagement.controller');


// ============================================================
// MULTER — LOI DOCUMENTS
// ============================================================

const loiStorage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      const destDir =
        path.join(
          process.cwd(),
          'uploads',
          'loi_documents'
        );

      if (
        !fs.existsSync(
          destDir
        )
      ) {
        fs.mkdirSync(
          destDir,
          {
            recursive: true,
          }
        );
      }

      cb(
        null,
        destDir
      );
    },

    filename: (
      req,
      file,
      cb
    ) => {
      const safeName =
        `loi-${Date.now()}-${file.originalname}`
          .replace(
            /[^a-zA-Z0-9._-]/g,
            '_'
          );

      cb(
        null,
        safeName
      );
    },
  });


const uploadLOIFile =
  multer({
    storage: loiStorage,

    limits: {
      fileSize:
        25 *
        1024 *
        1024,
    },
  });


// ============================================================
// MULTER — LEAD VOICE NOTES
// ============================================================

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      const destDir =
        path.join(
          process.cwd(),
          'uploads',
          'voice_notes'
        );

      if (
        !fs.existsSync(
          destDir
        )
      ) {
        fs.mkdirSync(
          destDir,
          {
            recursive: true,
          }
        );
      }

      cb(
        null,
        destDir
      );
    },

    filename: (
      req,
      file,
      cb
    ) => {
      const safeName =
        `${Date.now()}-${file.originalname}`
          .replace(
            /[^a-zA-Z0-9._-]/g,
            '_'
          );

      cb(
        null,
        safeName
      );
    },
  });


const upload =
  multer({
    storage,

    limits: {
      fileSize:
        10 *
        1024 *
        1024,
    },
  });


// ============================================================
// PUBLIC ROUTES
// ============================================================

/**
 * Public chat / quote-request ingestion.
 *
 * MUST remain above router.use(authenticate).
 */
router.post(
  '/from-chat',
  createFromChat
);


/**
 * Master DPR v4.0
 * Public Requirement Builder persistence.
 *
 * MUST remain above router.use(authenticate).
 */
router.post(
  '/website',
  createWebsiteLead
);


/**
 * Master DPR v4.0
 * Progressive profile after phone capture.
 *
 * Lead must already exist before this route is called.
 * Protected by immutable Lead ID + original submissionId pairing.
 * No OTP is introduced by default.
 */
router.patch(
  '/website/profile',
  updateWebsiteLeadProfile
);


// ============================================================
// AUTHENTICATED ROUTES FROM THIS POINT
// ============================================================

router.use(
  authenticate
);


// ============================================================
// MULTER — CALL RECORDINGS
// ============================================================

const callRecordingStorage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      const destDir =
        path.join(
          process.cwd(),
          'uploads',
          'call_recordings'
        );

      if (
        !fs.existsSync(
          destDir
        )
      ) {
        fs.mkdirSync(
          destDir,
          {
            recursive: true,
          }
        );
      }

      cb(
        null,
        destDir
      );
    },

    filename: (
      req,
      file,
      cb
    ) => {
      const safeName =
        `call-${Date.now()}-${file.originalname}`
          .replace(
            /[^a-zA-Z0-9._-]/g,
            '_'
          );

      cb(
        null,
        safeName
      );
    },
  });


const uploadCallAudio =
  multer({
    storage:
      callRecordingStorage,

    limits: {
      fileSize:
        30 *
        1024 *
        1024,
    },
  });


// ============================================================
// STATIC SUB-ROUTES
//
// IMPORTANT:
// These routes MUST remain above dynamic /:id routes.
// ============================================================


// ============================================================
// MASTER DPR v4.0 — MANAGEMENT / SLA / RECOVERY
// ============================================================

router.get(
  '/management/sla',
  getSalesSlaDashboardController
);


router.get(
  '/management/recovery',
  getLeadRecoveryDashboardController
);


router.post(
  '/management/recovery/:id/requeue',
  requeueLeadRecoveryController
);


// ============================================================
// CALL RECORDINGS
// ============================================================

/**
 * Call recordings are internal CRM evidence.
 *
 * They must never be exposed before authentication.
 * Record-level ownership enforcement is handled
 * in the controller/service layer.
 */

router.get(
  '/call-recordings/:recordingId/stream',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  streamCallRecording
);


router.post(
  '/score',
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        score,
        priority,
        classification,
        action,
        breakdown,
        scoringVersion,
      } =
        require(
          './ai-agent/leadScoring.service'
        )
          .scoreAndClassifyLead(
            req.body
          );

      return require(
        '../../utils/response'
      ).ok(
        res,
        {
          score,
          priority,
          classification,
          action,
          breakdown,
          scoringVersion,
        },
        'Lead scored successfully',
        200,
        req
      );

    } catch (error) {
      next(
        error
      );
    }
  }
);


router.get(
  '/call-recordings',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  getCallRecordings
);


router.post(
  '/call-recordings',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  uploadCallAudio.single(
    'file'
  ),
  uploadCallRecording
);


router.patch(
  '/call-recordings/:recordingId/remark',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  updateCallRecordingRemark
);


router.patch(
  '/call-recordings/:recordingId/status',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  updateCallRecordingStatus
);


// ============================================================
// UNASSIGNED LEADS
// ============================================================

router.get(
  '/unassigned',
  rbac(
    'ADMIN',
    'MANAGER',
    'HR'
  ),
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  async (
    req,
    res,
    next
  ) => {
    try {
      const Lead =
        require(
          './lead.model'
        );

      const {
        getLeadDisplay,
      } =
        require(
          './lead.service'
        );

      const leads =
        await Lead
          .find({
            assignedTo:
              null,
          })
          .sort({
            createdAt:
              -1,
          });

      return require(
        '../../utils/response'
      ).ok(
        res,
        {
          leads:
            leads.map(
              (
                lead
              ) =>
                getLeadDisplay(
                  lead,
                  req.user
                )
            ),
        },
        'Unassigned leads list',
        200,
        req
      );

    } catch (error) {
      next(
        error
      );
    }
  }
);


// ============================================================
// REMINDERS
// ============================================================

router.get(
  '/reminders/due',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  getDueReminders
);


// ============================================================
// SALES / LEAD METRICS
// ============================================================

router.get(
  '/metrics',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  getSalesMetrics
);


// ============================================================
// LEAD COUNTS
// ============================================================

router.get(
  '/count',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  async (
    req,
    res,
    next
  ) => {
    try {
      const Lead =
        require(
          './lead.model'
        );

      const {
        status,
      } =
        req.query;

      let filter =
        {};

      if (
        status ===
        'won'
      ) {
        filter.crmStatus =
          'WON';

      } else if (
        status ===
        'lost'
      ) {
        filter.crmStatus =
          'LOST';

      } else if (
        status ===
        'pending'
      ) {
        filter.crmStatus =
          {
            $nin: [
              'WON',
              'LOST',
            ],
          };
      }

      const count =
        await Lead
          .countDocuments(
            filter
          );

      return require(
        '../../utils/response'
      ).ok(
        res,
        {
          count,
        },
        'Leads count retrieved successfully',
        200,
        req
      );

    } catch (error) {
      next(
        error
      );
    }
  }
);


// ============================================================
// BULK ASSIGN
// ============================================================

router.post(
  '/assign',
  rbac(
    'ADMIN',
    'MANAGER',
    'SALES_MANAGER'
  ),
  assignLeadsBulk
);


// ============================================================
// BULK IMPORT
// ============================================================

router.post(
  '/bulk-import',
  rbac(
    'ADMIN',
    'MANAGER',
    'SALES_MANAGER'
  ),
  bulkImportLeads
);


// ============================================================
// LEAD COLLECTION
// ============================================================

router.get(
  '/',
  checkPermission(
    'leadPermission',
    'taskPermission',
    'paymentPermission',
    'dispatchPermission',
    'quotationPermission'
  ),
  getLeadsList
);


router.post(
  '/',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  createManualLead
);


// ============================================================
// DYNAMIC /:id SUB-ROUTES
//
// IMPORTANT:
// Keep these below all static lead routes.
// ============================================================


// ============================================================
// ASSIGN SINGLE LEAD
// ============================================================

router.post(
  '/:id/assign',
  rbac(
    'ADMIN',
    'MANAGER',
    'SALES_MANAGER'
  ),
  assignLead
);


// ============================================================
// LEAD ACTIVITY
// ============================================================

router.post(
  '/:id/activity',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  addActivity
);


// ============================================================
// VOICE NOTES
// ============================================================

router.post(
  '/:id/voice-note',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  upload.single(
    'voiceNote'
  ),
  uploadVoiceNote
);


router.get(
  '/:id/voice-note/:index',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  streamVoiceNote
);


// ============================================================
// WHATSAPP ACTIVITY
// ============================================================

router.post(
  '/:id/log-whatsapp',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  logWhatsAppActivity
);


// ============================================================
// EMAIL ACTIVITY
// ============================================================

router.post(
  '/:id/send-email',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  logEmailActivity
);


router.post(
  '/:id/log-call',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  logCallOutcome
);


// ============================================================
// LOI DOCUMENT
// ============================================================

router.post(
  '/:id/loi',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  uploadLOIFile.single(
    'file'
  ),
  uploadLOIDocument
);


router.get(
  '/:id/loi/:index',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  streamLOIDocument
);


// ============================================================
// MASTER DPR v4.0 — CANONICAL CRM LIFECYCLE
// ============================================================

router.patch(
  '/:id/status',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  changeLeadCrmStatus
);


// ============================================================
// EXISTING LEAD DETAIL / OPERATIONAL PIPELINE
// ============================================================

router.get(
  '/:id',
  checkPermission(
    'leadPermission',
    'taskPermission',
    'paymentPermission',
    'dispatchPermission',
    'quotationPermission'
  ),
  getLeadDetails
);


router.patch(
  '/:id/stage',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  changeLeadStage
);


router.patch(
  '/:id/priority',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  changeLeadPriority
);


/**
 * Compatibility route.
 *
 * Existing clients may still PATCH /leads/:id.
 *
 * crmStatus must continue to be handled through
 * /:id/status so canonical lifecycle rules are not bypassed.
 */
router.patch(
  '/:id',
  checkPermission(
    'leadPermission',
    'taskPermission'
  ),
  changeLeadStage
);


// ============================================================
// DELETE LEAD
// ============================================================

router.delete(
  '/:id',
  rbac(
    'ADMIN',
    'MANAGER',
    'SALES_MANAGER'
  ),
  deleteLead
);


module.exports =
  router;