const crypto = require('crypto');
const http = require('http');
const https = require('https');

const Lead = require('./lead.model');

const {
  decryptText,
} = require('../../utils/crypto');

const {
  recordAudit,
} = require('../security-audit/auditLog.service');

const logger = require('../../utils/logger');

const {
  logCrmSync,
  logRetry,
} = require('../operations/operationalLog.service');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.26E: Durable CRM sync + operational outcome ledger
 *
 * Reliability rules:
 * - Lead persistence is authoritative; CRM delivery is asynchronous.
 * - Retries use exponential backoff.
 * - Webhook retries for the SAME business payload use the same idempotency key.
 * - If the Lead changes while an older CRM request is in flight, the older
 *   request can never mark the newer Lead state as fully synchronized.
 * - Exhausted retries move the Lead to MANUAL_RECOVERY and queue a durable
 *   IT alert. The Lead itself is never deleted or rolled back.
 * - Every material CRM delivery/retry/manual-recovery outcome is written to
 *   the privacy-safe operational ledger.
 * - Raw contact data and credentials are never written to logs.
 */

const MAX_CRM_SYNC_ATTEMPTS = 8;
const STALE_PROCESSING_MS = 10 * 60 * 1000;
const BASE_RETRY_MS = 60 * 1000;
const MAX_RETRY_MS = 6 * 60 * 60 * 1000;
const WEBHOOK_TIMEOUT_MS = 12 * 1000;
const MAX_RESPONSE_BYTES = 64 * 1024;


/* ============================================================
   BASIC / CONFIGURATION HELPERS
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


function getCrmSyncMode() {
  const mode =
    cleanText(
      process.env.CRM_SYNC_MODE,
      40
    ).toUpperCase();

  return mode === 'WEBHOOK'
    ? 'WEBHOOK'
    : 'INTERNAL';
}


function getCrmSyncConfig() {
  const mode =
    getCrmSyncMode();

  const webhookUrl =
    cleanText(
      process.env.CRM_SYNC_WEBHOOK_URL,
      1000
    );

  const webhookToken =
    cleanText(
      process.env.CRM_SYNC_WEBHOOK_TOKEN,
      4000
    );

  return {
    mode,
    webhookUrl,
    webhookToken,

    configured:
      mode === 'INTERNAL' ||
      Boolean(webhookUrl),
  };
}


function getCrmSyncStatus() {
  const config =
    getCrmSyncConfig();

  return {
    mode:
      config.mode,

    configured:
      config.configured,

    webhookConfigured:
      Boolean(
        config.webhookUrl
      ),

    tokenConfigured:
      Boolean(
        config.webhookToken
      ),

    maxAttempts:
      MAX_CRM_SYNC_ATTEMPTS,
  };
}


function getCrmProvider() {
  return getCrmSyncMode() === 'WEBHOOK'
    ? 'CRM_WEBHOOK'
    : 'INTERNAL_CRM';
}


function getSafeLeadEntityId(lead) {
  return cleanText(
    lead?.leadCode ||
    lead?._id ||
    '',
    160
  );
}


/* ============================================================
   BACKOFF
============================================================ */

function getRetryDelayMs(
  attempts
) {
  const safeAttempts =
    Math.max(
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


function getNextAttemptAt(
  attempts
) {
  return new Date(
    Date.now() +
      getRetryDelayMs(
        attempts
      )
  );
}


/* ============================================================
   SAFE CRM PAYLOAD
============================================================ */

function safeDecrypt(
  encryptedValue
) {
  if (!encryptedValue) {
    return '';
  }

  try {
    const value =
      decryptText(
        encryptedValue
      );

    if (
      !value ||
      value === 'DECRYPTION_ERROR'
    ) {
      return '';
    }

    return value;
  } catch {
    return '';
  }
}


function buildCrmPayload(
  lead
) {
  if (!lead?._id) {
    throw new Error(
      'A persisted Lead is required for CRM synchronization.'
    );
  }

  return {
    schemaVersion:
      'MASTER_DPR_V4_PHASE_2',

    lead: {
      internalLeadId:
        String(
          lead._id
        ),

      leadCode:
        lead.leadCode,

      contactId:
        lead.contactId
          ? String(
              lead.contactId
            )
          : null,

      source:
        lead.source,

      leadOrigin:
        lead.leadOrigin,

      crmStatus:
        lead.crmStatus,

      operationalStage:
        lead.stage,

      priority:
        lead.priority,

      score:
        lead.score,

      assignedTo:
        lead.assignedTo
          ? String(
              lead.assignedTo
            )
          : null,

      assignedDepartment:
        lead.assignedDepartment,

      assignedTeam:
        lead.assignedTeam,

      territory:
        lead.territory,

      assignedAt:
        lead.assignedAt,

      createdAt:
        lead.createdAt,

      /*
       * Informational only.
       * This field is deliberately excluded from the CRM business-payload
       * fingerprint because queue/notification writes also update updatedAt.
       */
      updatedAt:
        lead.updatedAt,
    },

    contact: {
      customerName:
        lead.customerName || '',

      companyName:
        lead.companyName || '',

      phone:
        safeDecrypt(
          lead.phoneEncrypted
        ),

      email:
        safeDecrypt(
          lead.emailEncrypted
        ),

      gst:
        safeDecrypt(
          lead.gstEncrypted
        ),

      country:
        lead.country || '',
    },

    requirement: {
      productCategory:
        lead.productCategory,

      product:
        lead.product,

      productVariant:
        lead.productVariant,

      grade:
        lead.grade,

      specification:
        lead.specification,

      quantity:
        lead.quantity,

      quantityValue:
        lead.quantityValue,

      quantityUnit:
        lead.quantityUnit,

      quantityBand:
        lead.quantityBand,

      destination:
        lead.destination,

      timeline:
        lead.timeline,

      targetDate:
        lead.targetDate,

      eligibilityStatus:
        lead.eligibilityStatus,

      eligibilityReason:
        lead.eligibilityReason,
    },

    commercial: {
      leadValue:
        lead.leadValue,

      quoteId:
        lead.quoteId
          ? String(
              lead.quoteId
            )
          : null,

      quoteAmount:
        lead.quoteAmount,

      expectedMarginBand:
        lead.expectedMarginBand,

      orderAmount:
        lead.orderAmount,

      lostReason:
        lead.lostReason,

      lostReasonNotes:
        lead.lostReasonNotes,

      wonAt:
        lead.wonAt,

      lostAt:
        lead.lostAt,
    },

    activity: {
      firstResponseAt:
        lead.firstResponseAt,

      lastContactAt:
        lead.lastContactAt,

      nextFollowupAt:
        lead.nextFollowupAt,
    },

    attribution: {
      utmSource:
        lead.attribution?.utmSource || '',

      utmMedium:
        lead.attribution?.utmMedium || '',

      utmCampaign:
        lead.attribution?.utmCampaign || '',

      utmContent:
        lead.attribution?.utmContent || '',

      utmTerm:
        lead.attribution?.utmTerm || '',

      gclid:
        lead.attribution?.gclid || '',

      fbclid:
        lead.attribution?.fbclid || '',

      campaignId:
        lead.attribution?.campaignId || '',

      adSetId:
        lead.attribution?.adSetId || '',

      adId:
        lead.attribution?.adId || '',

      creativeId:
        lead.attribution?.creativeId || '',

      creative:
        lead.attribution?.creative || '',

      landingPage:
        lead.attribution?.landingPage || '',

      landingPageType:
        lead.attribution?.landingPageType || '',

      analyticsSessionId:
        lead.attribution?.analyticsSessionId || '',
    },
  };
}


/* ============================================================
   BUSINESS-PAYLOAD FINGERPRINT / IDEMPOTENCY
============================================================ */

function buildCrmPayloadFingerprint(
  lead
) {
  const payload =
    buildCrmPayload(
      lead
    );

  /*
   * updatedAt is not a business field. Queue claims, retries and notification
   * delivery can change it without changing what the external CRM should see.
   */
  const fingerprintPayload = {
    ...payload,

    lead: {
      ...payload.lead,
    },
  };

  delete fingerprintPayload
    .lead
    .updatedAt;

  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify(
        fingerprintPayload
      )
    )
    .digest('hex');
}


function buildCrmRequestId(
  lead,
  fingerprint = null
) {
  const payloadFingerprint =
    fingerprint ||
    buildCrmPayloadFingerprint(
      lead
    );

  return `ito-crm-${payloadFingerprint.slice(0, 32)}`;
}


async function getCurrentLeadFingerprint(
  leadId
) {
  const currentLead =
    await Lead.findById(
      leadId
    );

  if (!currentLead) {
    return {
      lead: null,
      fingerprint: null,
    };
  }

  return {
    lead:
      currentLead,

    fingerprint:
      buildCrmPayloadFingerprint(
        currentLead
      ),
  };
}


async function requeueSupersededCrmPayload(
  lead,
  reason
) {
  const result =
    await Lead.findOneAndUpdate(
      {
        _id:
          lead._id,

        'crmSync.status':
          'PROCESSING',
      },

      {
        $set: {
          'crmSync.status':
            'PENDING',

          'crmSync.attempts':
            0,

          'crmSync.nextAttemptAt':
            null,

          'crmSync.lastError':
            cleanText(
              reason,
              500
            ),

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

  if (result) {
    logger.info(
      '[CRM Sync] Newer Lead state detected; CRM payload requeued',
      {
        leadId:
          String(
            lead._id
          ),
      }
    );

    await logCrmSync(
      'CRM_PAYLOAD_SUPERSEDED',
      'RETRY_SCHEDULED',
      {
        leadId:
          lead._id,

        entityType:
          'LEAD',

        entityId:
          getSafeLeadEntityId(
            lead
          ),

        provider:
          getCrmProvider(),

        retryCount:
          Number(
            lead.crmSync?.attempts
          ) || 0,

        metadata: {
          reason:
            cleanText(
              reason,
              500
            ),

          latestPayloadQueued:
            true,
        },
      }
    );

    await logRetry(
      'CRM_SYNC_PAYLOAD_REQUEUE',
      'RETRY_SCHEDULED',
      {
        leadId:
          lead._id,

        entityType:
          'LEAD',

        entityId:
          getSafeLeadEntityId(
            lead
          ),

        provider:
          getCrmProvider(),

        retryCount:
          Number(
            lead.crmSync?.attempts
          ) || 0,

        metadata: {
          reason:
            cleanText(
              reason,
              500
            ),
        },
      }
    );
  }

  return result;
}


/* ============================================================
   WEBHOOK TRANSPORT
============================================================ */

function postJsonToWebhook({
  url,
  token,
  payload,
  idempotencyKey,
  leadCode,
}) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      let parsedUrl;

      try {
        parsedUrl =
          new URL(url);
      } catch {
        reject(
          new Error(
            'CRM_SYNC_WEBHOOK_URL is invalid.'
          )
        );
        return;
      }

      if (
        parsedUrl.protocol !== 'https:' &&
        parsedUrl.protocol !== 'http:'
      ) {
        reject(
          new Error(
            'CRM sync webhook must use HTTP or HTTPS.'
          )
        );
        return;
      }

      const body =
        JSON.stringify(
          payload
        );

      const transport =
        parsedUrl.protocol === 'https:'
          ? https
          : http;

      const headers = {
        'Content-Type':
          'application/json',

        'Content-Length':
          Buffer.byteLength(
            body
          ),

        'Idempotency-Key':
          idempotencyKey,

        'X-ITO-Lead-Code':
          leadCode,
      };

      if (token) {
        headers.Authorization =
          `Bearer ${token}`;
      }

      const request =
        transport.request(
          parsedUrl,

          {
            method:
              'POST',

            headers,
          },

          (response) => {
            let responseBody =
              '';

            response.setEncoding(
              'utf8'
            );

            response.on(
              'data',
              (chunk) => {
                if (
                  Buffer.byteLength(
                    responseBody + chunk,
                    'utf8'
                  ) <= MAX_RESPONSE_BYTES
                ) {
                  responseBody +=
                    chunk;
                }
              }
            );

            response.on(
              'end',
              () => {
                const statusCode =
                  Number(
                    response.statusCode
                  ) || 0;

                let parsedBody =
                  null;

                if (responseBody) {
                  try {
                    parsedBody =
                      JSON.parse(
                        responseBody
                      );
                  } catch {
                    parsedBody =
                      null;
                  }
                }

                if (
                  statusCode >= 200 &&
                  statusCode < 300
                ) {
                  resolve({
                    statusCode,

                    externalCrmId:
                      cleanText(
                        parsedBody?.externalCrmId ||
                        parsedBody?.crmId ||
                        parsedBody?.id,
                        200
                      ),
                  });

                  return;
                }

                reject(
                  new Error(
                    `CRM webhook returned HTTP ${statusCode}.`
                  )
                );
              }
            );
          }
        );

      request.setTimeout(
        WEBHOOK_TIMEOUT_MS,

        () => {
          request.destroy(
            new Error(
              'CRM webhook request timed out.'
            )
          );
        }
      );

      request.on(
        'error',
        (error) => {
          reject(error);
        }
      );

      request.write(body);
      request.end();
    }
  );
}


/* ============================================================
   CRM ADAPTER
============================================================ */

async function deliverLeadToCrm(
  lead,
  {
    payloadFingerprint = null,
  } = {}
) {
  const config =
    getCrmSyncConfig();

  const fingerprint =
    payloadFingerprint ||
    buildCrmPayloadFingerprint(
      lead
    );

  if (
    config.mode === 'INTERNAL'
  ) {
    const exists =
      await Lead.exists({
        _id:
          lead._id,
      });

    if (!exists) {
      throw new Error(
        'Persisted Lead could not be verified in the internal CRM store.'
      );
    }

    return {
      responseCode:
        'INTERNAL_CRM',

      externalCrmId:
        '',

      requestId:
        buildCrmRequestId(
          lead,
          fingerprint
        ),
    };
  }

  if (!config.webhookUrl) {
    throw new Error(
      'CRM webhook mode is enabled but CRM_SYNC_WEBHOOK_URL is missing.'
    );
  }

  const payload =
    buildCrmPayload(
      lead
    );

  const requestId =
    buildCrmRequestId(
      lead,
      fingerprint
    );

  const result =
    await postJsonToWebhook({
      url:
        config.webhookUrl,

      token:
        config.webhookToken,

      payload,

      idempotencyKey:
        requestId,

      leadCode:
        lead.leadCode,
    });

  return {
    responseCode:
      String(
        result.statusCode
      ),

    externalCrmId:
      result.externalCrmId,

    requestId,
  };
}


/* ============================================================
   QUEUE / CLAIM
============================================================ */

async function enqueueCrmSyncLead(
  leadId,
  {
    resetAttempts = false,
  } = {}
) {
  if (!leadId) {
    return null;
  }

  const set = {
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
  };

  if (resetAttempts) {
    set['crmSync.attempts'] =
      0;
  }

  const queuedLead =
    await Lead.findByIdAndUpdate(
      leadId,

      {
        $set: set,
      },

      {
        new: true,
      }
    );

  if (queuedLead) {
    await logCrmSync(
      'CRM_SYNC_ENQUEUED',
      'PENDING',
      {
        leadId:
          queuedLead._id,

        entityType:
          'LEAD',

        entityId:
          getSafeLeadEntityId(
            queuedLead
          ),

        provider:
          getCrmProvider(),

        retryCount:
          Number(
            queuedLead.crmSync?.attempts
          ) || 0,

        metadata: {
          resetAttempts:
            resetAttempts === true,
        },
      }
    );
  }

  return queuedLead;
}


async function claimNextCrmSyncLead() {
  const now =
    new Date();

  return Lead.findOneAndUpdate(
    {
      'crmSync.status': {
        $in: [
          'PENDING',
          'FAILED',
        ],
      },

      'crmSync.attempts': {
        $lt:
          MAX_CRM_SYNC_ATTEMPTS,
      },

      'crmSync.manualRecoveryRequired': {
        $ne:
          true,
      },

      $or: [
        {
          'crmSync.nextAttemptAt':
            null,
        },

        {
          'crmSync.nextAttemptAt': {
            $exists:
              false,
          },
        },

        {
          'crmSync.nextAttemptAt': {
            $lte:
              now,
          },
        },
      ],
    },

    {
      $set: {
        'crmSync.status':
          'PROCESSING',

        'crmSync.lastAttemptAt':
          now,

        'crmSync.nextAttemptAt':
          null,
      },

      $inc: {
        'crmSync.attempts':
          1,
      },
    },

    {
      new: true,

      sort: {
        createdAt:
          1,
      },
    }
  );
}


/* ============================================================
   DURABLE IT ALERT QUEUE
============================================================ */

async function queueCrmManualRecoveryAlert(
  lead,
  errorMessage
) {
  try {
    await Lead.findByIdAndUpdate(
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
      }
    );
  } catch (alertQueueError) {
    logger.error(
      '[CRM Sync] Failed to queue IT manual-recovery alert',
      {
        leadId:
          String(
            lead._id
          ),

        error:
          cleanText(
            alertQueueError.message,
            300
          ),
      }
    );
  }

  try {
    await recordAudit({
      actorId:
        null,

      actionType:
        'CRM_SYNC_MANUAL_RECOVERY',

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

        attempts:
          lead.crmSync?.attempts ||
          MAX_CRM_SYNC_ATTEMPTS,

        error:
          cleanText(
            errorMessage,
            300
          ),
      },
    });
  } catch (auditError) {
    logger.error(
      '[CRM Sync] Manual recovery audit log failed',
      {
        leadId:
          String(
            lead._id
          ),

        error:
          cleanText(
            auditError.message,
            300
          ),
      }
    );
  }
}


/* ============================================================
   DELIVERY RESULT STATE
============================================================ */

async function markCrmSyncSucceeded(
  lead,
  result = {},
  claimedFingerprint = null
) {
  const fingerprint =
    claimedFingerprint ||
    buildCrmPayloadFingerprint(
      lead
    );

  const current =
    await getCurrentLeadFingerprint(
      lead._id
    );

  if (!current.lead) {
    return {
      status:
        'LEAD_MISSING',

      synced:
        false,
    };
  }

  /*
   * The CRM accepted an older snapshot, but the Lead changed while the
   * request was in flight. Do NOT mark the newer state SYNCED.
   */
  if (
    current.fingerprint !==
    fingerprint
  ) {
    await requeueSupersededCrmPayload(
      current.lead,
      'Lead changed while CRM delivery was in flight; latest payload requeued.'
    );

    return {
      status:
        'SUPERSEDED',

      synced:
        false,
    };
  }

  const set = {
    'crmSync.status':
      'SYNCED',

    'crmSync.syncedAt':
      new Date(),

    'crmSync.nextAttemptAt':
      null,

    'crmSync.lastError':
      '',

    'crmSync.manualRecoveryRequired':
      false,

    'crmSync.manualRecoveryReason':
      '',
  };

  const externalCrmId =
    cleanText(
      result.externalCrmId,
      200
    );

  if (externalCrmId) {
    set['crmSync.externalCrmId'] =
      externalCrmId;
  }

  const updated =
    await Lead.findOneAndUpdate(
      {
        _id:
          lead._id,

        'crmSync.status':
          'PROCESSING',
      },

      {
        $set: set,
      },

      {
        new: true,
      }
    );

  if (!updated) {
    return {
      status:
        'STATE_CHANGED',

      synced:
        false,
    };
  }

  try {
    await recordAudit({
      actorId:
        null,

      actionType:
        'CRM_SYNC_SUCCEEDED',

      entityType:
        'LEAD',

      entityId:
        String(
          lead._id
        ),

      severity:
        'LOW',

      metadata: {
        leadCode:
          lead.leadCode,

        crmMode:
          getCrmSyncMode(),

        externalCrmId:
          externalCrmId || '',

        requestId:
          cleanText(
            result.requestId,
            100
          ),
      },
    });
  } catch (auditError) {
    logger.warn(
      '[CRM Sync] Success audit logging failed',
      {
        leadId:
          String(
            lead._id
          ),

        error:
          cleanText(
            auditError.message,
            300
          ),
      }
    );
  }

  await logCrmSync(
    'LEAD_CRM_SYNC',
    'SUCCESS',
    {
      leadId:
        lead._id,

      entityType:
        'LEAD',

      entityId:
        getSafeLeadEntityId(
          lead
        ),

      provider:
        getCrmProvider(),

      idempotencyKey:
        cleanText(
          result.requestId,
          220
        ),

      retryCount:
        Number(
          lead.crmSync?.attempts
        ) || 0,

      httpStatus:
        /^\d{3}$/.test(
          cleanText(
            result.responseCode,
            10
          )
        )
          ? Number(
              result.responseCode
            )
          : null,

      metadata: {
        crmMode:
          getCrmSyncMode(),

        responseCode:
          cleanText(
            result.responseCode,
            80
          ),

        externalCrmId:
          externalCrmId || '',
      },
    }
  );

  return {
    status:
      'SYNCED',

    synced:
      true,
  };
}


async function markCrmSyncFailed(
  lead,
  error,
  claimedFingerprint = null
) {
  const fingerprint =
    claimedFingerprint ||
    buildCrmPayloadFingerprint(
      lead
    );

  const current =
    await getCurrentLeadFingerprint(
      lead._id
    );

  if (!current.lead) {
    return {
      status:
        'LEAD_MISSING',

      nextAttemptAt:
        null,
    };
  }

  /*
   * The failure belongs to an older Lead snapshot. The newest business state
   * starts a fresh sync cycle instead of inheriting the old payload's retry
   * exhaustion.
   */
  if (
    current.fingerprint !==
    fingerprint
  ) {
    await requeueSupersededCrmPayload(
      current.lead,
      'Lead changed during a failed CRM delivery; latest payload requeued.'
    );

    return {
      status:
        'SUPERSEDED',

      nextAttemptAt:
        null,
    };
  }

  const attempts =
    Number(
      current.lead.crmSync?.attempts
    ) || 1;

  const errorMessage =
    cleanText(
      error?.message ||
      'Unknown CRM synchronization failure',
      500
    );

  if (
    attempts >=
    MAX_CRM_SYNC_ATTEMPTS
  ) {
    const manualRecoveryLead =
      await Lead.findOneAndUpdate(
        {
          _id:
            lead._id,

          'crmSync.status':
            'PROCESSING',
        },

        {
          $set: {
            'crmSync.status':
              'MANUAL_RECOVERY',

            'crmSync.nextAttemptAt':
              null,

            'crmSync.lastError':
              errorMessage,

            'crmSync.manualRecoveryRequired':
              true,

            'crmSync.manualRecoveryReason':
              errorMessage,
          },
        },

        {
          new: true,
        }
      );

    if (manualRecoveryLead) {
      await queueCrmManualRecoveryAlert(
        manualRecoveryLead,
        errorMessage
      );

      await logCrmSync(
        'LEAD_CRM_SYNC',
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
            getCrmProvider(),

          retryCount:
            attempts,

          error,

          metadata: {
            maxAttempts:
              MAX_CRM_SYNC_ATTEMPTS,

            manualRecoveryRequired:
              true,
          },
        }
      );

      await logRetry(
        'CRM_SYNC_RETRY_EXHAUSTED',
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
            getCrmProvider(),

          retryCount:
            attempts,

          error,

          metadata: {
            maxAttempts:
              MAX_CRM_SYNC_ATTEMPTS,
          },
        }
      );
    }

    return {
      status:
        manualRecoveryLead
          ? 'MANUAL_RECOVERY'
          : 'STATE_CHANGED',

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

        'crmSync.status':
          'PROCESSING',
      },

      {
        $set: {
          'crmSync.status':
            'FAILED',

          'crmSync.nextAttemptAt':
            nextAttemptAt,

          'crmSync.lastError':
            errorMessage,
        },
      },

      {
        new: true,
      }
    );

  if (failedLead) {
    await logCrmSync(
      'LEAD_CRM_SYNC',
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
          getCrmProvider(),

        retryCount:
          attempts,

        error,

        metadata: {
          nextAttemptAt,
          maxAttempts:
            MAX_CRM_SYNC_ATTEMPTS,
        },
      }
    );

    await logRetry(
      'CRM_SYNC_RETRY',
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
          getCrmProvider(),

        retryCount:
          attempts,

        error,

        metadata: {
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


/* ============================================================
   STALE PROCESSING RECOVERY
============================================================ */

async function recoverStaleCrmSyncProcessing() {
  const staleBefore =
    new Date(
      Date.now() -
      STALE_PROCESSING_MS
    );

  const staleLeads =
    await Lead.find({
      'crmSync.status':
        'PROCESSING',

      'crmSync.lastAttemptAt': {
        $lt:
          staleBefore,
      },
    })
      .select(
        '_id leadCode crmSync'
      )
      .limit(200);

  let recovered =
    0;

  for (
    const staleLead
    of staleLeads
  ) {
    const attempts =
      Number(
        staleLead.crmSync?.attempts
      ) || 1;

    if (
      attempts >=
      MAX_CRM_SYNC_ATTEMPTS
    ) {
      const manualRecoveryLead =
        await Lead.findOneAndUpdate(
          {
            _id:
              staleLead._id,

            'crmSync.status':
              'PROCESSING',
          },

          {
            $set: {
              'crmSync.status':
                'MANUAL_RECOVERY',

              'crmSync.nextAttemptAt':
                null,

              'crmSync.lastError':
                'Recovered stale CRM processing state after retry exhaustion.',

              'crmSync.manualRecoveryRequired':
                true,

              'crmSync.manualRecoveryReason':
                'Recovered stale CRM processing state after retry exhaustion.',
            },
          },

          {
            new: true,
          }
        );

      if (manualRecoveryLead) {
        await queueCrmManualRecoveryAlert(
          manualRecoveryLead,
          'Recovered stale CRM processing state after retry exhaustion.'
        );

        await logCrmSync(
          'CRM_STALE_PROCESSING_RECOVERY',
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
              getCrmProvider(),

            retryCount:
              attempts,

            errorMessage:
              'Recovered stale CRM processing state after retry exhaustion.',

            metadata: {
              maxAttempts:
                MAX_CRM_SYNC_ATTEMPTS,
            },
          }
        );

        await logRetry(
          'CRM_SYNC_STALE_RECOVERY',
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
              getCrmProvider(),

            retryCount:
              attempts,
          }
        );

        recovered += 1;
      }

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
            staleLead._id,

          'crmSync.status':
            'PROCESSING',
        },

        {
          $set: {
            'crmSync.status':
              'FAILED',

            'crmSync.nextAttemptAt':
              nextAttemptAt,

            'crmSync.lastError':
              'Recovered stale CRM processing state.',
          },
        },

        {
          new: true,
        }
      );

    if (updated) {
      await logCrmSync(
        'CRM_STALE_PROCESSING_RECOVERY',
        'RETRY_SCHEDULED',
        {
          leadId:
            staleLead._id,

          entityType:
            'LEAD',

          entityId:
            getSafeLeadEntityId(
              staleLead
            ),

          provider:
            getCrmProvider(),

          retryCount:
            attempts,

          errorMessage:
            'Recovered stale CRM processing state.',

          metadata: {
            nextAttemptAt,
          },
        }
      );

      await logRetry(
        'CRM_SYNC_STALE_RECOVERY',
        'RETRY_SCHEDULED',
        {
          leadId:
            staleLead._id,

          entityType:
            'LEAD',

          entityId:
            getSafeLeadEntityId(
              staleLead
            ),

          provider:
            getCrmProvider(),

          retryCount:
            attempts,

          metadata: {
            nextAttemptAt,
          },
        }
      );

      recovered += 1;
    }
  }

  return recovered;
}


/* ============================================================
   BATCH WORKER
============================================================ */

async function processCrmSyncBatch(
  limit = 25
) {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        Number(limit) || 25,
        100
      )
    );

  const staleRecovered =
    await recoverStaleCrmSyncProcessing();

  let processed = 0;
  let synced = 0;
  let failed = 0;
  let manualRecovery = 0;
  let superseded = 0;

  for (
    let index = 0;
    index < safeLimit;
    index += 1
  ) {
    const lead =
      await claimNextCrmSyncLead();

    if (!lead) {
      break;
    }

    processed += 1;

    const claimedFingerprint =
      buildCrmPayloadFingerprint(
        lead
      );

    try {
      const result =
        await deliverLeadToCrm(
          lead,
          {
            payloadFingerprint:
              claimedFingerprint,
          }
        );

      const state =
        await markCrmSyncSucceeded(
          lead,
          result,
          claimedFingerprint
        );

      if (
        state.status ===
        'SYNCED'
      ) {
        synced += 1;
      } else if (
        state.status ===
        'SUPERSEDED'
      ) {
        superseded += 1;
      }

    } catch (error) {
      const state =
        await markCrmSyncFailed(
          lead,
          error,
          claimedFingerprint
        );

      if (
        state.status ===
        'MANUAL_RECOVERY'
      ) {
        manualRecovery += 1;
      } else if (
        state.status ===
        'SUPERSEDED'
      ) {
        superseded += 1;
      } else if (
        state.status ===
        'FAILED'
      ) {
        failed += 1;
      }

      logger.warn(
        '[CRM Sync] Delivery attempt failed',
        {
          leadId:
            String(
              lead._id
            ),

          attempt:
            lead.crmSync?.attempts ||
            1,

          status:
            state.status,

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
    staleRecovered,
    processed,
    synced,
    failed,
    manualRecovery,
    superseded,
  };
}


/* ============================================================
   MANUAL REQUEUE
============================================================ */

async function requeueCrmSyncLead(
  leadId
) {
  if (!leadId) {
    throw new Error(
      'leadId is required to requeue CRM synchronization.'
    );
  }

  const requeuedLead =
    await Lead.findByIdAndUpdate(
      leadId,

      {
        $set: {
          'crmSync.status':
            'PENDING',

          'crmSync.attempts':
            0,

          'crmSync.nextAttemptAt':
            null,

          'crmSync.lastAttemptAt':
            null,

          'crmSync.syncedAt':
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

  if (requeuedLead) {
    await logCrmSync(
      'CRM_SYNC_MANUAL_REQUEUE',
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
          getCrmProvider(),

        retryCount:
          0,

        metadata: {
          manualRequeue:
            true,
        },
      }
    );

    await logRetry(
      'CRM_SYNC_MANUAL_REQUEUE',
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
          getCrmProvider(),

        retryCount:
          0,
      }
    );
  }

  return requeuedLead;
}


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  MAX_CRM_SYNC_ATTEMPTS,

  getCrmSyncStatus,

  buildCrmPayload,
  buildCrmPayloadFingerprint,
  buildCrmRequestId,

  enqueueCrmSyncLead,
  claimNextCrmSyncLead,

  deliverLeadToCrm,

  markCrmSyncSucceeded,
  markCrmSyncFailed,

  recoverStaleCrmSyncProcessing,
  processCrmSyncBatch,

  requeueCrmSyncLead,
};