const Lead = require('./lead.model');
const AuditLog = require('../security-audit/auditLog.model');

const {
  requeueCrmSyncLead,
} = require('./crmSync.service');

const {
  requeueLeadNotification,
} = require('./leadNotificationRecovery.service');

const {
  recordAudit,
} = require('../security-audit/auditLog.service');

const logger = require('../../utils/logger');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.20B: Admin / IT Lead Reliability & Recovery Service
 *
 * Purpose:
 * - make backend failure states visible to authorised operations staff;
 * - expose CRM-sync failures / retry exhaustion;
 * - expose sales / IT notification delivery failures;
 * - expose website post-persistence automation failures;
 * - expose Contact-resolution ambiguity requiring human review;
 * - allow controlled manual requeue of recoverable jobs;
 * - never return raw buyer phone/email/GST or encrypted/hash identity fields.
 *
 * The persisted Lead remains the source of truth. This service only reports
 * reliability state and requeues durable jobs; it never deletes a Lead.
 */

const RECOVERY_TYPES = Object.freeze([
  'CRM_SYNC',
  'SALES_ALERT',
  'IT_ALERT',
  'WEBSITE_AUTOMATION',
]);

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const STALE_PROCESSING_MS = 10 * 60 * 1000;


/* ============================================================
   BASIC HELPERS
============================================================ */

function cleanText(
  value,
  maxLength = 500
) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}


function normalizeLimit(
  value,
  fallback = DEFAULT_LIMIT
) {
  const numeric =
    Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(
    1,
    Math.min(
      Math.floor(numeric),
      MAX_LIMIT
    )
  );
}


function normalizeRecoveryType(
  value
) {
  const normalized =
    cleanText(
      value,
      80
    )
      .toUpperCase()
      .replace(/[\s-]+/g, '_');

  return RECOVERY_TYPES.includes(
    normalized
  )
    ? normalized
    : null;
}


function parseOptionalDate(
  value,
  fieldName
) {
  if (!value) {
    return null;
  }

  const parsed =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    const error =
      new Error(
        `${fieldName} must be a valid date.`
      );

    error.code =
      'RECOVERY_DATE_INVALID';

    throw error;
  }

  return parsed;
}


function buildCreatedAtFilter({
  from = null,
  to = null,
} = {}) {
  const parsedFrom =
    parseOptionalDate(
      from,
      'from'
    );

  const parsedTo =
    parseOptionalDate(
      to,
      'to'
    );

  if (
    parsedFrom &&
    parsedTo &&
    parsedFrom > parsedTo
  ) {
    const error =
      new Error(
        'from cannot be later than to.'
      );

    error.code =
      'RECOVERY_DATE_RANGE_INVALID';

    throw error;
  }

  const range = {};

  if (parsedFrom) {
    range.$gte =
      parsedFrom;
  }

  if (parsedTo) {
    range.$lte =
      parsedTo;
  }

  return Object.keys(range).length
    ? {
        createdAt:
          range,
      }
    : {};
}


function isStaleProcessing(
  lastAttemptAt,
  now = new Date()
) {
  if (!lastAttemptAt) {
    return false;
  }

  const parsed =
    new Date(lastAttemptAt);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return false;
  }

  return (
    now.getTime() -
    parsed.getTime()
  ) >= STALE_PROCESSING_MS;
}


/* ============================================================
   PRIVACY-SAFE LEAD PROJECTION
============================================================ */

function projectRecoveryLead(
  lead,
  now = new Date()
) {
  const value =
    lead?.toObject
      ? lead.toObject()
      : lead || {};

  const crmSync =
    value.crmSync || {};

  const salesAlert =
    value.notificationDelivery
      ?.salesAlert || {};

  const itAlert =
    value.notificationDelivery
      ?.itAlert || {};

  return {
    leadId:
      value._id
        ? String(value._id)
        : null,

    leadCode:
      value.leadCode || '',

    submissionId:
      value.submissionId || '',

    source:
      value.source || '',

    leadOrigin:
      value.leadOrigin || '',

    productCategory:
      value.productCategory || '',

    product:
      value.product || '',

    priority:
      value.priority || '',

    score:
      Number(value.score) || 0,

    crmStatus:
      value.crmStatus || 'NEW',

    operationalStage:
      value.stage || '',

    assignedTo:
      value.assignedTo
        ? String(
            value.assignedTo._id ||
            value.assignedTo
          )
        : null,

    assignedDepartment:
      value.assignedDepartment || '',

    assignedTeam:
      value.assignedTeam || '',

    territory:
      value.territory || '',

    contactResolution: {
      status:
        value.contactResolution
          ?.status ||
        'UNRESOLVED',

      method:
        value.contactResolution
          ?.method ||
        'NONE',

      resolvedAt:
        value.contactResolution
          ?.resolvedAt ||
        null,

      conflictContactIds:
        Array.isArray(
          value.originalPayload
            ?.contactConflictIds
        )
          ? value.originalPayload
              .contactConflictIds
              .map((id) =>
                cleanText(id, 64)
              )
              .filter(Boolean)
          : [],

      reason:
        cleanText(
          value.originalPayload
            ?.contactResolutionReason,
          200
        ),
    },

    websiteAutomation: {
      status:
        value.automationStatus || '',

      attempts:
        Number(
          value.automationAttempts
        ) || 0,

      lastAttemptAt:
        value.automationLastAttemptAt ||
        null,

      lastError:
        cleanText(
          value.automationLastError,
          500
        ),

      staleProcessing:
        value.automationStatus ===
          'PROCESSING' &&
        isStaleProcessing(
          value.automationLastAttemptAt,
          now
        ),
    },

    crmSync: {
      status:
        crmSync.status || '',

      attempts:
        Number(
          crmSync.attempts
        ) || 0,

      externalCrmId:
        cleanText(
          crmSync.externalCrmId,
          200
        ),

      nextAttemptAt:
        crmSync.nextAttemptAt ||
        null,

      lastAttemptAt:
        crmSync.lastAttemptAt ||
        null,

      syncedAt:
        crmSync.syncedAt ||
        null,

      lastError:
        cleanText(
          crmSync.lastError,
          500
        ),

      manualRecoveryRequired:
        crmSync.manualRecoveryRequired ===
        true,

      manualRecoveryReason:
        cleanText(
          crmSync.manualRecoveryReason,
          500
        ),

      staleProcessing:
        crmSync.status ===
          'PROCESSING' &&
        isStaleProcessing(
          crmSync.lastAttemptAt,
          now
        ),
    },

    notifications: {
      salesAlert: {
        status:
          salesAlert.status || '',

        attempts:
          Number(
            salesAlert.attempts
          ) || 0,

        nextAttemptAt:
          salesAlert.nextAttemptAt ||
          null,

        lastAttemptAt:
          salesAlert.lastAttemptAt ||
          null,

        sentAt:
          salesAlert.sentAt ||
          null,

        lastError:
          cleanText(
            salesAlert.lastError,
            500
          ),

        staleProcessing:
          salesAlert.status ===
            'PROCESSING' &&
          isStaleProcessing(
            salesAlert.lastAttemptAt,
            now
          ),
      },

      itAlert: {
        status:
          itAlert.status || '',

        attempts:
          Number(
            itAlert.attempts
          ) || 0,

        nextAttemptAt:
          itAlert.nextAttemptAt ||
          null,

        lastAttemptAt:
          itAlert.lastAttemptAt ||
          null,

        sentAt:
          itAlert.sentAt ||
          null,

        lastError:
          cleanText(
            itAlert.lastError,
            500
          ),

        staleProcessing:
          itAlert.status ===
            'PROCESSING' &&
          isStaleProcessing(
            itAlert.lastAttemptAt,
            now
          ),
      },
    },

    createdAt:
      value.createdAt || null,

    updatedAt:
      value.updatedAt || null,
  };
}


/* ============================================================
   DASHBOARD FILTERS
============================================================ */

function getRecoveryFilters(
  createdAtFilter = {},
  now = new Date()
) {
  const staleBefore =
    new Date(
      now.getTime() -
      STALE_PROCESSING_MS
    );

  return {
    crmProblem: {
      ...createdAtFilter,

      $or: [
        {
          'crmSync.status': {
            $in: [
              'FAILED',
              'MANUAL_RECOVERY',
            ],
          },
        },

        {
          'crmSync.status':
            'PROCESSING',

          'crmSync.lastAttemptAt': {
            $lt:
              staleBefore,
          },
        },
      ],
    },

    crmManualRecovery: {
      ...createdAtFilter,

      $or: [
        {
          'crmSync.status':
            'MANUAL_RECOVERY',
        },

        {
          'crmSync.manualRecoveryRequired':
            true,
        },
      ],
    },

    salesNotificationProblem: {
      ...createdAtFilter,

      $or: [
        {
          'notificationDelivery.salesAlert.status': {
            $in: [
              'FAILED',
              'MANUAL_RECOVERY',
            ],
          },
        },

        {
          'notificationDelivery.salesAlert.status':
            'PROCESSING',

          'notificationDelivery.salesAlert.lastAttemptAt': {
            $lt:
              staleBefore,
          },
        },
      ],
    },

    itNotificationProblem: {
      ...createdAtFilter,

      $or: [
        {
          'notificationDelivery.itAlert.status': {
            $in: [
              'FAILED',
              'MANUAL_RECOVERY',
            ],
          },
        },

        {
          'notificationDelivery.itAlert.status':
            'PROCESSING',

          'notificationDelivery.itAlert.lastAttemptAt': {
            $lt:
              staleBefore,
          },
        },
      ],
    },

    websiteAutomationProblem: {
      ...createdAtFilter,

      $or: [
        {
          automationStatus:
            'FAILED',
        },

        {
          automationStatus:
            'PROCESSING',

          automationLastAttemptAt: {
            $lt:
              staleBefore,
          },
        },
      ],
    },

    contactAmbiguity: {
      ...createdAtFilter,

      'contactResolution.status':
        'AMBIGUOUS',
    },
  };
}


/* ============================================================
   RECENT SAFE RECOVERY AUDIT
============================================================ */

async function getRecentRecoveryAudit(
  limit = 25
) {
  const safeLimit =
    normalizeLimit(
      limit,
      25
    );

  const actionTypes = [
    'CRM_SYNC_SUCCEEDED',
    'CRM_SYNC_FAILED',
    'CRM_SYNC_MANUAL_RECOVERY',
    'CRM_SYNC_REQUEUED',
    'SALES_ALERT_MANUAL_RECOVERY',
    'IT_ALERT_MANUAL_RECOVERY',
    'NOTIFICATION_SENT',
    'NOTIFICATION_FAILED',
    'LEAD_RECOVERY_REQUEUED',
  ];

  const rows =
    await AuditLog.find({
      actionType: {
        $in:
          actionTypes,
      },
    })
      .select(
        'actionType entityType entityId severity metadata createdAt'
      )
      .sort({
        createdAt:
          -1,
      })
      .limit(
        safeLimit
      )
      .lean();

  return rows.map(
    (row) => ({
      actionType:
        row.actionType,

      entityType:
        row.entityType,

      entityId:
        row.entityId,

      severity:
        row.severity,

      createdAt:
        row.createdAt,

      /*
       * Privacy-safe metadata whitelist.
       * Never expose the complete audit metadata object here.
       */
      metadata: {
        leadCode:
          cleanText(
            row.metadata?.leadCode,
            150
          ),

        attempts:
          Number(
            row.metadata?.attempts ||
            row.metadata?.crmSyncAttempts
          ) || 0,

        crmMode:
          cleanText(
            row.metadata?.crmMode,
            50
          ),

        status:
          cleanText(
            row.metadata?.status,
            80
          ),

        recoveryType:
          cleanText(
            row.metadata?.recoveryType,
            80
          ),
      },
    })
  );
}


/* ============================================================
   RECOVERY DASHBOARD
============================================================ */

async function getLeadRecoveryDashboard({
  from = null,
  to = null,
  limit = DEFAULT_LIMIT,
  auditLimit = 25,
} = {}) {
  const safeLimit =
    normalizeLimit(limit);

  const createdAtFilter =
    buildCreatedAtFilter({
      from,
      to,
    });

  const now =
    new Date();

  const filters =
    getRecoveryFilters(
      createdAtFilter,
      now
    );

  const projection =
    '_id leadCode submissionId source leadOrigin productCategory product priority score crmStatus stage assignedTo assignedDepartment assignedTeam territory contactResolution originalPayload.contactResolutionReason originalPayload.contactConflictIds automationStatus automationAttempts automationLastError automationLastAttemptAt crmSync notificationDelivery createdAt updatedAt';

  const [
    crmProblemCount,
    crmManualRecoveryCount,
    salesNotificationProblemCount,
    itNotificationProblemCount,
    websiteAutomationProblemCount,
    contactAmbiguityCount,
    crmProblems,
    crmManualRecovery,
    salesNotificationProblems,
    itNotificationProblems,
    websiteAutomationProblems,
    contactAmbiguities,
    recentAudit,
  ] = await Promise.all([
    Lead.countDocuments(
      filters.crmProblem
    ),

    Lead.countDocuments(
      filters.crmManualRecovery
    ),

    Lead.countDocuments(
      filters.salesNotificationProblem
    ),

    Lead.countDocuments(
      filters.itNotificationProblem
    ),

    Lead.countDocuments(
      filters.websiteAutomationProblem
    ),

    Lead.countDocuments(
      filters.contactAmbiguity
    ),

    Lead.find(
      filters.crmProblem
    )
      .select(projection)
      .sort({
        'crmSync.lastAttemptAt': 1,
        createdAt: 1,
      })
      .limit(safeLimit)
      .lean(),

    Lead.find(
      filters.crmManualRecovery
    )
      .select(projection)
      .sort({
        'crmSync.lastAttemptAt': 1,
        createdAt: 1,
      })
      .limit(safeLimit)
      .lean(),

    Lead.find(
      filters.salesNotificationProblem
    )
      .select(projection)
      .sort({
        'notificationDelivery.salesAlert.lastAttemptAt': 1,
        createdAt: 1,
      })
      .limit(safeLimit)
      .lean(),

    Lead.find(
      filters.itNotificationProblem
    )
      .select(projection)
      .sort({
        'notificationDelivery.itAlert.lastAttemptAt': 1,
        createdAt: 1,
      })
      .limit(safeLimit)
      .lean(),

    Lead.find(
      filters.websiteAutomationProblem
    )
      .select(projection)
      .sort({
        automationLastAttemptAt: 1,
        createdAt: 1,
      })
      .limit(safeLimit)
      .lean(),

    Lead.find(
      filters.contactAmbiguity
    )
      .select(projection)
      .sort({
        createdAt: 1,
      })
      .limit(safeLimit)
      .lean(),

    getRecentRecoveryAudit(
      auditLimit
    ),
  ]);

  return {
    generatedAt:
      now,

    scope: {
      from:
        from || null,

      to:
        to || null,

      queueLimit:
        safeLimit,

      auditLimit:
        normalizeLimit(
          auditLimit,
          25
        ),
    },

    metrics: {
      crmProblemCount,
      crmManualRecoveryCount,
      salesNotificationProblemCount,
      itNotificationProblemCount,
      websiteAutomationProblemCount,
      contactAmbiguityCount,

      totalVisibleProblems:
        crmProblemCount +
        salesNotificationProblemCount +
        itNotificationProblemCount +
        websiteAutomationProblemCount +
        contactAmbiguityCount,
    },

    queues: {
      crmProblems:
        crmProblems.map(
          (lead) =>
            projectRecoveryLead(
              lead,
              now
            )
        ),

      crmManualRecovery:
        crmManualRecovery.map(
          (lead) =>
            projectRecoveryLead(
              lead,
              now
            )
        ),

      salesNotificationProblems:
        salesNotificationProblems.map(
          (lead) =>
            projectRecoveryLead(
              lead,
              now
            )
        ),

      itNotificationProblems:
        itNotificationProblems.map(
          (lead) =>
            projectRecoveryLead(
              lead,
              now
            )
        ),

      websiteAutomationProblems:
        websiteAutomationProblems.map(
          (lead) =>
            projectRecoveryLead(
              lead,
              now
            )
        ),

      contactAmbiguities:
        contactAmbiguities.map(
          (lead) =>
            projectRecoveryLead(
              lead,
              now
            )
        ),
    },

    recentAudit,
  };
}


/* ============================================================
   MANUAL WEBSITE-AUTOMATION REQUEUE
============================================================ */

async function requeueWebsiteLeadAutomation(
  leadId
) {
  const lead =
    await Lead.findById(
      leadId
    );

  if (!lead) {
    const error =
      new Error(
        'Lead not found.'
      );

    error.code =
      'LEAD_NOT_FOUND';

    throw error;
  }

  /*
   * AI/import/manual Leads deliberately do not use the Website
   * post-persistence automation worker.
   */
  if (
    lead.source !== 'WEBSITE' &&
    lead.leadOrigin !==
      'REQUIREMENT_BUILDER'
  ) {
    const error =
      new Error(
        'Website automation can only be requeued for Website Requirement Builder leads.'
      );

    error.code =
      'RECOVERY_TYPE_NOT_APPLICABLE';

    throw error;
  }

  return Lead.findByIdAndUpdate(
    lead._id,

    {
      $set: {
        automationStatus:
          'PENDING',

        automationAttempts:
          0,

        automationLastAttemptAt:
          null,

        automationLastError:
          '',
      },
    },

    {
      new:
        true,
    }
  );
}


/* ============================================================
   CONTROLLED MANUAL RECOVERY REQUEUE
============================================================ */

async function requeueLeadRecovery({
  leadId,
  recoveryType,
  actorId = null,
  reason = '',
} = {}) {
  if (!leadId) {
    const error =
      new Error(
        'leadId is required.'
      );

    error.code =
      'LEAD_ID_REQUIRED';

    throw error;
  }

  const normalizedType =
    normalizeRecoveryType(
      recoveryType
    );

  if (!normalizedType) {
    const error =
      new Error(
        `recoveryType must be one of: ${RECOVERY_TYPES.join(', ')}.`
      );

    error.code =
      'RECOVERY_TYPE_INVALID';

    throw error;
  }

  const recoveryReason =
    cleanText(
      reason,
      500
    );

  if (
    recoveryReason.length < 5
  ) {
    const error =
      new Error(
        'A meaningful recovery reason is required.'
      );

    error.code =
      'RECOVERY_REASON_REQUIRED';

    throw error;
  }

  const existingLead =
    await Lead.findById(
      leadId
    );

  if (!existingLead) {
    const error =
      new Error(
        'Lead not found.'
      );

    error.code =
      'LEAD_NOT_FOUND';

    throw error;
  }

  let updatedLead =
    null;

  if (
    normalizedType ===
    'CRM_SYNC'
  ) {
    updatedLead =
      await requeueCrmSyncLead(
        existingLead._id
      );
  }

  else if (
    normalizedType ===
    'SALES_ALERT'
  ) {
    updatedLead =
      await requeueLeadNotification(
        existingLead._id,
        'salesAlert'
      );
  }

  else if (
    normalizedType ===
    'IT_ALERT'
  ) {
    updatedLead =
      await requeueLeadNotification(
        existingLead._id,
        'itAlert'
      );
  }

  else if (
    normalizedType ===
    'WEBSITE_AUTOMATION'
  ) {
    updatedLead =
      await requeueWebsiteLeadAutomation(
        existingLead._id
      );
  }

  if (!updatedLead) {
    const error =
      new Error(
        'Lead recovery requeue could not be completed.'
      );

    error.code =
      'RECOVERY_REQUEUE_FAILED';

    throw error;
  }

  try {
    await recordAudit({
      actorId:
        actorId || null,

      actionType:
        'LEAD_RECOVERY_REQUEUED',

      entityType:
        'LEAD',

      entityId:
        String(
          existingLead._id
        ),

      severity:
        'MEDIUM',

      metadata: {
        leadCode:
          existingLead.leadCode,

        recoveryType:
          normalizedType,

        reason:
          recoveryReason,
      },
    });

  } catch (auditError) {
    logger.warn(
      '[Lead Recovery] Requeue audit logging failed',
      {
        leadId:
          String(
            existingLead._id
          ),

        recoveryType:
          normalizedType,

        error:
          cleanText(
            auditError.message,
            300
          ),
      }
    );
  }

  logger.info(
    '[Lead Recovery] Recovery job manually requeued',
    {
      leadId:
        String(
          existingLead._id
        ),

      recoveryType:
        normalizedType,
    }
  );

  return {
    recoveryType:
      normalizedType,

    lead:
      projectRecoveryLead(
        updatedLead
      ),
  };
}


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  RECOVERY_TYPES,
  STALE_PROCESSING_MS,

  projectRecoveryLead,
  getRecentRecoveryAudit,
  getLeadRecoveryDashboard,

  requeueWebsiteLeadAutomation,
  requeueLeadRecovery,
};