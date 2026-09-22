const mongoose = require('mongoose');

const AnalyticsEvent = require('./analyticsEvent.model');
const logger = require('../../utils/logger');

const {
  logTracking,
  logRetry,
} = require('../operations/operationalLog.service');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.26H: First-party analytics + tracking operational ledger
 *
 * Responsibilities:
 * - validate canonical DPR events;
 * - persist events idempotently by eventId;
 * - normalize first-party attribution/page/business context;
 * - block PII/secrets from generic properties;
 * - reconcile anonymous events to persisted Leads;
 * - manage durable Meta CAPI queue/retry/backoff state;
 * - record tracking persistence/delivery/retry outcomes in OperationalLog.
 *
 * Analytics/Meta failure must never delete or roll back a persisted Lead.
 */

const MAX_META_CAPI_ATTEMPTS = 8;
const META_CAPI_STALE_MINUTES = 10;
const META_CAPI_RETRY_BASE_MS = 30 * 1000;
const META_CAPI_RETRY_MAX_MS = 6 * 60 * 60 * 1000;

const META_CAPI_ELIGIBLE_EVENTS = Object.freeze([
  'lead_created',
  'qualified_lead',
  'quote_created',
  'quote_sent',
  'order_won',
  'purchase',
  'repeat_order',
]);

const SAFE_PROPERTY_KEYS = Object.freeze(
  new Set([
    'tracking_version',
    'builder_version',
    'eligibility_rule_version',
    'method',
    'channel',
    'lead_source',
    'crm_status',
    'contact_resolution_status',
    'reason_code',
    'status_code',
    'quote_status',
    'order_status',
    'payment_status',
    'currency',
    'value_band',
    'quantity_unit',
    'page_variant',
    'experiment_id',
    'experiment_variant',
  ])
);

const BLOCKED_KEY_PATTERNS = Object.freeze([
  /(^|_)(phone|mobile|whatsapp)(_|$)/i,
  /(^|_)(email|e_mail)(_|$)/i,
  /(^|_)(first_name|last_name|full_name|customer_name|contact_name|name)(_|$)/i,
  /(^|_)(password|passcode|otp|pin_code)(_|$)/i,
  /(^|_)(token|secret|authorization|cookie|session_token|api_key|apikey)(_|$)/i,
  /(^|_)(address|street_address|postal_address)(_|$)/i,
  /(^|_)(message|remarks|notes|description|free_text|chat_summary)(_|$)/i,
  /(^|_)(gstin|pan|aadhaar|aadhar)(_|$)/i,
]);

function validationError(
  message,
  code = 'ANALYTICS_VALIDATION_FAILED'
) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function cleanText(
  value,
  maxLength = 250
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

function cleanFiniteNumber(value) {
  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? numeric
    : undefined;
}

function isBlockedKey(key) {
  return BLOCKED_KEY_PATTERNS.some(
    (pattern) =>
      pattern.test(
        String(key)
      )
  );
}

function isValidEventId(value) {
  const eventId = cleanText(
    value,
    160
  );

  return (
    eventId.length >= 8 &&
    /^[A-Za-z0-9._:-]+$/.test(eventId)
  );
}

function isValidSubmissionId(value) {
  if (!value) {
    return true;
  }

  const submissionId = cleanText(
    value,
    128
  );

  return /^[A-Za-z0-9_-]{8,128}$/.test(
    submissionId
  );
}

function isValidObjectId(value) {
  return Boolean(
    value &&
    mongoose.Types.ObjectId.isValid(
      value
    )
  );
}

function calculateMetaCapiRetryDelayMs(
  attempts
) {
  const safeAttempts = Math.max(
    1,
    Math.min(
      Number(
        attempts || 1
      ),
      MAX_META_CAPI_ATTEMPTS
    )
  );

  return Math.min(
    META_CAPI_RETRY_BASE_MS *
      2 ** (
        safeAttempts - 1
      ),

    META_CAPI_RETRY_MAX_MS
  );
}

function calculateMetaCapiNextAttemptAt(
  attempts
) {
  return new Date(
    Date.now() +
      calculateMetaCapiRetryDelayMs(
        attempts
      )
  );
}

function normalizeEventTimestamp(value) {
  if (!value) {
    return new Date();
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw validationError(
      'Invalid analytics event timestamp.'
    );
  }

  if (
    parsed.getTime() >
    Date.now() +
      5 * 60 * 1000
  ) {
    throw validationError(
      'Analytics event timestamp cannot be in the future.'
    );
  }

  return parsed;
}

function normalizePagePath(value) {
  const raw =
    cleanText(
      value,
      1000
    );

  if (!raw) {
    return '';
  }

  try {
    if (
      /^https?:\/\//i.test(
        raw
      )
    ) {
      return cleanText(
        new URL(raw)
          .pathname ||
          '/',
        250
      );
    }

    const questionIndex =
      raw.indexOf('?');

    const hashIndex =
      raw.indexOf('#');

    let cutAt =
      raw.length;

    if (
      questionIndex >= 0
    ) {
      cutAt =
        Math.min(
          cutAt,
          questionIndex
        );
    }

    if (
      hashIndex >= 0
    ) {
      cutAt =
        Math.min(
          cutAt,
          hashIndex
        );
    }

    const pathname =
      raw.slice(
        0,
        cutAt
      ) || '/';

    return cleanText(
      pathname.startsWith('/')
        ? pathname
        : `/${pathname}`,
      250
    );

  } catch {
    return '';
  }
}

function normalizeAttribution(
  input = {}
) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    return {};
  }

  return {
    utmSource:
      cleanText(
        input.utmSource ||
        input.utm_source,
        150
      ),

    utmMedium:
      cleanText(
        input.utmMedium ||
        input.utm_medium,
        150
      ),

    utmCampaign:
      cleanText(
        input.utmCampaign ||
        input.utm_campaign,
        200
      ),

    utmContent:
      cleanText(
        input.utmContent ||
        input.utm_content,
        200
      ),

    utmTerm:
      cleanText(
        input.utmTerm ||
        input.utm_term,
        200
      ),

    gclid:
      cleanText(
        input.gclid,
        250
      ),

    fbclid:
      cleanText(
        input.fbclid,
        250
      ),

    campaignId:
      cleanText(
        input.campaignId ||
        input.campaign_id,
        150
      ),

    adSetId:
      cleanText(
        input.adSetId ||
        input.adset_id,
        150
      ),

    creativeId: cleanText(input.creativeId || input.creative_id,150),
    adId:
      cleanText(
        input.adId ||
        input.ad_id,
        150
      ),
  };
}

function normalizePage(
  input = {}
) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    return {};
  }

  return {
    path:
      normalizePagePath(
        input.path ||
        input.pagePath ||
        input.page_path ||
        input.landingPage ||
        input.landing_page
      ),

    pageType:
      cleanText(
        input.pageType ||
        input.page_type,
        100
      ),

    landingPageType:
      cleanText(
        input.landingPageType ||
        input.landing_page_type,
        100
      ),
  };
}

function normalizeBusiness(
  input = {}
) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    return {};
  }

  return {
    vertical:
      cleanText(
        input.vertical,
        100
      ),

    productCategory:
      cleanText(
        input.productCategory ||
        input.product_category,
        100
      ),

    productCode:
      cleanText(
        input.productCode ||
        input.product_code,
        150
      ),

    quantityBand:
      cleanText(
        input.quantityBand ||
        input.quantity_band,
        100
      ),

    timelineBand:
      cleanText(
        input.timelineBand ||
        input.timeline_band,
        100
      ),

    eligibilityStatus:
      cleanText(
        input.eligibilityStatus ||
        input.eligibility_status,
        100
      ),

    leadPriority:
      cleanText(
        input.leadPriority ||
        input.lead_priority,
        50
      ),
  };
}

function sanitizePropertyValue(
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (
    typeof value === 'string'
  ) {
    return cleanText(
      value,
      500
    );
  }

  if (
    typeof value === 'boolean'
  ) {
    return value === true;
  }

  if (
    typeof value === 'number'
  ) {
    return cleanFiniteNumber(
      value
    );
  }

  return undefined;
}

function sanitizeProperties(
  input = {}
) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    return {
      properties: {},
      droppedKeys: [],
    };
  }

  const properties = {};
  const droppedKeys = [];

  for (
    const [
      rawKey,
      rawValue,
    ] of Object.entries(
      input
    )
  ) {
    const key =
      cleanText(
        rawKey,
        120
      );

    if (!key) {
      continue;
    }

    if (
      isBlockedKey(
        key
      ) ||
      !SAFE_PROPERTY_KEYS.has(
        key
      )
    ) {
      droppedKeys.push(
        key
      );

      continue;
    }

    const safeValue =
      sanitizePropertyValue(
        rawValue
      );

    if (
      safeValue !== undefined &&
      safeValue !== ''
    ) {
      properties[key] =
        safeValue;
    }
  }

  return {
    properties,
    droppedKeys,
  };
}

function validateCanonicalEventName(
  eventName
) {
  const cleaned =
    cleanText(
      eventName,
      100
    );

  const canonicalEvents =
    AnalyticsEvent
      .CANONICAL_DPR_EVENTS ||
    [];

  if (
    !canonicalEvents.includes(
      cleaned
    )
  ) {
    throw validationError(
      `Unsupported analytics event: ${
        cleaned ||
        'EMPTY'
      }`,
      'ANALYTICS_EVENT_NOT_CANONICAL'
    );
  }

  return cleaned;
}

function shouldQueueMetaCapi(
  eventName,
  options = {}
) {
  return (
    options.queueMetaCapi ===
      true &&
    META_CAPI_ELIGIBLE_EVENTS.includes(
      eventName
    )
  );
}

function buildEventDocument(
  input = {},
  options = {}
) {
  const eventId =
    cleanText(
      input.eventId ||
      input.event_id,
      160
    );

  if (
    !isValidEventId(
      eventId
    )
  ) {
    throw validationError(
      'A valid eventId is required for analytics deduplication.'
    );
  }

  const eventName =
    validateCanonicalEventName(
      input.eventName ||
      input.event_name
    );

  const eventSource =
    cleanText(
      input.eventSource ||
      input.event_source ||
      'WEB',
      20
    ).toUpperCase();

  if (
    ![
      'WEB',
      'SERVER',
      'CRM',
      'SYSTEM',
    ].includes(
      eventSource
    )
  ) {
    throw validationError(
      'Invalid analytics event source.'
    );
  }

  const analyticsSessionId =
    cleanText(
      input.analyticsSessionId ||
      input.analytics_session_id,
      160
    );

  const submissionId =
    cleanText(
      input.submissionId ||
      input.submission_id,
      128
    );

  if (
    !isValidSubmissionId(
      submissionId
    )
  ) {
    throw validationError(
      'Invalid analytics submissionId.'
    );
  }

  const leadId =
    input.leadId ||
    input.lead_id ||
    null;

  if (
    leadId &&
    !isValidObjectId(
      leadId
    )
  ) {
    throw validationError(
      'Invalid analytics leadId.'
    );
  }

  const {
    properties,
    droppedKeys,
  } =
    sanitizeProperties(
      input.properties &&
      typeof input.properties ===
        'object'
        ? input.properties
        : {}
    );

  if (
    droppedKeys.length >
    0
  ) {
    logger.warn(
      '[Analytics] Unsafe/unapproved property keys were dropped',
      {
        eventName,
        eventId,

        droppedKeys:
          droppedKeys.slice(
            0,
            30
          ),
      }
    );
  }

  const queueMetaCapi =
    shouldQueueMetaCapi(
      eventName,
      options
    );

  return {
    document: {
      eventId,
      eventName,
      eventSource,

      occurredAt:
        normalizeEventTimestamp(
          input.occurredAt ||
          input.occurred_at ||
          input.eventTimestamp ||
          input.event_timestamp
        ),

      analyticsSessionId,
      submissionId,

      leadId:
        leadId ||
        null,

      leadCode:
        cleanText(
          input.leadCode ||
          input.lead_code,
          120
        ),

      attribution:
        normalizeAttribution(
          input.attribution ||
          input
        ),

      page:
        normalizePage(
          input.page ||
          input
        ),

      business:
        normalizeBusiness(
          input.business ||
          input
        ),

      properties,

      delivery: {
        metaCapi: {
          status:
            queueMetaCapi
              ? 'PENDING'
              : 'NOT_REQUIRED',

          attempts:
            0,

          nextAttemptAt:
            queueMetaCapi
              ? new Date()
              : null,

          lastAttemptAt:
            null,

          deliveredAt:
            null,

          lastError:
            '',

          responseCode:
            '',
        },

        ga4Server: {
          status:
            'NOT_REQUIRED',

          attempts:
            0,

          nextAttemptAt:
            null,

          lastAttemptAt:
            null,

          deliveredAt:
            null,

          lastError:
            '',

          responseCode:
            '',
        },
      },
    },

    droppedKeys,
  };
}

async function logEventPersistence(
  event,
  reused,
  extra = {}
) {
  if (!event) {
    return;
  }

  await logTracking(
    'FIRST_PARTY_EVENT_PERSIST',
    'SUCCESS',
    {
      leadId:
        event.leadId ||
        null,

      analyticsEventId:
        event._id,

      entityType:
        'ANALYTICS_EVENT',

      entityId:
        event.eventId,

      provider:
        'FIRST_PARTY_ANALYTICS',

      idempotencyKey:
        event.eventId,

      metadata: {
        eventName:
          event.eventName,

        eventSource:
          event.eventSource,

        reused:
          reused === true,

        metaCapiStatus:
          event.delivery
            ?.metaCapi
            ?.status ||
          'NOT_REQUIRED',

        ...extra,
      },
    }
  );
}

async function recordAnalyticsEvent(
  input = {},
  options = {}
) {
  let document =
    null;

  try {
    ({
      document,
    } =
      buildEventDocument(
        input,
        options
      ));

    const existing =
      await AnalyticsEvent.findOne({
        eventId:
          document.eventId,
      });

    if (existing) {
      await logEventPersistence(
        existing,
        true
      );

      return {
        event:
          existing,

        reused:
          true,
      };
    }

    try {
      const event =
        await AnalyticsEvent.create(
          document
        );

      await logEventPersistence(
        event,
        false
      );

      return {
        event,
        reused:
          false,
      };

    } catch (error) {
      if (
        error?.code ===
        11000
      ) {
        const alreadyCreated =
          await AnalyticsEvent.findOne({
            eventId:
              document.eventId,
          });

        if (
          alreadyCreated
        ) {
          await logEventPersistence(
            alreadyCreated,
            true,
            {
              raceRecovered:
                true,
            }
          );

          return {
            event:
              alreadyCreated,

            reused:
              true,
          };
        }
      }

      throw error;
    }

  } catch (error) {
    await logTracking(
      'FIRST_PARTY_EVENT_PERSIST',
      'FAILURE',
      {
        leadId:
          document?.leadId ||
          null,

        entityType:
          'ANALYTICS_EVENT',

        entityId:
          document?.eventId ||
          cleanText(
            input.eventId ||
            input.event_id ||
            'UNKNOWN_EVENT',
            160
          ),

        provider:
          'FIRST_PARTY_ANALYTICS',

        idempotencyKey:
          document?.eventId ||
          cleanText(
            input.eventId ||
            input.event_id,
            160
          ),

        error,

        metadata: {
          eventName:
            document?.eventName ||
            cleanText(
              input.eventName ||
              input.event_name,
              100
            ),

          eventSource:
            document?.eventSource ||
            cleanText(
              input.eventSource ||
              input.event_source ||
              'WEB',
              20
            ).toUpperCase(),
        },
      }
    );

    throw error;
  }
}

async function linkAnalyticsEventsToLead({
  leadId,
  leadCode = '',
  submissionId = '',
  analyticsSessionId = '',
} = {}) {
  if (
    !isValidObjectId(
      leadId
    )
  ) {
    throw validationError(
      'A valid persisted leadId is required.'
    );
  }

  const safeSubmissionId =
    cleanText(
      submissionId,
      128
    );

  const safeSessionId =
    cleanText(
      analyticsSessionId,
      160
    );

  if (
    safeSubmissionId &&
    !isValidSubmissionId(
      safeSubmissionId
    )
  ) {
    throw validationError(
      'Invalid submissionId for analytics reconciliation.'
    );
  }

  const matchers =
    [];

  if (
    safeSubmissionId
  ) {
    matchers.push({
      submissionId:
        safeSubmissionId,
    });
  }

  if (
    safeSessionId
  ) {
    matchers.push({
      analyticsSessionId:
        safeSessionId,
    });
  }

  if (
    matchers.length ===
    0
  ) {
    return {
      matchedCount:
        0,

      modifiedCount:
        0,
    };
  }

  const result =
    await AnalyticsEvent.updateMany(
      {
        leadId:
          null,

        $or:
          matchers,
      },

      {
        $set: {
          leadId,

          leadCode:
            cleanText(
              leadCode,
              120
            ),
        },
      }
    );

  return {
    matchedCount:
      result.matchedCount ||
      0,

    modifiedCount:
      result.modifiedCount ||
      0,
  };
}

async function claimNextMetaCapiEvent() {
  const now =
    new Date();

  return AnalyticsEvent.findOneAndUpdate(
    {
      eventName: {
        $in:
          META_CAPI_ELIGIBLE_EVENTS,
      },

      'delivery.metaCapi.status': {
        $in: [
          'PENDING',
          'FAILED',
        ],
      },

      'delivery.metaCapi.attempts': {
        $lt:
          MAX_META_CAPI_ATTEMPTS,
      },

      $or: [
        {
          'delivery.metaCapi.nextAttemptAt':
            null,
        },

        {
          'delivery.metaCapi.nextAttemptAt': {
            $exists:
              false,
          },
        },

        {
          'delivery.metaCapi.nextAttemptAt': {
            $lte:
              now,
          },
        },
      ],
    },

    {
      $set: {
        'delivery.metaCapi.status':
          'PROCESSING',

        'delivery.metaCapi.lastAttemptAt':
          now,

        'delivery.metaCapi.nextAttemptAt':
          null,

        'delivery.metaCapi.lastError':
          '',
      },

      $inc: {
        'delivery.metaCapi.attempts':
          1,
      },
    },

    {
      new:
        true,

      sort: {
        occurredAt:
          1,
      },
    }
  );
}

function responseCodeToHttpStatus(
  responseCode
) {
  const clean =
    cleanText(
      responseCode,
      10
    );

  return /^\d{3}$/.test(
    clean
  )
    ? Number(clean)
    : null;
}

async function markMetaCapiDelivered(
  analyticsEventId,
  {
    responseCode = '',
  } = {}
) {
  if (
    !isValidObjectId(
      analyticsEventId
    )
  ) {
    throw validationError(
      'Invalid analytics event database ID.'
    );
  }

  const event =
    await AnalyticsEvent.findByIdAndUpdate(
      analyticsEventId,

      {
        $set: {
          'delivery.metaCapi.status':
            'SENT',

          'delivery.metaCapi.nextAttemptAt':
            null,

          'delivery.metaCapi.deliveredAt':
            new Date(),

          'delivery.metaCapi.lastError':
            '',

          'delivery.metaCapi.responseCode':
            cleanText(
              responseCode,
              80
            ),
        },
      },

      {
        new:
          true,
      }
    );

  if (event) {
    const attempts =
      Number(
        event.delivery
          ?.metaCapi
          ?.attempts
      ) || 0;

    await logTracking(
      'META_CAPI_DISPATCH',
      'SUCCESS',
      {
        leadId:
          event.leadId ||
          null,

        analyticsEventId:
          event._id,

        entityType:
          'ANALYTICS_EVENT',

        entityId:
          event.eventId,

        provider:
          'META_CAPI',

        idempotencyKey:
          event.eventId,

        retryCount:
          Math.max(
            0,
            attempts - 1
          ),

        httpStatus:
          responseCodeToHttpStatus(
            responseCode
          ),

        metadata: {
          eventName:
            event.eventName,

          eventSource:
            event.eventSource,

          deliveryStatus:
            'SENT',

          attempts,
        },
      }
    );
  }

  return event;
}

async function markMetaCapiFailed(
  analyticsEventId,
  error,
  {
    responseCode = '',
  } = {}
) {
  if (
    !isValidObjectId(
      analyticsEventId
    )
  ) {
    throw validationError(
      'Invalid analytics event database ID.'
    );
  }

  const current =
    await AnalyticsEvent
      .findById(
        analyticsEventId
      )
      .select(
        'eventId eventName eventSource leadId delivery.metaCapi.attempts'
      );

  if (!current) {
    return null;
  }

  const attempts =
    Number(
      current.delivery
        ?.metaCapi
        ?.attempts ||
      0
    );

  const exhausted =
    attempts >=
    MAX_META_CAPI_ATTEMPTS;

  const nextStatus =
    exhausted
      ? 'SKIPPED'
      : 'FAILED';

  const nextAttemptAt =
    exhausted
      ? null
      : calculateMetaCapiNextAttemptAt(
          attempts
        );

  const updated =
    await AnalyticsEvent.findByIdAndUpdate(
      analyticsEventId,

      {
        $set: {
          'delivery.metaCapi.status':
            nextStatus,

          'delivery.metaCapi.nextAttemptAt':
            nextAttemptAt,

          'delivery.metaCapi.lastError':
            cleanText(
              error?.message ||
              error ||
              'Unknown Meta CAPI delivery error',
              500
            ),

          'delivery.metaCapi.responseCode':
            cleanText(
              responseCode,
              80
            ),
        },
      },

      {
        new:
          true,
      }
    );

  logger.warn(
    '[Analytics] Meta CAPI delivery failed',
    {
      analyticsEventId:
        String(
          analyticsEventId
        ),

      attempts,

      status:
        nextStatus,

      nextAttemptAt:
        nextAttemptAt
          ? nextAttemptAt
              .toISOString()
          : null,
    }
  );

  await logTracking(
    'META_CAPI_DISPATCH',

    exhausted
      ? 'SKIPPED'
      : 'RETRY_SCHEDULED',

    {
      leadId:
        updated?.leadId ||
        current.leadId ||
        null,

      analyticsEventId:
        updated?._id ||
        current._id,

      entityType:
        'ANALYTICS_EVENT',

      entityId:
        updated?.eventId ||
        current.eventId,

      provider:
        'META_CAPI',

      idempotencyKey:
        updated?.eventId ||
        current.eventId,

      retryCount:
        attempts,

      httpStatus:
        responseCodeToHttpStatus(
          responseCode
        ),

      error,

      metadata: {
        eventName:
          updated?.eventName ||
          current.eventName,

        eventSource:
          updated?.eventSource ||
          current.eventSource,

        deliveryStatus:
          nextStatus,

        attempts,

        nextAttemptAt,

        retryBudgetExhausted:
          exhausted,
      },
    }
  );

  await logRetry(
    'META_CAPI_RETRY',

    exhausted
      ? 'SKIPPED'
      : 'RETRY_SCHEDULED',

    {
      leadId:
        updated?.leadId ||
        current.leadId ||
        null,

      analyticsEventId:
        updated?._id ||
        current._id,

      entityType:
        'ANALYTICS_EVENT',

      entityId:
        updated?.eventId ||
        current.eventId,

      provider:
        'META_CAPI',

      retryCount:
        attempts,

      error,

      metadata: {
        nextAttemptAt,

        retryBudgetExhausted:
          exhausted,
      },
    }
  );

  return updated;
}

async function recoverStaleMetaCapiDeliveries() {
  const staleBefore =
    new Date(
      Date.now() -
      META_CAPI_STALE_MINUTES *
      60 *
      1000
    );

  const staleEvents =
    await AnalyticsEvent.find({
      'delivery.metaCapi.status':
        'PROCESSING',

      'delivery.metaCapi.lastAttemptAt': {
        $lt:
          staleBefore,
      },
    })
      .select(
        '_id eventId eventName eventSource leadId delivery.metaCapi.attempts'
      )
      .limit(
        500
      );

  if (
    staleEvents.length ===
    0
  ) {
    return {
      matchedCount:
        0,

      modifiedCount:
        0,
    };
  }

  let modifiedCount =
    0;

  for (
    const event
    of staleEvents
  ) {
    const attempts =
      Number(
        event.delivery
          ?.metaCapi
          ?.attempts ||
        0
      );

    const exhausted =
      attempts >=
      MAX_META_CAPI_ATTEMPTS;

    const nextAttemptAt =
      exhausted
        ? null
        : calculateMetaCapiNextAttemptAt(
            attempts
          );

    const result =
      await AnalyticsEvent.updateOne(
        {
          _id:
            event._id,

          'delivery.metaCapi.status':
            'PROCESSING',
        },

        {
          $set: {
            'delivery.metaCapi.status':
              exhausted
                ? 'SKIPPED'
                : 'FAILED',

            'delivery.metaCapi.nextAttemptAt':
              nextAttemptAt,

            'delivery.metaCapi.lastError':
              'Recovered stale Meta CAPI PROCESSING state after worker interruption.',
          },
        }
      );

    if (
      (
        result.modifiedCount ||
        0
      ) === 0
    ) {
      continue;
    }

    modifiedCount +=
      1;

    await logTracking(
      'META_CAPI_STALE_RECOVERY',

      exhausted
        ? 'SKIPPED'
        : 'RETRY_SCHEDULED',

      {
        leadId:
          event.leadId ||
          null,

        analyticsEventId:
          event._id,

        entityType:
          'ANALYTICS_EVENT',

        entityId:
          event.eventId,

        provider:
          'META_CAPI',

        idempotencyKey:
          event.eventId,

        retryCount:
          attempts,

        errorMessage:
          'Recovered stale Meta CAPI PROCESSING state after worker interruption.',

        metadata: {
          eventName:
            event.eventName,

          eventSource:
            event.eventSource,

          staleProcessingRecovered:
            true,

          deliveryStatus:
            exhausted
              ? 'SKIPPED'
              : 'FAILED',

          nextAttemptAt,

          retryBudgetExhausted:
            exhausted,
        },
      }
    );

    await logRetry(
      'META_CAPI_STALE_RECOVERY',

      exhausted
        ? 'SKIPPED'
        : 'RETRY_SCHEDULED',

      {
        leadId:
          event.leadId ||
          null,

        analyticsEventId:
          event._id,

        entityType:
          'ANALYTICS_EVENT',

        entityId:
          event.eventId,

        provider:
          'META_CAPI',

        retryCount:
          attempts,

        metadata: {
          nextAttemptAt,

          retryBudgetExhausted:
            exhausted,
        },
      }
    );
  }

  return {
    matchedCount:
      staleEvents.length,

    modifiedCount,
  };
}

async function requeueMetaCapiEvent(
  analyticsEventId
) {
  if (
    !isValidObjectId(
      analyticsEventId
    )
  ) {
    throw validationError(
      'Invalid analytics event database ID.'
    );
  }

  const event =
    await AnalyticsEvent.findByIdAndUpdate(
      analyticsEventId,

      {
        $set: {
          'delivery.metaCapi.status':
            'PENDING',

          'delivery.metaCapi.attempts':
            0,

          'delivery.metaCapi.nextAttemptAt':
            new Date(),

          'delivery.metaCapi.lastAttemptAt':
            null,

          'delivery.metaCapi.deliveredAt':
            null,

          'delivery.metaCapi.lastError':
            '',

          'delivery.metaCapi.responseCode':
            '',
        },
      },

      {
        new:
          true,
      }
    );

  if (event) {
    await logTracking(
      'META_CAPI_MANUAL_REQUEUE',
      'PENDING',
      {
        leadId:
          event.leadId ||
          null,

        analyticsEventId:
          event._id,

        entityType:
          'ANALYTICS_EVENT',

        entityId:
          event.eventId,

        provider:
          'META_CAPI',

        idempotencyKey:
          event.eventId,

        retryCount:
          0,

        metadata: {
          eventName:
            event.eventName,

          eventSource:
            event.eventSource,

          manualRequeue:
            true,
        },
      }
    );

    await logRetry(
      'META_CAPI_MANUAL_REQUEUE',
      'PENDING',
      {
        leadId:
          event.leadId ||
          null,

        analyticsEventId:
          event._id,

        entityType:
          'ANALYTICS_EVENT',

        entityId:
          event.eventId,

        provider:
          'META_CAPI',

        retryCount:
          0,
      }
    );
  }

  return event;
}

function getAnalyticsServiceConfig() {
  return {
    canonicalEvents: [
      ...(
        AnalyticsEvent
          .CANONICAL_DPR_EVENTS ||
        []
      ),
    ],

    metaCapiEligibleEvents: [
      ...META_CAPI_ELIGIBLE_EVENTS,
    ],

    maxMetaCapiAttempts:
      MAX_META_CAPI_ATTEMPTS,

    metaCapiStaleMinutes:
      META_CAPI_STALE_MINUTES,

    metaCapiRetryBaseMs:
      META_CAPI_RETRY_BASE_MS,

    metaCapiRetryMaxMs:
      META_CAPI_RETRY_MAX_MS,
  };
}

module.exports = {
  recordAnalyticsEvent,

  linkAnalyticsEventsToLead,

  claimNextMetaCapiEvent,

  markMetaCapiDelivered,

  markMetaCapiFailed,

  recoverStaleMetaCapiDeliveries,

  requeueMetaCapiEvent,

  getAnalyticsServiceConfig,

  calculateMetaCapiRetryDelayMs,

  normalizePagePath,

  normalizeAttribution,

  normalizeBusiness,

  sanitizeProperties,
};