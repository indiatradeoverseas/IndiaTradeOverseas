const Lead = require('./lead.model');
const Notification = require('../notifications/notification.model');
const { recordAudit } = require('../security-audit/auditLog.service');
const logger = require('../../utils/logger');

const {
  logNotification,
  logRetry,
} = require('../operations/operationalLog.service');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.26F: Durable notification retry/recovery + operational ledger
 *
 * Responsibilities:
 * - retry failed/pending sales assignment alerts;
 * - retry failed/pending IT recovery alerts;
 * - use exponential backoff with durable nextAttemptAt timestamps;
 * - recover stale PROCESSING states after a process/server crash;
 * - prevent duplicate notifications after crash/retry;
 * - preserve Phase 2.24 assignment-target deduplication semantics;
 * - escalate exhausted sales-alert delivery to IT/manual recovery;
 * - operationally log notification success/failure/retry/manual recovery;
 * - never roll back or delete an already-persisted Lead.
 */

const MAX_NOTIFICATION_ATTEMPTS = 8;
const STALE_PROCESSING_MS = 10 * 60 * 1000;
const BASE_RETRY_MS = 60 * 1000;
const MAX_RETRY_MS = 6 * 60 * 60 * 1000;

const SUPPORTED_CHANNELS = Object.freeze([
  'salesAlert',
  'itAlert',
]);

function cleanText(value, maxLength = 500) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function normalizeChannel(channel) {
  const value = cleanText(
    channel,
    40
  );

  if (!SUPPORTED_CHANNELS.includes(value)) {
    throw new Error(
      'channel must be salesAlert or itAlert.'
    );
  }

  return value;
}

function getRetryDelayMs(attempts) {
  const safeAttempts = Math.max(
    1,
    Number(attempts) || 1
  );

  return Math.min(
    BASE_RETRY_MS *
      Math.pow(
        2,
        safeAttempts - 1
      ),
    MAX_RETRY_MS
  );
}

function getNextAttemptAt(attempts) {
  return new Date(
    Date.now() +
      getRetryDelayMs(attempts)
  );
}

function getDeliveryPath(
  channel,
  field
) {
  return `notificationDelivery.${channel}.${field}`;
}

function getNotificationProvider(
  channel
) {
  return channel === 'itAlert'
    ? 'INTERNAL_IT_ALERT'
    : 'INTERNAL_SALES_ALERT';
}

function getSafeLeadEntityId(lead) {
  return cleanText(
    lead?.leadCode ||
      lead?._id ||
      '',
    160
  );
}

function buildSalesAssignmentAlertCode(
  lead
) {
  if (lead?.assignedTo) {
    return `LEAD_ASSIGNMENT_USER_${String(
      lead.assignedTo
    )}`;
  }

  if (
    lead?.assignedDepartment &&
    lead.assignedDepartment !== 'ADMIN'
  ) {
    return `LEAD_ASSIGNMENT_DEPT_${cleanText(
      lead.assignedDepartment,
      80
    ).toUpperCase()}`;
  }

  return 'LEAD_ASSIGNMENT_ADMIN_REVIEW';
}

async function claimNextLeadNotification(
  channel
) {
  const safeChannel =
    normalizeChannel(channel);

  const now =
    new Date();

  const statusPath =
    getDeliveryPath(
      safeChannel,
      'status'
    );

  const attemptsPath =
    getDeliveryPath(
      safeChannel,
      'attempts'
    );

  const nextAttemptPath =
    getDeliveryPath(
      safeChannel,
      'nextAttemptAt'
    );

  const lastAttemptPath =
    getDeliveryPath(
      safeChannel,
      'lastAttemptAt'
    );

  return Lead.findOneAndUpdate(
    {
      [statusPath]: {
        $in: [
          'PENDING',
          'FAILED',
        ],
      },

      [attemptsPath]: {
        $lt:
          MAX_NOTIFICATION_ATTEMPTS,
      },

      $or: [
        {
          [nextAttemptPath]:
            null,
        },

        {
          [nextAttemptPath]: {
            $exists:
              false,
          },
        },

        {
          [nextAttemptPath]: {
            $lte:
              now,
          },
        },
      ],
    },

    {
      $set: {
        [statusPath]:
          'PROCESSING',

        [lastAttemptPath]:
          now,

        [nextAttemptPath]:
          null,
      },

      $inc: {
        [attemptsPath]:
          1,
      },
    },

    {
      new:
        true,

      sort: {
        createdAt:
          1,
      },
    }
  );
}

async function markNotificationSent(
  lead,
  channel
) {
  const safeChannel =
    normalizeChannel(channel);

  const now =
    new Date();

  const updated =
    await Lead.findOneAndUpdate(
      {
        _id:
          lead._id,

        [getDeliveryPath(
          safeChannel,
          'status'
        )]:
          'PROCESSING',
      },

      {
        $set: {
          [getDeliveryPath(
            safeChannel,
            'status'
          )]:
            'SENT',

          [getDeliveryPath(
            safeChannel,
            'sentAt'
          )]:
            now,

          [getDeliveryPath(
            safeChannel,
            'nextAttemptAt'
          )]:
            null,

          [getDeliveryPath(
            safeChannel,
            'lastError'
          )]:
            '',
        },
      },

      {
        new:
          true,
      }
    );

  if (updated) {
    const attempts =
      Number(
        updated
          .notificationDelivery
          ?.[safeChannel]
          ?.attempts
      ) || 1;

    await logNotification(
      safeChannel ===
        'salesAlert'
        ? 'SALES_ASSIGNMENT_ALERT'
        : 'IT_RECOVERY_ALERT',

      'SUCCESS',

      {
        leadId:
          updated._id,

        entityType:
          'LEAD',

        entityId:
          getSafeLeadEntityId(
            updated
          ),

        provider:
          getNotificationProvider(
            safeChannel
          ),

        retryCount:
          Math.max(
            0,
            attempts - 1
          ),

        metadata: {
          channel:
            safeChannel,

          attempts,

          sentAt:
            now,
        },
      }
    );
  }

  return updated;
}

async function scheduleItEscalationForSalesAlert(
  lead
) {
  const currentStatus =
    lead.notificationDelivery
      ?.itAlert
      ?.status ||
    'NOT_REQUIRED';

  if (
    [
      'PROCESSING',
      'SENT',
      'PENDING',
    ].includes(
      currentStatus
    )
  ) {
    return null;
  }

  return Lead.findByIdAndUpdate(
    lead._id,

    {
      $set: {
        'notificationDelivery.itAlert.status':
          'PENDING',

        'notificationDelivery.itAlert.attempts':
          0,

        'notificationDelivery.itAlert.nextAttemptAt':
          null,

        'notificationDelivery.itAlert.lastAttemptAt':
          null,

        'notificationDelivery.itAlert.sentAt':
          null,

        'notificationDelivery.itAlert.lastError':
          '',
      },
    },

    {
      new:
        true,
    }
  );
}

async function markNotificationFailed(
  lead,
  channel,
  error
) {
  const safeChannel =
    normalizeChannel(channel);

  const attempts =
    Number(
      lead
        .notificationDelivery
        ?.[safeChannel]
        ?.attempts
    ) || 1;

  const errorMessage =
    cleanText(
      error?.message ||
        'Unknown notification delivery failure',
      500
    );

  if (
    attempts >=
    MAX_NOTIFICATION_ATTEMPTS
  ) {
    const manualRecoveryLead =
      await Lead.findOneAndUpdate(
        {
          _id:
            lead._id,

          [getDeliveryPath(
            safeChannel,
            'status'
          )]:
            'PROCESSING',
        },

        {
          $set: {
            [getDeliveryPath(
              safeChannel,
              'status'
            )]:
              'MANUAL_RECOVERY',

            [getDeliveryPath(
              safeChannel,
              'nextAttemptAt'
            )]:
              null,

            [getDeliveryPath(
              safeChannel,
              'lastError'
            )]:
              errorMessage,
          },
        },

        {
          new:
            true,
        }
      );

    if (!manualRecoveryLead) {
      return {
        status:
          'STATE_CHANGED',

        nextAttemptAt:
          null,
      };
    }

    if (
      safeChannel ===
      'salesAlert'
    ) {
      await scheduleItEscalationForSalesAlert(
        manualRecoveryLead
      );
    }

    try {
      await recordAudit({
        actorId:
          null,

        actionType:
          safeChannel ===
            'salesAlert'
            ? 'SALES_ALERT_MANUAL_RECOVERY'
            : 'IT_ALERT_MANUAL_RECOVERY',

        entityType:
          'LEAD',

        entityId:
          String(
            lead._id
          ),

        severity:
          'HIGH',

        metadata: {
          leadCode:
            lead.leadCode,

          attempts,

          error:
            errorMessage,
        },
      });

    } catch (auditError) {
      logger.error(
        '[Lead Notification Recovery] Manual-recovery audit failed',
        {
          leadId:
            String(
              lead._id
            ),

          channel:
            safeChannel,

          error:
            cleanText(
              auditError.message,
              300
            ),
        }
      );
    }

    await logNotification(
      safeChannel ===
        'salesAlert'
        ? 'SALES_ASSIGNMENT_ALERT'
        : 'IT_RECOVERY_ALERT',

      'MANUAL_RECOVERY',

      {
        leadId:
          manualRecoveryLead._id,

        entityType:
          'LEAD',

        entityId:
          getSafeLeadEntityId(
            manualRecoveryLead
          ),

        provider:
          getNotificationProvider(
            safeChannel
          ),

        retryCount:
          attempts,

        error,

        metadata: {
          channel:
            safeChannel,

          maxAttempts:
            MAX_NOTIFICATION_ATTEMPTS,
        },
      }
    );

    await logRetry(
      safeChannel ===
        'salesAlert'
        ? 'SALES_ALERT_RETRY_EXHAUSTED'
        : 'IT_ALERT_RETRY_EXHAUSTED',

      'MANUAL_RECOVERY',

      {
        leadId:
          manualRecoveryLead._id,

        entityType:
          'LEAD',

        entityId:
          getSafeLeadEntityId(
            manualRecoveryLead
          ),

        provider:
          getNotificationProvider(
            safeChannel
          ),

        retryCount:
          attempts,

        error,

        metadata: {
          channel:
            safeChannel,

          maxAttempts:
            MAX_NOTIFICATION_ATTEMPTS,
        },
      }
    );

    return {
      status:
        'MANUAL_RECOVERY',

      nextAttemptAt:
        null,
    };
  }

  const nextAttemptAt =
    getNextAttemptAt(
      attempts
    );

  const failedLead =
    await Lead.findOneAndUpdate(
      {
        _id:
          lead._id,

        [getDeliveryPath(
          safeChannel,
          'status'
        )]:
          'PROCESSING',
      },

      {
        $set: {
          [getDeliveryPath(
            safeChannel,
            'status'
          )]:
            'FAILED',

          [getDeliveryPath(
            safeChannel,
            'nextAttemptAt'
          )]:
            nextAttemptAt,

          [getDeliveryPath(
            safeChannel,
            'lastError'
          )]:
            errorMessage,
        },
      },

      {
        new:
          true,
      }
    );

  if (failedLead) {
    await logNotification(
      safeChannel ===
        'salesAlert'
        ? 'SALES_ASSIGNMENT_ALERT'
        : 'IT_RECOVERY_ALERT',

      'RETRY_SCHEDULED',

      {
        leadId:
          failedLead._id,

        entityType:
          'LEAD',

        entityId:
          getSafeLeadEntityId(
            failedLead
          ),

        provider:
          getNotificationProvider(
            safeChannel
          ),

        retryCount:
          attempts,

        error,

        metadata: {
          channel:
            safeChannel,

          nextAttemptAt,

          maxAttempts:
            MAX_NOTIFICATION_ATTEMPTS,
        },
      }
    );

    await logRetry(
      safeChannel ===
        'salesAlert'
        ? 'SALES_ALERT_RETRY'
        : 'IT_ALERT_RETRY',

      'RETRY_SCHEDULED',

      {
        leadId:
          failedLead._id,

        entityType:
          'LEAD',

        entityId:
          getSafeLeadEntityId(
            failedLead
          ),

        provider:
          getNotificationProvider(
            safeChannel
          ),

        retryCount:
          attempts,

        error,

        metadata: {
          channel:
            safeChannel,

          nextAttemptAt,
        },
      }
    );
  }

  return {
    status:
      failedLead
        ? 'FAILED'
        : 'STATE_CHANGED',

    nextAttemptAt:
      failedLead
        ? nextAttemptAt
        : null,
  };
}

async function ensureNotification({
  lead,
  alertCode,
  type,
  message,
  targetUserId = null,
  targetRole = null,
  targetDepartment = null,
  metadata = {},
}) {
  const existing =
    await Notification.findOne({
      type,

      'metadata.leadId':
        lead._id,

      'metadata.alertCode':
        alertCode,
    });

  if (existing) {
    return {
      notification:
        existing,

      reused:
        true,
    };
  }

  const notification =
    await Notification.create({
      targetUserId,
      targetRole,
      targetDepartment,
      message,
      type,

      metadata: {
        leadId:
          lead._id,

        leadCode:
          lead.leadCode,

        alertCode,

        ...metadata,
      },
    });

  return {
    notification,
    reused:
      false,
  };
}

async function deliverSalesAssignmentAlert(
  lead
) {
  let targetUserId =
    null;

  let targetRole =
    null;

  let targetDepartment =
    null;

  let message =
    '';

  if (lead.assignedTo) {
    targetUserId =
      lead.assignedTo;

    message =
      `A new lead ${lead.leadCode} has been assigned to you.`;

  } else if (
    lead.assignedDepartment &&
    lead.assignedDepartment !==
      'ADMIN'
  ) {
    targetDepartment =
      lead.assignedDepartment;

    message =
      `Lead ${lead.leadCode} requires ownership in ${lead.assignedDepartment}.`;

  } else {
    targetRole =
      'ADMIN';

    targetDepartment =
      'ADMIN';

    message =
      `Lead ${lead.leadCode} requires manual ownership review.`;
  }

  return ensureNotification({
    lead,

    alertCode:
      buildSalesAssignmentAlertCode(
        lead
      ),

    type:
      'TASK_ASSIGNMENT',

    message,

    targetUserId,
    targetRole,
    targetDepartment,

    metadata: {
      productCategory:
        lead.productCategory ||
        '',

      priority:
        lead.priority ||
        '',

      assignedDepartment:
        lead.assignedDepartment ||
        '',

      assignedTo:
        lead.assignedTo
          ? String(
              lead.assignedTo
            )
          : '',
    },
  });
}

function getRequiredItAlerts(
  lead
) {
  const alerts =
    [];

  if (
    lead.crmSync
      ?.manualRecoveryRequired ===
      true ||
    lead.crmSync?.status ===
      'MANUAL_RECOVERY'
  ) {
    alerts.push({
      alertCode:
        'CRM_SYNC_MANUAL_RECOVERY',

      message:
        `CRM synchronization for lead ${lead.leadCode} requires manual recovery.`,

      metadata: {
        crmSyncAttempts:
          lead.crmSync
            ?.attempts ||
          0,
      },
    });
  }

  if (
    lead.notificationDelivery
      ?.salesAlert
      ?.status ===
    'MANUAL_RECOVERY'
  ) {
    alerts.push({
      alertCode:
        'SALES_ALERT_MANUAL_RECOVERY',

      message:
        `Sales assignment notification for lead ${lead.leadCode} could not be delivered automatically and requires manual review.`,

      metadata: {
        salesAlertAttempts:
          lead
            .notificationDelivery
            ?.salesAlert
            ?.attempts ||
          0,
      },
    });
  }

  if (!alerts.length) {
    alerts.push({
      alertCode:
        'LEAD_IT_REVIEW',

      message:
        `Lead ${lead.leadCode} requires IT review.`,

      metadata:
        {},
    });
  }

  return alerts;
}

async function deliverItRecoveryAlert(
  lead
) {
  const alerts =
    getRequiredItAlerts(
      lead
    );

  const delivered =
    [];

  for (
    const alert
    of alerts
  ) {
    const result =
      await ensureNotification({
        lead,

        alertCode:
          alert.alertCode,

        type:
          'SYSTEM_ALERT',

        message:
          alert.message,

        targetRole:
          'IT',

        targetDepartment:
          'IT',

        metadata:
          alert.metadata,
      });

    delivered.push(
      result
    );
  }

  return delivered;
}

async function recoverStaleNotificationProcessing() {
  const staleBefore =
    new Date(
      Date.now() -
        STALE_PROCESSING_MS
    );

  let recovered =
    0;

  for (
    const channel
    of SUPPORTED_CHANNELS
  ) {
    const statusPath =
      getDeliveryPath(
        channel,
        'status'
      );

    const lastAttemptPath =
      getDeliveryPath(
        channel,
        'lastAttemptAt'
      );

    const staleLeads =
      await Lead.find({
        [statusPath]:
          'PROCESSING',

        [lastAttemptPath]: {
          $lt:
            staleBefore,
        },
      })
        .select(
          '_id leadCode crmSync notificationDelivery assignedTo assignedDepartment productCategory priority'
        )
        .limit(
          200
        );

    for (
      const lead
      of staleLeads
    ) {
      const attempts =
        Number(
          lead
            .notificationDelivery
            ?.[channel]
            ?.attempts
        ) || 1;

      const message =
        attempts >=
        MAX_NOTIFICATION_ATTEMPTS
          ? 'Recovered stale notification processing state after retry exhaustion.'
          : 'Recovered stale notification processing state.';

      if (
        attempts >=
        MAX_NOTIFICATION_ATTEMPTS
      ) {
        const updated =
          await Lead.findOneAndUpdate(
            {
              _id:
                lead._id,

              [statusPath]:
                'PROCESSING',
            },

            {
              $set: {
                [statusPath]:
                  'MANUAL_RECOVERY',

                [getDeliveryPath(
                  channel,
                  'nextAttemptAt'
                )]:
                  null,

                [getDeliveryPath(
                  channel,
                  'lastError'
                )]:
                  message,
              },
            },

            {
              new:
                true,
            }
          );

        if (!updated) {
          continue;
        }

        if (
          channel ===
          'salesAlert'
        ) {
          await scheduleItEscalationForSalesAlert(
            updated
          );
        }

        await logNotification(
          channel ===
            'salesAlert'
            ? 'SALES_ALERT_STALE_RECOVERY'
            : 'IT_ALERT_STALE_RECOVERY',

          'MANUAL_RECOVERY',

          {
            leadId:
              updated._id,

            entityType:
              'LEAD',

            entityId:
              getSafeLeadEntityId(
                updated
              ),

            provider:
              getNotificationProvider(
                channel
              ),

            retryCount:
              attempts,

            errorMessage:
              message,

            metadata: {
              channel,

              staleProcessingRecovered:
                true,
            },
          }
        );

        await logRetry(
          channel ===
            'salesAlert'
            ? 'SALES_ALERT_STALE_RECOVERY'
            : 'IT_ALERT_STALE_RECOVERY',

          'MANUAL_RECOVERY',

          {
            leadId:
              updated._id,

            entityType:
              'LEAD',

            entityId:
              getSafeLeadEntityId(
                updated
              ),

            provider:
              getNotificationProvider(
                channel
              ),

            retryCount:
              attempts,
          }
        );

        recovered +=
          1;

        continue;
      }

      const nextAttemptAt =
        getNextAttemptAt(
          attempts
        );

      const updated =
        await Lead.findOneAndUpdate(
          {
            _id:
              lead._id,

            [statusPath]:
              'PROCESSING',
          },

          {
            $set: {
              [statusPath]:
                'FAILED',

              [getDeliveryPath(
                channel,
                'nextAttemptAt'
              )]:
                nextAttemptAt,

              [getDeliveryPath(
                channel,
                'lastError'
              )]:
                message,
            },
          },

          {
            new:
              true,
          }
        );

      if (!updated) {
        continue;
      }

      await logNotification(
        channel ===
          'salesAlert'
          ? 'SALES_ALERT_STALE_RECOVERY'
          : 'IT_ALERT_STALE_RECOVERY',

        'RETRY_SCHEDULED',

        {
          leadId:
            updated._id,

          entityType:
            'LEAD',

          entityId:
            getSafeLeadEntityId(
              updated
            ),

          provider:
            getNotificationProvider(
              channel
            ),

          retryCount:
            attempts,

          errorMessage:
            message,

          metadata: {
            channel,

            staleProcessingRecovered:
              true,

            nextAttemptAt,
          },
        }
      );

      await logRetry(
        channel ===
          'salesAlert'
          ? 'SALES_ALERT_STALE_RECOVERY'
          : 'IT_ALERT_STALE_RECOVERY',

        'RETRY_SCHEDULED',

        {
          leadId:
            updated._id,

          entityType:
            'LEAD',

          entityId:
            getSafeLeadEntityId(
              updated
            ),

          provider:
            getNotificationProvider(
              channel
            ),

          retryCount:
            attempts,

          metadata: {
            nextAttemptAt,
          },
        }
      );

      recovered +=
        1;
    }
  }

  return recovered;
}

async function processNotificationChannel(
  channel,
  limit
) {
  const safeChannel =
    normalizeChannel(
      channel
    );

  let processed =
    0;

  let sent =
    0;

  let failed =
    0;

  let manualRecovery =
    0;

  for (
    let index = 0;
    index < limit;
    index += 1
  ) {
    const lead =
      await claimNextLeadNotification(
        safeChannel
      );

    if (!lead) {
      break;
    }

    processed +=
      1;

    try {
      if (
        safeChannel ===
        'salesAlert'
      ) {
        await deliverSalesAssignmentAlert(
          lead
        );

      } else {
        await deliverItRecoveryAlert(
          lead
        );
      }

      const updated =
        await markNotificationSent(
          lead,
          safeChannel
        );

      if (updated) {
        sent +=
          1;
      }

    } catch (error) {
      const result =
        await markNotificationFailed(
          lead,
          safeChannel,
          error
        );

      if (
        result.status ===
        'MANUAL_RECOVERY'
      ) {
        manualRecovery +=
          1;

      } else if (
        result.status ===
        'FAILED'
      ) {
        failed +=
          1;
      }

      logger.warn(
        '[Lead Notification Recovery] Delivery attempt failed',
        {
          leadId:
            String(
              lead._id
            ),

          channel:
            safeChannel,

          attempt:
            lead
              .notificationDelivery
              ?.[safeChannel]
              ?.attempts ||
            1,

          status:
            result.status,

          error:
            cleanText(
              error.message,
              300
            ),
        }
      );
    }
  }

  return {
    processed,
    sent,
    failed,
    manualRecovery,
  };
}

async function processLeadNotificationBatch(
  limit = 25
) {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        Number(limit) ||
          25,
        100
      )
    );

  const recovered =
    await recoverStaleNotificationProcessing();

  const salesAlert =
    await processNotificationChannel(
      'salesAlert',
      safeLimit
    );

  const itAlert =
    await processNotificationChannel(
      'itAlert',
      safeLimit
    );

  return {
    recovered,

    salesAlert,

    itAlert,

    processed:
      salesAlert.processed +
      itAlert.processed,

    sent:
      salesAlert.sent +
      itAlert.sent,

    failed:
      salesAlert.failed +
      itAlert.failed,

    manualRecovery:
      salesAlert.manualRecovery +
      itAlert.manualRecovery,
  };
}

async function requeueLeadNotification(
  leadId,
  channel
) {
  if (!leadId) {
    throw new Error(
      'leadId is required to requeue a notification.'
    );
  }

  const safeChannel =
    normalizeChannel(
      channel
    );

  const requeuedLead =
    await Lead.findByIdAndUpdate(
      leadId,

      {
        $set: {
          [getDeliveryPath(
            safeChannel,
            'status'
          )]:
            'PENDING',

          [getDeliveryPath(
            safeChannel,
            'attempts'
          )]:
            0,

          [getDeliveryPath(
            safeChannel,
            'nextAttemptAt'
          )]:
            null,

          [getDeliveryPath(
            safeChannel,
            'lastAttemptAt'
          )]:
            null,

          [getDeliveryPath(
            safeChannel,
            'sentAt'
          )]:
            null,

          [getDeliveryPath(
            safeChannel,
            'lastError'
          )]:
            '',
        },
      },

      {
        new:
          true,
      }
    );

  if (requeuedLead) {
    await logNotification(
      safeChannel ===
        'salesAlert'
        ? 'SALES_ALERT_MANUAL_REQUEUE'
        : 'IT_ALERT_MANUAL_REQUEUE',

      'PENDING',

      {
        leadId:
          requeuedLead._id,

        entityType:
          'LEAD',

        entityId:
          getSafeLeadEntityId(
            requeuedLead
          ),

        provider:
          getNotificationProvider(
            safeChannel
          ),

        retryCount:
          0,

        metadata: {
          channel:
            safeChannel,

          manualRequeue:
            true,
        },
      }
    );

    await logRetry(
      safeChannel ===
        'salesAlert'
        ? 'SALES_ALERT_MANUAL_REQUEUE'
        : 'IT_ALERT_MANUAL_REQUEUE',

      'PENDING',

      {
        leadId:
          requeuedLead._id,

        entityType:
          'LEAD',

        entityId:
          getSafeLeadEntityId(
            requeuedLead
          ),

        provider:
          getNotificationProvider(
            safeChannel
          ),

        retryCount:
          0,
      }
    );
  }

  return requeuedLead;
}

module.exports = {
  MAX_NOTIFICATION_ATTEMPTS,

  claimNextLeadNotification,

  deliverSalesAssignmentAlert,
  deliverItRecoveryAlert,

  recoverStaleNotificationProcessing,

  processLeadNotificationBatch,

  requeueLeadNotification,
};