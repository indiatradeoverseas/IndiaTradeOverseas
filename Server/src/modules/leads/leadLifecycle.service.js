const Lead = require('./lead.model');
const LeadActivity = require('./leadActivity.model');

const {
  CRM_STATUS,
  CRM_STATUSES,
  normalizeCrmStatus,
  normalizeLostReason,
} = require('./lead.constants');

const {
  recordAudit,
} = require('../security-audit/auditLog.service');

const {
  recordAnalyticsEvent,
} = require('../analytics/analyticsEvent.service');

const logger = require('../../utils/logger');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.13: Canonical CRM lifecycle transition service
 *
 * Canonical lifecycle:
 * NEW → CONTACT_ATTEMPTED → CONTACTED → QUALIFIED →
 * QUOTATION_SENT → NEGOTIATION → WON / LOST
 *
 * LOST may be reached from any active stage because the DPR includes
 * reasons such as invalid contact, unsupported destination and quantity too low.
 *
 * A forced transition exists only for controlled administrative recovery /
 * migration. Normal callers must follow the canonical state machine.
 */

const ACTIVE_CRM_STATUSES = Object.freeze([
  CRM_STATUS.NEW,
  CRM_STATUS.CONTACT_ATTEMPTED,
  CRM_STATUS.CONTACTED,
  CRM_STATUS.QUALIFIED,
  CRM_STATUS.QUOTATION_SENT,
  CRM_STATUS.NEGOTIATION,
]);

const TERMINAL_CRM_STATUSES = Object.freeze([
  CRM_STATUS.WON,
  CRM_STATUS.LOST,
]);

const ALLOWED_TRANSITIONS = Object.freeze({
  [CRM_STATUS.NEW]: Object.freeze([
    CRM_STATUS.CONTACT_ATTEMPTED,
    CRM_STATUS.LOST,
  ]),

  [CRM_STATUS.CONTACT_ATTEMPTED]: Object.freeze([
    CRM_STATUS.CONTACTED,
    CRM_STATUS.LOST,
  ]),

  [CRM_STATUS.CONTACTED]: Object.freeze([
    CRM_STATUS.QUALIFIED,
    CRM_STATUS.LOST,
  ]),

  [CRM_STATUS.QUALIFIED]: Object.freeze([
    CRM_STATUS.QUOTATION_SENT,
    CRM_STATUS.LOST,
  ]),

  [CRM_STATUS.QUOTATION_SENT]: Object.freeze([
    CRM_STATUS.NEGOTIATION,
    CRM_STATUS.LOST,
  ]),

  [CRM_STATUS.NEGOTIATION]: Object.freeze([
    CRM_STATUS.WON,
    CRM_STATUS.LOST,
  ]),

  [CRM_STATUS.WON]: Object.freeze([]),
  [CRM_STATUS.LOST]: Object.freeze([]),
});

const CRM_STATUS_TO_STAGE = Object.freeze({
  [CRM_STATUS.NEW]: 'NEW_LEAD',
  [CRM_STATUS.CONTACT_ATTEMPTED]: 'CONTACT_ATTEMPTED',
  [CRM_STATUS.CONTACTED]: 'CONTACTED',
  [CRM_STATUS.QUALIFIED]: 'LEAD_QUALIFICATION',
  [CRM_STATUS.QUOTATION_SENT]: 'QUOTATION_SENT',
  [CRM_STATUS.NEGOTIATION]: 'NEGOTIATION',
  [CRM_STATUS.WON]: 'CLOSED_WON',
  [CRM_STATUS.LOST]: 'CLOSED_LOST',
});

function cleanText(value, maxLength = 1000) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function lifecycleError(
  message,
  code = 'CRM_LIFECYCLE_ERROR',
  details = {}
) {
  const error = new Error(message);

  error.code = code;
  error.details = details;

  return error;
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
    throw lifecycleError(
      `${fieldName} must be a valid date.`,
      'CRM_DATE_INVALID',
      {
        field: fieldName,
      }
    );
  }

  return parsed;
}

function parseOptionalNonNegativeNumber(
  value,
  fieldName
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const numeric =
    Number(value);

  if (
    !Number.isFinite(numeric) ||
    numeric < 0
  ) {
    throw lifecycleError(
      `${fieldName} must be a non-negative number.`,
      'CRM_NUMBER_INVALID',
      {
        field: fieldName,
      }
    );
  }

  return numeric;
}

function canTransition(
  fromStatus,
  toStatus
) {
  const from =
    normalizeCrmStatus(
      fromStatus
    );

  const to =
    normalizeCrmStatus(
      toStatus
    );

  if (!from || !to) {
    return false;
  }

  if (from === to) {
    return true;
  }

  return Boolean(
    ALLOWED_TRANSITIONS[from]
      ?.includes(to)
  );
}

function assertTransitionAllowed({
  fromStatus,
  toStatus,
  force = false,
  forceReason = '',
}) {
  if (
    fromStatus ===
    toStatus
  ) {
    return;
  }

  if (
    canTransition(
      fromStatus,
      toStatus
    )
  ) {
    return;
  }

  if (force === true) {
    const reason =
      cleanText(
        forceReason,
        500
      );

    if (
      reason.length < 5
    ) {
      throw lifecycleError(
        'A meaningful forceReason is required for an administrative CRM lifecycle override.',
        'CRM_FORCE_REASON_REQUIRED'
      );
    }

    return;
  }

  throw lifecycleError(
    `CRM status cannot move directly from ${fromStatus} to ${toStatus}.`,
    'CRM_TRANSITION_NOT_ALLOWED',
    {
      fromStatus,
      toStatus,

      allowedNextStatuses:
        ALLOWED_TRANSITIONS[
          fromStatus
        ] || [],
    }
  );
}

function validateLostOutcome({
  toStatus,
  lostReason,
  lostReasonNotes,
}) {
  if (
    toStatus !==
    CRM_STATUS.LOST
  ) {
    return {
      reason: '',
      notes: '',
    };
  }

  const normalizedReason =
    normalizeLostReason(
      lostReason
    );

  if (!normalizedReason) {
    throw lifecycleError(
      'A valid lost reason is mandatory when a Lead is moved to LOST.',
      'LOST_REASON_REQUIRED'
    );
  }

  const notes =
    cleanText(
      lostReasonNotes,
      1000
    );

  if (
    normalizedReason ===
      'OTHER' &&
    !notes
  ) {
    throw lifecycleError(
      'Lost reason notes are required when the lost reason is Other.',
      'LOST_REASON_NOTES_REQUIRED'
    );
  }

  return {
    reason:
      normalizedReason,

    notes,
  };
}

function getLifecycleAnalyticsEvents(
  status
) {
  switch (status) {
    case CRM_STATUS.QUALIFIED:
      return [
        'qualification_completed',
        'qualified_lead',
      ];

    case CRM_STATUS.QUOTATION_SENT:
      return [
        'quote_sent',
      ];

    case CRM_STATUS.WON:
      return [
        'order_won',
      ];

    default:
      return [];
  }
}

async function recordLifecycleAnalytics(
  lead,
  toStatus
) {
  const events =
    getLifecycleAnalyticsEvents(
      toStatus
    );

  if (
    !events.length ||
    !lead?._id
  ) {
    return;
  }

  const analyticsAllowed =
    lead.consent
      ?.analyticsAllowed ===
    true;

  const advertisingAllowed =
    lead.consent
      ?.advertisingAllowed ===
    true;

  if (
    !analyticsAllowed &&
    !advertisingAllowed
  ) {
    return;
  }

  for (
    const eventName
    of events
  ) {
    try {
      await recordAnalyticsEvent(
        {
          eventId:
            `${eventName}_${lead.leadCode || lead._id}`,

          eventName,

          eventSource:
            'SERVER',

          occurredAt:
            new Date(),

          analyticsSessionId:
            lead.attribution
              ?.analyticsSessionId ||
            '',

          submissionId:
            lead.submissionId ||
            '',

          leadId:
            lead._id,

          leadCode:
            lead.leadCode,

          attribution: {
            utmSource:
              lead.attribution
                ?.utmSource,

            utmMedium:
              lead.attribution
                ?.utmMedium,

            utmCampaign:
              lead.attribution
                ?.utmCampaign,

            utmContent:
              lead.attribution
                ?.utmContent,

            utmTerm:
              lead.attribution
                ?.utmTerm,

            gclid:
              lead.attribution
                ?.gclid,

            fbclid:
              lead.attribution
                ?.fbclid,

            campaignId:
              lead.attribution
                ?.campaignId,

            adSetId:
              lead.attribution
                ?.adSetId,

            adId:
              lead.attribution
                ?.adId,
          },

          page: {
            pagePath:
              lead.attribution
                ?.landingPage,

            landingPageType:
              lead.attribution
                ?.landingPageType,
          },

          business: {
            vertical:
              lead.productCategory,

            productCategory:
              lead.productCategory,

            productCode:
              lead.grade ||
              lead.product,

            quantityBand:
              lead.quantityBand,

            timelineBand:
              lead.timeline,

            eligibilityStatus:
              lead.eligibilityStatus,

            leadPriority:
              lead.priority,
          },

          properties: {
            crm_status:
              toStatus,

            tracking_version:
              'master_dpr_v4_phase_2',
          },
        },

        {
          queueMetaCapi:
            advertisingAllowed,
        }
      );

    } catch (error) {
      /*
       * CRM state is already durably persisted.
       * Analytics failure must never undo the business transition.
       */
      logger.warn(
        '[Lead Lifecycle] Analytics event persistence failed',

        {
          leadId:
            String(
              lead._id
            ),

          eventName,

          error:
            cleanText(
              error.message,
              300
            ),
        }
      );
    }
  }
}

async function queueCrmResyncAfterLifecycleChange(
  leadId
) {
  /*
   * PENDING / FAILED / PROCESSING already mean CRM work exists.
   *
   * MANUAL_RECOVERY must stay manual until an operator explicitly
   * requeues it.
   *
   * A previously SYNCED / NOT_REQUIRED record needs a fresh sync
   * because business state changed.
   */
  await Lead.updateOne(
    {
      _id:
        leadId,

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
      },
    }
  );
}

async function transitionLeadCrmStatus({
  leadId,
  toStatus,
  actorId = null,
  note = '',
  nextFollowupAt = null,
  lostReason = '',
  lostReasonNotes = '',
  orderAmount = null,
  force = false,
  forceReason = '',
} = {}) {
  if (!leadId) {
    throw lifecycleError(
      'leadId is required.',
      'LEAD_ID_REQUIRED'
    );
  }

  const normalizedToStatus =
    normalizeCrmStatus(
      toStatus
    );

  if (
    !normalizedToStatus ||
    !CRM_STATUSES.includes(
      normalizedToStatus
    )
  ) {
    throw lifecycleError(
      'A valid canonical CRM status is required.',
      'CRM_STATUS_INVALID',
      {
        suppliedStatus:
          cleanText(
            toStatus,
            100
          ),
      }
    );
  }

  const existingLead =
    await Lead.findById(
      leadId
    );

  if (!existingLead) {
    throw lifecycleError(
      'Lead not found.',
      'LEAD_NOT_FOUND'
    );
  }

  const currentStatus =
    normalizeCrmStatus(
      existingLead.crmStatus
    ) ||
    CRM_STATUS.NEW;

  /*
   * Idempotent retry.
   */
  if (
    currentStatus ===
    normalizedToStatus
  ) {
    return {
      lead:
        existingLead,

      changed:
        false,

      reused:
        true,

      fromStatus:
        currentStatus,

      toStatus:
        normalizedToStatus,
    };
  }

  assertTransitionAllowed({
    fromStatus:
      currentStatus,

    toStatus:
      normalizedToStatus,

    force,

    forceReason,
  });

  const lostOutcome =
    validateLostOutcome({
      toStatus:
        normalizedToStatus,

      lostReason,

      lostReasonNotes,
    });

  const parsedNextFollowupAt =
    parseOptionalDate(
      nextFollowupAt,
      'nextFollowupAt'
    );

  const parsedOrderAmount =
    parseOptionalNonNegativeNumber(
      orderAmount,
      'orderAmount'
    );

  const now =
    new Date();

  const set = {
    crmStatus:
      normalizedToStatus,

    crmStatusChangedAt:
      now,

    crmStatusChangedBy:
      actorId ||
      null,

    stage:
      CRM_STATUS_TO_STAGE[
        normalizedToStatus
      ],

    stageChangedAt:
      now,

    stageChangedBy:
      actorId ||
      null,
  };

  /*
   * Follow-up date remains optional because WON/LOST and some
   * contact actions may not need another follow-up.
   */
  if (
    parsedNextFollowupAt
  ) {
    set.nextFollowupAt =
      parsedNextFollowupAt;
  }

  /*
   * First sales response is recorded once.
   */
  if (
    normalizedToStatus ===
      CRM_STATUS.CONTACT_ATTEMPTED &&
    !existingLead.firstResponseAt
  ) {
    set.firstResponseAt =
      now;
  }

  /*
   * CONTACTED is the first confirmed buyer contact.
   */
  if (
    normalizedToStatus ===
    CRM_STATUS.CONTACTED
  ) {
    set.lastContactAt =
      now;

    if (
      !existingLead
        .firstResponseAt
    ) {
      set.firstResponseAt =
        now;
    }
  }

  /*
   * LOST outcome.
   */
  if (
    normalizedToStatus ===
    CRM_STATUS.LOST
  ) {
    set.lostReason =
      lostOutcome.reason;

    set.lostReasonNotes =
      lostOutcome.notes;

    set.lostAt =
      now;

    set.wonAt =
      null;
  }

  /*
   * Only an explicit forced reopening may clear an existing
   * LOST outcome.
   */
  else if (
    currentStatus ===
      CRM_STATUS.LOST &&
    force === true
  ) {
    set.lostReason =
      '';

    set.lostReasonNotes =
      '';

    set.lostAt =
      null;
  }

  /*
   * WON outcome.
   */
  if (
    normalizedToStatus ===
    CRM_STATUS.WON
  ) {
    set.wonAt =
      now;

    set.lostAt =
      null;

    set.lostReason =
      '';

    set.lostReasonNotes =
      '';

    if (
      parsedOrderAmount !==
      null
    ) {
      set.orderAmount =
        parsedOrderAmount;
    }
  }

  /*
   * Only an explicit forced reopening may clear WON.
   */
  else if (
    currentStatus ===
      CRM_STATUS.WON &&
    force === true
  ) {
    set.wonAt =
      null;
  }

  /*
   * Concurrency guard:
   *
   * Update only if the Lead is still in the state that this
   * request inspected.
   */
  const updatedLead =
    await Lead.findOneAndUpdate(
      {
        _id:
          existingLead._id,

        crmStatus:
          currentStatus,
      },

      {
        $set:
          set,
        $push: { crmHistory: { fromStatus: currentStatus, toStatus: normalizedToStatus, occurredAt: new Date(), actorId: actorId || null } },
      },

      {
        new:
          true,

        runValidators:
          true,
      }
    );

  if (!updatedLead) {
    throw lifecycleError(
      'Lead status changed concurrently. Reload the Lead and retry the transition.',
      'CRM_TRANSITION_CONFLICT',
      {
        expectedStatus:
          currentStatus,

        requestedStatus:
          normalizedToStatus,
      }
    );
  }

  /* ==========================================================
     POST-PERSISTENCE SIDE EFFECTS

     None of these may roll back the CRM status.
  ========================================================== */

  try {
    await LeadActivity.create({
      leadId:
        updatedLead._id,

      actionType:
        'CRM_STATUS_CHANGED',

      note:
        cleanText(
          note,
          1000
        ) ||
        `CRM status changed from ${currentStatus} to ${normalizedToStatus}.`,

      nextFollowupAt:
        parsedNextFollowupAt,

      actorId:
        actorId ||
        null,

      metadata: {
        fromStatus:
          currentStatus,

        toStatus:
          normalizedToStatus,

        lostReason:
          normalizedToStatus ===
          CRM_STATUS.LOST
            ? lostOutcome.reason
            : '',

        forced:
          force === true,

        forceReason:
          force === true
            ? cleanText(
                forceReason,
                500
              )
            : '',
      },
    });

  } catch (error) {
    logger.warn(
      '[Lead Lifecycle] Activity log failed',

      {
        leadId:
          String(
            updatedLead._id
          ),

        error:
          cleanText(
            error.message,
            300
          ),
      }
    );
  }

  try {
    await recordAudit({
      actorId:
        actorId ||
        null,

      actionType:
        force === true
          ? 'CRM_STATUS_FORCE_CHANGED'
          : 'CRM_STATUS_CHANGED',

      entityType:
        'LEAD',

      entityId:
        String(
          updatedLead._id
        ),

      severity:
        force === true ||
        TERMINAL_CRM_STATUSES.includes(
          normalizedToStatus
        )
          ? 'MEDIUM'
          : 'LOW',

      metadata: {
        leadCode:
          updatedLead.leadCode,

        fromStatus:
          currentStatus,

        toStatus:
          normalizedToStatus,

        lostReason:
          normalizedToStatus ===
          CRM_STATUS.LOST
            ? lostOutcome.reason
            : '',

        forced:
          force === true,

        forceReason:
          force === true
            ? cleanText(
                forceReason,
                500
              )
            : '',
      },
    });

  } catch (error) {
    logger.warn(
      '[Lead Lifecycle] Audit logging failed',

      {
        leadId:
          String(
            updatedLead._id
          ),

        error:
          cleanText(
            error.message,
            300
          ),
      }
    );
  }

  try {
    await queueCrmResyncAfterLifecycleChange(
      updatedLead._id
    );

  } catch (error) {
    logger.warn(
      '[Lead Lifecycle] CRM resync queue update failed',

      {
        leadId:
          String(
            updatedLead._id
          ),

        error:
          cleanText(
            error.message,
            300
          ),
      }
    );
  }

  await recordLifecycleAnalytics(
    updatedLead,
    normalizedToStatus
  );

  return {
    lead:
      updatedLead,

    changed:
      true,

    reused:
      false,

    fromStatus:
      currentStatus,

    toStatus:
      normalizedToStatus,
  };
}

module.exports = {
  ACTIVE_CRM_STATUSES,
  TERMINAL_CRM_STATUSES,
  ALLOWED_TRANSITIONS,
  CRM_STATUS_TO_STAGE,
  canTransition,
  transitionLeadCrmStatus,
};