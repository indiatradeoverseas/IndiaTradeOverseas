import { dispatchMetaEvent, updateMetaConsent } from './metaPixel';
/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 1.6F-B: Frontend analytics + first-party backend persistence
 *
 * Responsibilities:
 * - Preserve first-party campaign attribution across the website journey.
 * - Create a per-tab/session anonymous analytics session ID.
 * - Push privacy-safe events into window.dataLayer for the existing GTM container.
 * - Define the canonical DPR commercial-event dictionary.
 * - Reuse the SAME event_id for GTM/browser and ITO backend persistence.
 * - Persist only browser-safe canonical funnel events to the ITO backend.
 * - Respect analytics consent before first-party analytics persistence.
 * - Keep failed backend analytics events in the retry outbox.
 * - Provide privacy-safe diagnostic click/form/change tracking.
 *
 * IMPORTANT:
 * - A form submit attempt is NOT proof of a persisted lead.
 * - lead_created must only be emitted after backend Lead persistence succeeds.
 * - The public analytics endpoint is NOT allowed to manufacture lead_created,
 *   qualified_lead, quote_created, purchase, order_won, etc.
 * - Never send raw personal/contact/security values into analytics.
 */

import {
  flushAnalyticsOutbox,
  persistAnalyticsEventDirect,
  queueAnalyticsEvent,
} from '../api/analytics.js';

const ATTRIBUTION_STORAGE_KEY =
  'ito_first_party_attribution_v2';

const LEGACY_ATTRIBUTION_STORAGE_KEY =
  'ito_first_party_attribution';

const ANALYTICS_SESSION_KEY =
  'ito_analytics_session_id';

const ANALYTICS_CONSENT_KEY =
  'ito_analytics_consent';

const MAX_VALUE_LENGTH = 500;

/* =========================================================
   MASTER DPR CANONICAL EVENTS
========================================================= */

export const DPR_EVENTS = Object.freeze({
  // Exact Master DPR v4.0 canonical event.
  LANDING_PAGE_VIEW: 'landing_page_view',

  /**
   * Temporary compatibility alias.
   *
   * Some Phase 1 files already reference LANDING_PAGE_VIEWED.
   * Both constants intentionally emit the exact DPR event
   * `landing_page_view`.
   */
  LANDING_PAGE_VIEWED: 'landing_page_view',

  VIEW_PRODUCT: 'view_product',
  START_REQUIREMENT: 'start_requirement',
  SELECT_PRODUCT: 'select_product',
  SELECT_QUANTITY: 'select_quantity',
  ENTER_DESTINATION: 'enter_destination',
  SELECT_TIMELINE: 'select_timeline',
  ELIGIBILITY_CHECKED: 'eligibility_checked',
  VIEW_SOFT_GATE: 'view_soft_gate',
  SUBMIT_PHONE: 'submit_phone',

  LEAD_CREATED: 'lead_created',
  QUALIFICATION_COMPLETED: 'qualification_completed',
  QUALIFIED_LEAD: 'qualified_lead',

  QUOTE_CREATED: 'quote_created',
  QUOTE_SENT: 'quote_sent',

  ORDER_WON: 'order_won',
  PURCHASE: 'purchase',
  REPEAT_ORDER: 'repeat_order',
});


/**
 * Only these canonical events may be persisted from the anonymous
 * public browser endpoint.
 *
 * Commercial outcomes such as:
 *
 * lead_created
 * qualified_lead
 * quote_created
 * order_won
 * purchase
 *
 * must originate from trusted backend/CRM flows.
 */
const PUBLIC_BACKEND_PERSISTED_DPR_EVENTS = Object.freeze(
  new Set([
    DPR_EVENTS.LANDING_PAGE_VIEW,
    DPR_EVENTS.VIEW_PRODUCT,
    DPR_EVENTS.START_REQUIREMENT,
    DPR_EVENTS.SELECT_PRODUCT,
    DPR_EVENTS.SELECT_QUANTITY,
    DPR_EVENTS.ENTER_DESTINATION,
    DPR_EVENTS.SELECT_TIMELINE,
    DPR_EVENTS.ELIGIBILITY_CHECKED,
    DPR_EVENTS.VIEW_SOFT_GATE,
    DPR_EVENTS.SUBMIT_PHONE,
  ])
);


/* =========================================================
   ATTRIBUTION
========================================================= */

const ATTRIBUTION_PARAMS = Object.freeze([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
  'campaign_id',
  'adset_id',
  'ad_id',
  'creative_id',
]);


/* =========================================================
   PRIVACY FILTERS
========================================================= */

const BLOCKED_KEY_PATTERNS = Object.freeze([
  /(^|_)(phone|mobile|whatsapp)(_|$)/i,

  /(^|_)(email|e_mail)(_|$)/i,

  /(^|_)(first_name|last_name|full_name|customer_name|contact_name)(_|$)/i,

  /(^|_)(password|passcode|otp|pin_code)(_|$)/i,

  /(^|_)(token|secret|authorization|cookie|session_token)(_|$)/i,

  /(^|_)(address|street_address)(_|$)/i,

  /(^|_)(message|remarks|notes|description|free_text)(_|$)/i,

  /(^|_)(gstin|pan|aadhaar|aadhar)(_|$)/i,
]);


/* =========================================================
   BASIC HELPERS
========================================================= */

function isBrowser() {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}


function safeJsonParse(
  value,
  fallback = null
) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}


function safeLocalStorageGet(key) {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}


function safeLocalStorageSet(
  key,
  value
) {
  if (!isBrowser()) {
    return false;
  }

  try {
    window.localStorage.setItem(
      key,
      value
    );

    return true;
  } catch {
    return false;
  }
}


function safeSessionStorageGet(key) {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.sessionStorage.getItem(
      key
    );
  } catch {
    return null;
  }
}


function safeSessionStorageSet(
  key,
  value
) {
  if (!isBrowser()) {
    return false;
  }

  try {
    window.sessionStorage.setItem(
      key,
      value
    );

    return true;
  } catch {
    return false;
  }
}


function cleanString(
  value,
  maxLength = MAX_VALUE_LENGTH
) {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  const cleaned =
    String(value).trim();

  if (!cleaned) {
    return undefined;
  }

  return cleaned.slice(
    0,
    maxLength
  );
}


function createUuidLikeId(
  prefix = 'evt'
) {
  if (!isBrowser()) {
    return null;
  }

  if (
    window.crypto &&
    typeof window.crypto.randomUUID ===
      'function'
  ) {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 14)}`;
}


function getSafePagePath() {
  if (!isBrowser()) {
    return undefined;
  }

  return (
    window.location.pathname ||
    '/'
  );
}


function getSafeReferrerOrigin() {
  if (
    !isBrowser() ||
    !document.referrer
  ) {
    return undefined;
  }

  try {
    return new URL(
      document.referrer
    ).origin;
  } catch {
    return undefined;
  }
}


function isBlockedAnalyticsKey(key) {
  return BLOCKED_KEY_PATTERNS.some(
    (pattern) =>
      pattern.test(key)
  );
}


/* =========================================================
   PAYLOAD SANITIZATION
========================================================= */

function sanitizeAnalyticsValue(
  value,
  depth = 0
) {
  if (
    depth > 4 ||
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (
    typeof value === 'string'
  ) {
    return cleanString(value);
  }

  if (
    typeof value === 'number'
  ) {
    return Number.isFinite(value)
      ? value
      : undefined;
  }

  if (
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (
    Array.isArray(value)
  ) {
    return value
      .slice(0, 50)
      .map((item) =>
        sanitizeAnalyticsValue(
          item,
          depth + 1
        )
      )
      .filter(
        (item) =>
          item !== undefined
      );
  }

  if (
    typeof value === 'object'
  ) {
    const result = {};

    Object.entries(
      value
    ).forEach(
      ([
        key,
        nestedValue,
      ]) => {
        if (
          isBlockedAnalyticsKey(
            key
          )
        ) {
          return;
        }

        const safeValue =
          sanitizeAnalyticsValue(
            nestedValue,
            depth + 1
          );

        if (
          safeValue !==
          undefined
        ) {
          result[key] =
            safeValue;
        }
      }
    );

    return result;
  }

  return undefined;
}


export function sanitizeAnalyticsPayload(
  payload = {}
) {
  const sanitized =
    sanitizeAnalyticsValue(
      payload
    );

  if (
    !sanitized ||
    typeof sanitized !==
      'object' ||
    Array.isArray(sanitized)
  ) {
    return {};
  }

  return sanitized;
}


/* =========================================================
   ATTRIBUTION STORAGE
========================================================= */

function readAttributionEnvelope() {
  const current =
    safeJsonParse(
      safeLocalStorageGet(
        ATTRIBUTION_STORAGE_KEY
      ),
      null
    );

  if (
    current &&
    typeof current === 'object'
  ) {
    return current;
  }

  /**
   * Backward compatibility with the original:
   *
   * ito_first_party_attribution
   */
  const legacy =
    safeJsonParse(
      safeLocalStorageGet(
        LEGACY_ATTRIBUTION_STORAGE_KEY
      ),
      {}
    );

  if (
    !legacy ||
    typeof legacy !==
      'object' ||
    Array.isArray(legacy)
  ) {
    return {
      first_touch: {},
      last_touch: {},
    };
  }

  const migrated = {
    first_touch: {
      ...legacy,
    },

    last_touch: {
      ...legacy,
    },
  };

  safeLocalStorageSet(
    ATTRIBUTION_STORAGE_KEY,
    JSON.stringify(
      migrated
    )
  );

  return migrated;
}


function readIncomingAttribution() {
  if (!isBrowser()) {
    return {};
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  const incoming = {};

  ATTRIBUTION_PARAMS.forEach(
    (key) => {
      const value =
        cleanString(
          params.get(key)
        );

      if (value) {
        incoming[key] =
          value;
      }
    }
  );

  return incoming;
}


/**
 * First-touch is never overwritten.
 *
 * Last-touch changes only when new campaign parameters arrive.
 */
export function captureFirstPartyAttribution() {
  if (!isBrowser()) {
    return {};
  }

  const existing =
    readAttributionEnvelope();

  const incoming =
    readIncomingAttribution();

  const hasIncomingCampaignData =
    Object.keys(
      incoming
    ).length > 0;

  const landingContext = {
    landing_page:
      getSafePagePath(),

    referrer_origin:
      getSafeReferrerOrigin(),

    captured_at:
      new Date().toISOString(),
  };


  const hasFirstTouch =
    existing.first_touch &&
    Object.keys(
      existing.first_touch
    ).length > 0;


  const firstTouch =
    hasFirstTouch
      ? existing.first_touch
      : {
          ...incoming,
          ...landingContext,
        };


  const hasExistingLastTouch =
    existing.last_touch &&
    Object.keys(
      existing.last_touch
    ).length > 0;


  const lastTouch =
    hasIncomingCampaignData
      ? {
          ...incoming,
          ...landingContext,
        }

      : hasExistingLastTouch
        ? existing.last_touch
        : {
            ...firstTouch,
          };


  const envelope = {
    first_touch:
      firstTouch,

    last_touch:
      lastTouch,
  };


  safeLocalStorageSet(
    ATTRIBUTION_STORAGE_KEY,
    JSON.stringify(
      envelope
    )
  );


  /**
   * Preserve old flat attribution storage for any legacy components
   * that still read this key.
   */
  safeLocalStorageSet(
    LEGACY_ATTRIBUTION_STORAGE_KEY,
    JSON.stringify(
      lastTouch
    )
  );


  return {
    ...lastTouch,
  };
}


export function getStoredAttribution() {
  return getFirstPartyAttribution();
}


function getDeviceType() {
  if(typeof navigator==='undefined')return '';
  if(/ipad|tablet/i.test(navigator.userAgent))return 'TABLET';
  return /mobile|android/i.test(navigator.userAgent)?'MOBILE':'DESKTOP';
}
export function getFirstPartyAttribution() {
  const envelope =
    readAttributionEnvelope();

  return {
    ...(
      envelope.last_touch ||
      {}
    ),
    device_type: getDeviceType(),
  };
}


export function getAttributionJourney() {
  const envelope =
    readAttributionEnvelope();

  return {
    first_touch: {
      ...(
        envelope.first_touch ||
        {}
      ),
    },

    last_touch: {
      ...(
        envelope.last_touch ||
        {}
      ),
    },
  };
}


/* =========================================================
   SESSION + EVENT IDS
========================================================= */

export function getOrCreateAnalyticsSessionId() {
  if (!isBrowser()) {
    return null;
  }

  const existing =
    safeSessionStorageGet(
      ANALYTICS_SESSION_KEY
    );

  if (existing) {
    return existing;
  }

  const sessionId =
    createUuidLikeId(
      'ses'
    );

  if (!sessionId) {
    return null;
  }

  safeSessionStorageSet(
    ANALYTICS_SESSION_KEY,
    sessionId
  );

  return sessionId;
}


export function createAnalyticsEventId() {
  return createUuidLikeId(
    'evt'
  );
}


/* =========================================================
   CONSENT STATE
========================================================= */

export function getAnalyticsConsent() {
  const saved =
    safeJsonParse(
      safeLocalStorageGet(
        ANALYTICS_CONSENT_KEY
      ),
      null
    );

  if (
    !saved ||
    typeof saved !==
      'object'
  ) {
    return {
      analytics: false,
      advertising: false,
      updated_at: null,
    };
  }

  return {
    analytics:
      saved.analytics === true,

    advertising:
      saved.advertising === true,

    updated_at:
      cleanString(
        saved.updated_at,
        50
      ) ||
      null,
  };
}


/**
 * Save the user's consent choice and update Google Consent Mode.
 */
export function setAnalyticsConsent({
  analytics = false,
  advertising = false,
} = {}) {
  if (!isBrowser()) {
    return;
  }

  const consent = {
    analytics:
      analytics === true,

    advertising:
      advertising === true,

    updated_at:
      new Date().toISOString(),
  };


  safeLocalStorageSet(
    ANALYTICS_CONSENT_KEY,
    JSON.stringify(
      consent
    )
  );


  window.dataLayer =
    window.dataLayer || [];


  updateMetaConsent(consent.advertising);
  if (consent.analytics || consent.advertising) window.__itoLoadGtm?.();

  const consentUpdate = {
    analytics_storage:
      consent.analytics
        ? 'granted'
        : 'denied',

    ad_storage:
      consent.advertising
        ? 'granted'
        : 'denied',

    ad_user_data:
      consent.advertising
        ? 'granted'
        : 'denied',

    ad_personalization:
      consent.advertising
        ? 'granted'
        : 'denied',
  };


  /**
   * index.html initializes window.gtag before GTM loads.
   */
  if (
    typeof window.gtag ===
    'function'
  ) {
    window.gtag(
      'consent',
      'update',
      consentUpdate
    );
  }


  /**
   * Diagnostic GTM event.
   *
   * This is not a commercial conversion.
   */
  window.dataLayer.push({
    event:
      'ito_consent_updated',

    ...consentUpdate,
  });


  /**
   * If analytics is granted, retry any previously queued analytics
   * events that failed because of temporary backend problems.
   */
  if (
    consent.analytics
  ) {
    flushAnalyticsOutbox({
      consentGranted:
        true,

      force:
        true,
    }).catch(() => {
      /**
       * Failure remains in outbox/status.
       *
       * Analytics failure must never break the website UI.
       */
    });
  }
}


/* =========================================================
   ANALYTICS CONTEXT
========================================================= */

export function getAnalyticsContext() {
  const attribution =
    getFirstPartyAttribution();

  return {
    ...attribution,

    analytics_session_id:
      getOrCreateAnalyticsSessionId(),

    page_path:
      getSafePagePath(),
  };
}


/* =========================================================
   GTM / DATALAYER
========================================================= */

/**
 * Generic privacy-safe dataLayer push.
 *
 * Returns the generated event ID so callers can reuse the exact
 * same event ID for backend persistence and later deduplication.
 */
export function pushDataLayerEvent(
  event,
  payload = {},
  options = {}
) {
  if (!isBrowser()) {
    return null;
  }

  const safeEventName =
    cleanString(
      event,
      100
    );

  if (!safeEventName) {
    return null;
  }


  captureFirstPartyAttribution();


  const eventId =
    cleanString(
      options.eventId,
      160
    ) ||
    createAnalyticsEventId();


  const safePayload =
    sanitizeAnalyticsPayload(
      payload
    );


  const eventRecord = {
    ...safePayload,

    ...getAnalyticsContext(),

    event:
      safeEventName,

    event_id:
      eventId,

    event_timestamp:
      new Date().toISOString(),

    page_path:
      getSafePagePath(),
  };


  /**
   * Never automatically send complete URLs.
   *
   * Query strings may contain campaign IDs or accidentally contain
   * personal/security data.
   */
  delete eventRecord.page_location;
  delete eventRecord.url;
  delete eventRecord.href;


  window.dataLayer =
    window.dataLayer || [];


  window.dataLayer.push(
    eventRecord
  );


  return eventId;
}


/* =========================================================
   FIRST-PARTY BACKEND EVENT ENVELOPE
========================================================= */

function buildBackendEventEnvelope(
  event,
  eventId,
  payload = {}
) {
  const safePayload =
    sanitizeAnalyticsPayload(
      payload
    );


  const attribution =
    getFirstPartyAttribution();


  const {
    page_path:
      _page_path,

    page_title:
      _page_title,

    page_type,

    landing_page_type,

    vertical,

    product_category,

    product_code,

    quantity_band,

    timeline_band,

    eligibility_status,

    lead_priority,

    submission_id,

    ...remainingProperties
  } = safePayload;


  return {
    event_id:
      eventId,

    event_name:
      event,

    event_timestamp:
      new Date().toISOString(),

    analytics_session_id:
      getOrCreateAnalyticsSessionId(),

    submission_id:
      cleanString(
        submission_id,
        128
      ),


    attribution: {
      utm_source:
        attribution.utm_source,

      utm_medium:
        attribution.utm_medium,

      utm_campaign:
        attribution.utm_campaign,

      utm_content:
        attribution.utm_content,

      utm_term:
        attribution.utm_term,

      gclid:
        attribution.gclid,

      fbclid:
        attribution.fbclid,

      campaign_id:
        attribution.campaign_id,

      adset_id:
        attribution.adset_id,

      ad_id:
        attribution.ad_id,
      creative_id: attribution.creative_id,
    },


    page: {
      page_path:
        getSafePagePath(),

      page_type,

      landing_page_type,
    },


    business: {
      vertical,

      product_category,

      product_code,

      quantity_band,

      timeline_band,

      eligibility_status,

      lead_priority,
    },


    properties:
      {...remainingProperties, device_type:getDeviceType()},
  };
}


/* =========================================================
   FIRST-PARTY BACKEND PERSISTENCE
========================================================= */

async function persistPublicDprEventToBackend(
  event,
  eventId,
  payload = {}
) {
  if (
    !PUBLIC_BACKEND_PERSISTED_DPR_EVENTS.has(
      event
    )
  ) {
    return;
  }


  const consent =
    getAnalyticsConsent();


  if (
    !consent.analytics
  ) {
    return;
  }


  const eventEnvelope =
    buildBackendEventEnvelope(
      event,
      eventId,
      payload
    );


  const queueResult =
    queueAnalyticsEvent(
      eventEnvelope,

      {
        consentGranted:
          true,
      }
    );


  if (
    queueResult.queued
  ) {
    try {
      await flushAnalyticsOutbox({
        consentGranted:
          true,
      });
    } catch {
      /**
       * Event remains in outbox for future retry.
       */
    }

    return;
  }


  /**
   * Some privacy/browser modes may disable localStorage.
   *
   * In that case we attempt a direct consented request.
   */
  if (
    queueResult.reason ===
    'LOCAL_STORAGE_UNAVAILABLE'
  ) {
    try {
      await persistAnalyticsEventDirect(
        eventEnvelope,

        {
          consentGranted:
            true,
        }
      );
    } catch {
      /**
       * Failure remains visible in the analytics persistence status.
       *
       * We do not pretend persistence succeeded.
       */
    }
  }
}


/* =========================================================
   CANONICAL DPR EVENT PUSH
========================================================= */

/**
 * Canonical DPR event helper.
 *
 * Browser-safe event flow:
 *
 * dataLayer/GTM
 *      +
 * first-party analytics ledger
 *
 * using the same event_id.
 *
 * Trusted commercial outcome events are intentionally NOT persisted
 * through the anonymous browser endpoint.
 */
export function pushDprEvent(
  event,
  payload = {},
  options = {}
) {
  const validEvents =
    Object.values(
      DPR_EVENTS
    );


  if (
    !validEvents.includes(
      event
    )
  ) {
    if (
      import.meta.env &&
      import.meta.env.DEV
    ) {
      console.warn(
        `[analytics] Non-canonical DPR event ignored: ${event}`
      );
    }

    return null;
  }


  const eventId =
    pushDataLayerEvent(
      event,
      payload,
      options
    );


  if (!eventId) {
    return null;
  }

  dispatchMetaEvent(event, eventId, getAnalyticsConsent().advertising);


  if (
    PUBLIC_BACKEND_PERSISTED_DPR_EVENTS.has(
      event
    )
  ) {
    persistPublicDprEventToBackend(
      event,
      eventId,
      payload
    ).catch(() => {
      /**
       * Final defensive catch.
       *
       * Retry state remains in the outbox/status object.
       */
    });
  }


  return eventId;
}


/* =========================================================
   PRIVACY-SAFE GENERIC ACTIVITY
========================================================= */

const CLICKABLE_SELECTOR =
  'button, a, [role="button"], input[type="submit"], input[type="button"], summary, [class*="cursor-pointer"]';


function getSafeClickUrl(
  target
) {
  if (
    !isBrowser() ||
    target.tagName !==
      'A'
  ) {
    return undefined;
  }


  const href =
    target.getAttribute(
      'href'
    );


  if (!href) {
    return undefined;
  }


  try {
    const url =
      new URL(
        href,
        window.location.origin
      );


    /**
     * Internal URL:
     * only pathname.
     */
    if (
      (
        url.protocol ===
          'http:' ||
        url.protocol ===
          'https:'
      ) &&
      url.origin ===
        window.location.origin
    ) {
      return url.pathname;
    }


    /**
     * External HTTP(S):
     * origin only.
     */
    if (
      url.protocol ===
        'http:' ||
      url.protocol ===
        'https:'
    ) {
      return url.origin;
    }


    /**
     * Never expose:
     *
     * tel:
     * mailto:
     * sms:
     * WhatsApp deep links
     * or similar schemes.
     */
    return undefined;

  } catch {
    return undefined;
  }
}


function describeClickTarget(
  element
) {
  const target =
    element?.closest?.(
      CLICKABLE_SELECTOR
    );


  if (!target) {
    return null;
  }


  /**
   * Visible text is not collected automatically because it could
   * contain user-generated or sensitive information.
   *
   * Use data-analytics-label for approved labels.
   */
  return {
    click_label:
      cleanString(
        target.getAttribute(
          'data-analytics-label'
        ),
        120
      ),

    click_id:
      cleanString(
        target.id,
        120
      ),

    click_tag:
      target.tagName.toLowerCase(),

    click_url:
      getSafeClickUrl(
        target
      ),
  };
}


let activityTrackingBound =
  false;

let retryLifecycleBound =
  false;


/* =========================================================
   GENERIC CLICK / FORM / CHANGE TRACKING
========================================================= */

export function initActivityTracking() {
  if (
    !isBrowser() ||
    activityTrackingBound
  ) {
    return;
  }


  activityTrackingBound =
    true;


  document.addEventListener(
    'click',

    (event) => {
      if (
        event.target?.tagName ===
          'INPUT' &&
        event.target.closest?.(
          'label'
        )
      ) {
        return;
      }


      const metadata =
        describeClickTarget(
          event.target
        );


      if (!metadata) {
        return;
      }


      pushDataLayerEvent(
        'site_click',
        metadata
      );
    },

    true
  );


  document.addEventListener(
    'submit',

    (event) => {
      const form =
        event.target;


      if (
        !(
          form instanceof
          HTMLFormElement
        )
      ) {
        return;
      }


      /**
       * Field names only.
       *
       * Never send user-entered values.
       */
      const fieldNames =
        Array.from(
          form.elements
        )
          .filter(
            (element) =>
              element.name &&
              element.type !==
                'password' &&
              element.type !==
                'file' &&
              !isBlockedAnalyticsKey(
                element.name
              )
          )
          .map(
            (element) =>
              element.name
          )
          .slice(
            0,
            100
          );


      pushDataLayerEvent(
        'site_form_submit',

        {
          form_id:
            form.id ||
            undefined,

          form_name:
            form.getAttribute(
              'name'
            ) ||
            undefined,

          form_fields:
            fieldNames.join(
              ','
            ) ||
            undefined,
        }
      );
    },

    true
  );


  document.addEventListener(
    'change',

    (event) => {
      const element =
        event.target;


      if (
        !(
          element instanceof
          HTMLElement
        )
      ) {
        return;
      }


      const inputName =
        cleanString(
          element.getAttribute?.(
            'name'
          ),
          120
        );


      if (
        inputName &&
        isBlockedAnalyticsKey(
          inputName
        )
      ) {
        return;
      }


      const tag =
        element.tagName.toLowerCase();


      if (
        tag ===
        'select'
      ) {
        pushDataLayerEvent(
          'site_input_change',

          {
            input_type:
              'select',

            input_id:
              element.id ||
              undefined,

            input_name:
              inputName,
          }
        );

        return;
      }


      if (
        tag ===
          'input' &&
        (
          element.type ===
            'checkbox' ||
          element.type ===
            'radio'
        )
      ) {
        pushDataLayerEvent(
          'site_input_change',

          {
            input_type:
              element.type,

            input_id:
              element.id ||
              undefined,

            input_name:
              inputName,

            input_checked:
              element.checked,
          }
        );

        return;
      }


      if (
        tag ===
          'input' &&
        element.type ===
          'file'
      ) {
        pushDataLayerEvent(
          'site_input_change',

          {
            input_type:
              'file',

            input_id:
              element.id ||
              undefined,

            input_name:
              inputName,

            file_count:
              element.files
                ? element.files.length
                : 0,
          }
        );
      }
    },

    true
  );
}


/* =========================================================
   OUTBOX RETRY LIFECYCLE
========================================================= */

function flushOutboxIfAllowed({
  force = false,
} = {}) {
  const consent =
    getAnalyticsConsent();


  if (
    !consent.analytics
  ) {
    return;
  }


  flushAnalyticsOutbox({
    consentGranted:
      true,

    force,
  }).catch(() => {
    /**
     * Retry state remains in outbox/status.
     */
  });
}


function initAnalyticsRetryLifecycle() {
  if (
    !isBrowser() ||
    retryLifecycleBound
  ) {
    return;
  }


  retryLifecycleBound =
    true;


  window.addEventListener(
    'online',

    () => {
      flushOutboxIfAllowed({
        force:
          true,
      });
    }
  );


  window.addEventListener(
    'focus',

    () => {
      flushOutboxIfAllowed();
    }
  );


  document.addEventListener(
    'visibilitychange',

    () => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        flushOutboxIfAllowed();
      }
    }
  );


  /**
   * Periodic retry.
   *
   * Intentionally modest to avoid request storms.
   */
  window.setInterval(
    () => {
      flushOutboxIfAllowed();
    },

    60 * 1000
  );
}


/* =========================================================
   APPLICATION INITIALIZATION
========================================================= */

/**
 * Called once from Client/src/main.jsx.
 */
export function initAnalytics() {
  if (!isBrowser()) {
    return;
  }


  captureFirstPartyAttribution();

  getOrCreateAnalyticsSessionId();

  initActivityTracking();

  initAnalyticsRetryLifecycle();


  /**
   * Retry pending consented analytics events from an earlier page load.
   */
  flushOutboxIfAllowed();


  /**
   * Diagnostic only.
   *
   * Not a conversion event.
   */
  pushDataLayerEvent(
    'analytics_initialized',

    {
      tracking_version:
        'master_dpr_v4_phase_1_6f',
    }
  );
}