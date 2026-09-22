const Lead = require('./lead.model');

const {
  ACTIVE_CRM_STATUSES,
  autoRouteLead,
} = require('./leadAssignment.service');

const logger = require('../../utils/logger');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.24B: Durable ownership recovery
 *
 * Purpose:
 * - find persisted active Leads that still have no individual owner;
 * - retry the normal routing engine until a real owner becomes available;
 * - prioritize HOT/WARM queues without inventing a sales-response SLA;
 * - avoid concurrent ownership-recovery claims across server instances;
 * - avoid resetting notification retry history when no new owner was found;
 * - queue CRM re-sync when ownership metadata changes;
 * - never delete, roll back, or hide an unowned Lead.
 *
 * Technical retry cadence is an implementation concern, not a buyer-response SLA.
 */

const OWNERSHIP_RECOVERY_RETRY_MS = 5 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;

const PRIORITY_RANK = Object.freeze({
  HOT: 0,
  WARM: 1,
  NURTURE: 2,
  LOW: 3,
  COLD: 3,
  INCOMPLETE: 4,
  FAKE: 5,
});

function cleanText(value, maxLength = 500) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function normalizeBatchSize(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.max(
    1,
    Math.min(
      Math.floor(numeric),
      MAX_BATCH_SIZE
    )
  );
}

function getRecoveryDueBefore(now = new Date()) {
  return new Date(
    now.getTime() -
      OWNERSHIP_RECOVERY_RETRY_MS
  );
}

function buildUnownedCondition() {
  return {
    $or: [
      {
        assignedTo: null,
      },

      {
        assignedTo: '',
      },

      {
        assignedTo: {
          $exists: false,
        },
      },

      {
        assignedTo: 'unassigned',
      },

      {
        assignedTo: 'UNASSIGNED',
      },

      {
        assignedTo: 'null',
      },

      {
        assignedTo: 'undefined',
      },
    ],
  };
}

function buildRecoveryDueCondition(
  now = new Date()
) {
  const dueBefore =
    getRecoveryDueBefore(now);

  return {
    $or: [
      {
        assignedAt: null,
      },

      {
        assignedAt: {
          $exists: false,
        },
      },

      {
        assignedAt: {
          $lte: dueBefore,
        },
      },
    ],
  };
}

function buildOwnershipRecoveryFilter(
  now = new Date()
) {
  return {
    $and: [
      {
        crmStatus: {
          $in: ACTIVE_CRM_STATUSES,
        },
      },

      buildUnownedCondition(),

      buildRecoveryDueCondition(now),

      /*
       * Do not disturb an assignment notification that is currently being
       * delivered. The notification-recovery worker handles stale PROCESSING
       * records separately.
       */
      {
        'notificationDelivery.salesAlert.status': {
          $ne: 'PROCESSING',
        },
      },
    ],
  };
}

async function findOwnershipRecoveryCandidateIds(
  limit = DEFAULT_BATCH_SIZE,
  now = new Date()
) {
  const safeLimit =
    normalizeBatchSize(limit);

  const match =
    buildOwnershipRecoveryFilter(now);

  const rows =
    await Lead.aggregate([
      {
        $match: match,
      },

      {
        $addFields: {
          __ownershipPriorityRank: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: [
                      '$priority',
                      'HOT',
                    ],
                  },
                  then: PRIORITY_RANK.HOT,
                },

                {
                  case: {
                    $eq: [
                      '$priority',
                      'WARM',
                    ],
                  },
                  then: PRIORITY_RANK.WARM,
                },

                {
                  case: {
                    $eq: [
                      '$priority',
                      'NURTURE',
                    ],
                  },
                  then: PRIORITY_RANK.NURTURE,
                },

                {
                  case: {
                    $in: [
                      '$priority',
                      [
                        'LOW',
                        'COLD',
                      ],
                    ],
                  },
                  then: PRIORITY_RANK.LOW,
                },

                {
                  case: {
                    $eq: [
                      '$priority',
                      'INCOMPLETE',
                    ],
                  },
                  then: PRIORITY_RANK.INCOMPLETE,
                },

                {
                  case: {
                    $eq: [
                      '$priority',
                      'FAKE',
                    ],
                  },
                  then: PRIORITY_RANK.FAKE,
                },
              ],

              default: 6,
            },
          },
        },
      },

      {
        $sort: {
          __ownershipPriorityRank: 1,
          createdAt: 1,
          _id: 1,
        },
      },

      {
        $limit: safeLimit,
      },

      {
        $project: {
          _id: 1,
        },
      },
    ]);

  return rows.map(
    (row) => row._id
  );
}

async function claimOwnershipRecoveryLead(
  leadId,
  now = new Date()
) {
  if (!leadId) {
    return null;
  }

  const filter = {
    _id: leadId,

    ...buildOwnershipRecoveryFilter(now),
  };

  return Lead.findOneAndUpdate(
    filter,

    {
      $set: {
        assignmentSource:
          'SYSTEM_RECOVERY',

        /*
         * For an unowned Lead this timestamp doubles as the distributed
         * recovery-attempt marker. Once an actual owner is found,
         * autoRouteLead writes the real assignment timestamp again.
         */
        assignedAt:
          now,

        assignmentReason:
          'Ownership recovery claim: retrying automatic Lead routing.',
      },
    },

    {
      new: true,
    }
  );
}

function cloneNotificationState(state) {
  if (!state) {
    return null;
  }

  const raw =
    typeof state.toObject === 'function'
      ? state.toObject()
      : state;

  return {
    status:
      raw.status || '',

    attempts:
      Number(raw.attempts) || 0,

    nextAttemptAt:
      raw.nextAttemptAt || null,

    lastAttemptAt:
      raw.lastAttemptAt || null,

    sentAt:
      raw.sentAt || null,

    lastError:
      cleanText(
        raw.lastError,
        500
      ),
  };
}

function shouldPreservePreviousAlertState(
  previousState
) {
  if (!previousState) {
    return false;
  }

  return [
    'PENDING',
    'FAILED',
    'SENT',
    'MANUAL_RECOVERY',
  ].includes(
    cleanText(
      previousState.status,
      80
    ).toUpperCase()
  );
}

async function restorePreviousSalesAlertState(
  leadId,
  previousState
) {
  if (
    !leadId ||
    !shouldPreservePreviousAlertState(
      previousState
    )
  ) {
    return null;
  }

  /*
   * Restore only if no notification worker has claimed the freshly queued
   * PENDING alert after routing. This prevents us from overwriting a live
   * delivery attempt.
   */
  return Lead.findOneAndUpdate(
    {
      _id: leadId,

      assignedTo: null,

      'notificationDelivery.salesAlert.status':
        'PENDING',

      'notificationDelivery.salesAlert.lastAttemptAt':
        null,
    },

    {
      $set: {
        'notificationDelivery.salesAlert.status':
          previousState.status,

        'notificationDelivery.salesAlert.attempts':
          previousState.attempts,

        'notificationDelivery.salesAlert.nextAttemptAt':
          previousState.nextAttemptAt,

        'notificationDelivery.salesAlert.lastAttemptAt':
          previousState.lastAttemptAt,

        'notificationDelivery.salesAlert.sentAt':
          previousState.sentAt,

        'notificationDelivery.salesAlert.lastError':
          previousState.lastError,
      },
    },

    {
      new: true,
    }
  );
}

async function queueCrmResync(
  leadId
) {
  if (!leadId) {
    return null;
  }

  try {
    return await Lead.findOneAndUpdate(
      {
        _id: leadId,

        'crmSync.status': {
          $in: [
            'SYNCED',
            'NOT_REQUIRED',
          ],
        },
      },

      {
        $set: {
          'crmSync.status':
            'PENDING',

          'crmSync.nextAttemptAt':
            null,

          'crmSync.lastError':
            '',

          'crmSync.manualRecoveryRequired':
            false,

          'crmSync.manualRecoveryReason':
            '',
        },
      },

      {
        new: true,
      }
    );

  } catch (error) {
    logger.warn(
      '[Lead Ownership Recovery] CRM re-sync queue update failed',
      {
        leadId:
          String(leadId),

        error:
          cleanText(
            error.message,
            300
          ),
      }
    );

    return null;
  }
}

async function recoverLeadOwnership(
  lead
) {
  if (!lead?._id) {
    throw new Error(
      'A claimed persisted Lead is required for ownership recovery.'
    );
  }

  const previousSalesAlert =
    cloneNotificationState(
      lead.notificationDelivery
        ?.salesAlert
    );

  const previousOwnership = {
    assignedTo:
      lead.assignedTo
        ? String(
            lead.assignedTo._id ||
              lead.assignedTo
          )
        : '',

    assignedDepartment:
      lead.assignedDepartment || '',

    assignedTeam:
      lead.assignedTeam || '',

    territory:
      lead.territory || '',
  };

  const result =
    await autoRouteLead(
      lead,
      {
        force: true,

        attemptImmediateNotification:
          false,

        reasonPrefix:
          'Ownership recovery',
      }
    );

  const ownerFound =
    Boolean(
      result.assignedTo
    );

  if (!ownerFound) {
    /*
     * autoRouteLead deliberately queues an admin/department alert when no
     * owner exists. If an alert already had meaningful retry/delivery state,
     * restore it so periodic ownership checks do not reset retry history.
     *
     * If the previous state was missing / NOT_REQUIRED, the new PENDING state
     * is kept so operations receives the first admin-review alert.
     */
    await restorePreviousSalesAlertState(
      lead._id,
      previousSalesAlert
    );
  }

  const latestLead =
    await Lead.findById(
      lead._id
    )
      .select(
        '_id assignedTo assignedDepartment assignedTeam territory crmSync'
      )
      .lean();

  const currentOwnership = {
    assignedTo:
      latestLead?.assignedTo
        ? String(
            latestLead.assignedTo._id ||
              latestLead.assignedTo
          )
        : '',

    assignedDepartment:
      latestLead?.assignedDepartment || '',

    assignedTeam:
      latestLead?.assignedTeam || '',

    territory:
      latestLead?.territory || '',
  };

  const ownershipChanged =
    previousOwnership.assignedTo !==
      currentOwnership.assignedTo ||
    previousOwnership.assignedDepartment !==
      currentOwnership.assignedDepartment ||
    previousOwnership.assignedTeam !==
      currentOwnership.assignedTeam ||
    previousOwnership.territory !==
      currentOwnership.territory;

  if (ownershipChanged) {
    await queueCrmResync(
      lead._id
    );
  }

  return {
    leadId:
      String(
        lead._id
      ),

    ownerFound,

    assignedTo:
      result.assignedTo
        ? String(
            result.assignedTo
          )
        : null,

    assignedDepartment:
      result.assignedDepartment ||
      null,

    assignedTeam:
      result.assignedTeam || '',

    adminReviewRequired:
      result.adminReviewRequired ===
      true,

    ownershipChanged,
  };
}

async function processLeadOwnershipRecoveryBatch(
  limit = DEFAULT_BATCH_SIZE
) {
  const safeLimit =
    normalizeBatchSize(limit);

  const now =
    new Date();

  const candidateIds =
    await findOwnershipRecoveryCandidateIds(
      safeLimit,
      now
    );

  const summary = {
    candidates:
      candidateIds.length,

    claimed:
      0,

    assigned:
      0,

    adminFallbackAssigned:
      0,

    stillUnowned:
      0,

    crmResyncQueued:
      0,

    failed:
      0,
  };

  for (
    const leadId
    of candidateIds
  ) {
    let claimedLead =
      null;

    try {
      claimedLead =
        await claimOwnershipRecoveryLead(
          leadId,
          new Date()
        );

      if (!claimedLead) {
        continue;
      }

      summary.claimed +=
        1;

      const result =
        await recoverLeadOwnership(
          claimedLead
        );

      if (
        result.ownerFound
      ) {
        summary.assigned +=
          1;

        if (
          result.assignedDepartment ===
            'ADMIN' ||
          result.assignedTeam ===
            'ADMIN_REVIEW'
        ) {
          summary.adminFallbackAssigned +=
            1;
        }

      } else {
        summary.stillUnowned +=
          1;
      }

      if (
        result.ownershipChanged
      ) {
        summary.crmResyncQueued +=
          1;
      }

    } catch (error) {
      summary.failed +=
        1;

      logger.error(
        '[Lead Ownership Recovery] Lead ownership recovery failed',
        {
          leadId:
            String(
              claimedLead?._id ||
                leadId
            ),

          error:
            cleanText(
              error.message,
              300
            ),
        }
      );
    }
  }

  return summary;
}

module.exports = {
  OWNERSHIP_RECOVERY_RETRY_MS,
  DEFAULT_BATCH_SIZE,

  buildOwnershipRecoveryFilter,
  findOwnershipRecoveryCandidateIds,
  claimOwnershipRecoveryLead,
  recoverLeadOwnership,
  processLeadOwnershipRecoveryBatch,
};