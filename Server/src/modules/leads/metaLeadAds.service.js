const crypto = require('crypto');
const https = require('https');

const logger = require('../../utils/logger');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.11: Meta Lead Ads integration adapter
 *
 * Responsibilities:
 * - keep Meta Lead Ads disabled until real configuration exists;
 * - verify Meta webhook subscription challenges;
 * - verify POST webhook signatures against the exact raw request body;
 * - extract leadgen change notifications without persisting PII;
 * - reject internally conflicting duplicate leadgen notifications;
 * - retrieve the actual lead payload from Meta Graph API with bounded
 *   response handling;
 * - normalize Meta field_data into an unambiguous neutral field map for the
 *   next layer.
 *
 * This file deliberately does NOT:
 * - invent Page/Form/App/Campaign/Ad IDs;
 * - assume commercial market, MOQ, freight, price or serviceability;
 * - infer consent from a random field name;
 * - persist a Lead directly;
 * - log raw lead-form PII or access tokens.
 *
 * The next adapter/controller layer will map an approved Instant Form
 * configuration into metaInstantFormLead.service.js.
 */

const META_REQUEST_TIMEOUT_MS = 12 * 1000;
const MAX_GRAPH_RESPONSE_BYTES = 2 * 1024 * 1024;

function cleanText(value, maxLength = 500) {
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

function configurationError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function parseWebhookCreatedTime(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    throw configurationError(
      'Meta leadgen created_time is invalid.',
      'META_WEBHOOK_CREATED_TIME_INVALID'
    );
  }

  return parsed;
}

function normalizePrimitiveMetaValue(
  value,
  maxLength = 2000
) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  ) {
    throw configurationError(
      'Meta Lead Ads field_data contained an unsupported value type.',
      'META_LEAD_ADS_FIELD_DATA_INVALID'
    );
  }

  return cleanText(
    value,
    maxLength
  );
}

/* ============================================================
   CONFIGURATION
============================================================ */

function getMetaLeadAdsConfig() {
  const enabled = isTruthyEnv(
    process.env.META_LEAD_ADS_ENABLED
  );

  const verifyToken = cleanText(
    process.env.META_LEAD_ADS_VERIFY_TOKEN,
    1024
  );

  const appSecret = cleanText(
    process.env.META_LEAD_ADS_APP_SECRET,
    4096
  );

  const pageAccessToken = cleanText(
    process.env.META_LEAD_ADS_PAGE_ACCESS_TOKEN,
    8192
  );

  /*
   * Reuse the same governed Graph API version environment variable already
   * used by the Meta CAPI integration. Do not hard-code a version here.
   */
  const graphApiVersion = cleanText(
    process.env.META_GRAPH_API_VERSION,
    30
  );

  /*
   * Optional defense-in-depth restriction. The integration can be wired
   * before a real Page ID is known, but once supplied, webhook entries from
   * any other Page can be rejected by the controller.
   */
  const expectedPageId = cleanText(
    process.env.META_LEAD_ADS_PAGE_ID,
    160
  );

  const missing = [];

  if (!verifyToken) {
    missing.push('META_LEAD_ADS_VERIFY_TOKEN');
  }

  if (!appSecret) {
    missing.push('META_LEAD_ADS_APP_SECRET');
  }

  if (!pageAccessToken) {
    missing.push('META_LEAD_ADS_PAGE_ACCESS_TOKEN');
  }

  if (!graphApiVersion) {
    missing.push('META_GRAPH_API_VERSION');
  }
  if (!expectedPageId) missing.push('META_LEAD_ADS_PAGE_ID');

  return {
    enabled,
    configured: missing.length === 0,
    missing,
    verifyToken,
    appSecret,
    pageAccessToken,
    graphApiVersion,
    expectedPageId,
  };
}

function getMetaLeadAdsStatus() {
  const config = getMetaLeadAdsConfig();

  return {
    enabled: config.enabled,
    configured: config.configured,
    missing: [...config.missing],
    pageRestricted: Boolean(config.expectedPageId),
  };
}

function requireEnabledConfig() {
  const config = getMetaLeadAdsConfig();

  if (!config.enabled) {
    throw configurationError(
      'Meta Lead Ads integration is disabled.',
      'META_LEAD_ADS_DISABLED'
    );
  }

  if (!config.configured) {
    throw configurationError(
      `Meta Lead Ads configuration is incomplete: ${config.missing.join(', ')}`,
      'META_LEAD_ADS_NOT_CONFIGURED'
    );
  }

  return config;
}

/* ============================================================
   WEBHOOK VERIFICATION
============================================================ */

function timingSafeTextEqual(left, right) {
  const leftBuffer = Buffer.from(cleanText(left, 4096));
  const rightBuffer = Buffer.from(cleanText(right, 4096));

  if (
    leftBuffer.length === 0 ||
    rightBuffer.length === 0 ||
    leftBuffer.length !== rightBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    leftBuffer,
    rightBuffer
  );
}

function verifyWebhookChallenge({
  mode,
  verifyToken,
  challenge,
}) {
  const config = requireEnabledConfig();

  if (cleanText(mode, 50) !== 'subscribe') {
    throw configurationError(
      'Unsupported Meta webhook verification mode.',
      'META_WEBHOOK_MODE_INVALID'
    );
  }

  if (
    !timingSafeTextEqual(
      verifyToken,
      config.verifyToken
    )
  ) {
    throw configurationError(
      'Meta webhook verification token did not match.',
      'META_WEBHOOK_VERIFY_TOKEN_INVALID'
    );
  }

  const cleanChallenge = cleanText(
    challenge,
    4096
  );

  if (!cleanChallenge) {
    throw configurationError(
      'Meta webhook challenge is missing.',
      'META_WEBHOOK_CHALLENGE_MISSING'
    );
  }

  return cleanChallenge;
}

function verifyWebhookSignature({
  rawBody,
  signatureHeader,
}) {
  const config = requireEnabledConfig();

  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
    throw configurationError(
      'Raw webhook body is required for Meta signature verification.',
      'META_WEBHOOK_RAW_BODY_MISSING'
    );
  }

  const signature = cleanText(
    signatureHeader,
    300
  );

  if (!signature.startsWith('sha256=')) {
    throw configurationError(
      'Meta webhook signature header is missing or invalid.',
      'META_WEBHOOK_SIGNATURE_MISSING'
    );
  }

  const suppliedHex = signature.slice('sha256='.length);

  if (!/^[a-f0-9]{64}$/i.test(suppliedHex)) {
    throw configurationError(
      'Meta webhook signature format is invalid.',
      'META_WEBHOOK_SIGNATURE_INVALID'
    );
  }

  const expectedHex = crypto
    .createHmac('sha256', config.appSecret)
    .update(rawBody)
    .digest('hex');

  const suppliedBuffer = Buffer.from(
    suppliedHex.toLowerCase(),
    'hex'
  );

  const expectedBuffer = Buffer.from(
    expectedHex,
    'hex'
  );

  const valid =
    suppliedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(
      suppliedBuffer,
      expectedBuffer
    );

  if (!valid) {
    throw configurationError(
      'Meta webhook signature verification failed.',
      'META_WEBHOOK_SIGNATURE_INVALID'
    );
  }

  return true;
}

/* ============================================================
   LEADGEN NOTIFICATION EXTRACTION
============================================================ */

function extractLeadgenChanges(payload = {}) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    return [];
  }

  if (
    cleanText(
      payload.object,
      50
    ) !== 'page'
  ) {
    return [];
  }

  const entries =
    Array.isArray(
      payload.entry
    )
      ? payload.entry
      : [];

  const deduped =
    new Map();

  for (
    const entry of entries
  ) {
    const entryPageId =
      cleanText(
        entry?.id,
        160
      );

    const changes =
      Array.isArray(
        entry?.changes
      )
        ? entry.changes
        : [];

    for (
      const change of changes
    ) {
      if (
        cleanText(
          change?.field,
          80
        ) !== 'leadgen'
      ) {
        continue;
      }

      const value =
        change?.value &&
        typeof change.value === 'object' &&
        !Array.isArray(change.value)
          ? change.value
          : {};

      const leadgenId =
        cleanText(
          value.leadgen_id,
          500
        );

      if (!leadgenId) {
        throw configurationError('Meta leadgen ID is required.', 'META_LEAD_ADS_LEADGEN_ID_REQUIRED');
      }

      const valuePageId =
        cleanText(
          value.page_id,
          160
        );

      if (
        entryPageId &&
        valuePageId &&
        entryPageId !==
          valuePageId
      ) {
        throw configurationError(
          'Meta leadgen notification contained conflicting Page IDs.',
          'META_WEBHOOK_NOTIFICATION_CONFLICT'
        );
      }

      const normalized = {
        leadgenId,

        pageId:
          entryPageId ||
          valuePageId,

        formId:
          cleanText(
            value.form_id,
            160
          ),

        adId:
          cleanText(
            value.ad_id,
            160
          ),

        createdTime:
          parseWebhookCreatedTime(
            value.created_time
          ),
      };

      const existing =
        deduped.get(
          leadgenId
        );

      if (existing) {
        const comparableFields = [
          'pageId',
          'formId',
          'adId',
          'createdTime',
        ];

        const conflicting =
          comparableFields.some(
            (field) => {
              const previous =
                existing[field];

              const current =
                normalized[field];

              return (
                previous !== null &&
                previous !== '' &&
                current !== null &&
                current !== '' &&
                previous !== current
              );
            }
          );

        if (conflicting) {
          throw configurationError(
            'Duplicate Meta leadgen notifications contained conflicting identifiers.',
            'META_WEBHOOK_NOTIFICATION_CONFLICT'
          );
        }

        deduped.set(
          leadgenId,
          {
            leadgenId,

            pageId:
              existing.pageId ||
              normalized.pageId,

            formId:
              existing.formId ||
              normalized.formId,

            adId:
              existing.adId ||
              normalized.adId,

            createdTime:
              existing.createdTime ||
              normalized.createdTime,
          }
        );

        continue;
      }

      deduped.set(
        leadgenId,
        normalized
      );
    }
  }

  return [
    ...deduped.values()
  ];
}

function assertExpectedPage(change, config = getMetaLeadAdsConfig()) {
  if (!config.expectedPageId) {
    throw configurationError('An authorized Page ID is required.', 'META_LEAD_ADS_NOT_CONFIGURED');
  }

  if (
    !change?.pageId ||
    change.pageId !== config.expectedPageId
  ) {
    throw configurationError(
      'Meta webhook Page ID is not authorized for this integration.',
      'META_WEBHOOK_PAGE_NOT_ALLOWED'
    );
  }

  return true;
}

/* ============================================================
   GRAPH API TRANSPORT
============================================================ */

function normalizeMetaFieldData(
  fieldData
) {
  const rows =
    Array.isArray(
      fieldData
    )
      ? fieldData
      : [];

  const fields = {};

  for (
    const row of rows
  ) {
    const key =
      cleanText(
        row?.name,
        200
      ).toLowerCase();

    if (!key) {
      continue;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        fields,
        key
      )
    ) {
      throw configurationError(
        `Meta Lead Ads field_data contained duplicate field name: ${key}`,
        'META_LEAD_ADS_FIELD_DATA_DUPLICATE'
      );
    }

    const rawValues =
      Array.isArray(
        row?.values
      )
        ? row.values
        : [];

    const values =
      rawValues
        .map(
          (value) =>
            normalizePrimitiveMetaValue(
              value,
              2000
            )
        )
        .filter(Boolean);

    if (
      values.length === 0
    ) {
      fields[key] =
        '';
    } else if (
      values.length === 1
    ) {
      fields[key] =
        values[0];
    } else {
      fields[key] =
        values;
    }
  }

  return fields;
}

function requestGraphLead({
  leadgenId,
  config,
}) {
  return new Promise((resolve, reject) => {
    const fields = [
      'id',
      'created_time',
      'ad_id',
      'form_id',
      'field_data',
    ].join(',');

    const requestPath =
      `/${encodeURIComponent(config.graphApiVersion)}` +
      `/${encodeURIComponent(leadgenId)}` +
      `?fields=${encodeURIComponent(fields)}`;

    const request = https.request(
      {
        protocol: 'https:',
        hostname: 'graph.facebook.com',
        port: 443,
        path: requestPath,
        method: 'GET',
        timeout: META_REQUEST_TIMEOUT_MS,
        headers: {
          Authorization:
            `Bearer ${config.pageAccessToken}`,
          Accept: 'application/json',
          'User-Agent':
            'IndiaTradeOverseas-MasterDPR-LeadAds/1.0',
        },
      },
      (response) => {
        let raw =
          '';

        let responseBytes =
          0;

        let settled =
          false;

        response.setEncoding(
          'utf8'
        );
        response.on('error', reject);
        response.on('aborted', () => reject(configurationError('Meta response was interrupted.', 'META_LEAD_ADS_GRAPH_REQUEST_FAILED')));

        response.on(
          'data',
          (chunk) => {
            if (settled) {
              return;
            }

            responseBytes +=
              Buffer.byteLength(
                chunk,
                'utf8'
              );

            if (
              responseBytes >
              MAX_GRAPH_RESPONSE_BYTES
            ) {
              settled =
                true;

              const error =
                configurationError(
                  'Meta Lead Ads response exceeded the allowed size.',
                  'META_LEAD_ADS_GRAPH_RESPONSE_TOO_LARGE'
                );

              error.statusCode =
                502;

              response.destroy(
                error
              );

              reject(error);
              return;
            }

            raw +=
              chunk;
          }
        );

        response.on(
          'end',
          () => {
            if (settled) {
              return;
            }

            settled =
              true;

            let parsed =
              null;

            if (raw) {
              try {
                parsed =
                  JSON.parse(
                    raw
                  );
              } catch {
                parsed =
                  null;
              }
            }

            if (
              response.statusCode >=
                200 &&
              response.statusCode <
                300 &&
              parsed &&
              !parsed.error
            ) {
              resolve(parsed);
              return;
            }

            const error =
              new Error(
                cleanText(
                  parsed?.error?.message,
                  500
                ) ||
                  `Meta Graph API request failed with HTTP ${response.statusCode}.`
              );

            error.code =
              'META_LEAD_ADS_GRAPH_REQUEST_FAILED';

            error.statusCode =
              response.statusCode ||
              502;

            /*
             * Keep only non-secret diagnostic identifiers.
             * Never attach the request Authorization header/token.
             */
            error.meta = {
              type:
                cleanText(
                  parsed?.error?.type,
                  120
                ),

              code:
                Number.isFinite(
                  Number(
                    parsed?.error?.code
                  )
                )
                  ? Number(
                      parsed.error.code
                    )
                  : null,

              traceId:
                cleanText(
                  parsed?.error?.fbtrace_id,
                  200
                ),
            };

            reject(error);
          }
        );
      }
    );

    request.on('timeout', () => {
      request.destroy(
        configurationError(
          'Meta Lead Ads Graph API request timed out.',
          'META_LEAD_ADS_GRAPH_TIMEOUT'
        )
      );
    });

    request.on('error', reject);

    request.end();
  });
}

async function fetchMetaLeadById(leadgenId) {
  const config = requireEnabledConfig();

  const cleanLeadgenId = cleanText(
    leadgenId,
    500
  );

  if (!cleanLeadgenId) {
    throw configurationError(
      'Meta leadgen ID is required.',
      'META_LEAD_ADS_LEADGEN_ID_REQUIRED'
    );
  }

  const payload = await requestGraphLead({
    leadgenId: cleanLeadgenId,
    config,
  });

  const returnedId =
    cleanText(
      payload?.id,
      500
    );

  if (!returnedId) {
    throw configurationError(
      'Meta Graph API response did not include the requested lead identifier.',
      'META_LEAD_ADS_LEADGEN_ID_MISSING'
    );
  }

  if (
    returnedId !==
    cleanLeadgenId
  ) {
    throw configurationError(
      'Meta Graph API returned an unexpected lead identifier.',
      'META_LEAD_ADS_LEADGEN_ID_MISMATCH'
    );
  }

  if (
    !Array.isArray(
      payload?.field_data
    )
  ) {
    throw configurationError(
      'Meta Graph API lead response did not include a valid field_data array.',
      'META_LEAD_ADS_FIELD_DATA_INVALID'
    );
  }

  return {
    metaLeadId:
      returnedId,

    createdTime:
      cleanText(
        payload?.created_time,
        100
      ),

    metaAdId:
      cleanText(
        payload?.ad_id,
        160
      ),

    metaFormId:
      cleanText(
        payload?.form_id,
        160
      ),

    fields:
      normalizeMetaFieldData(
        payload.field_data
      ),
  };
}

/* ============================================================
   SAFE DIAGNOSTICS
============================================================ */

function logConfigurationStatusOnce() {
  const status = getMetaLeadAdsStatus();

  if (!status.enabled) {
    return;
  }

  if (!status.configured) {
    logger.warn(
      '[Meta Lead Ads] Integration enabled but configuration is incomplete.',
      {
        missing: status.missing,
      }
    );
  }
}

module.exports = {
  getMetaLeadAdsConfig,
  getMetaLeadAdsStatus,
  verifyWebhookChallenge,
  verifyWebhookSignature,
  extractLeadgenChanges,
  assertExpectedPage,
  normalizeMetaFieldData,
  fetchMetaLeadById,
  logConfigurationStatusOnce,
};
