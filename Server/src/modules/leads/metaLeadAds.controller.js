const crypto = require('crypto');

const logger = require('../../utils/logger');

const {
  verifyWebhookChallenge,
  verifyWebhookSignature,
  extractLeadgenChanges,
  assertExpectedPage,
  fetchMetaLeadById,
} = require('./metaLeadAds.service');

const {
  mapMetaLeadRecordToCanonicalInput,
} = require('./metaLeadFormMapping.service');

const {
  createMetaInstantFormLeadRecord,
} = require('./metaInstantFormLead.service');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.14: Meta Lead Ads webhook controller
 *
 * Public endpoint responsibilities:
 * - answer Meta webhook verification challenges;
 * - verify every POST against x-hub-signature-256;
 * - extract signed leadgen notifications;
 * - retrieve the authoritative lead payload from Meta Graph API;
 * - map only explicitly configured, unambiguous form fields/consent values;
 * - reject inconsistent webhook/fetched-lead identifiers before persistence;
 * - persist the lead through the existing idempotent Meta Instant Form service.
 *
 * Security / data-handling rules:
 * - never trust POST body data before signature verification;
 * - never log raw form fields, phone, email, access tokens or app secret;
 * - do not invent campaign/market/commercial values;
 * - repeated webhook deliveries remain safe because persistence is keyed by
 *   the immutable Meta lead identifier.
 */

function cleanText(value, maxLength = 500) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function createControllerError(
  message,
  code,
  statusCode = 500
) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function getSafeLeadReference(value) {
  const normalized = cleanText(value, 500);

  if (!normalized) {
    return '';
  }

  return crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .slice(0, 12);
}

function sendWebhookText(res, statusCode, text) {
  return res
    .status(statusCode)
    .type('text/plain')
    .send(text);
}

function mapWebhookError(error) {
  const code = cleanText(
    error?.code,
    160
  );

  if (
    [
      'META_LEAD_ADS_DISABLED',
      'META_LEAD_ADS_NOT_CONFIGURED',
      'META_LEAD_ADS_FORM_MAPPING_NOT_CONFIGURED',
      'META_LEAD_ADS_FIELD_MAP_INVALID',
      'META_LEAD_ADS_GRAPH_TIMEOUT',
      'META_LEAD_ADS_GRAPH_REQUEST_FAILED',
      'META_LEAD_ADS_GRAPH_RESPONSE_TOO_LARGE',
    ].includes(code)
  ) {
    return {
      statusCode: 503,
      responseText: 'TEMPORARILY_UNAVAILABLE',
    };
  }

  if (
    [
      'META_WEBHOOK_SIGNATURE_MISSING',
      'META_WEBHOOK_SIGNATURE_INVALID',
    ].includes(code)
  ) {
    return {
      statusCode: 401,
      responseText: 'INVALID_SIGNATURE',
    };
  }

  if (
    [
      'META_WEBHOOK_MODE_INVALID',
      'META_WEBHOOK_VERIFY_TOKEN_INVALID',
    ].includes(code)
  ) {
    return {
      statusCode: 403,
      responseText: 'VERIFICATION_FAILED',
    };
  }

  if (
    code === 'META_WEBHOOK_PAGE_NOT_ALLOWED'
  ) {
    return {
      statusCode: 403,
      responseText: 'PAGE_NOT_ALLOWED',
    };
  }

  if (
    [
      'META_WEBHOOK_CHALLENGE_MISSING',
      'META_WEBHOOK_RAW_BODY_MISSING',
      'META_WEBHOOK_CREATED_TIME_INVALID',
      'META_WEBHOOK_NOTIFICATION_CONFLICT',
      'META_LEAD_ADS_RECORD_REQUIRED',
      'META_LEAD_ADS_LEADGEN_ID_REQUIRED',
      'META_LEAD_ADS_LEADGEN_ID_MISSING',
      'META_LEAD_ADS_LEADGEN_ID_MISMATCH',
      'META_LEAD_ADS_NOTIFICATION_MISMATCH',
      'META_LEAD_ADS_FIELD_DATA_INVALID',
      'META_LEAD_ADS_FIELD_DATA_DUPLICATE',
    ].includes(code)
  ) {
    return {
      statusCode: 400,
      responseText: 'INVALID_WEBHOOK_PAYLOAD',
    };
  }

  if (
    [
      'META_LEAD_ADS_FIELD_VALUE_AMBIGUOUS',
      'META_LEAD_ADS_REQUIRED_FIELD_MISSING',
      'META_LEAD_ADS_CONSENT_FIELD_COLLISION',
    ].includes(code)
  ) {
    return {
      statusCode: 422,
      responseText: 'LEAD_REJECTED',
    };
  }

  /*
   * Lead-level validation failures should not be converted into a false
   * success. Returning 422 keeps the failure visible while avoiding any claim
   * that the record entered CRM successfully.
   */
  if (
    code.startsWith('META_INSTANT_FORM_') ||
    code === 'VALIDATION_FAILED'
  ) {
    return {
      statusCode: 422,
      responseText: 'LEAD_REJECTED',
    };
  }

  return {
    statusCode: 500,
    responseText: 'PROCESSING_FAILED',
  };
}

function parseMetaTimestampSeconds(value) {
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
    Number.isFinite(numeric) &&
    numeric > 0
  ) {
    /*
     * Meta webhook created_time is normally epoch seconds. If a millisecond
     * value is ever supplied, normalize it safely without assuming one form.
     */
    return numeric > 1e12
      ? Math.floor(
          numeric / 1000
        )
      : Math.floor(
          numeric
        );
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return Math.floor(
    parsed.getTime() /
      1000
  );
}

function assertNotificationMatchesFetchedLead(
  change,
  metaRecord
) {
  const webhookFormId = cleanText(
    change?.formId,
    160
  );

  const fetchedFormId = cleanText(
    metaRecord?.metaFormId,
    160
  );

  if (
    webhookFormId &&
    fetchedFormId &&
    webhookFormId !== fetchedFormId
  ) {
    throw createControllerError(
      'Meta webhook Form ID did not match the fetched lead record.',
      'META_LEAD_ADS_NOTIFICATION_MISMATCH',
      400
    );
  }

  const webhookAdId = cleanText(
    change?.adId,
    160
  );

  const fetchedAdId = cleanText(
    metaRecord?.metaAdId,
    160
  );

  if (
    webhookAdId &&
    fetchedAdId &&
    webhookAdId !== fetchedAdId
  ) {
    throw createControllerError(
      'Meta webhook Ad ID did not match the fetched lead record.',
      'META_LEAD_ADS_NOTIFICATION_MISMATCH',
      400
    );
  }

  const webhookCreatedTime =
    parseMetaTimestampSeconds(
      change?.createdTime
    );

  const fetchedCreatedTime =
    parseMetaTimestampSeconds(
      metaRecord?.createdTime
    );

  if (
    webhookCreatedTime !== null &&
    fetchedCreatedTime !== null &&
    webhookCreatedTime !==
      fetchedCreatedTime
  ) {
    throw createControllerError(
      'Meta webhook created time did not match the fetched lead record.',
      'META_LEAD_ADS_NOTIFICATION_MISMATCH',
      400
    );
  }

  return true;
}

async function processLeadgenChange(change) {
  assertExpectedPage(change);

  const metaRecord =
    await fetchMetaLeadById(
      change.leadgenId
    );

  assertNotificationMatchesFetchedLead(
    change,
    metaRecord
  );

  const canonicalInput =
    mapMetaLeadRecordToCanonicalInput({
      metaRecord,
      webhookChange: change,
    });

  return createMetaInstantFormLeadRecord(
    canonicalInput
  );
}

/* ============================================================
   GET — META WEBHOOK SUBSCRIPTION VERIFICATION
============================================================ */

async function verifyMetaLeadAdsWebhook(
  req,
  res
) {
  try {
    const challenge =
      verifyWebhookChallenge({
        mode:
          req.query?.['hub.mode'],

        verifyToken:
          req.query?.['hub.verify_token'],

        challenge:
          req.query?.['hub.challenge'],
      });

    return sendWebhookText(
      res,
      200,
      challenge
    );

  } catch (error) {
    const mapped =
      mapWebhookError(error);

    logger.warn(
      '[Meta Lead Ads] Webhook verification rejected.',
      {
        code:
          cleanText(
            error?.code,
            160
          ) || 'UNKNOWN',
      }
    );

    return sendWebhookText(
      res,
      mapped.statusCode,
      mapped.responseText
    );
  }
}

/* ============================================================
   POST — SIGNED META LEADGEN NOTIFICATION
============================================================ */

async function receiveMetaLeadAdsWebhook(
  req,
  res
) {
  try {
    verifyWebhookSignature({
      rawBody: req.rawBody,

      signatureHeader:
        req.headers?.[
          'x-hub-signature-256'
        ],
    });

    const changes =
      extractLeadgenChanges(
        req.body
      );

    /*
     * A signed Page webhook may contain events other than leadgen.
     * Acknowledge those without inventing a CRM lead.
     */
    if (changes.length === 0) {
      return sendWebhookText(
        res,
        200,
        'EVENT_RECEIVED'
      );
    }

    const results =
      await Promise.allSettled(
        changes.map(
          (change) =>
            processLeadgenChange(
              change
            )
        )
      );

    const failed = [];

    let createdCount = 0;
    let reusedCount = 0;

    results.forEach(
      (result, index) => {
        if (
          result.status ===
          'fulfilled'
        ) {
          if (
            result.value?.reused ===
            true
          ) {
            reusedCount += 1;
          } else {
            createdCount += 1;
          }

          return;
        }

        const change =
          changes[index];

        failed.push({
          error:
            result.reason,

          leadReference:
            getSafeLeadReference(
              change?.leadgenId
            ),
        });
      }
    );

    if (failed.length > 0) {
      /*
       * Successful records are safe if Meta retries this same delivery:
       * metaInstantFormLead.service.js is idempotent by Meta lead ID.
       */
      const firstFailure =
        failed[0];

      const mapped =
        mapWebhookError(
          firstFailure.error
        );

      logger.error(
        '[Meta Lead Ads] One or more signed leadgen events failed.',
        {
          total:
            changes.length,

          failed:
            failed.length,

          created:
            createdCount,

          reused:
            reusedCount,

          firstFailureCode:
            cleanText(
              firstFailure.error?.code,
              160
            ) || 'UNKNOWN',

          firstFailureHttpStatus:
            Number.isInteger(
              firstFailure.error?.statusCode
            )
              ? firstFailure.error.statusCode
              : null,

          firstFailureLeadReference:
            firstFailure.leadReference,
        }
      );

      return sendWebhookText(
        res,
        mapped.statusCode,
        mapped.responseText
      );
    }

    logger.info(
      '[Meta Lead Ads] Signed leadgen webhook processed.',
      {
        total:
          changes.length,

        created:
          createdCount,

        reused:
          reusedCount,
      }
    );

    return sendWebhookText(
      res,
      200,
      'EVENT_RECEIVED'
    );

  } catch (error) {
    const mapped =
      mapWebhookError(error);

    logger.warn(
      '[Meta Lead Ads] Webhook request rejected.',
      {
        code:
          cleanText(
            error?.code,
            160
          ) || 'UNKNOWN',
      }
    );

    return sendWebhookText(
      res,
      mapped.statusCode,
      mapped.responseText
    );
  }
}

module.exports = {
  verifyMetaLeadAdsWebhook,
  receiveMetaLeadAdsWebhook,
};
