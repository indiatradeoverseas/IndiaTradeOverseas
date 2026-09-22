const crypto = require('crypto');
const https = require('https');

const env = require('../../config/env');
const logger = require('../../utils/logger');

const {
  claimNextMetaCapiEvent,
  markMetaCapiDelivered,
  markMetaCapiFailed,
  recoverStaleMetaCapiDeliveries,
} = require('./analyticsEvent.service');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 1.6G-A: Meta Conversions API delivery service
 *
 * Responsibilities:
 * - Deliver trusted server-side commercial events to Meta CAPI.
 * - Reuse the persistent AnalyticsEvent.eventId for deduplication.
 * - Never expose Meta access tokens in logs.
 * - Retry through the durable AnalyticsEvent delivery state.
 * - Recover stale PROCESSING events after a crash/redeploy.
 * - Remain disabled unless explicitly enabled and configured.
 *
 * IMPORTANT:
 * - Browser code cannot queue CAPI work. Only trusted backend workflows may
 *   create AnalyticsEvent records with delivery.metaCapi.status = PENDING.
 * - Missing Meta configuration must never break lead persistence or the API.
 * - No raw phone/email/name is read or transmitted by this Phase 1 service.
 *   Matching uses a one-way SHA-256 external_id derived from an internal
 *   first-party identifier.
 */

const META_REQUEST_TIMEOUT_MS = 12 * 1000;
const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;

const META_EVENT_NAME_MAP = Object.freeze({
  lead_created: 'Lead',
  qualified_lead: 'QualifiedLead',
  quote_created: 'QuoteCreated',
  quote_sent: 'QuoteSent',
  order_won: 'OrderWon',
  purchase: 'Purchase',
  repeat_order: 'RepeatOrder',
});

let configurationWarningShown = false;

/* =========================================================
   BASIC HELPERS
========================================================= */

function cleanText(value, maxLength = 250) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function isTruthyEnv(value) {
  return ['1', 'true', 'yes', 'on'].includes(
    cleanText(value, 20).toLowerCase()
  );
}

function sha256(value) {
  const clean = cleanText(value, 500);

  if (!clean) {
    return '';
  }

  return crypto
    .createHash('sha256')
    .update(clean)
    .digest('hex');
}

function safeInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

/* =========================================================
   CONFIGURATION
========================================================= */

/**
 * No existing credential is overwritten here.
 *
 * When the project owner is ready to activate Meta CAPI, these environment
 * variables may be ADDED to the deployment environment / Server/.env:
 *
 * META_CAPI_ENABLED=true
 * META_PIXEL_ID=<existing Meta dataset/pixel id>
 * META_CAPI_ACCESS_TOKEN=<existing Meta CAPI token>
 * META_GRAPH_API_VERSION=<approved Graph API version, e.g. vXX.X>
 * META_CAPI_TEST_EVENT_CODE=<optional Events Manager test code>
 *
 * The service intentionally does not invent IDs, tokens or API versions.
 */
function getMetaCapiConfig() {
  const enabled = isTruthyEnv(
    process.env.META_CAPI_ENABLED
  );

  const pixelId = cleanText(
    process.env.META_PIXEL_ID || require('../../config/publicBusiness.json').metaPixelId,
    120
  );

  const accessToken = cleanText(
    process.env.META_CAPI_ACCESS_TOKEN,
    4096
  );

  const graphApiVersion = cleanText(
    process.env.META_GRAPH_API_VERSION,
    30
  );

  const testEventCode = cleanText(
    process.env.META_CAPI_TEST_EVENT_CODE,
    120
  );

  const missing = [];

  if (!pixelId) {
    missing.push('META_PIXEL_ID');
  }

  if (!accessToken) {
    missing.push('META_CAPI_ACCESS_TOKEN');
  }

  if (!graphApiVersion) {
    missing.push('META_GRAPH_API_VERSION');
  }

  return {
    enabled,
    configured: missing.length === 0,
    missing,
    pixelId,
    accessToken,
    graphApiVersion,
    testEventCode,
  };
}

function getMetaCapiStatus() {
  const config = getMetaCapiConfig();

  return {
    enabled: config.enabled,
    configured: config.configured,
    missing: [...config.missing],
    testMode: !!config.testEventCode,
  };
}

/* =========================================================
   META EVENT BUILDING
========================================================= */

function getMetaEventName(canonicalEventName) {
  return (
    META_EVENT_NAME_MAP[canonicalEventName] ||
    cleanText(canonicalEventName, 100)
  );
}

function getExternalIdSource(event) {
  /**
   * Preference order:
   * 1. Public/non-secret CRM lead code
   * 2. Mongo Lead ObjectId
   * 3. Anonymous analytics session id
   *
   * The source value itself is never transmitted. Only SHA-256 is sent.
   */
  return (
    cleanText(event?.leadCode, 120) ||
    cleanText(event?.leadId?.toString?.() || event?.leadId, 120) ||
    cleanText(event?.analyticsSessionId, 160)
  );
}

function buildMetaUserData(event) {
  const externalIdSource = getExternalIdSource(event);
  const externalIdHash = sha256(externalIdSource);

  if (!externalIdHash) {
    const error = new Error(
      'Meta CAPI event has no first-party match identifier.'
    );

    error.code = 'META_CAPI_MATCH_IDENTIFIER_MISSING';
    throw error;
  }

  return {
    external_id: [externalIdHash],
  };
}

function buildEventSourceUrl(event) {
  const frontendBase = cleanText(
    env.FRONTEND_URL,
    500
  ).replace(/\/+$/, '');

  const path = cleanText(
    event?.page?.path,
    250
  );

  if (!frontendBase) {
    return undefined;
  }

  if (!path) {
    return frontendBase;
  }

  const safePath = path.startsWith('/')
    ? path
    : `/${path}`;

  return `${frontendBase}${safePath}`;
}

function buildMetaCustomData(event) {
  const properties =
    event?.properties &&
    typeof event.properties === 'object'
      ? event.properties
      : {};

  const customData = {};

  const currency = cleanText(
    properties.currency,
    10
  ).toUpperCase();

  if (currency) {
    customData.currency = currency;
    if(/^[A-Z]{3}$/.test(currency) && typeof properties.value==='number' && Number.isFinite(properties.value) && properties.value>=0) customData.value=properties.value;
  }

  const category = cleanText(
    event?.business?.productCategory ||
      event?.business?.vertical,
    100
  );

  if (category) {
    customData.content_category = category;
  }

  const productCode = cleanText(
    event?.business?.productCode,
    150
  );

  if (productCode) {
    customData.content_name = productCode;
  }

  const quantityBand = cleanText(
    event?.business?.quantityBand,
    100
  );

  if (quantityBand) {
    customData.quantity_band = quantityBand;
  }

  const timelineBand = cleanText(
    event?.business?.timelineBand,
    100
  );

  if (timelineBand) {
    customData.timeline_band = timelineBand;
  }

  const leadPriority = cleanText(
    event?.business?.leadPriority,
    50
  );

  if (leadPriority) {
    customData.lead_priority = leadPriority;
  }

  const eligibilityStatus = cleanText(
    event?.business?.eligibilityStatus,
    100
  );

  if (eligibilityStatus) {
    customData.eligibility_status = eligibilityStatus;
  }

  const valueBand = cleanText(
    properties.value_band,
    100
  );

  if (valueBand) {
    customData.value_band = valueBand;
  }

  return customData;
}

function buildMetaCapiPayload(event, config) {
  const eventTime = Math.floor(
    new Date(event.occurredAt || Date.now()).getTime() / 1000
  );

  if (!Number.isFinite(eventTime)) {
    const error = new Error(
      'Meta CAPI event has an invalid occurredAt timestamp.'
    );

    error.code = 'META_CAPI_INVALID_EVENT_TIME';
    throw error;
  }

  const eventSourceUrl = buildEventSourceUrl(event);

  const metaEvent = {
    event_name: getMetaEventName(event.eventName),
    event_time: eventTime,
    event_id: cleanText(event.eventId, 160),
    action_source: 'website',
    user_data: buildMetaUserData(event),
    custom_data: buildMetaCustomData(event),
  };

  if (eventSourceUrl) {
    metaEvent.event_source_url = eventSourceUrl;
  }

  const payload = {
    data: [metaEvent],
  };

  if (config.testEventCode) {
    payload.test_event_code = config.testEventCode;
  }

  return payload;
}

/* =========================================================
   HTTPS TRANSPORT
========================================================= */

function requestMetaGraphApi({
  config,
  payload,
}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);

    const requestPath =
      `/${encodeURIComponent(config.graphApiVersion)}` +
      `/${encodeURIComponent(config.pixelId)}` +
      '/events';

    const request = https.request(
      {
        protocol: 'https:',
        hostname: 'graph.facebook.com',
        port: 443,
        path: requestPath,
        method: 'POST',
        timeout: META_REQUEST_TIMEOUT_MS,

        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'IndiaTradeOverseas-MasterDPR-CAPI/1.0',
        },
      },

      (response) => {
        let raw = '';

        response.setEncoding('utf8');

        response.on('data', (chunk) => {
          raw += chunk;

          if (raw.length > 1024 * 1024) {
            response.destroy(
              new Error(
                'Meta CAPI response exceeded 1 MB.'
              )
            );
          }
        });

        response.on('error', reject);
        response.on('aborted', () => reject(new Error('META_CAPI_RESPONSE_ABORTED')));
        response.on('end', () => {
          let parsed = null;

          if (raw) {
            try {
              parsed = JSON.parse(raw);
            } catch {
              parsed = null;
            }
          }

          const statusCode =
            Number(
              response.statusCode || 0
            );

          if (
            statusCode >= 200 &&
            statusCode < 300 &&
            !parsed?.error
          ) {
            resolve({
              statusCode,
              body: parsed,
            });

            return;
          }

          const errorMessage =
            cleanText(
              parsed?.error?.message ||
              parsed?.message ||
              `Meta CAPI returned HTTP ${statusCode}.`,
              500
            );

          const error =
            new Error(
              errorMessage
            );

          error.code =
            'META_CAPI_HTTP_ERROR';

          error.statusCode =
            statusCode;

          error.metaErrorCode =
            cleanText(
              parsed?.error?.code,
              80
            );

          error.metaErrorSubcode =
            cleanText(
              parsed?.error?.error_subcode,
              80
            );

          reject(error);
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(
        new Error(
          'Meta CAPI request timed out.'
        )
      );
    });

    request.on('error', (error) => {
      if (!error.code) {
        error.code =
          'META_CAPI_NETWORK_ERROR';
      }

      reject(error);
    });

    request.write(body);
    request.end();
  });
}

/* =========================================================
   SINGLE EVENT DELIVERY
========================================================= */

async function deliverMetaCapiEvent(
  event,
  config
) {
  const payload =
    buildMetaCapiPayload(
      event,
      config
    );

  return requestMetaGraphApi({
    config,
    payload,
  });
}

/* =========================================================
   BATCH WORKER
========================================================= */

/**
 * Process pending/failed Meta CAPI events.
 *
 * This worker is intentionally no-op unless META_CAPI_ENABLED=true
 * AND all required configuration is present.
 *
 * Pending events remain stored in MongoDB until configuration is available.
 */
async function processMetaCapiBatch(
  requestedLimit = DEFAULT_BATCH_SIZE
) {
  const config =
    getMetaCapiConfig();

  if (!config.enabled) {
    return {
      status: 'DISABLED',
      processed: 0,
      sent: 0,
      failed: 0,
    };
  }

  if (!config.configured) {
    if (!configurationWarningShown) {
      configurationWarningShown = true;

      logger.warn(
        '[Meta CAPI] Enabled but configuration is incomplete.',
        {
          missing:
            config.missing,
        }
      );
    }

    return {
      status:
        'MISCONFIGURED',

      missing:
        [...config.missing],

      processed:
        0,

      sent:
        0,

      failed:
        0,
    };
  }

  configurationWarningShown =
    false;

  const limit =
    Math.max(
      1,

      Math.min(
        safeInteger(
          requestedLimit,
          DEFAULT_BATCH_SIZE
        ),

        MAX_BATCH_SIZE
      )
    );

  await recoverStaleMetaCapiDeliveries();

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (
    let index = 0;
    index < limit;
    index += 1
  ) {
    const event =
      await claimNextMetaCapiEvent();

    if (!event) {
      break;
    }

    processed += 1;

    try {
      const result =
        await deliverMetaCapiEvent(
          event,
          config
        );

      await markMetaCapiDelivered(
        event._id,
        {
          responseCode:
            String(
              result.statusCode ||
              200
            ),
        }
      );

      sent += 1;

      logger.info(
        '[Meta CAPI] Event delivered.',
        {
          analyticsEventId:
            event._id.toString(),

          eventId:
            event.eventId,

          eventName:
            event.eventName,

          testMode:
            !!config.testEventCode,
        }
      );
    } catch (error) {
      failed += 1;

      await markMetaCapiFailed(
        event._id,
        error,
        {
          responseCode:
            cleanText(
              error?.statusCode,
              80
            ),
        }
      );

      logger.warn(
        '[Meta CAPI] Event delivery failed and remains auditable.',
        {
          analyticsEventId:
            event._id.toString(),

          eventId:
            event.eventId,

          eventName:
            event.eventName,

          errorCode:
            cleanText(
              error?.code,
              100
            ),

          statusCode:
            cleanText(
              error?.statusCode,
              80
            ),

          metaErrorCode:
            cleanText(
              error?.metaErrorCode,
              80
            ),

          metaErrorSubcode:
            cleanText(
              error?.metaErrorSubcode,
              80
            ),
        }
      );
    }
  }

  return {
    status:
      'OK',

    processed,
    sent,
    failed,

    testMode:
      !!config.testEventCode,
  };
}

module.exports = {
  processMetaCapiBatch,
  deliverMetaCapiEvent,
  buildMetaCapiPayload,
  getMetaCapiConfig,
  getMetaCapiStatus,
};